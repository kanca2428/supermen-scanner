var CONFIG          = require("./config");
var apis            = require("./apis");
var fetchCandles    = apis.fetchCandles;
var getCurrentPrice = apis.getCurrentPrice;

// ═══════════════════════════════════════════════════════════════════
// 1. STOCHASTIC HESAPLAMA
// candlesRaw: [en yeni → en eski] gelir → burada ters çeviriyoruz
// Dönüş: k, d (şimdiki bar) + k1, d1 (önceki bar) — Hook için gerekli
// ═══════════════════════════════════════════════════════════════════
function calculateStochastic(candlesRaw, kPeriod, dPeriod, slowing) {
  if (!candlesRaw || candlesRaw.length < kPeriod + slowing + dPeriod + 5) return null;

  var candles = candlesRaw.slice().reverse(); // [en eski → en yeni]
  var len     = candles.length;

  // ── Ham %K ──
  var rawK = [];
  for (var i = kPeriod - 1; i < len; i++) {
    var hh = -Infinity, ll = Infinity;
    for (var j = i - kPeriod + 1; j <= i; j++) {
      if (candles[j].high > hh) hh = candles[j].high;
      if (candles[j].low  < ll) ll = candles[j].low;
    }
    rawK.push((hh - ll) === 0 ? 50 : ((candles[i].close - ll) / (hh - ll)) * 100);
  }

  // ── Slowing SMA ──
  var slowedK = [];
  for (var i = slowing - 1; i < rawK.length; i++) {
    var s = 0;
    for (var j = i - slowing + 1; j <= i; j++) s += rawK[j];
    slowedK.push(s / slowing);
  }

  // ── %D ──
  var dArr = [];
  for (var i = dPeriod - 1; i < slowedK.length; i++) {
    var s = 0;
    for (var j = i - dPeriod + 1; j <= i; j++) s += slowedK[j];
    dArr.push(s / dPeriod);
  }

  // En az 2 değer gerekli (şimdiki + önceki bar) — Hook için
  if (slowedK.length < 2 || dArr.length < 2) return null;

  return {
    k:       slowedK[slowedK.length - 1],   // Şimdiki bar %K
    d:       dArr[dArr.length - 1],          // Şimdiki bar %D
    k1:      slowedK[slowedK.length - 2],   // Önceki bar %K  ← Hook için eklendi
    d1:      dArr[dArr.length - 2],          // Önceki bar %D  ← Hook için eklendi
    kArr:    slowedK,
    dArr:    dArr
  };
}

// ═══════════════════════════════════════════════════════════════════
// 2. HOOK SİNYAL HESAPLAMA
//
// SELL HOOK:
//   Esnek : K >= OB'da VE K < D VE önceki barda K >= D  (OB'da D'yi aşağı kesiyor)
//   Kesin : Önceki bar K >= OB VE şimdi K < OB VE K < D (OB'dan çıkarken D'yi kesiyor)
//
// BUY HOOK:
//   Esnek : K <= OS'ta VE K > D VE önceki barda K <= D  (OS'ta D'yi yukarı kesiyor)
//   Kesin : Önceki bar K <= OS VE şimdi K > OS VE K > D (OS'tan çıkarken D'yi kesiyor)
//
// Döner: 1 (BUY hook), -1 (SELL hook), 0 (sinyal yok)
// ═══════════════════════════════════════════════════════════════════
function calcHookSignal(k, d, k1, d1, obLevel, osLevel, strictHook) {
  // ── BUY HOOK ──
  var buyEarly  = (k  <= osLevel) && (k > d)  && (k1 <= d1);   // OS'ta D'yi yukarı kesiyor
  var buyStrict = (k1 <= osLevel) && (k > osLevel) && (k > d); // OS'tan çıkarken D üstünde

  // ── SELL HOOK ──
  var sellEarly  = (k  >= obLevel) && (k < d)  && (k1 >= d1);  // OB'da D'yi aşağı kesiyor
  var sellStrict = (k1 >= obLevel) && (k < obLevel) && (k < d); // OB'dan çıkarken D altında

  var isBuy  = strictHook ? buyStrict  : (buyEarly  || buyStrict);
  var isSell = strictHook ? sellStrict : (sellEarly || sellStrict);

  if (isBuy  && !isSell) return  1;
  if (isSell && !isBuy)  return -1;
  return 0;
}

