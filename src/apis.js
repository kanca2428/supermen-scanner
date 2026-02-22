var axios = require("axios");
var CONFIG = require("./config");

// ═══════════════════════════════════════════════════════════════
// CACHE YÖNETİMİ
// ═══════════════════════════════════════════════════════════════

const memCache = {};
const CACHE_TTL = { 
  M5: 300,      // 5 dakika
  M15: 900,     // 15 dakika
  H4: 7200,     // 2 saat
  D1: 21600,    // 6 saat
  W1: 43200     // 12 saat
};

function getCached(key) {
  const entry = memCache[key];
  if (!entry) return null;
  if (Date.now() - entry.time > (entry.ttl || 900) * 1000) { 
    delete memCache[key]; 
    return null; 
  }
  return entry.data;
}

function setCache(key, data, ttlSec) {
  memCache[key] = { data: data, time: Date.now(), ttl: ttlSec || 900 };
}

// ═══════════════════════════════════════════════════════════════
// HTTP FETCH
// ═══════════════════════════════════════════════════════════════

async function safeFetch(url, options) {
  if (!options) options = {};
  try {
    var resp = await axios({
      url: url,
      method: options.method || "get",
      headers: options.headers || {},
      data: options.data || undefined,
      timeout: options.timeout || 15000,
      validateStatus: function() { return true; }
    });
    return { code: resp.status, data: resp.data, ok: resp.status === 200 };
  } catch (e) {
    console.log("[API] Fetch error: " + url + " - " + e.message);
    return { code: 0, data: null, ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// BINANCE API
// ═══════════════════════════════════════════════════════════════

async function getKlinesBinance(symbol, tfKey, limit) {
  var interval = CONFIG.BINANCE_TF_MAP[tfKey];
  if (!interval) {
    console.log("[API] Invalid timeframe:", tfKey);
    return null;
  }
  
  var url = CONFIG.BINANCE_BASE + "/api/v3/klines?symbol=" + symbol + "&interval=" + interval + "&limit=" + limit;
  console.log("[API] Binance URL:", url);
  
  var r = await safeFetch(url);
  if (!r.ok || !Array.isArray(r.data)) {
    console.log("[API] Binance error:", r.code);
    return null;
  }
  
  var candles = [];
  for (var i = r.data.length - 1; i >= 0; i--) {
    var d = r.data[i];
    var o = parseFloat(d[1]), h = parseFloat(d[2]), l = parseFloat(d[3]), c = parseFloat(d[4]), v = parseFloat(d[5]);
    if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) continue;
    candles.push({ 
      time: Math.floor(parseInt(d[0]) / 1000), 
      open: o, 
      high: h, 
      low: l, 
      close: c, 
      volume: v || 0 
    });
  }
  
  return candles.length > 0 ? candles : null;
}

// ═══════════════════════════════════════════════════════════════
// SYMBOL CONVERTER
// ═══════════════════════════════════════════════════════════════

function toBinanceSymbol(pair) { 
  console.log("[API] Converting symbol:", pair);
  
  // Farklı formatları normalize et
  let symbol = pair
    .replace("/", "")
    .replace("-", "")
    .replace("_", "")
    .replace(".", "")
    .toUpperCase();
  
  // Eğer zaten USDT ile bitmiyorsa ekle
  if (!symbol.endsWith("USDT") && !symbol.endsWith("BUSD")) {
    symbol = symbol.replace("USD", "USDT");
  }
  
  console.log("[API] Converted symbol:", symbol);
  return symbol;
}

function toYahooSymbol(displaySymbol, marketType) {
  if (marketType === "BIST") {
    const symbol = displaySymbol.includes(".IS") ? displaySymbol : displaySymbol + ".IS";
    console.log("[API] BIST symbol:", symbol);
    return symbol;
  }
  if (marketType === "FOREX") {
    const symbol = displaySymbol + "=X";
    console.log("[API] Forex symbol:", symbol);
    return symbol;
  }
  return displaySymbol;
}

// ═══════════════════════════════════════════════════════════════
// UNIFIED CANDLE FETCHER
// ═══════════════════════════════════════════════════════════════

async function fetchCandles(displaySymbol, marketType, tfKey, limit) {
  var cKey = ("C_" + marketType + "_" + displaySymbol + "_" + tfKey).replace(/[^a-zA-Z0-9_]/g, "_");
  console.log("[API] Cache key:", cKey);
  
  var cached = getCached(cKey);
  if (cached && cached.length >= 5) {
    console.log("[API] Using cached data for:", cKey);
    return cached;
  }
  
  var candles = null;
  if (marketType === "CRYPTO") {
    try {
      const binanceSymbol = toBinanceSymbol(displaySymbol);
      console.log("[API] Trying Binance for:", binanceSymbol);
      candles = await getKlinesBinance(binanceSymbol, tfKey, limit);
      if (candles && candles.length >= 5) {
        console.log("[API] Got data from Binance:", candles.length, "candles");
      }
    } catch (e) {
      console.error("[API] Binance error:", e);
    }
  } else if (marketType === "BIST" || marketType === "FOREX") {
    var yt = CONFIG.YAHOO_TF_MAP[tfKey];
    if (yt) {
      const yahooSymbol = toYahooSymbol(displaySymbol, marketType);
      console.log("[API] Trying Yahoo for:", yahooSymbol);
      candles = await getKlinesYahoo(yahooSymbol, yt.interval, yt.range);
      if (candles && candles.length >= 5) {
        console.log("[API] Got data from Yahoo:", candles.length, "candles");
      }
    }
  }
  
  if (candles && candles.length > 0) {
    setCache(cKey, candles, CACHE_TTL[tfKey]);
    console.log("[API] Cached data for:", cKey);
  } else {
    console.log("[API] No data received for:", displaySymbol, marketType, tfKey);
  }
  
  return candles;
}

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════

async function checkAPIHealth() {
  console.log("[API] Checking API health...");
  
  const binanceHealth = await safeFetch(CONFIG.BINANCE_BASE + "/api/v3/ping");
  const yahooHealth = await safeFetch("https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d");
  
  const health = {
    binance: binanceHealth.ok,
    yahoo: yahooHealth.ok,
    timestamp: new Date().toISOString()
  };
  
  console.log("[API] Health check result:", health);
  return health;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = { 
  safeFetch, 
  fetchCandles, 
  checkAPIHealth,
  getCached,
  setCache,
  getCacheStats: () => ({ total: Object.keys(memCache).length })
};
