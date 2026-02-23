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
  if (!pair.includes("/")) return pair;
  var parts = pair.split("/");
  var base  = parts[0];
  var quote = parts[1];
  var q     = (quote === "USD") ? "USDT" : quote;
  if (exchange === "kucoin") return base + "-" + q;
  return base + q;
}

function toBinanceSymbol(pair) {
  return formatSymbol(pair, "binance");
}

function toYahooSymbol(displaySymbol, marketType) {
  if (marketType === "BIST")  return displaySymbol.includes(".IS") ? displaySymbol : displaySymbol + ".IS";
  if (marketType === "FOREX") return displaySymbol.includes("=X")  ? displaySymbol : displaySymbol + "=X";
  return displaySymbol;
}

// ═══════════════════════════════════════════════════════════════════
// GERÇEK ZAMANLI FİYAT — Entry fiyatı için kullanılır
// Binance → Bybit → KuCoin → CryptoCompare sırasıyla dener
// ═══════════════════════════════════════════════════════════════════
async function getCurrentPrice(pair, marketType) {
  if (marketType === "CRYPTO") {
    // 1. Binance
    try {
      var sym = formatSymbol(pair, "binance");
      var r = await safeFetch(CONFIG.BINANCE_BASE + "/api/v3/ticker/price?symbol=" + sym);
      if (r.ok && r.data && r.data.price) return parseFloat(r.data.price);
    } catch (e) {}

    // 2. Bybit
    try {
      var sym2 = formatSymbol(pair, "bybit");
      var r2 = await safeFetch(CONFIG.BYBIT_BASE + "/v5/market/tickers?category=spot&symbol=" + sym2);
      if (r2.ok && r2.data && r2.data.result && r2.data.result.list && r2.data.result.list[0])
        return parseFloat(r2.data.result.list[0].lastPrice);
    } catch (e) {}

    // 3. KuCoin
    try {
      var sym3 = formatSymbol(pair, "kucoin");
      var r3 = await safeFetch(CONFIG.KUCOIN_BASE + "/api/v1/market/orderbook/level1?symbol=" + sym3);
      if (r3.ok && r3.data && r3.data.data && r3.data.data.price)
        return parseFloat(r3.data.data.price);
    } catch (e) {}

    // 4. CryptoCompare
    try {
      var base = pair.includes("/") ? pair.split("/")[0] : pair.replace(/(USDT|USDC|USD)$/, "");
      var apiKey = CONFIG.CRYPTOCOMPARE_API_KEY || "";
      var r4 = await safeFetch(
        "https://min-api.cryptocompare.com/data/price?fsym=" + base + "&tsyms=USDT" +
        (apiKey ? "&api_key=" + apiKey : "")
      );
      if (r4.ok && r4.data && r4.data.USDT) return parseFloat(r4.data.USDT);
    } catch (e) {}
  }

  // FOREX / BIST için Yahoo'dan son kapanış fiyatı
  if (marketType === "FOREX" || marketType === "BIST") {
    try {
      var yahooSym = toYahooSymbol(pair, marketType);
      var r5 = await safeFetch(
        "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(yahooSym) +
        "?interval=1m&range=1d",
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (r5.ok && r5.data && r5.data.chart && r5.data.chart.result) {
        var q = r5.data.chart.result[0].indicators.quote[0];
        var closes = q.close.filter(function(v) { return v != null; });
        if (closes.length > 0) return closes[closes.length - 1];
      }
    } catch (e) {}
  }

  return null; // Tüm kaynaklar başarısız
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
  var symbol = formatSymbol(pair, "kucoin");
  var tfCfg  = CONFIG.KUCOIN_TF_MAP ? CONFIG.KUCOIN_TF_MAP[tfKey] : null;
  if (!tfCfg) return null;

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
// CRYPTOCOMPARE KLINE — 4. Fallback
// ═══════════════════════════════════════════════════════════════════
async function getKlinesCryptoCompare(pair, tfKey, limit) {
  var base;
  if (pair.includes("/")) {
    base = pair.split("/")[0];
  } else {
    base = pair.replace(/(USDT|USDC|BUSD|USD|BTC|ETH)$/, "") || pair.substring(0, pair.length - 4);
  }
  if (!base || base.length === 0) return null;

  var endpoint  = "";
  var aggregate = 1;

  if (tfKey === "H4") {
    endpoint = "histohour"; aggregate = 4; limit = limit || 200;
  } else if (tfKey === "D1") {
    endpoint = "histoday";  aggregate = 1; limit = limit || 100;
  } else if (tfKey === "W1") {
    endpoint = "histoday";  aggregate = 7; limit = limit || 60;
  } else {
    return null;
  }

  var apiKey = CONFIG.CRYPTOCOMPARE_API_KEY || "";
  var url = "https://min-api.cryptocompare.com/data/v2/" + endpoint +
            "?fsym=" + base + "&tsym=USDT&limit=" + limit + "&aggregate=" + aggregate +
            (apiKey ? "&api_key=" + apiKey : "");

  var r = await safeFetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok || !r.data || r.data.Response === "Error") return null;

  var list = r.data.Data && r.data.Data.Data;
  if (!Array.isArray(list) || list.length === 0) return null;

  list = list.filter(function(d) { return d.close > 0; });
  if (list.length < 10) return null;

  var candles = [];
  for (var i = list.length - 1; i >= 0; i--) {
    var d = list[i];
    candles.push({
      time:   d.time,
      open:   d.open,
      high:   d.high,
      low:    d.low,
      close:  d.close,
      volume: d.volumefrom || 0
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
// CRYPTO: Binance → Bybit → KuCoin → CryptoCompare
// FOREX / BIST: Yahoo Finance
// ═══════════════════════════════════════════════════════════════════
async function fetchCandles(displaySymbol, marketType, tfKey, limit) {
  var cKey = ("C_" + marketType + "_" + displaySymbol + "_" + tfKey)
               .replace(/[^a-zA-Z0-9_]/g, "_");

  var cached = getCached(cKey);
  if (cached) return cached;

  var candles = null;

  if (marketType === "CRYPTO") {
    try { candles = await getKlinesBinance(displaySymbol, tfKey, limit || 150); } catch (e) {}
    if (!candles) {
      try { candles = await getKlinesBybit(displaySymbol, tfKey, limit || 150); } catch (e) {}
    }
    if (!candles) {
      try { candles = await getKlinesKucoin(displaySymbol, tfKey, limit || 150); } catch (e) {}
    }
    if (!candles) {
      try { candles = await getKlinesCryptoCompare(displaySymbol, tfKey, limit || 150); } catch (e) {}
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
  getCurrentPrice,
  checkAPIHealth,
  getCacheStats,
  formatSymbol,
  toBinanceSymbol
};
