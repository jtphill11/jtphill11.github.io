// routes/alpaca.js
const express = require('express');
const router = express.Router();

// Fix for fetch() in all Node.js environments
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const HEADERS = {
  'APCA-API-KEY-ID': process.env.ALPACA_KEY,
  'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET
};

const DATA  = process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets/v2';
const PAPER = 'https://paper-api.alpaca.markets/v2';

// Health check & debug endpoint (account info)
router.get('/debug', async (req, res) => {
  try {
    const response = await fetch(`${PAPER}/account`, { headers: HEADERS });
    const data = await response.json();
    res.json({ status: 'ok', account: data });
  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ error: 'failed', details: err.message });
  }
});

// Popular tickers
router.get('/popular', async (_req, res) => {
  const pop = ['AAPL','MSFT','GOOGL','AMZN','META','TSLA','NVDA','AMD','INTC','NFLX'];
  try {
    const data = await Promise.all(pop.map(async s => {
      const r = await fetch(`${DATA}/stocks/${s}/quotes/latest`, { headers: HEADERS });
      return r.ok ? { symbol: s, quote: (await r.json()).quote } : null;
    }));
    res.json(data.filter(Boolean));
  } catch (err) {
    console.error('Popular error:', err);
    res.status(500).json({ error: 'failed-popular', message: err.message });
  }
});

// Search tickers
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').toUpperCase();
  if (!q) return res.json([]);
  try {
    const r = await fetch(`${DATA}/stocks/${q}/quotes/latest`, { headers: HEADERS });
    if (!r.ok) return res.json([]);
    const j = await r.json();
    res.json([{ symbol: q, quote: j.quote }]);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'search-failed', message: err.message });
  }
});

module.exports = router;
