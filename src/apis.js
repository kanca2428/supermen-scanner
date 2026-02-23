var axios = require("axios");
var CONFIG = require("./config");

// ───────────────────────────────────────────────────────────────────
// CACHE
// ───────────────────────────────────────────────────────────────────
var memCache = {};
var CACHE_TTL = { M5: 300, M15: 900, H4: 7200, D1: 21600, W1: 43200 };

function getCached(key) {
  var entry = memCache[key];
  if (!entry) return null;
  if (Date.now() - entry.time > (entry.ttl || 900) * 1000) { delete memCache[key]; return null; }
  return entry.data;
}
function setCache(key, data, ttlSec) {
  memCache[key] = { data: data, time: Date.now(), ttl: ttlSec || 900 };
}
function getCacheStats() { return { total: Object.keys(memCache).length }; }

// ───────────────────────────────────────────────────────────────────
// SAFE FETCH
// ───────────────────────────────────────────────────────────────────
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
    return { code: 0, data: null, ok: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// SEMBOL DÖNÜŞTÜRÜCÜ
// "BTC/USD" → exchange'e göre doğru formata çevirir
// ═══════════════════════════════════════════════════════════════════
function formatSymbol(pair, exchange) {
  // Zaten slash yok ise (BTCUSDT gibi) dokunma
  if (!pair.includes("/")) return pair;

  var parts = pair.split("/");
  var base  = parts[0];
  var quote = parts[1];
  var q     = (quote === "USD") ? "USDT" : quote; // USD → USDT

  if (exchange === "kucoin") return base + "-" + q;  // BTC-USDT
  return base + q;                                    // BTCUSDT (Binance/Bybit)
}

// Eski fonksiyon — geriye dönük uyumluluk için bırakıldı
function toBinanceSymbol(pair) {
  return formatSymbol(pair, "binance");
}

function toYahooSymbol(displaySymbol, marketType) {
  if (marketType === "BIST")  return displaySymbol.includes(".IS") ? displaySymbol : displaySymbol + ".IS";
  if (marketType === "FOREX") return displaySymbol.includes("=X")  ? displaySymbol : displaySymbol + "=X";
  return displaySymbol;
}

// ═══════════════════════════════════════════════════════════════════
// BİNANCE KLINE
// ═══════════════════════════════════════════════════════════════════
async function getKlinesBinance(pair, tfKey, limit) {
  var symbol   = formatSymbol(pair, "binance");
  var interval = CONFIG.BINANCE_TF_MAP[tfKey];
  if (!interval) return null;

  var url = CONFIG.BINANCE_BASE + "/api/v3/klines?symbol=" + symbol +
            "&interval=" + interval + "&limit=" + limit;
  var r = await safeFetch(url);

  // Invalid symbol hatası — bu coin Binance'de yok
  if (!r.ok || !Array.isArray(r.data)) return null;
  if (r.data.code && r.data.code === -1121) return null;

  var candles = [];
  for (var i = r.data.length - 1; i >= 0; i--) {
    var d = r.data[i];
    candles.push({
      time:   Math.floor(parseInt(d[0]) / 1000),
      open:   parseFloat(d[1]),
      high:   parseFloat(d[2]),
      low:    parseFloat(d[3]),
      close:  parseFloat(d[4]),
      volume: parseFloat(d[5])
    });
  }
  return candles.length > 0 ? candles : null;
}

// ═══════════════════════════════════════════════════════════════════
// BYBIT KLINE
// ═══════════════════════════════════════════════════════════════════
async function getKlinesBybit(pair, tfKey, limit) {
  var symbol   = formatSymbol(pair, "bybit");
  var interval = CONFIG.BYBIT_TF_MAP ? CONFIG.BYBIT_TF_MAP[tfKey] : null;
  if (!interval) return null;

  var url = CONFIG.BYBIT_BASE + "/v5/market/kline?category=spot&symbol=" + symbol +
            "&interval=" + interval + "&limit=" + limit;
  var r = await safeFetch(url);

  if (!r.ok || !r.data || !r.data.result || !r.data.result.list) return null;

  var list    = r.data.result.list;
  var candles = [];
  for (var i = list.length - 1; i >= 0; i--) {
    var d = list[i];
    candles.push({
      time:   Math.floor(parseInt(d[0]) / 1000),
      open:   parseFloat(d[1]),
      high:   parseFloat(d[2]),
      low:    parseFloat(d[3]),
      close:  parseFloat(d[4]),
      volume: parseFloat(d[5])
    });
  }
  return candles.length > 0 ? candles : null;
}

// ═══════════════════════════════════════════════════════════════════
// KUCOIN KLINE
// ═══════════════════════════════════════════════════════════════════
async function getKlinesKucoin(pair, tfKey, limit) {
  var symbol  = formatSymbol(pair, "kucoin");
  var tfCfg   = CONFIG.KUCOIN_TF_MAP ? CONFIG.KUCOIN_TF_MAP[tfKey] : null;
  if (!tfCfg) return null;

  // KuCoin: startAt / endAt ile limit kadar mum çek
  var endAt   = Math.floor(Date.now() / 1000);
  var startAt = endAt - (limit * tfCfg.minutes * 60);
  var url     = CONFIG.KUCOIN_BASE + "/api/v1/market/candles?type=" + tfCfg.code +
                "&symbol=" + symbol + "&startAt=" + startAt + "&endAt=" + endAt;
  var r = await safeFetch(url);

  if (!r.ok || !r.data || !Array.isArray(r.data.data)) return null;

  var list    = r.data.data;
  var candles = [];
  for (var i = list.length - 1; i >= 0; i--) {
    var d = list[i];
    candles.push({
      time:   parseInt(d[0]),
      open:   parseFloat(d[1]),
      close:  parseFloat(d[2]),
      high:   parseFloat(d[3]),
      low:    parseFloat(d[4]),
      volume: parseFloat(d[5])
    });
  }
  return candles.length > 0 ? candles : null;
}

// ═══════════════════════════════════════════════════════════════════
// YAHOO KLINE (Forex + BIST)
// ═══════════════════════════════════════════════════════════════════
async function getKlinesYahoo(yahooSymbol, interval, range) {
  var url = "https://query1.finance.yahoo.com/v8/finance/chart/" +
            encodeURIComponent(yahooSymbol) + "?interval=" + interval + "&range=" + range;
  var r = await safeFetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });

  if (!r.ok || !r.data || !r.data.chart || !r.data.chart.result) return null;
  var cr = r.data.chart.result[0];
  var ts = cr.timestamp;
  var q  = cr.indicators.quote[0];
  if (!ts || !q) return null;

  var candles = [];
  for (var i = ts.length - 1; i >= 0; i--) {
    if (q.close[i] == null) continue;
    candles.push({
      time:   ts[i],
      open:   q.open[i],
      high:   q.high[i],
      low:    q.low[i],
      close:  q.close[i],
      volume: q.volume ? q.volume[i] || 0 : 0
    });
  }
  return candles.length > 0 ? candles : null;
}

