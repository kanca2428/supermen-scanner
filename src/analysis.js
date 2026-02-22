var CONFIG = require("./config");
var apis = require("./apis");
var fetchCandles = apis.fetchCandles;
function calculateStochastic(candles, kPeriod, dPeriod, slowing) { if (!candles || candles.length < kPeriod + 5) return null; var rawK = [], len = candles.length; for (var i = 0; i <= len - kPeriod; i++) { var hh = -Infinity, ll = Infinity; for (var j = i; j < i + kPeriod; j++) { if (candles[j].high > hh) hh = candles[j].high; if (candles[j].low < ll) ll = candles[j].low; } rawK[i] = (hh - ll) === 0 ? 50 : ((candles[i].close - ll) / (hh - ll)) * 100; } var slowedK = []; for (var i = 0; i <= rawK.length - slowing; i++) { var s = 0; for (var j = i; j < i + slowing; j++) s += rawK[j]; slowedK[i] = s / slowing; } var dVal = []; for (var i = 0; i <= slowedK.length - dPeriod; i++) { var s = 0; for (var j = i; j < i + dPeriod; j++) s += slowedK[j]; dVal[i] = s / dPeriod; } return { k: slowedK, d: dVal }; }
function calculatePivotPoints(candles) { if (!candles || candles.length < 2) return null; var prev = candles[1]; var pp = (prev.high + prev.low + prev.close) / 3; return { pp: pp, r1: (2 * pp) - prev.low, r2: pp + (prev.high - prev.low), r3: prev.high + 2 * (pp - prev.low), s1: (2 * pp) - prev.high, s2: pp - (prev.high - prev.low), s3: prev.low - 2 * (prev.high - pp) }; }
function calculateATR(candles, period) { if (!candles || candles.length < period + 2) return 0; var trs = []; for (var i = 1; i <= period; i++) { var tr = Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i+1].close), Math.abs(candles[i].low - candles[i+1].close)); trs.push(tr); } return trs.reduce((a,b)=>a+b,0) / trs.length; }
async function analyzeSingleSymbol(symbol) {
  var marketType = CONFIG.BIST_SYMBOLS.includes(symbol) ? "BIST" : "CRYPTO";
  var tfs = ["H4", "D1", "W1"];
  var results = [];
  var lastCandles = null;
  for (var tf of tfs) {
    var candles = await fetchCandles(symbol, marketType, tf, 50);
    if (!candles) return null;
    if (tf === "H4") lastCandles = candles;
    var stoch = calculateStochastic(candles, CONFIG.STOCH_K_PERIOD, CONFIG.STOCH_D_PERIOD, CONFIG.STOCH_SLOWING);
    if (!stoch) return null;
    var k = stoch.k[0];
    var dir = k <= CONFIG.STOCH_OS_LEVEL ? 1 : (k >= CONFIG.STOCH_OB_LEVEL ? -1 : 0);
    if (dir === 0) return null;
    results.push({ tf: tf, dir: dir, k: k });
  }
  if (results[0].dir !== results[1].dir || results[1].dir !== results[2].dir) return null;
  var direction = results[0].dir;
  var entry = lastCandles[0].close;
  var atr = calculateATR(lastCandles, CONFIG.ATR_PERIOD);
  var sl = direction === 1 ? entry - (atr * CONFIG.ATR_MULTIPLIER_SL) : entry + (atr * CONFIG.ATR_MULTIPLIER_SL);
  var tp1 = direction === 1 ? entry + (atr * CONFIG.ATR_TP1_MULTIPLIER) : entry - (atr * CONFIG.ATR_TP1_MULTIPLIER);
  var tp2 = direction === 1 ? entry + (atr * CONFIG.ATR_TP2_MULTIPLIER) : entry - (atr * CONFIG.ATR_TP2_MULTIPLIER);
  return { symbol: symbol, marketType: marketType, direction: direction, signal: direction === 1 ? "LONG" : "SHORT", entryPrice: entry, sl: sl, tp1: tp1, tp2: tp2, atr: atr, stochKStr: Math.round(results[0].k)+"/"+Math.round(results[1].k)+"/"+Math.round(results[2].k), score: 100 };
}
module.exports = { analyzeSingleSymbol };
