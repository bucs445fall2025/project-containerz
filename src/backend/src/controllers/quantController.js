const axios = require('axios');

const AI_URL = process.env.AI_URL || 'http://localhost:8001';

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
     *   weights: number[], // must sum to 1, same length as assets
     *   T: number, // years (e.g., 1)
     *   r: number, // risk-free, decimal (e.g., 0.04)
     *   n_steps: number, // e.g., 252
     *   n_paths: number, // e.g., 10000
     *   seed?: number // optional
     * }
     */
    try {
        // implement here; similar to priceCallOption

        const { data } = await axios.post(`${AI_URL}/simulate`, req.body, { timeout: 10_000 });

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