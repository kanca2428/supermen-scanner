const axios = require("axios");
const CONFIG = require("./config");

const memCache = {};
const CACHE_TTL = { M5: 300, M15: 900, H4: 7200, D1: 21600, W1: 21600 };

function getCached(key) {
  const entry = memCache[key];
  if (!entry) return null;
  if (Date.now() - entry.time > (entry.ttl || 900) * 1000) { delete memCache[key]; return null; }
  return entry.data;
}

function setCache(key, data, ttlSec) {
  memCache[key] = { data: data, time: Date.now(), ttl: ttlSec || 900 };
}

async function safeFetch(url, options) {
  if (!options) options = {};
  try {
    var resp = await axios({
      url: url,
      method: options.method || "get",
      headers: options.headers || {},
      data: options.data || undefined,
      timeout: 15000,
      validateStatus: function() { return true; }
    });
    return { code: resp.status, data: resp.data, ok: resp.status === 200 };
  } catch (e) {
    return { code: 0, data: null, ok: false };
  }
}

async function getKlinesBinance(symbol, tfKey, limit) {
  var interval = CONFIG.BINANCE_TF_MAP[tfKey];
  if (!interval) return null;
  var url = CONFIG.BINANCE_BASE + "/api/v3/klines?symbol=" + symbol + "&interval=" + interval + "&limit=" + limit;
  var r = await safeFetch(url);
  if (!r.ok || !Array.isArray(r.data)) return null;
  var candles = [];
  for (var i = r.data.length - 1; i >= 0; i--) {
    var d = r.data[i];
    var o = parseFloat(d[1]), h = parseFloat(d[2]), l = parseFloat(d[3]), c = parseFloat(d[4]), v = parseFloat(d[5]);
    if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) continue;
    candles.push({ time: Math.floor(parseInt(d[0]) / 1000), open: o, high: h, low: l, close: c, volume: v || 0 });
  }
  return candles.length > 0 ? candles : null;
}

async function getBinanceTickers() {
  var r = await safeFetch(CONFIG.BINANCE_BASE + "/api/v3/ticker/24hr");
  if (!r.ok || !Array.isArray(r.data)) return {};
  var map = {};
  for (var i = 0; i < r.data.length; i++) {
    var t = r.data[i];
    if (!t.symbol || t.symbol.indexOf("USDT") < 0) continue;
    var lp = parseFloat(t.lastPrice) || 0;
    if (lp <= 0) continue;
    map[t.symbol] = { lastPrice: lp, vol24h: parseFloat(t.quoteVolume) || 0, changeRate: parseFloat(t.priceChangePercent) / 100 || 0 };
  }
  return map;
}

async function getKlinesBybit(symbol, tfKey, limit) {
  var interval = CONFIG.BYBIT_TF_MAP[tfKey];
  if (!interval) return null;
  var url = CONFIG.BYBIT_BASE + "/v5/market/kline?category=spot&symbol=" + symbol + "&interval=" + interval + "&limit=" + limit;
  var r = await safeFetch(url);
  if (!r.ok || !r.data || !r.data.result || !r.data.result.list) return null;
  var candles = [];
  var list = r.data.result.list;
  for (var i = 0; i < list.length; i++) {
    var d = list[i];
    var o = parseFloat(d[1]), h = parseFloat(d[2]), l = parseFloat(d[3]), c = parseFloat(d[4]), v = parseFloat(d[5]);
    if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) continue;
    candles.push({ time: Math.floor(parseInt(d[0]) / 1000), open: o, high: h, low: l, close: c, volume: v || 0 });
  }
  return candles.length > 0 ? candles : null;
}

async function getBybitTickers() {
  var r = await safeFetch(CONFIG.BYBIT_BASE + "/v5/market/tickers?category=spot");
  if (!r.ok || !r.data || !r.data.result || !r.data.result.list) return {};
  var map = {};
  var list = r.data.result.list;
  for (var i = 0; i < list.length; i++) {
    var t = list[i];
    if (!t.symbol || t.symbol.indexOf("USDT") < 0) continue;
    var lp = parseFloat(t.lastPrice) || 0;
    if (lp <= 0) continue;
    map[t.symbol] = { lastPrice: lp, vol24h: parseFloat(t.turnover24h) || 0, changeRate: parseFloat(t.price24hPcnt) || 0 };
  }
  return map;
}

async function getKlinesKuCoin(symbol, tfKey, limit) {
  var tf = CONFIG.KUCOIN_TF_MAP[tfKey];
  if (!tf) return null;
  var now = Math.floor(Date.now() / 1000);
  var url = CONFIG.KUCOIN_BASE + "/api/v1/market/candles?symbol=" + symbol + "&type=" + tf.code + "&startAt=" + (now - limit * tf.minutes * 60) + "&endAt=" + now;
  var r = await safeFetch(url, { headers: { "Content-Type": "application/json" } });
  if (!r.ok || !r.data || r.data.code !== "200000" || !Array.isArray(r.data.data)) return null;
  var candles = [];
  for (var i = 0; i < r.data.data.length; i++) {
    var d = r.data.data[i];
    if (!d || d.length < 6) continue;
    var o = parseFloat(d[1]), c = parseFloat(d[2]), h = parseFloat(d[3]), l = parseFloat(d[4]), v = parseFloat(d[5]);
    if (isNaN(o) || isNaN(c) || isNaN(h) || isNaN(l)) continue;
    candles.push({ time: parseInt(d[0]), open: o, close: c, high: h, low: l, volume: v || 0 });
  }
  return candles.length > 0 ? candles : null;
}

