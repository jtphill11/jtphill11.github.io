// routes/alpaca.js
const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const HEADERS = {
  'APCA-API-KEY-ID': process.env.ALPACA_KEY,
  'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET
};

const DATA = process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets/v2';
const PAPER = 'https://paper-api.alpaca.markets/v2';

// ---------------------------
// Health check & debug endpoint
// ---------------------------
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

// ---------------------------
// Popular tickers (top 10 tech)
// ---------------------------
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

// ---------------------------
// Search tickers (by symbol)
// ---------------------------
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

// ---------------------------
// Historical bars (multi-symbol + timeframe)
// Supports optional range=3m|6m|1y
// Example: /api/stocks/bars?symbols=AAPL&timeframe=1Day&range=6m
// ---------------------------
router.get('/bars', async (req, res) => {
  try {
    const symbols = (req.query.symbols || '').toUpperCase();
    const timeframe = req.query.timeframe || '1Day';  // 1Min, 5Min, 1Hour, 1Day
    const range = (req.query.range || '3m').toLowerCase(); // 3m, 6m, 1y
    const limit = req.query.limit || 300; // enough to plot longer ranges

    if (!symbols) return res.json({ bars: {} });

    // Define date ranges dynamically
    const now = new Date();
    const start = new Date();
    if (range === '1y') start.setFullYear(start.getFullYear() - 1);
    else if (range === '6m') start.setMonth(start.getMonth() - 6);
    else start.setMonth(start.getMonth() - 3); // default 3m
    const startIso = start.toISOString();
    const endIso = now.toISOString();

    let url = `${DATA}/stocks/bars?symbols=${encodeURIComponent(symbols)}&timeframe=${timeframe}&start=${startIso}&end=${endIso}&limit=${limit}`;
    let response = await fetch(url, { headers: HEADERS });
    let json = await response.json();

    // Fallback if Alpaca gives no data
    if ((!json.bars || Object.keys(json.bars).length === 0) && timeframe === '1Day') {
      console.warn(`No ${range} data found for ${symbols} — retrying with 1Hour`);
      url = `${DATA}/stocks/bars?symbols=${encodeURIComponent(symbols)}&timeframe=1Hour&start=${startIso}&end=${endIso}&limit=${limit}`;
      response = await fetch(url, { headers: HEADERS });
      json = await response.json();
    }

    res.json(json);
  } catch (err) {
    console.error('Bars error:', err);
    res.status(500).json({ error: 'bars-failed', message: err.message });
  }
});

module.exports = router;
