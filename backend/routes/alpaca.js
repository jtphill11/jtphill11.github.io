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

// ------------------------------------
// Simple in-memory cache for asset names
// ------------------------------------
const companyCache = new Map();

async function getCompanyName(symbol) {
  const upper = symbol.toUpperCase();
  if (companyCache.has(upper)) return companyCache.get(upper);

  try {
    const r = await fetch(`${PAPER}/assets/${upper}`, { headers: HEADERS });
    if (!r.ok) {
      console.warn(`Asset fetch failed for ${upper}: HTTP ${r.status}`);
      return upper;
    }
    const d = await r.json();
    const name = d.name || upper;
    companyCache.set(upper, name);
    return name;
  } catch (err) {
    console.error(`getCompanyName error for ${upper}:`, err);
    return upper;
  }
}

// ------------------------------------
// Health check & debug endpoint (account info)
// ------------------------------------
router.get('/debug', async (_req, res) => {
  try {
    const response = await fetch(`${PAPER}/account`, { headers: HEADERS });
    const data = await response.json();
    res.json({ status: 'ok', account: data });
  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ error: 'failed', details: err.message });
  }
});

// ------------------------------------
// Popular tickers (top 10 tech stocks)
// ------------------------------------
router.get('/popular', async (_req, res) => {
  const pop = ['AAPL','MSFT','GOOGL','AMZN','META','TSLA','NVDA','AMD','INTC','NFLX'];

  try {
    const data = await Promise.all(pop.map(async s => {
      // Fetch company info (Trading API) + quote (Market Data API)
      const [name, quoteRes] = await Promise.all([
        getCompanyName(s),
        fetch(`${DATA}/stocks/${s}/quotes/latest`, { headers: HEADERS })
      ]);

      if (!quoteRes.ok) return null;
      const quote = await quoteRes.json();
      return { symbol: s, name, quote: quote.quote };
    }));

    res.json(data.filter(Boolean));
  } catch (err) {
    console.error('Popular error:', err);
    res.status(500).json({ error: 'failed-popular', message: err.message });
  }
});

// ------------------------------------
// Search tickers (by symbol)
// Example: /api/stocks/search?q=AAPL
// ------------------------------------
// ---------------------------
// Search tickers or names
// Example: /api/stocks/search?q=apple or /api/stocks/search?q=AAPL
// ---------------------------
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  try {
    const query = q.toUpperCase();

    // Try direct ticker lookup first
    const [name, quoteRes] = await Promise.all([
      getCompanyName(query),
      fetch(`${DATA}/stocks/${query}/quotes/latest`, { headers: HEADERS })
    ]);

    if (quoteRes.ok) {
      const quote = await quoteRes.json();
      return res.json([{ symbol: query, name, quote: quote.quote }]);
    }

    // Fallback: search by name (partial match) using Alpaca /assets endpoint
    const assetsRes = await fetch(`${PAPER}/assets`, { headers: HEADERS });
    if (!assetsRes.ok) return res.json([]);

    const allAssets = await assetsRes.json();
    const matches = allAssets.filter(a =>
      a.name?.toLowerCase().includes(q.toLowerCase()) ||
      a.symbol?.toLowerCase() === q.toLowerCase()
    ).slice(0, 10); // limit to 10 results

    const results = await Promise.all(matches.map(async asset => {
      const quoteRes2 = await fetch(`${DATA}/stocks/${asset.symbol}/quotes/latest`, { headers: HEADERS });
      if (!quoteRes2.ok) return null;
      const quote = await quoteRes2.json();
      return { symbol: asset.symbol, name: asset.name, quote: quote.quote };
    }));

    res.json(results.filter(Boolean));
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'search-failed', message: err.message });
  }
});

// ------------------------------------
// Historical bars (multi-symbol + timeframe)
// Example: /api/stocks/bars?symbols=AAPL,MSFT&timeframe=1Day&limit=30
// ------------------------------------
router.get('/bars', async (req, res) => {
  try {
    const symbolsRaw = (req.query.symbols || '').toString();
    const symbols = symbolsRaw.toUpperCase();
    const timeframe = (req.query.timeframe || '1Day').toString();
    const limit = Number(req.query.limit || 30);

    if (!symbols) return res.json({ bars: {} });

    // Optional params
    let { start, end, adjustment, feed } = req.query;

    // Compute a default start date for daily data if not provided
    if (timeframe === '1Day' && !start) {
      const daysBuffer = Math.ceil(limit * 2); // buffer for weekends/holidays
      const d = new Date();
      d.setDate(d.getDate() - daysBuffer);
      start = d.toISOString();
    }

    // Build upstream URL
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
      return res.status(response.status).json({
        error: 'bars-upstream',
        status: response.status,
        body: text
      });
    }

    const json = await response.json();
    res.json(json); // { bars: { AAPL: [...], MSFT: [...] } }
  } catch (err) {
    console.error('Bars error:', err);
    res.status(500).json({ error: 'bars-failed', message: err.message });
  }
});

module.exports = router;