async function getKuCoinTickers() {
  var r = await safeFetch(CONFIG.KUCOIN_BASE + "/api/v1/market/allTickers", { headers: { "Content-Type": "application/json" } });
  if (!r.ok || !r.data || r.data.code !== "200000" || !r.data.data || !r.data.data.ticker) return {};
  var map = {};
  for (var i = 0; i < r.data.data.ticker.length; i++) {
    var t = r.data.data.ticker[i];
    if (!t.symbol || t.symbol.indexOf("-USDT") < 0) continue;
    var lp = parseFloat(t.last) || 0;
    if (lp <= 0) continue;
    map[t.symbol.replace("-USDT", "USDT")] = { lastPrice: lp, vol24h: parseFloat(t.volValue) || 0, changeRate: parseFloat(t.changeRate) || 0 };
  }
  return map;
}

async function getKlinesYahoo(yahooSymbol, interval, range) {
  var url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(yahooSymbol) + "?interval=" + interval + "&range=" + range;
  var r = await safeFetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
  if (!r.ok || !r.data || !r.data.chart || !r.data.chart.result || r.data.chart.result.length === 0) return null;
  var cr = r.data.chart.result[0];
  var ts = cr.timestamp;
  var q = cr.indicators && cr.indicators.quote ? cr.indicators.quote[0] : null;
  if (!ts || !q || ts.length === 0) return null;
  var candles = [];
  for (var i = ts.length - 1; i >= 0; i--) {
    var o = q.open ? q.open[i] : null, h = q.high ? q.high[i] : null, l = q.low ? q.low[i] : null, c = q.close ? q.close[i] : null;
    if (o == null || h == null || l == null || c == null || isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) continue;
    candles.push({ time: ts[i], open: o, high: h, low: l, close: c, volume: (q.volume ? q.volume[i] : 0) || 0 });
  }
  return candles.length > 0 ? candles : null;
}

function toBinanceSymbol(pair) { return pair.replace("/USD", "") + "USDT"; }
function toKuCoinSymbol(pair) { return pair.replace("/USD", "") + "-USDT"; }

async function getCryptoTickers() {
  var cacheKey = "ALL_TICKERS";
  var cached = getCached(cacheKey);
  if (cached && Object.keys(cached).length > 10) return cached;
  var tickers = {}, source = "?";
  try { tickers = await getBinanceTickers(); source = "Binance"; } catch (e) {}
  if (Object.keys(tickers).length < 10) {
    try { tickers = await getBybitTickers(); source = "Bybit"; } catch (e) {}
  }
  if (Object.keys(tickers).length < 10) {
    try { tickers = await getKuCoinTickers(); source = "KuCoin"; } catch (e) {}
  }
  console.log("  Ticker: " + source + " -> " + Object.keys(tickers).length + " sembol");
  if (Object.keys(tickers).length > 10) setCache(cacheKey, tickers, 900);
  return tickers;
}

async function fetchCandles(displaySymbol, marketType, tfKey, limit) {
  var cKey = ("C_" + marketType + "_" + displaySymbol + "_" + tfKey).replace(/[^a-zA-Z0-9_]/g, "_");
  var cached = getCached(cKey);
  if (cached && cached.length >= 5) return cached;
  var candles = null;
  if (marketType === "crypto") {
    var bSym = toBinanceSymbol(displaySymbol);
    try { candles = await getKlinesBinance(bSym, tfKey, limit); } catch (e) {}
    if (!candles || candles.length < 5) {
      try { candles = await getKlinesBybit(bSym, tfKey, limit); } catch (e) {}
    }
    if (!candles || candles.length < 5) {
      try { candles = await getKlinesKuCoin(toKuCoinSymbol(displaySymbol), tfKey, limit); } catch (e) {}
    }
  } else if (marketType === "forex") {
    var yt = CONFIG.YAHOO_TF_MAP[tfKey];
    if (yt) try { candles = await getKlinesYahoo(displaySymbol.replace("/", "") + "=X", yt.interval, yt.range); } catch (e) {}
  } else if (marketType === "bist") {
    var yt = CONFIG.YAHOO_TF_MAP[tfKey];
    if (yt) try { candles = await getKlinesYahoo(displaySymbol + ".IS", yt.interval, yt.range); } catch (e) {}
  }
  if (candles && candles.length > 0) setCache(cKey, candles, CACHE_TTL[tfKey] || 900);
  return candles;
}

function getPriceFromTickers(displaySymbol, tickers) {
  return tickers[toBinanceSymbol(displaySymbol)] || null;
}

async function getYahooQuote(yahooSymbol) {
  var cKey = "Q_" + yahooSymbol.replace(/[^a-zA-Z0-9]/g, "_");
  var cached = getCached(cKey);
  if (cached && cached.lastPrice > 0) return cached;
  var c = await getKlinesYahoo(yahooSymbol, "1d", "5d");
  if (!c || c.length === 0) return null;
  var pc = c.length > 1 ? c[1].close : c[0].close;
  var q = { lastPrice: c[0].close, vol24h: c[0].volume || 0, changeRate: pc > 0 ? (c[0].close - pc) / pc : 0 };
  if (q.lastPrice > 0) setCache(cKey, q, 1800);
  return q;
}

module.exports = { getCryptoTickers: getCryptoTickers, fetchCandles: fetchCandles, getPriceFromTickers: getPriceFromTickers, getYahooQuote: getYahooQuote, safeFetch: safeFetch };
