var CONFIG = require("./config");
var apis = require("./apis");
var fetchCandles = apis.fetchCandles;

// 1. STOCHASTIC HESAPLAMA
function calculateStochastic(candles, kPeriod, dPeriod, slowing) {
  if (!candles || candles.length < kPeriod + 5) return null;
  var rawK = [], len = candles.length;
  for (var i = 0; i <= len - kPeriod; i++) {
    var hh = -Infinity, ll = Infinity;
    for (var j = i; j < i + kPeriod; j++) {
      if (candles[j].high > hh) hh = candles[j].high;
      if (candles[j].low < ll) ll = candles[j].low;
    }
    rawK[i] = (hh - ll) === 0 ? 50 : ((candles[i].close - ll) / (hh - ll)) * 100;
  }
  var slowedK = [];
  for (var i = 0; i <= rawK.length - slowing; i++) {
    var s = 0;
    for (var j = i; j < i + slowing; j++) s += rawK[j];
    slowedK[i] = s / slowing;
  }
  var dVal = [];
  for (var i = 0; i <= slowedK.length - dPeriod; i++) {
    var s = 0;
    for (var j = i; j < i + dPeriod; j++) s += slowedK[j];
    dVal[i] = s / dPeriod;
  }
  return { k: slowedK, d: dVal };
}

// 2. ATR HESAPLAMA
function calculateATR(candles, period) {
  if (!candles || candles.length < period + 2) return 0;
  var trs = [];
  for (var i = 1; i <= period; i++) {
    var tr = Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i+1].close), Math.abs(candles[i].low - candles[i+1].close));
    trs.push(tr);
  }
  return trs.reduce((a,b)=>a+b,0) / trs.length;
}

// 3. PIVOT NOKTALARI HESAPLAMA
function calculatePivotPoints(candle) {
  if (!candle) return null;
  var h = candle.high;
  var l = candle.low;
  var c = candle.close;
  var pp = (h + l + c) / 3;
  var r1 = (2 * pp) - l;
  var s1 = (2 * pp) - h;
  var r2 = pp + (h - l);
  var s2 = pp - (h - l);
  var r3 = h + 2 * (pp - l);
  var s3 = l - 2 * (h - pp);
  return { pp: pp, r1: r1, s1: s1, r2: r2, s2: s2, r3: r3, s3: s3 };
}

function isNearLevel(price, level, percent) {
  var diff = Math.abs(price - level);
  var threshold = (level * percent) / 100;
  return diff <= threshold;
}

// ANA ANALİZ FONKSİYONU (ULTRA STRICT MODE)
async function analyzeSingleSymbol(symbol) {
  var marketType = "CRYPTO";
  if (CONFIG.BIST_SYMBOLS.includes(symbol)) marketType = "BIST";
  else if (CONFIG.FOREX_PAIRS.includes(symbol)) marketType = "FOREX";

  var tfs = ["H4", "D1", "W1"];
  var results = [];
  var lastCandlesH4 = null;

  // --- DÖNGÜ: Her zaman dilimi için tek tek kontrol ---
  for (var tf of tfs) {
    var candles = await fetchCandles(symbol, marketType, tf, 50);
    if (!candles) return null;
    
    if (tf === "H4") lastCandlesH4 = candles;

    // 1. STOCHASTIC KONTROLÜ
    var stoch = calculateStochastic(candles, CONFIG.STOCH_K_PERIOD, CONFIG.STOCH_D_PERIOD, CONFIG.STOCH_SLOWING);
    if (!stoch) return null;

    var k = stoch.k[0];
    var dir = k <= CONFIG.STOCH_OS_LEVEL ? 1 : (k >= CONFIG.STOCH_OB_LEVEL ? -1 : 0);
    
    if (dir === 0) return null; // Stoch nötr ise iptal

    // 2. PIVOT KONTROLÜ (Her zaman dilimi için ayrı ayrı!)
    var usePivot = CONFIG["PIVOT_USE_" + tf];
    
    if (usePivot) {
      var currentPrice = candles[0].close;
      var prevCandle = candles[1];
      var pivots = calculatePivotPoints(prevCandle);
      var proximity = CONFIG.SR_PROXIMITY_PERCENT || 0.5;
      var isNear = false;

      if (dir === 1) { 
        // LONG: Desteklere yakın mı?
        if (isNearLevel(currentPrice, pivots.s1, proximity) || isNearLevel(currentPrice, pivots.s2, proximity) || isNearLevel(currentPrice, pivots.s3, proximity) || isNearLevel(currentPrice, pivots.pp, proximity)) isNear = true;
      } else {
        // SHORT: Dirençlere yakın mı?
        if (isNearLevel(currentPrice, pivots.r1, proximity) || isNearLevel(currentPrice, pivots.r2, proximity) || isNearLevel(currentPrice, pivots.r3, proximity) || isNearLevel(currentPrice, pivots.pp, proximity)) isNear = true;
      }

      if (!isNear) return null; // Stoch uydu ama Pivot uymadı -> İPTAL
    }

    results.push({ tf: tf, dir: dir, k: k });
  }

  // --- SON KONTROL ---
  if (results.length < 3 || results[0].dir !== results[1].dir || results[1].dir !== results[2].dir) return null;

  var direction = results[0].dir;
  var entry = lastCandlesH4[0].close;
  var atr = calculateATR(lastCandlesH4, CONFIG.ATR_PERIOD);

  var sl = direction === 1 ? entry - (atr * CONFIG.ATR_MULTIPLIER_SL) : entry + (atr * CONFIG.ATR_MULTIPLIER_SL);
  var tp1 = direction === 1 ? entry + (atr * CONFIG.ATR_TP1_MULTIPLIER) : entry - (atr * CONFIG.ATR_TP1_MULTIPLIER);
  var tp2 = direction === 1 ? entry + (atr * CONFIG.ATR_TP2_MULTIPLIER) : entry - (atr * CONFIG.ATR_TP2_MULTIPLIER);

  return {
    symbol: symbol,
    marketType: marketType,
    direction: direction,
    signal: direction === 1 ? "LONG" : "SHORT",
    entryPrice: entry,
    sl: sl,
    tp1: tp1,
    tp2: tp2,
    atr: atr,
    stochKStr: Math.round(results[0].k)+"/"+Math.round(results[1].k)+"/"+Math.round(results[2].k),
    score: 100
  };
}

module.exports = { analyzeSingleSymbol };
