const axios = require('axios');
const User = require('../models/User.js');
const { decryptBlob } = require('../utils/crypto.js');
const PYTHON_SERVICE = process.env.PYTHON_SERVICE || 'http://pythonservice:8001';

function combineHoldsAndSecs(holds, secs, { includeCash = false, cashTicker = 'CASH' } = {}) {
    const secById = new Map(secs.map(s => [s.security_id, s]));

    const rows = [];
    for (const h of holds) {
        const s = secById.get(h.security_id);
        if (!s) continue;

        const rawS0 = (h.institution_price ?? s.close_price ?? s.close_price_as_of ?? null);
        const S0 = Number(rawS0);
        const quantity = Number(h.quantity);

        if (!Number.isFinite(S0) || S0 <= 0) continue;
        if (!Number.isFinite(quantity) || quantity <= 0) continue;

        let ticker = s.ticker_symbol || null;

        if (!ticker) {
            if (!includeCash) continue; 
            ticker = cashTicker;
        }

        const name = s.name || ticker || 'Unknown';

        rows.push({
            name,
            ticker,
            S0,
            quantity,
            mu: 0.08,
            sigma: ticker === cashTicker ? 0.0001 : 0.20,
        });
    }

    if (rows.length === 0) {
        return { assets: [], weights: [], initialValue: 0 };
    }

    const numerators = rows.map(r => r.quantity * r.S0);
    const total = numerators.reduce((a, b) => a + b, 0);

    if (!Number.isFinite(total) || total <= 0) {
        return { assets: [], weights: [], initialValue: 0 };
    }

    const weights = numerators.map(v => v / total);

    const assets = rows.map(({ name, ticker, S0, mu, sigma }) => ({
        name, ticker, S0, mu, sigma
    }));

    return {
        assets,
        weights,
        initialValue: total
    };
}


exports.priceCallOption = async (req, res) => {
    try {
        // Expect body: { S0, K, T, r, sigma, n_paths, seed }
        const { data } = await axios.post(`${PYTHON_SERVICE}/simulate`, req.body, { timeout: 10_000 });
        return res.json({ success: true, ...data });
    } catch (err) {
        console.error('python simulate error:', err.message);
        return res.status(502).json({ success: false, message: 'AI service unavailable' });
  }
};

exports.simAsset = async (req,res) => {
    /**
     * Expected Body: { S0, mu, sigma, T, r, n_steps, n_paths, seed }
     *  S0 := Current price => get from plaid 
     *  mu := Expected annual return (drift) => can hardcode or randomize or estimate
     *  sigma := Annulized volatility => you can do it the same way for mu
     *  T := Horizon in years => choose 10 or something idk
     *  r := risk-free rate => 0.04 % or something
     *  n_steps := # of steps per path => go with 252 
     *  n_paths := number of times you gonna simulate => usually 10000 - 50000
     *  seed := is optional, this is jsut for reproducability
     * 
     *  this is all for fake data using plaid
     */
    try {
        // implement here; similar to priceCallOption

        // expected output
        // return res.status(200).json({
        //     success: true,
        //     message: "Asset Simulation Complete",
        //     data: {
        //         finalPrices: [], // ending price of each simulated path
        //         meanFinalPrices: float, // average of all final prices
        //         stdFinalPrice: float, // volatility of all simulation outcomes
        //         expectedReturn: float, // (meanFinalPrice - S0)/S0
        //         params: { S0, mu, sigma, T, r, n_steps, n_paths } // echo back what was used for outcomes (mainly for debug)
        //     }
        // });
    } catch (error) {
        console.error('AI simulate error:', error.message);
        return res.status(502).json({ success: false, message: 'AI service unavailable' });
    }
}

