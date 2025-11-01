const axios = require('axios');
const User = require('../models/User.js');
const { decryptBlob } = require('../utils/crypto.js');
const AI_URL = process.env.AI_URL || 'http://localhost:8001';

// function findSec(secs, secID) { // finds and returns cleaner data from sec
//     for (const obj of secs) {
//         if (obj.security_id == secID) {
//             return { name: obj.name, ticker_symbol: obj.ticker_symbol, security_id: obj.security_id, close_price: obj.close_price,  };
//         }
//     }
//     return {};
// }

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
        const { data } = await axios.post(`${AI_URL}/simulate`, req.body, { timeout: 10_000 });
        return res.json({ success: true, ...data });
    } catch (err) {
        console.error('AI simulate error:', err.message);
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

        const { assets, weights, initialValue } = combineHoldsAndSecs(plaidHoldings, plaidSecurities); 
        const T = req.body?.T ?? 1;
        const r = req.body?.r ?? 0.04;
        const n_steps = req.body?.n_steps ?? 252;
        const n_paths = req.body?.n_paths ?? 10000;
        const seed = req.body?.seed ?? null;

        // make data into expected body before passing it in
        const payload = {
            assets, weights,
            T, r,
            n_steps, n_paths,
            seed, return_paths: false
        }

        console.log(payload)

        const { data } = await axios.post(`${AI_URL}/sim/portfolio`, payload, { timeout: 10_000 });

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
        console.error('AI simulate error:', error.message);
        return res.status(502).json({ success: false, message: 'AI service unavailable' });
    }
}