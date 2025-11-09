const axios = require('axios');
const User = require('../models/User.js');
const { decryptBlob } = require('../utils/crypto.js');
const PYTHON_SERVICE = process.env.PYTHON_SERVICE || 'http://pythonservice:8001';
const CASH_TICKER = 'CASH';

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

function buildAssetContext(holding, security, { cashTicker = CASH_TICKER } = {}) {
    if (!holding || !security) {
        return null;
    }

    const rawS0 =
        holding.institution_price ??
        security.close_price ??
        security.close_price_as_of ??
        security.close_price_adjusted ??
        null;
    const S0 = Number(rawS0);
    const quantity = Number(holding.quantity);

    if (!Number.isFinite(S0) || S0 <= 0) {
        return null;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
        return null;
    }

    let ticker = security.ticker_symbol || null;
    if (!ticker) {
        ticker = cashTicker;
    }

    const name = security.name || ticker || 'Unknown';
    const currency =
        holding.iso_currency_code ||
        holding.unofficial_currency_code ||
        security.iso_currency_code ||
        security.unofficial_currency_code ||
        'USD';

    const isCash = ticker === cashTicker;

    return {
        securityId: security.security_id,
        holdingId: holding.holding_id ?? holding.security_id,
        ticker,
        name,
        currency,
        accountId: holding.account_id,
        quantity,
        S0,
        mu: isCash ? 0.02 : 0.08,
        sigma: isCash ? 0.0001 : 0.20
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
    try {
        const { securityId, ticker } = req.body ?? {};
        if (!securityId && !ticker) {
            return res.status(400).json({ success: false, message: "securityId or ticker required" });
        }

        const existingUser = await User.findById(req.user.id)
            .select('+plaidHoldingsEnc +plaidSecuritiesEnc')
            .lean();
        if (!existingUser) {
            return res.status(404).json({ success: false, message: "user not found" });
        }

        const plaidHoldings = decryptBlob(existingUser.plaidHoldingsEnc) || [];
        const plaidSecurities = decryptBlob(existingUser.plaidSecuritiesEnc) || [];

        const normalizedTicker = ticker?.toString()?.trim()?.toUpperCase() || null;

        let holding = null;
        let security = null;

        if (securityId) {
            holding = plaidHoldings.find(h => h.security_id === securityId) || null;
            security = plaidSecurities.find(s => s.security_id === securityId) || null;
        }

        if ((!holding || !security) && normalizedTicker) {
            security =
                plaidSecurities.find(
                    s => s.ticker_symbol && s.ticker_symbol.toUpperCase() === normalizedTicker
                ) || security;
            if (security && !holding) {
                holding = plaidHoldings.find(h => h.security_id === security.security_id) || null;
            }
        }

        if (!holding || !security) {
            return res.status(404).json({ success: false, message: "Asset not found for user" });
        }

        const context = buildAssetContext(holding, security);
        if (!context) {
            return res.status(400).json({ success: false, message: "Unable to derive asset parameters" });
        }

        const T = req.body?.T ?? 1;
        const r = req.body?.r ?? 0.04;
        const n_steps = req.body?.n_steps ?? 252;
        const n_paths = req.body?.n_paths ?? 10000;
        const seed = req.body?.seed ?? null;
        const return_paths = req.body?.return_paths ?? true;

        const payload = {
            S0: Number(req.body?.S0 ?? context.S0),
            mu: Number(req.body?.mu ?? context.mu),
            sigma: Number(req.body?.sigma ?? context.sigma),
            T: Number(T),
            r: Number(r),
            n_steps: Number(n_steps),
            n_paths: Number(n_paths),
            seed: seed === null || seed === undefined ? null : Number(seed),
            return_paths: Boolean(return_paths)
        };

        if (!Number.isFinite(payload.S0) || payload.S0 <= 0) {
            return res.status(400).json({ success: false, message: "Invalid or missing asset price" });
        }
        if (!Number.isFinite(payload.mu)) {
            return res.status(400).json({ success: false, message: "mu must be a finite number" });
        }
        if (!Number.isFinite(payload.sigma) || payload.sigma <= 0) {
            return res.status(400).json({ success: false, message: "sigma must be > 0" });
        }
        if (!Number.isFinite(payload.n_steps) || payload.n_steps < 1) {
            return res.status(400).json({ success: false, message: "n_steps must be >= 1" });
        }
        if (!Number.isFinite(payload.n_paths) || payload.n_paths < 2) {
            return res.status(400).json({ success: false, message: "n_paths must be >= 2" });
        }

        const { data } = await axios.post(`${PYTHON_SERVICE}/sim/asset`, payload, { timeout: 10_000 });

        const quantity = context.quantity;
        const initialValue = quantity * payload.S0;
        const finalPrices = Array.isArray(data?.finalPrices) ? data.finalPrices : null;
        const holdingFinalValues =
            finalPrices && quantity > 0 ? finalPrices.map(price => price * quantity) : null;

        return res.status(200).json({
            success: true,
            message: "Asset Simulation Complete",
            asset: {
                id: context.securityId,
                securityId: context.securityId,
                holdingId: context.holdingId,
                name: context.name,
                ticker: context.ticker,
                currency: context.currency,
                quantity,
                price: payload.S0,
                mu: payload.mu,
                sigma: payload.sigma,
                accountId: context.accountId
            },
            data,
            holdingFinalValues,
            position: {
                initialValue,
                meanFinalValue: data.meanFinalPrice * quantity,
                stdFinalValue: data.stdFinalPrice * quantity,
                expectedReturn: data.expectedReturn,
                var95Return: data.assetVar95,
                cvar95Return: data.assetCvar95,
                var95FinalValue: initialValue * (1 + data.assetVar95),
                cvar95FinalValue: initialValue * (1 + data.assetCvar95)
            }
        });
    } catch (error) {
        const status = error.response?.status || 502;
        const detail = error.response?.data || error.message;
        console.error('Asset simulate error:', status, JSON.stringify(detail, null, 2));
        return res.status(status).json({ success: false, message: 'AI service unavailable', detail });
    }
}

exports.simPortfolio = async (req,res) => {
    try {
        const existingUser = await User.findById(req.user.id).select('+plaidHoldingsEnc +plaidSecuritiesEnc').lean();
        if (!existingUser) { 
            return res.status(404).json({ success: false, message: "user not found" });
        }

        let plaidHoldings = decryptBlob(existingUser.plaidHoldingsEnc) || [];
        let plaidSecurities = decryptBlob(existingUser.plaidSecuritiesEnc) || [];

        let comb = combineHoldsAndSecs(plaidHoldings, plaidSecurities);
        const T = req.body?.T ?? 1;
        const r = req.body?.r ?? 0.04;
        const n_steps = req.body?.n_steps ?? 252;
        const n_paths = req.body?.n_paths ?? 10000;
        const seed = req.body?.seed ?? null;

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
            seed,
            return_paths: Boolean(req.body?.return_paths ?? true),
            corr: req.body?.corr ?? null
        }

        const { data } = await axios.post(`${PYTHON_SERVICE}/sim/portfolio`, payload, { timeout: 10_000 });

        // need to add intital value, pass in from pythonservice
        return res.status(200).json({
            success: true, 
            message: "Portfolio Simulation Complete", 
            data,
            meta: {
                initialValue: comb.initialValue
            },
            params: {
                r,
                n_steps,
                n_paths,
                weights,
                seed, 
                corr_matrix_present: false
            }
        });
    } catch (error) {
        const status = error.response?.status || 502;
        const detail = error.response?.data || error.message;
        console.error('Python simulate error:', status, JSON.stringify(detail, null, 2));
        return res.status(status).json({ success: false, message: 'Python service error', detail });
    }
}