// ═══════════════════════════════════════════════════════════════════
// 3. ATR HESAPLAMA
// ═══════════════════════════════════════════════════════════════════
function calculateATR(candlesRaw, period) {
  if (!candlesRaw || candlesRaw.length < period + 2) return 0;
  var candles = candlesRaw.slice(0, period + 1);
  var trs = [];
  for (var i = 0; i < period; i++) {
    var curr = candles[i];
    var prev = candles[i + 1];
    var tr   = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low  - prev.close)
    );
    trs.push(tr);
  }
  return trs.reduce(function(a, b) { return a + b; }, 0) / trs.length;
}

// ═══════════════════════════════════════════════════════════════════
// 4. PIVOT HESAPLAMA (Classic)
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
// 5. PIVOT ZONE KONTROL
// SELL: fiyat >= R1 → resistance zone
// BUY:  fiyat <= S1 → support zone
// ═══════════════════════════════════════════════════════════════════
function checkPivotZone(price, pivots, direction, proximityPct) {
  if (!pivots) return false;
  var tol = price * (proximityPct / 100);
  if (direction ===  1) return price <= pivots.s1 + tol;
  if (direction === -1) return price >= pivots.r1 - tol;
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// 6. TEK BİR TF ANALİZİ — HOOK YÖNTEMİ
//
// ESKİ MANTIK (YANLIŞ):
//   k <= OS → BUY,  k >= OB → SELL
//   (80'e değince emri açıyordu, fiyat hâlâ gidiyordu!)
//
// YENİ MANTIK (HOOK):
//   K, OB bölgesine GİRDİKTEN SONRA D'yi AŞAĞI kesince → SELL
//   K, OS bölgesine GİRDİKTEN SONRA D'yi YUKARI kesince → BUY
//
// Döner: { dir: 1/-1/0, k: değer, hookActive: true/false }
// ═══════════════════════════════════════════════════════════════════
function analyzeTF(candles, tfKey, checkPivot) {
  var stoch = calculateStochastic(
    candles,
    CONFIG.STOCH_K_PERIOD,
    CONFIG.STOCH_D_PERIOD,
    CONFIG.STOCH_SLOWING
  );
  if (!stoch) return { dir: 0, k: 0, hookActive: false };

  var k  = stoch.k;
  var d  = stoch.d;
  var k1 = stoch.k1;
  var d1 = stoch.d1;

  // OB/OS seviyeleri — config'den al, yoksa varsayılan
  var obLevel    = CONFIG.STOCH_OB_LEVEL    || 80;
  var osLevel    = CONFIG.STOCH_OS_LEVEL    || 20;
  var strictHook = CONFIG.STOCH_STRICT_HOOK || false;

  // ── HOOK SİNYALİ ──
  var hookDir = calcHookSignal(k, d, k1, d1, obLevel, osLevel, strictHook);
  if (hookDir === 0) return { dir: 0, k: k, hookActive: false };

  // Pivot kontrolü (büyük TF'ler için)
  if (checkPivot && CONFIG["PIVOT_USE_" + tfKey]) {
    var currentPrice = candles[0].close;
    var prevCandle   = candles[1];
    var pivots       = calculatePivotPoints(prevCandle);
    var proximity    = CONFIG.SR_PROXIMITY_PERCENT || 1.0;
    if (!checkPivotZone(currentPrice, pivots, hookDir, proximity)) {
      return { dir: 0, k: k, hookActive: false };
    }
  }

  return { dir: hookDir, k: k, hookActive: true };
}

// ═══════════════════════════════════════════════════════════════════
// ANA ANALİZ FONKSİYONU
//
// SİSTEM MANTIĞI:
//   ADIM 1 — Büyük TF AND: H4 + D1 + W1 → HOOK sinyali + Pivot
//   ADIM 2 — Küçük TF ONAY: M5 + M15 → sadece HOOK yönü (Pivot yok)
//            M5/M15 ters ise → giriş iptal (pullback koruması)
//
// SONUÇ: Tüm aktif TF'ler aynı HOOK yönünde ise sinyal üret
// ═══════════════════════════════════════════════════════════════════
async function analyzeSingleSymbol(symbol) {

  // Market tipini belirle
  var marketType = "CRYPTO";
  if (CONFIG.BIST_SYMBOLS  && CONFIG.BIST_SYMBOLS.includes(symbol))   marketType = "BIST";
  if (CONFIG.FOREX_PAIRS   && CONFIG.FOREX_PAIRS.includes(symbol))     marketType = "FOREX";

  // ── ADIM 1: Büyük TF'ler — H4 + D1 + W1 (HOOK + Pivot AND) ──
  var bigTFs     = ["H4", "D1", "W1"];
  var bigResults = [];
  var lastCandlesH4 = null;

  for (var t = 0; t < bigTFs.length; t++) {
    var tf    = bigTFs[t];
    // Hook için önceki bar değeri lazım → limit'e +5 ekliyoruz
    var limit = tf === "W1" ? 65 : tf === "D1" ? 85 : 125;

    var candles = await fetchCandles(symbol, marketType, tf, limit);
    if (!candles || candles.length < 40) return null;

    if (tf === "H4") lastCandlesH4 = candles;

    var res = analyzeTF(candles, tf, true); // Pivot kontrolü açık

    // Bu TF'de aktif Hook yok → tüm sistemi durdur
    if (res.dir === 0) return null;

    bigResults.push({ tf: tf, dir: res.dir, k: res.k, hookActive: res.hookActive });
  }

  // Büyük TF'lerin hepsi aynı yönde mi?
  var mainDir = bigResults[0].dir;
  for (var i = 1; i < bigResults.length; i++) {
    if (bigResults[i].dir !== mainDir) return null;
  }

  // ── ADIM 2: Küçük TF onayı — M5 + M15 (sadece HOOK, Pivot yok) ──
  var smallResults = [];

  if (CONFIG.STOCH_USE_M5) {
    var candlesM5 = await fetchCandles(symbol, marketType, "M5", 65);
    if (!candlesM5 || candlesM5.length < 35) return null;

    var resM5 = analyzeTF(candlesM5, "M5", false); // Pivot kapalı
    if (resM5.dir === 0)          return null; // M5 nötr → henüz uygun değil
    if (resM5.dir !== mainDir)    return null; // M5 ters yön → pullback, iptal!

    smallResults.push({ tf: "M5", dir: resM5.dir, k: resM5.k, hookActive: resM5.hookActive });
  }

  if (CONFIG.STOCH_USE_M15) {
    var candlesM15 = await fetchCandles(symbol, marketType, "M15", 65);
    if (!candlesM15 || candlesM15.length < 35) return null;

    var resM15 = analyzeTF(candlesM15, "M15", false);
    if (resM15.dir === 0)         return null; // M15 nötr → bekle
    if (resM15.dir !== mainDir)   return null; // M15 ters → pullback, iptal!

    smallResults.push({ tf: "M15", dir: resM15.dir, k: resM15.k, hookActive: resM15.hookActive });
  }

  // ── Tüm TF'ler Hook sinyali verdi → Sinyal üret ──

  // Gerçek zamanlı entry fiyatı
  var entry = await getCurrentPrice(symbol, marketType);
  if (!entry || entry <= 0) entry = lastCandlesH4[0].close; // Fallback

  // ATR
  var atr = calculateATR(lastCandlesH4, CONFIG.ATR_PERIOD);
  if (!atr || atr <= 0) return null;

  // SL / TP
  var sl  = mainDir ===  1
    ? entry - (atr * CONFIG.ATR_MULTIPLIER_SL)
    : entry + (atr * CONFIG.ATR_MULTIPLIER_SL);
  var tp1 = mainDir ===  1
    ? entry + (atr * CONFIG.ATR_TP1_MULTIPLIER)
    : entry - (atr * CONFIG.ATR_TP1_MULTIPLIER);
  var tp2 = mainDir ===  1
    ? entry + (atr * CONFIG.ATR_TP2_MULTIPLIER)
    : entry - (atr * CONFIG.ATR_TP2_MULTIPLIER);

  // Stoch + Hook bilgisi string (dashboard için)
  var allResults = bigResults.concat(smallResults);
  var stochKStr  = allResults.map(function(r) {
    return r.tf + ":" + Math.round(r.k) + (r.hookActive ? "✓" : "");
  }).join(" ");

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