// ═══════════════════════════════════════════════════════════════════
// ANA FETCH FONKSİYONU
// CRYPTO: Binance dene → bulamazsa Bybit → bulamazsa KuCoin
// FOREX / BIST: Yahoo Finance
// ═══════════════════════════════════════════════════════════════════
async function fetchCandles(displaySymbol, marketType, tfKey, limit) {
  var cKey = ("C_" + marketType + "_" + displaySymbol + "_" + tfKey)
               .replace(/[^a-zA-Z0-9_]/g, "_");

  var cached = getCached(cKey);
  if (cached) return cached;

  var candles = null;

  if (marketType === "CRYPTO") {
    // 1. Binance dene
    try { candles = await getKlinesBinance(displaySymbol, tfKey, limit || 150); } catch (e) {}

    // 2. Binance'de yoksa Bybit dene
    if (!candles) {
      try { candles = await getKlinesBybit(displaySymbol, tfKey, limit || 150); } catch (e) {}
    }

    // 3. Bybit'te de yoksa KuCoin dene
    if (!candles) {
      try { candles = await getKlinesKucoin(displaySymbol, tfKey, limit || 150); } catch (e) {}
    }

  } else if (marketType === "BIST" || marketType === "FOREX") {
    var yt = CONFIG.YAHOO_TF_MAP[tfKey];
    if (yt) {
      candles = await getKlinesYahoo(
        toYahooSymbol(displaySymbol, marketType),
        yt.interval,
        yt.range
      );
    }
  }

  if (candles) setCache(cKey, candles, CACHE_TTL[tfKey] || 900);
  return candles;
}

// ═══════════════════════════════════════════════════════════════════
// API SAĞLIK KONTROLÜ
// ═══════════════════════════════════════════════════════════════════
async function checkAPIHealth() {
  return {
    binance: (await safeFetch(CONFIG.BINANCE_BASE + "/api/v3/ping")).ok,
    bybit:   (await safeFetch(CONFIG.BYBIT_BASE + "/v5/market/time")).ok,
    yahoo:   (await safeFetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d"
    )).ok
  };
}

module.exports = {
  safeFetch,
  fetchCandles,
  checkAPIHealth,
  getCacheStats,
  formatSymbol,      // Dışarıdan da kullanılabilir
  toBinanceSymbol    // Geriye dönük uyumluluk
};
