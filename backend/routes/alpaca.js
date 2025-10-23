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

// ---------------------------
// Health check & debug endpoint (account info)
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
// Example: /api/stocks/bars?symbols=AAPL,MSFT&timeframe=1Day&limit=30
// ---------------------------
// routes/alpaca.js (inside router.get('/bars', ...))
router.get('/bars', async (req, res) => {
  try {
    const symbolsRaw = (req.query.symbols || '').toString();
    const symbols = symbolsRaw.toUpperCase();
    const timeframe = (req.query.timeframe || '1Day').toString(); // 1Min, 5Min, 1Hour, 1Day
    const limit = Number(req.query.limit || 30);

    if (!symbols) return res.json({ bars: {} });

    // Optional pass-throughs
    let { start, end, adjustment, feed } = req.query;

    // If asking for 1Day and no start provided, compute a default start far enough back
    // to cover `limit` trading days (add buffer for weekends/holidays).
    if (timeframe === '1Day' && !start) {
      const daysBuffer = Math.ceil(limit * 2); // simple buffer
      const d = new Date();
      d.setDate(d.getDate() - daysBuffer);
      start = d.toISOString();
    }

    // Build URL with all supported params
    let url = `${DATA}/stocks/bars` +
      `?symbols=${encodeURIComponent(symbols)}` +
      `&timeframe=${encodeURIComponent(timeframe)}` +
      `&limit=${encodeURIComponent(limit)}`;

    if (start)      url += `&start=${encodeURIComponent(start)}`;
    if (end)        url += `&end=${encodeURIComponent(end)}`;
    if (adjustment) url += `&adjustment=${encodeURIComponent(adjustment)}`;
    if (feed)       url += `&feed=${encodeURIComponent(feed)}`;

    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return res.status(response.status).json({ error: 'bars-upstream', status: response.status, body: text });
    }

    const json = await response.json();
    res.json(json); // { bars: { AAPL: [...], MSFT: [...] } }
  } catch (err) {
    console.error('Bars error:', err);
    res.status(500).json({ error: 'bars-failed', message: err.message });
  }
});


module.exports = router;
