var CONFIG   = require("./config");
var apis     = require("./apis");
var fetchCandles   = apis.fetchCandles;
var getCurrentPrice = apis.getCurrentPrice;

// ═══════════════════════════════════════════════════════════════════
// 1. STOCHASTIC HESAPLAMA
// candles: apis.js [en yeni → en eski] getiriyor → burada ters çeviriyoruz
// ═══════════════════════════════════════════════════════════════════
function calculateStochastic(candlesRaw, kPeriod, dPeriod, slowing) {
  if (!candlesRaw || candlesRaw.length < kPeriod + slowing + dPeriod + 3) return null;

  // [en yeni → en eski] → [en eski → en yeni]
  var candles = candlesRaw.slice().reverse();
  var len = candles.length;

  // Ham %K
  var rawK = [];
  for (var i = kPeriod - 1; i < len; i++) {
    var hh = -Infinity, ll = Infinity;
    for (var j = i - kPeriod + 1; j <= i; j++) {
      if (candles[j].high > hh) hh = candles[j].high;
      if (candles[j].low  < ll) ll = candles[j].low;
    }
    rawK.push((hh - ll) === 0 ? 50 : ((candles[i].close - ll) / (hh - ll)) * 100);
  }

  // Slowing SMA
  var slowedK = [];
  for (var i = slowing - 1; i < rawK.length; i++) {
    var s = 0;
    for (var j = i - slowing + 1; j <= i; j++) s += rawK[j];
    slowedK.push(s / slowing);
  }

  // %D (SMA of slowedK)
  var dVal = [];
  for (var i = dPeriod - 1; i < slowedK.length; i++) {
    var s = 0;
    for (var j = i - dPeriod + 1; j <= i; j++) s += slowedK[j];
    dVal.push(s / dPeriod);
  }

  if (slowedK.length < 2 || dVal.length < 1) return null;

  return {
    k:    slowedK[slowedK.length - 2], // Kapanmış son mumun değeri
    d:    dVal[dVal.length - 1],
    kArr: slowedK,
    dArr: dVal
  };
}

// ═══════════════════════════════════════════════════════════════════
// 2. ATR HESAPLAMA
// candles: [en yeni → en eski] formatında
// ═══════════════════════════════════════════════════════════════════
function calculateATR(candlesRaw, period) {
  if (!candlesRaw || candlesRaw.length < period + 2) return 0;

  var candles = candlesRaw.slice(0, period + 1);
  var trs = [];
  for (var i = 0; i < period; i++) {
    var curr = candles[i];
    var prev = candles[i + 1];
    var tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low  - prev.close)
    );
    trs.push(tr);
  }
  return trs.reduce(function(a, b) { return a + b; }, 0) / trs.length;
}

// ═══════════════════════════════════════════════════════════════════
// 3. PIVOT HESAPLAMA (Classic)
// Bir önceki mumun H/L/C'sinden hesaplanır
// ═══════════════════════════════════════════════════════════════════
function calculatePivotPoints(candle) {
  if (!candle) return null;
  var h  = candle.high;
  var l  = candle.low;
  var c  = candle.close;
  var pp = (h + l + c) / 3;
  return {
    pp: pp,
    r1: 2 * pp - l,
    s1: 2 * pp - h,
    r2: pp + (h - l),
    s2: pp - (h - l),
    r3: h + 2 * (pp - l),
    s3: l - 2 * (h - pp)
  };
}

