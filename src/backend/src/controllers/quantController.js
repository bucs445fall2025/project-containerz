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
