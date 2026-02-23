// ═══════════════════════════════════════════════════════════════
// SUPERMEN V16.0 - API MODULE
// ═══════════════════════════════════════════════════════════════

const axios = require("axios");
const CONFIG = require("./config");

// ═══════════════════════════════════════════════════════════════
// CACHE SİSTEMİ
// ═══════════════════════════════════════════════════════════════
const memCache = {};
const CACHE_TTL = { 
  M5: 300, 
  M15: 900, 
  H4: 7200, 
  D1: 21600, 
  W1: 43200 
};

function getCached(key) {
  const entry = memCache[key];
  if (!entry) return null;
  
  const ttl = entry.ttl || 900;
  if (Date.now() - entry.time > ttl * 1000) {
    delete memCache[key];
    return null;
  }
  return entry.data;
}

function setCache(key, data, ttlSec) {
  memCache[key] = { 
    data: data, 
    time: Date.now(), 
    ttl: ttlSec || 900 
  };
}

function getCacheStats() {
  return { 
    total: Object.keys(memCache).length,
    keys: Object.keys(memCache)
  };
}

function clearCache() {
  Object.keys(memCache).forEach(key => delete memCache[key]);
}

// ═══════════════════════════════════════════════════════════════
// SAFE HTTP FETCH
// ═══════════════════════════════════════════════════════════════
async function safeFetch(url, options = {}) {
  try {
    const resp = await axios({
      url: url,
      method: options.method || "get",
      headers: options.headers || {},
      data: options.data || undefined,
      timeout: options.timeout || 15000,
      validateStatus: function() { return true; }
    });
    
    return { 
      code: resp.status, 
      data: resp.data, 
      ok: resp.status === 200 
    };
  } catch (e) {
    console.error(`API Hatası (${url}):`, e.message);
    return { 
      code: 0, 
      data: null, 
      ok: false, 
      error: e.message 
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// BINANCE API
// ═══════════════════════════════════════════════════════════════
async function getKlinesBinance(symbol, tfKey, limit) {
  const interval = CONFIG.BINANCE_TF_MAP[tfKey];
  if (!interval) {
    console.warn(`Binance: Geçersiz timeframe: ${tfKey}`);
    return null;
  }
  
  const url = `${CONFIG.BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
  const r = await safeFetch(url);
  if (!r.ok || !Array.isArray(r.data)) {
    return null;
  }
  
  const candles = [];
  // En yeni mum başta olacak şekilde sırala
  for (let i = r.data.length - 1; i >= 0; i--) {
    const d = r.data[i];
    candles.push({
      time: Math.floor(parseInt(d[0]) / 1000),
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5])
    });
  }
  
  return candles.length > 0 ? candles : null;
}

// ═══════════════════════════════════════════════════════════════
// YAHOO FINANCE API
// ═══════════════════════════════════════════════════════════════
async function getKlinesYahoo(yahooSymbol, interval, range) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
  
  const r = await safeFetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  });
  
  if (!r.ok || !r.data || !r.data.chart || !r.data.chart.result) {
    return null;
  }
  
  const cr = r.data.chart.result[0];
  const ts = cr.timestamp;
  const q = cr.indicators.quote[0];
  
  if (!ts || !q) {
    return null;
  }
  
  const candles = [];
  // En yeni mum başta olacak şekilde sırala
  for (let i = ts.length - 1; i >= 0; i--) {
    if (q.close[i] == null) continue;
    
    candles.push({
      time: ts[i],
      open: q.open[i] || 0,
      high: q.high[i] || 0,
      low: q.low[i] || 0,
      close: q.close[i],
      volume: q.volume[i] || 0
    });
  }
  
  return candles.length > 0 ? candles : null;
}

// ═══════════════════════════════════════════════════════════════
// SEMBOL DÖNÜŞÜM FONKSİYONLARI
// ═══════════════════════════════════════════════════════════════
function toBinanceSymbol(pair) {
  // "BTC/USD" -> "BTCUSDT"
  return pair.replace("/USD", "").replace("/USDT", "") + "USDT";
}

function toYahooSymbol(displaySymbol, marketType) {
  if (marketType === "BIST") {
    // BIST için ".IS" ekle
    return displaySymbol.includes(".IS") ? displaySymbol : displaySymbol + ".IS";
  }
  if (marketType === "FOREX") {
    // Forex için "=X" ekle
    return displaySymbol + "=X";
  }
  return displaySymbol;
}

// ═══════════════════════════════════════════════════════════════
// ANA CANDLE FETCH FONKSİYONU
// ═══════════════════════════════════════════════════════════════
async function fetchCandles(displaySymbol, marketType, tfKey, limit) {
  // Cache key oluştur
  const cKey = `C_${marketType}_${displaySymbol}_${tfKey}`.replace(/[^a-zA-Z0-9_]/g, "_");
  
  // Cache kontrolü
  const cached = getCached(cKey);
  if (cached) {
    return cached;
  }
  
  let candles = null;
  
  try {
    if (marketType === "CRYPTO") {
      // Kripto için Binance kullan
      candles = await getKlinesBinance(toBinanceSymbol(displaySymbol), tfKey, limit);
    } 
    else if (marketType === "BIST" || marketType === "FOREX") {
      // BIST ve Forex için Yahoo Finance kullan
      const yt = CONFIG.YAHOO_TF_MAP[tfKey];
      if (yt) {
        candles = await getKlinesYahoo(
          toYahooSymbol(displaySymbol, marketType), 
          yt.interval, 
          yt.range
        );
      }
    }
  } catch (e) {
    console.error(`fetchCandles hatası (${displaySymbol}):`, e.message);
  }
  
  // Cache'e kaydet
  if (candles && candles.length > 0) {
    setCache(cKey, candles, CACHE_TTL[tfKey]);
  }
  
  return candles;
}

// ═══════════════════════════════════════════════════════════════
// API SAĞLIK KONTROLÜ
// ═══════════════════════════════════════════════════════════════
async function checkAPIHealth() {
  const binanceTest = await safeFetch(`${CONFIG.BINANCE_BASE}/api/v3/ping`);
  const yahooTest = await safeFetch(
    "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d",
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  
  return {
    binance: binanceTest.ok,
    yahoo: yahooTest.ok,
    timestamp: new Date().toISOString()
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════
module.exports = {
  safeFetch,
  fetchCandles,
  checkAPIHealth,
  getCacheStats,
  clearCache,
  toBinanceSymbol,
  toYahooSymbol
};
