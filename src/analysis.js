var CONFIG    = require("./config");
var apis      = require("./apis");
var fetchCandles    = apis.fetchCandles;
var getCurrentPrice = apis.getCurrentPrice;

// ═══════════════════════════════════════════════════════════════════
// 1. STOCHASTIC HESAPLAMA
// candles: apis.js [en yeni → en eski] getiriyor → burada ters çeviriyoruz
// ═══════════════════════════════════════════════════════════════════
function calculateStochastic(candlesRaw, kPeriod, dPeriod, slowing) {
  if (!candlesRaw || candlesRaw.length < kPeriod + slowing + dPeriod + 3) return null;

  var candles = candlesRaw.slice().reverse(); // [en eski → en yeni]
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

  // %D
  var dVal = [];
  for (var i = dPeriod - 1; i < slowedK.length; i++) {
    var s = 0;
    for (var j = i - dPeriod + 1; j <= i; j++) s += slowedK[j];
    dVal.push(s / dPeriod);
  }

  if (slowedK.length < 2 || dVal.length < 1) return null;

  return {
    k:    slowedK[slowedK.length - 1], // ✅ DÜZELTME: En yeni kapanmış mum
    d:    dVal[dVal.length - 1],
    kArr: slowedK,
    dArr: dVal
  };
}

// ═══════════════════════════════════════════════════════════════════
// 2. ATR HESAPLAMA
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
  if (direction === 1)  return price <= pivots.s1 + tol;
  if (direction === -1) return price >= pivots.r1 - tol;
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// 5. TEK BİR TF ANALİZİ
// Stochastic + Pivot (pivot opsiyonel) kontrolü yapar
// Döner: 1 (BUY), -1 (SELL), 0 (nötr/geçersiz)
// ═══════════════════════════════════════════════════════════════════
function analyzeTF(candles, tfKey, checkPivot) {
  var stoch = calculateStochastic(
    candles,
    CONFIG.STOCH_K_PERIOD,
    CONFIG.STOCH_D_PERIOD,
    CONFIG.STOCH_SLOWING
  );
  if (!stoch) return { dir: 0, k: 0 };

  var k   = stoch.k;
  var dir = k <= CONFIG.STOCH_OS_LEVEL ? 1 : (k >= CONFIG.STOCH_OB_LEVEL ? -1 : 0);
  if (dir === 0) return { dir: 0, k: k };

  // Pivot kontrolü (M5/M15 için pivot yok, büyük TF'ler için var)
  if (checkPivot && CONFIG["PIVOT_USE_" + tfKey]) {
    var currentPrice = candles[0].close;
    var prevCandle   = candles[1];
    var pivots       = calculatePivotPoints(prevCandle);
    var proximity    = CONFIG.SR_PROXIMITY_PERCENT || 1.0;
    if (!checkPivotZone(currentPrice, pivots, dir, proximity)) return { dir: 0, k: k };
  }

  return { dir: dir, k: k };
}