exports.simPortfolio = async (req,res) => {
    console.log('PYTHON_SERVICE in backend process:', process.env.PYTHON_SERVICE);
    /**
     * Expected Body: {
     *   assets: [{ name: "AAPL", S0: number, mu: number, sigma: number }, ...],
     *   weights: number[], // must sum to 1, same length as assets; weight = (quantity × S0) / total_value
     *   T: number, // years (e.g., 1)
     *   r: number, // risk-free, decimal (e.g., 0.04)
     *   n_steps: number, // e.g., 252
     *   n_paths: number, // e.g., 10000
     *   seed?: number // optional
     * }
     */
    try {
        // implement here; similar to priceCallOption
        const existingUser = await User.findById(req.user.id).select('+plaidHoldingsEnc +plaidSecuritiesEnc').lean();
        if (!existingUser) { 
            return res.status(404).json({ success: false, message: "user not found" });
        }

        let plaidHoldings = decryptBlob(existingUser.plaidHoldingsEnc) || [];
        let plaidSecurities = decryptBlob(existingUser.plaidSecuritiesEnc) || [];

        // console.log(plaidHoldings[0]);
        // console.log(plaidSecurities[0]);

        // const { assets, weights, initialValue } = combineHoldsAndSecs(plaidHoldings, plaidSecurities); 
        let comb = combineHoldsAndSecs(plaidHoldings, plaidSecurities);
        const T = req.body?.T ?? 1;
        const r = req.body?.r ?? 0.04;
        const n_steps = req.body?.n_steps ?? 252;
        const n_paths = req.body?.n_paths ?? 10000;
        const seed = req.body?.seed ?? null;

        // make data into expected body before passing it in

        let assets = comb.assets.map(a => ({
            S0: Number(a.S0),
            mu: Number(a.mu),
            sigma: Number(a.sigma),
        })).filter(a =>
            Number.isFinite(a.S0) && a.S0 > 0 &&
            Number.isFinite(a.mu) &&
            Number.isFinite(a.sigma) && a.sigma > 0
        );

        let weights = comb.weights.slice(0, assets.length);
        const ws = weights.reduce((s,w)=>s+w, 0);
        if (!assets.length || weights.length !== assets.length || ws === 0) {
            return res.status(400).json({ success:false, message:"No usable assets/weights after filtering" });
        }
        weights = weights.map(w => w / ws);

        const payload = {
            assets, weights,
            T, r,
            n_steps, n_paths,
            seed, return_paths: false,
            corr: null
        }


        console.log('PYTHON_SERVICE payload preview:', JSON.stringify({
            T, r, n_steps, n_paths, seed,
            assets: assets.slice(0,3),
            weights: weights.slice(0,3),
            corr: null
        }, null, 2));

        const { data } = await axios.post(`${PYTHON_SERVICE}/sim/portfolio`, payload, { timeout: 10_000 });

        return res.status(200).json({
            success: true, 
            message: "Portfolio Simulation Complete", 
            data,
            params: {
                r,
                n_steps,
                n_paths,
                weights,
                seed, 
                corr_matrix_present: false
            }
        });

        // expected output
        // return res.status(200).json({
        //     success: true,
        //     message: "Portfolio Simulation Complete",
        //     data: {
        //         initialValue: /* number */,
        //         portfolioFinalValues: /* number[] */,     // one per path (omit if huge)
        //         meanFinalValue: /* number */,
        //         stdFinalValue: /* number */,
        //         expectedReturn: /* (meanFinalValue - initialValue)/initialValue */,
        //         portfolioVar95: /* number */,             // e.g., -0.035 -> -3.5% over horizon
        //         portfolioCvar95: /* number */,
        //         // optional extras:
        //         // percentileFinalValues: { p5: number, p25: number, p50: number, p75: number, p95: number },
        //         // sharpe: number,   // (E[R] - r) / std(R) over horizon
        //         params: {
        //             T: /* from input */, 
        //             r: /* from input */,
        //             n_steps: /* from input */, 
        //             n_paths: /* from input */,
        //             weights: /* from input */, 
        //             seed: /* from input or null */,
        //             corr_matrix_present: /* true|false */
        //         }
        //     }
        // });
    } catch (error) {
        const status = error.response?.status || 502;
        const detail = error.response?.data || error.message;
        console.error('Python simulate error:', status, JSON.stringify(detail, null, 2));
        return res.status(status).json({ success: false, message: 'Python service error', detail });
    }
}