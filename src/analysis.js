const CONFIG = require("./config");
const apis = require("./apis");

// ═══════════════════════════════════════════════════════════════
// STOCHASTIC HESAPLAMA
// ═══════════════════════════════════════════════════════════════
function calculateStochastic(candles, kPeriod, dPeriod, slowing) {
  if (!candles || candles.length < kPeriod + slowing + dPeriod) {
    return null;
  }
  
  const len = candles.length;
  const rawK = [];
  
  for (let i = 0; i <= len - kPeriod; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let j = i; j < i + kPeriod; j++) {
      if (candles[j].high > highestHigh) highestHigh = candles[j].high;
      if (candles[j].low < lowestLow) lowestLow = candles[j].low;
    }
    
    const range = highestHigh - lowestLow;
    if (range === 0) {
      rawK.push(50);
    } else {
      rawK.push(((candles[i].close - lowestLow) / range) * 100);
    }
  }
  
  const slowedK = [];
  for (let i = 0; i <= rawK.length - slowing; i++) {
    let sum = 0;
    for (let j = i; j < i + slowing; j++) {
      sum += rawK[j];
    }
    slowedK.push(sum / slowing);
  }
  
  const dValues = [];
  for (let i = 0; i <= slowedK.length - dPeriod; i++) {
    let sum = 0;
    for (let j = i; j < i + dPeriod; j++) {
      sum += slowedK[j];
    }
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
  if (!candles || candles.length < period + 1) {
    return 0;
  }
  
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
// MARKET TYPE BELİRLEME
// ═══════════════════════════════════════════════════════════════
function getMarketType(symbol) {
  if (CONFIG.BIST_SYMBOLS.includes(symbol)) return "BIST";
  if (CONFIG.FOREX_PAIRS.includes(symbol)) return "FOREX";
  return "CRYPTO";
}

// ═══════════════════════════════════════════════════════════════
// ANA ANALİZ FONKSİYONU (GEVŞETİLMİŞ VERSİYON)
// ═══════════════════════════════════════════════════════════════
async function analyzeSingleSymbol(symbol, debug = false) {
  const marketType = getMarketType(symbol);
  const timeframes = CONFIG.TIMEFRAMES || ["H4", "D1"];
  const results = [];
  let lastCandles = null;
  
  for (const tf of timeframes) {
    try {
      const candles = await apis.fetchCandles(symbol, marketType, tf, 50);
      
      if (!candles || candles.length < 20) {
        if (debug) console.log(`   ⚠️ ${symbol} ${tf}: Yetersiz veri (${candles?.length || 0} mum)`);
        continue; // Devam et, hata verme
      }
      
      if (!lastCandles) lastCandles = candles;
      
      const stoch = calculateStochastic(
        candles,
        CONFIG.STOCH_K_PERIOD,
        CONFIG.STOCH_D_PERIOD,
        CONFIG.STOCH_SLOWING
      );
      
      if (!stoch) {
        if (debug) console.log(`   ⚠️ ${symbol} ${tf}: Stoch hesaplanamadı`);
        continue;
      }
      
      const k = stoch.currentK;
      
      // Yön belirleme
      let direction = 0;
      if (k <= CONFIG.STOCH_OS_LEVEL) {
        direction = 1; // LONG (oversold)
      } else if (k >= CONFIG.STOCH_OB_LEVEL) {
        direction = -1; // SHORT (overbought)
      }
      
      if (debug) {
        const status = direction === 1 ? "🟢 OVERSOLD" : direction === -1 ? "🔴 OVERBOUGHT" : "⚪ NÖTR";
        console.log(`   📊 ${symbol} ${tf}: K=${k.toFixed(1)} ${status}`);
      }
      
      if (direction !== 0) {
        results.push({
          tf: tf,
          direction: direction,
          k: k,
          d: stoch.currentD
        });
      }
      
    } catch (error) {
      if (debug) console.log(`   ❌ ${symbol} ${tf}: ${error.message}`);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SİNYAL KONTROLÜ (GEVŞETİLMİŞ)
  // ═══════════════════════════════════════════════════════════════
  
  // En az 1 timeframe bile yeterli (test için)
  if (results.length === 0) {
    return null;
  }
  
  // En az MIN_TF_AGREEMENT kadar TF aynı yönde mi?
  const minAgreement = CONFIG.MIN_TF_AGREEMENT || 1;
  
  const longCount = results.filter(r => r.direction === 1).length;
  const shortCount = results.filter(r => r.direction === -1).length;
  
  let direction = 0;
  if (longCount >= minAgreement) {
    direction = 1;
  } else if (shortCount >= minAgreement) {
    direction = -1;
  } else {
    if (debug) console.log(`   ⚠️ ${symbol}: Yeterli TF uyumu yok (L:${longCount} S:${shortCount})`);
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
  
  const stochKStr = results.map(r => Math.round(r.k)).join("/");
  
  // Skor hesapla
  let score = 50 + (results.length * 25); // Her uyumlu TF için +25
  
  for (const r of results) {
    if (direction === 1 && r.k <= 10) score += 15;
    else if (direction === 1 && r.k <= 15) score += 10;
    if (direction === -1 && r.k >= 90) score += 15;
    else if (direction === -1 && r.k >= 85) score += 10;
  }
  
  return {
    symbol: symbol,
    displaySymbol: symbol,
    marketType: marketType,
    direction: direction,
    signal: direction === 1 ? "LONG" : "SHORT",
    entryPrice: entryPrice,
    lastPrice: entryPrice,
    stopLoss: stopLoss,
    sl: stopLoss,
    tp1: tp1,
    tp2: tp2,
    atr: atr,
    stochK: stochKStr,
    stochKStr: stochKStr,
    score: Math.min(score, 200),
    tfCount: results.length,
    timestamp: Date.now()
  };
}

module.exports = {
  analyzeSingleSymbol,
  calculateStochastic,
  calculateATR,
  getMarketType
};
