var axios = require("axios");
var CONFIG = require("./config");
var memCache = {};
var CACHE_TTL = { M5: 300, M15: 900, H4: 7200, D1: 21600, W1: 43200 };
function getCached(key) { var entry = memCache[key]; if (!entry) return null; if (Date.now() - entry.time > (entry.ttl || 900) * 1000) { delete memCache[key]; return null; } return entry.data; }
function setCache(key, data, ttlSec) { memCache[key] = { data: data, time: Date.now(), ttl: ttlSec || 900 }; }
function getCacheStats() { return { total: Object.keys(memCache).length }; }
async function safeFetch(url, options) { if (!options) options = {}; try { var resp = await axios({ url: url, method: options.method || "get", headers: options.headers || {}, data: options.data || undefined, timeout: options.timeout || 15000, validateStatus: function() { return true; } }); return { code: resp.status, data: resp.data, ok: resp.status === 200 }; } catch (e) { return { code: 0, data: null, ok: false, error: e.message }; } }
async function getKlinesBinance(symbol, tfKey, limit) { var interval = CONFIG.BINANCE_TF_MAP[tfKey]; if (!interval) return null; var url = CONFIG.BINANCE_BASE + "/api/v3/klines?symbol=" + symbol + "&interval=" + interval + "&limit=" + limit; var r = await safeFetch(url); if (!r.ok || !Array.isArray(r.data)) return null; var candles = []; for (var i = r.data.length - 1; i >= 0; i--) { var d = r.data[i]; candles.push({ time: Math.floor(parseInt(d[0]) / 1000), open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4]), volume: parseFloat(d[5]) }); } return candles.length > 0 ? candles : null; }
async function getKlinesYahoo(yahooSymbol, interval, range) { var url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(yahooSymbol) + "?interval=" + interval + "&range=" + range; var r = await safeFetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }); if (!r.ok || !r.data || !r.data.chart || !r.data.chart.result) return null; var cr = r.data.chart.result[0]; var ts = cr.timestamp; var q = cr.indicators.quote[0]; if (!ts || !q) return null; var candles = []; for (var i = ts.length - 1; i >= 0; i--) { if (q.close[i] == null) continue; candles.push({ time: ts[i], open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i], volume: q.volume[i] || 0 }); } return candles.length > 0 ? candles : null; }
function toBinanceSymbol(pair) { return pair.replace("/USD", "").replace("/USDT", "") + "USDT"; }

// --- GÜNCELLENEN FONKSİYON ---
function toYahooSymbol(displaySymbol, marketType) {
  if (marketType === "BIST") return displaySymbol.includes(".IS") ? displaySymbol : displaySymbol + ".IS";
  if (marketType === "FOREX") return displaySymbol + "=X"; // Forex için "=X" ekle
  return displaySymbol;
}

async function fetchCandles(displaySymbol, marketType, tfKey, limit) {
  var cKey = ("C_" + marketType + "_" + displaySymbol + "_" + tfKey).replace(/[^a-zA-Z0-9_]/g, "_");
  var cached = getCached(cKey);
  if (cached) return cached;
  var candles = null;
  if (marketType === "CRYPTO") {
    try { candles = await getKlinesBinance(toBinanceSymbol(displaySymbol), tfKey, limit); } catch (e) {}
  } else if (marketType === "BIST" || marketType === "FOREX") { // FOREX'i buraya ekle
    var yt = CONFIG.YAHOO_TF_MAP[tfKey];
    if (yt) candles = await getKlinesYahoo(toYahooSymbol(displaySymbol, marketType), yt.interval, yt.range);
  }
  if (candles) setCache(cKey, candles, CACHE_TTL[tfKey]);
  return candles;
}

async function checkAPIHealth() { return { binance: (await safeFetch(CONFIG.BINANCE_BASE + "/api/v3/ping")).ok, yahoo: (await safeFetch("https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d")).ok }; }
module.exports = { safeFetch, fetchCandles, checkAPIHealth, getCacheStats };