// ═══════════════════════════════════════════════════════════════════
// ANA ANALİZ FONKSİYONU
//
// SİSTEM MANTIĞI:
//   ADIM 1 — Büyük TF AND: H4 + D1 + W1 hepsi aynı yön (Stoch + Pivot)
//   ADIM 2 — Küçük TF ONAY: M5 + M15 de aynı yönde (sadece Stoch)
//            Eğer M5/M15 ters dönüyorsa (pullback) → sinyal iptal
//
// SONUÇ: 5 TF'nin hepsi aynı yönde ise sinyal üret, yoksa bekle
// ═══════════════════════════════════════════════════════════════════
async function analyzeSingleSymbol(symbol) {

  // Market tipini belirle
  var marketType = "CRYPTO";
  if (CONFIG.BIST_SYMBOLS.includes(symbol))    marketType = "BIST";
  else if (CONFIG.FOREX_PAIRS.includes(symbol)) marketType = "FOREX";

  // ── ADIM 1: Büyük TF'ler — H4 + D1 + W1 (Stoch + Pivot AND) ──
  var bigTFs   = ["H4", "D1", "W1"];
  var bigResults = [];
  var lastCandlesH4 = null;

  for (var t = 0; t < bigTFs.length; t++) {
    var tf    = bigTFs[t];
    var limit = tf === "W1" ? 60 : tf === "D1" ? 80 : 120;

    var candles = await fetchCandles(symbol, marketType, tf, limit);
    if (!candles || candles.length < 35) return null;

    if (tf === "H4") lastCandlesH4 = candles;

    var res = analyzeTF(candles, tf, true); // Pivot kontrolü açık
    if (res.dir === 0) return null; // Bu büyük TF nötr → iptal

    bigResults.push({ tf: tf, dir: res.dir, k: res.k });
  }

  // Büyük TF'lerin hepsi aynı yönde mi?
  var mainDir = bigResults[0].dir;
  for (var i = 1; i < bigResults.length; i++) {
    if (bigResults[i].dir !== mainDir) return null;
  }

  // ── ADIM 2: Küçük TF onayı — M5 + M15 (sadece Stoch, Pivot yok) ──
  // Config'de M5/M15 aktifse kontrol et
  var smallResults = [];

  if (CONFIG.STOCH_USE_M5) {
    var candlesM5 = await fetchCandles(symbol, marketType, "M5", 60);
    if (!candlesM5 || candlesM5.length < 30) return null; // Veri yoksa iptal

    var resM5 = analyzeTF(candlesM5, "M5", false); // Pivot kontrolü kapalı
    if (resM5.dir === 0) return null;    // M5 nötr → henüz uygun değil
    if (resM5.dir !== mainDir) return null; // M5 ters → pullback var, giriş yapma!

    smallResults.push({ tf: "M5", dir: resM5.dir, k: resM5.k });
  }

  if (CONFIG.STOCH_USE_M15) {
    var candlesM15 = await fetchCandles(symbol, marketType, "M15", 60);
    if (!candlesM15 || candlesM15.length < 30) return null;

    var resM15 = analyzeTF(candlesM15, "M15", false);
    if (resM15.dir === 0) return null;    // M15 nötr → bekle
    if (resM15.dir !== mainDir) return null; // M15 ters → pullback, iptal!

    smallResults.push({ tf: "M15", dir: resM15.dir, k: resM15.k });
  }

  // ── Tüm TF'ler onayladı → Sinyal üret ──

  // Gerçek zamanlı entry fiyatı
  var entry = await getCurrentPrice(symbol, marketType);
  if (!entry || entry <= 0) entry = lastCandlesH4[0].close; // Fallback

  // ATR
  var atr = calculateATR(lastCandlesH4, CONFIG.ATR_PERIOD);
  if (!atr || atr <= 0) return null;

  // SL / TP
  var sl  = mainDir === 1 ? entry - (atr * CONFIG.ATR_MULTIPLIER_SL)  : entry + (atr * CONFIG.ATR_MULTIPLIER_SL);
  var tp1 = mainDir === 1 ? entry + (atr * CONFIG.ATR_TP1_MULTIPLIER) : entry - (atr * CONFIG.ATR_TP1_MULTIPLIER);
  var tp2 = mainDir === 1 ? entry + (atr * CONFIG.ATR_TP2_MULTIPLIER) : entry - (atr * CONFIG.ATR_TP2_MULTIPLIER);

  // Stoch string — büyük TF'ler + küçük TF'ler
  var allResults = bigResults.concat(smallResults);
  var stochKStr  = allResults.map(function(r) { return r.tf + ":" + Math.round(r.k); }).join(" ");

  return {
    symbol:     symbol,
    marketType: marketType,
    direction:  mainDir,
    signal:     mainDir === 1 ? "LONG" : "SHORT",
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
