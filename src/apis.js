const axios = require("axios");
const CONFIG = require("./config");

const memCache = {};
const CACHE_TTL = { H1: 3600, H4: 7200, D1: 21600, W1: 43200 };

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
// SAFE HTTP FETCH
// ═══════════════════════════════════════════════════════════════
async function safeFetch(url, options = {}) {
  try {
    const resp = await axios({
      url: url,
      method: options.method || "get",
      headers: options.headers || {},
      timeout: options.timeout || 10000,
      validateStatus: () => true
    });
    
    return { 
      code: resp.status, 
      data: resp.data, 
      ok: resp.status === 200 
    };
  } catch (e) {
    return { code: 0, data: null, ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// BINANCE API
// ═══════════════════════════════════════════════════════════════
async function getKlinesBinance(symbol, tfKey, limit) {
  const interval = CONFIG.BINANCE_TF_MAP[tfKey];
  if (!interval) return null;
  
  const url = `${CONFIG.BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
  const r = await safeFetch(url);
  
  if (!r.ok) {
    console.log(`      ⚠️ Binance API hata: ${symbol} - Status: ${r.code}`);
    return null;
  }
  
  if (!Array.isArray(r.data) || r.data.length === 0) {
    console.log(`      ⚠️ Binance veri yok: ${symbol}`);
    return null;
  }
  
  const candles = [];
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
  
  return candles;
}

// ═══════════════════════════════════════════════════════════════
// YAHOO FINANCE API
// ═══════════════════════════════════════════════════════════════
async function getKlinesYahoo(yahooSymbol, interval, range) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
  
  const r = await safeFetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
  });
  
  if (!r.ok || !r.data?.chart?.result?.[0]) {
    return null;
  }
  
  const cr = r.data.chart.result[0];
  const ts = cr.timestamp;
  const q = cr.indicators?.quote?.[0];
  
  if (!ts || !q) return null;
  
  const candles = [];
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
// SEMBOL DÖNÜŞÜMLER
// ═══════════════════════════════════════════════════════════════
function toBinanceSymbol(pair) {
  return pair.replace("/USD", "").replace("/USDT", "") + "USDT";
}

function toYahooSymbol(symbol, marketType) {
  if (marketType === "BIST") return symbol + ".IS";
  if (marketType === "FOREX") return symbol + "=X";
  return symbol;
}

// ═══════════════════════════════════════════════════════════════
// ANA FETCH FONKSİYONU
// ═══════════════════════════════════════════════════════════════
async function fetchCandles(displaySymbol, marketType, tfKey, limit) {
  const cKey = `C_${marketType}_${displaySymbol}_${tfKey}`.replace(/[^a-zA-Z0-9_]/g, "_");
  
  const cached = getCached(cKey);
  if (cached) return cached;
  
  let candles = null;
  
  try {
    if (marketType === "CRYPTO") {
      const binanceSymbol = toBinanceSymbol(displaySymbol);
      candles = await getKlinesBinance(binanceSymbol, tfKey, limit);
    } 
    else if (marketType === "BIST" || marketType === "FOREX") {
      const yt = CONFIG.YAHOO_TF_MAP[tfKey];
      if (yt) {
        const yahooSymbol = toYahooSymbol(displaySymbol, marketType);
        candles = await getKlinesYahoo(yahooSymbol, yt.interval, yt.range);
      }
    }
  } catch (e) {
    console.log(`      ❌ API hatası (${displaySymbol}): ${e.message}`);
  }
  
  if (candles && candles.length > 0) {
    setCache(cKey, candles, CACHE_TTL[tfKey] || 3600);
  }
  
  return candles;
}

// ═══════════════════════════════════════════════════════════════
// API SAĞLIK KONTROLÜ
// ═══════════════════════════════════════════════════════════════
async function testAPIs() {
  console.log("\n🔌 API BAĞLANTI TESTİ");
  console.log("─".repeat(50));
  
  // Binance test
  const binanceTest = await safeFetch(`${CONFIG.BINANCE_BASE}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1`);
  if (binanceTest.ok && Array.isArray(binanceTest.data)) {
    const price = parseFloat(binanceTest.data[0][4]);
    console.log(`✅ Binance: ÇALIŞIYOR (BTC: $${price.toLocaleString()})`);
  } else {
    console.log(`❌ Binance: HATA (${binanceTest.code || binanceTest.error})`);
  }
  
  // Yahoo test
  const yahooTest = await safeFetch(
    "https://query1.finance.yahoo.com/v8/finance/chart/THYAO.IS?interval=1d&range=5d",
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  if (yahooTest.ok && yahooTest.data?.chart?.result?.[0]) {
    console.log(`✅ Yahoo Finance: ÇALIŞIYOR`);
  } else {
    console.log(`❌ Yahoo Finance: HATA`);
  }
  
  console.log("─".repeat(50) + "\n");
  
  return {
    binance: binanceTest.ok,
    yahoo: yahooTest.ok
  };
}

module.exports = {
  safeFetch,
  fetchCandles,
  testAPIs,
  toBinanceSymbol,
  toYahooSymbol
};
