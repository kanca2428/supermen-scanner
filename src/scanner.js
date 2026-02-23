const CONFIG = require("./config");
const apis = require("./apis");

// ═══════════════════════════════════════════════════════════════
// STOCHASTIC HESAPLAMA
// ═══════════════════════════════════════════════════════════════
function calculateStochastic(candles, kPeriod, dPeriod, slowing) {
  if (!candles || candles.length < kPeriod + slowing + dPeriod) {
    return null;
  }
  
  const rawK = [];
  
  for (let i = 0; i <= candles.length - kPeriod; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let j = i; j < i + kPeriod; j++) {
      if (candles[j].high > highestHigh) highestHigh = candles[j].high;
      if (candles[j].low < lowestLow) lowestLow = candles[j].low;
    }
    
    const range = highestHigh - lowestLow;
    rawK.push(range === 0 ? 50 : ((candles[i].close - lowestLow) / range) * 100);
  }
  
  const slowedK = [];
  for (let i = 0; i <= rawK.length - slowing; i++) {
    let sum = 0;
    for (let j = i; j < i + slowing; j++) sum += rawK[j];
    slowedK.push(sum / slowing);
  }
  
  const dValues = [];
  for (let i = 0; i <= slowedK.length - dPeriod; i++) {
    let sum = 0;
    for (let j = i; j < i + dPeriod; j++) sum += slowedK[j];
    dValues.push(sum / dPeriod);
  }
  
  return {
    k: slowedK,
    d: dValues,
    currentK: slowedK[0] || 50,
    currentD: dValues[0] || 50
  };
}

// ═══════════════════════════════════════════════════════════════
// ATR HESAPLAMA
// ═══════════════════════════════════════════════════════════════
function calculateATR(candles, period) {
  if (!candles || candles.length < period + 1) return 0;
  
  const trueRanges = [];
  
  for (let i = 0; i < period; i++) {
    const current = candles[i];
    const previous = candles[i + 1];
    if (!current || !previous) continue;
    
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    trueRanges.push(tr);
  }
  
  if (trueRanges.length === 0) return 0;
  return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
}

// ═══════════════════════════════════════════════════════════════
// MARKET TYPE
// ═══════════════════════════════════════════════════════════════
function getMarketType(symbol) {
  if (CONFIG.BIST_SYMBOLS.includes(symbol)) return "BIST";
  if (CONFIG.FOREX_PAIRS.includes(symbol)) return "FOREX";
  return "CRYPTO";
}

// ═══════════════════════════════════════════════════════════════
// ANA ANALİZ (SÜPER GEVŞEK)
// ═══════════════════════════════════════════════════════════════
async function analyzeSingleSymbol(symbol, debug = false) {
  const marketType = getMarketType(symbol);
  const timeframes = CONFIG.TIMEFRAMES || ["H4", "D1"];
  const results = [];
  let lastCandles = null;
  
  for (const tf of timeframes) {
    try {
      const candles = await apis.fetchCandles(symbol, marketType, tf, 50);
      
      if (!candles || candles.length < 15) {
        if (debug) console.log(`      ⚠️ ${tf}: Yetersiz veri (${candles?.length || 0})`);
        continue;
      }
      
      if (!lastCandles) lastCandles = candles;
      
      const stoch = calculateStochastic(candles, CONFIG.STOCH_K_PERIOD, CONFIG.STOCH_D_PERIOD, CONFIG.STOCH_SLOWING);
      
      if (!stoch) {
        if (debug) console.log(`      ⚠️ ${tf}: Stoch hesaplanamadı`);
        continue;
      }
      
      const k = stoch.currentK;
      let direction = 0;
      
      if (k <= CONFIG.STOCH_OS_LEVEL) {
        direction = 1; // LONG
      } else if (k >= CONFIG.STOCH_OB_LEVEL) {
        direction = -1; // SHORT
      }
      
      if (debug) {
        const zone = direction === 1 ? "🟢 OS" : direction === -1 ? "🔴 OB" : "⚪ NÖTR";
        console.log(`      📊 ${tf}: K=${k.toFixed(1)} ${zone}`);
      }
      
      // Nötr bölgede de kaydet (debug için)
      results.push({ tf, direction, k, d: stoch.currentD });
      
    } catch (error) {
      if (debug) console.log(`      ❌ ${tf}: ${error.message}`);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SİNYAL KONTROLÜ
  // ═══════════════════════════════════════════════════════════════
  
  if (results.length === 0) {
    if (debug) console.log(`      ⛔ Hiç veri alınamadı`);
    return null;
  }
  
  // Sinyal veren TF'leri bul
  const signalResults = results.filter(r => r.direction !== 0);
  
  if (signalResults.length === 0) {
    if (debug) {
      const kValues = results.map(r => `${r.tf}:${r.k.toFixed(0)}`).join(" | ");
      console.log(`      ⚪ Tüm TF'ler nötr bölgede (${kValues})`);
    }
    return null;
  }
  
  // En az MIN_TF_AGREEMENT kadar TF aynı yönde mi?
  const minAgreement = CONFIG.MIN_TF_AGREEMENT || 1;
  const longCount = signalResults.filter(r => r.direction === 1).length;
  const shortCount = signalResults.filter(r => r.direction === -1).length;
  
  let direction = 0;
  if (longCount >= minAgreement) direction = 1;
  else if (shortCount >= minAgreement) direction = -1;
  
  if (direction === 0) {
    if (debug) console.log(`      ⚠️ Yeterli TF uyumu yok (L:${longCount} S:${shortCount})`);
    return null;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SİNYAL OLUŞTUR
  // ═══════════════════════════════════════════════════════════════
  const entryPrice = lastCandles[0].close;
  const atr = calculateATR(lastCandles, CONFIG.ATR_PERIOD);
  
  let stopLoss, tp1, tp2;
  
  if (direction === 1) {
    stopLoss = entryPrice - (atr * CONFIG.ATR_MULTIPLIER_SL);
    tp1 = entryPrice + (atr * CONFIG.ATR_TP1_MULTIPLIER);
    tp2 = entryPrice + (atr * CONFIG.ATR_TP2_MULTIPLIER);
  } else {
    stopLoss = entryPrice + (atr * CONFIG.ATR_MULTIPLIER_SL);
    tp1 = entryPrice - (atr * CONFIG.ATR_TP1_MULTIPLIER);
    tp2 = entryPrice - (atr * CONFIG.ATR_TP2_MULTIPLIER);
  }
  
  const matchingResults = signalResults.filter(r => r.direction === direction);
  const stochKStr = matchingResults.map(r => `${r.tf}:${Math.round(r.k)}`).join(" | ");
  
  let score = 50 + (matchingResults.length * 30);
  for (const r of matchingResults) {
    if (direction === 1 && r.k <= 15) score += 20;
    else if (direction === 1 && r.k <= 25) score += 10;
    if (direction === -1 && r.k >= 85) score += 20;
    else if (direction === -1 && r.k >= 75) score += 10;
  }
  
  return {
    symbol,
    displaySymbol: symbol,
    marketType,
    direction,
    signal: direction === 1 ? "LONG" : "SHORT",
    entryPrice,
    lastPrice: entryPrice,
    stopLoss,
    sl: stopLoss,
    tp1,
    tp2,
    atr,
    stochK: stochKStr,
    stochKStr,
    score: Math.min(score, 200),
    tfCount: matchingResults.length,
    timestamp: Date.now()
  };
}

module.exports = {
  analyzeSingleSymbol,
  calculateStochastic,
  calculateATR,
  getMarketType
};