// ═══════════════════════════════════════════════════════════════════
// 4. PIVOT ZONE KONTROL
// SELL: fiyat >= R1 → resistance zone
// BUY:  fiyat <= S1 → support zone
// ═══════════════════════════════════════════════════════════════════
function checkPivotZone(price, pivots, direction, proximityPct) {
  if (!pivots) return false;
  var tol = price * (proximityPct / 100);
  if (direction === 1)  return price <= pivots.s1 + tol;  // BUY: S1 veya altı
  if (direction === -1) return price >= pivots.r1 - tol;  // SELL: R1 veya üstü
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// ANA ANALİZ FONKSİYONU
// ═══════════════════════════════════════════════════════════════════
async function analyzeSingleSymbol(symbol) {

  // Market tipini belirle
  var marketType = "CRYPTO";
  if (CONFIG.BIST_SYMBOLS.includes(symbol))   marketType = "BIST";
  else if (CONFIG.FOREX_PAIRS.includes(symbol)) marketType = "FOREX";

  var tfs     = ["H4", "D1", "W1"];
  var results = [];
  var lastCandlesH4 = null;

  for (var t = 0; t < tfs.length; t++) {
    var tf = tfs[t];

    // Her TF için yeterli mum çek
    var limit = tf === "W1" ? 60 : tf === "D1" ? 80 : 120;

    var candles = await fetchCandles(symbol, marketType, tf, limit);
    if (!candles || candles.length < 35) return null;

    if (tf === "H4") lastCandlesH4 = candles;

    // ── Stochastic kontrolü ──
    var stoch = calculateStochastic(
      candles,
      CONFIG.STOCH_K_PERIOD,
      CONFIG.STOCH_D_PERIOD,
      CONFIG.STOCH_SLOWING
    );
    if (!stoch) return null;

    var k   = stoch.k;
    var dir = k <= CONFIG.STOCH_OS_LEVEL ? 1 : (k >= CONFIG.STOCH_OB_LEVEL ? -1 : 0);
    if (dir === 0) return null; // Bu TF'de stoch nötr → AND bozuldu, iptal

    // ── Pivot Zone kontrolü ──
    var usePivot = CONFIG["PIVOT_USE_" + tf];
    if (usePivot) {
      var currentPrice = candles[0].close;
      var prevCandle   = candles[1]; // Kapanmış son mum
      var pivots       = calculatePivotPoints(prevCandle);
      var proximity    = CONFIG.SR_PROXIMITY_PERCENT || 1.0;

      if (!checkPivotZone(currentPrice, pivots, dir, proximity)) return null;
    }

    results.push({ tf: tf, dir: dir, k: k });
  }

  // AND kontrolü: H4 + D1 + W1 hepsi aynı yönde olmalı
  if (results.length < 3) return null;
  if (results[0].dir !== results[1].dir || results[1].dir !== results[2].dir) return null;

  var direction = results[0].dir;

  // ── GERÇEK ZAMANLI FİYAT (entry için) ──
  // Binance/Bybit/KuCoin/CryptoCompare'den anlık fiyat çek
  // Başarısız olursa H4 son kapanışını kullan (fallback)
  var entry = await getCurrentPrice(symbol, marketType);
  if (!entry || entry <= 0) {
    entry = lastCandlesH4[0].close; // Fallback
  }

  // ── ATR hesapla ──
  var atr = calculateATR(lastCandlesH4, CONFIG.ATR_PERIOD);
  if (!atr || atr <= 0) return null;

  // ── SL / TP hesapla ──
  var sl  = direction === 1 ? entry - (atr * CONFIG.ATR_MULTIPLIER_SL)  : entry + (atr * CONFIG.ATR_MULTIPLIER_SL);
  var tp1 = direction === 1 ? entry + (atr * CONFIG.ATR_TP1_MULTIPLIER) : entry - (atr * CONFIG.ATR_TP1_MULTIPLIER);
  var tp2 = direction === 1 ? entry + (atr * CONFIG.ATR_TP2_MULTIPLIER) : entry - (atr * CONFIG.ATR_TP2_MULTIPLIER);

  var stochKStr = results.map(function(r) { return Math.round(r.k); }).join("/");

  return {
    symbol:     symbol,
    marketType: marketType,
    direction:  direction,
    signal:     direction === 1 ? "LONG" : "SHORT",
    entryPrice: entry,
    sl:         sl,
    tp1:        tp1,
    tp2:        tp2,
    atr:        atr,
    stochKStr:  stochKStr,
    score:      100
  };
}

module.exports = { analyzeSingleSymbol };
