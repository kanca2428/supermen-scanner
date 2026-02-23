// ═══════════════════════════════════════════════════════════════
// SUPERMEN V16.0 - ANALYSIS MODULE
// ═══════════════════════════════════════════════════════════════

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
  
  // Raw %K hesapla
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
  
  // Slowing uygula (Slow %K)
  const slowedK = [];
  for (let i = 0; i <= rawK.length - slowing; i++) {
    let sum = 0;
    for (let j = i; j < i + slowing; j++) {
      sum += rawK[j];
    }
    slowedK.push(sum / slowing);
  }
  
  // %D hesapla (Slow %K'nın SMA'sı)
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
// ATR (Average True Range) HESAPLAMA
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
// PIVOT NOKTALARI HESAPLAMA
// ═══════════════════════════════════════════════════════════════
function calculatePivotPoints(candle) {
  if (!candle) return null;
  
  const h = candle.high;
  const l = candle.low;
  const c = candle.close;
  
  // Classic Pivot Points
  const pp = (h + l + c) / 3;
  
  const r1 = (2 * pp) - l;
  const s1 = (2 * pp) - h;
  
  const r2 = pp + (h - l);
  const s2 = pp - (h - l);
  
  const r3 = h + 2 * (pp - l);
  const s3 = l - 2 * (h - pp);
  
  return {
    pp: pp,
    r1: r1,
    r2: r2,
    r3: r3,
    s1: s1,
    s2: s2,
    s3: s3
  };
}

// ═══════════════════════════════════════════════════════════════
// FİYAT SEVİYE YAKINLIK KONTROLÜ
// ═══════════════════════════════════════════════════════════════
function isNearLevel(price, level, percentThreshold) {
  if (!price || !level) return false;
  
  const diff = Math.abs(price - level);
  const threshold = (level * percentThreshold) / 100;
  
  return diff <= threshold;
}

// ═══════════════════════════════════════════════════════════════
// MARKET TYPE BELİRLEME
// ═══════════════════════════════════════════════════════════════
function getMarketType(symbol) {
  if (CONFIG.BIST_SYMBOLS.includes(symbol)) {
    return "BIST";
  }
  if (CONFIG.FOREX_PAIRS.includes(symbol)) {
    return "FOREX";
  }
  return "CRYPTO";
}

// ═══════════════════════════════════════════════════════════════
// ANA ANALİZ FONKSİYONU (ULTRA STRICT MODE)
// ═══════════════════════════════════════════════════════════════
async function analyzeSingleSymbol(symbol) {
  const marketType = getMarketType(symbol);
  const timeframes = ["H4", "D1", "W1"];
  const results = [];
  let lastCandlesH4 = null;
  
  // Her timeframe için analiz yap
  for (const tf of timeframes) {
    try {
      const candles = await apis.fetchCandles(symbol, marketType, tf, 50);
      
      if (!candles || candles.length < 30) {
        console.log(`${symbol} ${tf}: Yetersiz veri`);
        return null;
      }
      
      // H4 mumlarını sakla (entry/exit hesaplaması için)
      if (tf === "H4") {
        lastCandlesH4 = candles;
      }
      
      // 1. STOCHASTIC KONTROLÜ
      const stoch = calculateStochastic(
        candles,
        CONFIG.STOCH_K_PERIOD,
        CONFIG.STOCH_D_PERIOD,
        CONFIG.STOCH_SLOWING
      );
      
      if (!stoch) {
        console.log(`${symbol} ${tf}: Stochastic hesaplanamadı`);
        return null;
      }
      
      const k = stoch.currentK;
      
      // Yön belirleme
      let direction = 0;
      if (k <= CONFIG.STOCH_OS_LEVEL) {
        direction = 1; // LONG
      } else if (k >= CONFIG.STOCH_OB_LEVEL) {
        direction = -1; // SHORT
      } else {
        // Nötr bölge - sinyal yok
        return null;
      }
      
      // 2. PIVOT KONTROLÜ
      const usePivot = CONFIG["PIVOT_USE_" + tf];
      
      if (usePivot) {
        const currentPrice = candles[0].close;
        const prevCandle = candles[1];
        const pivots = calculatePivotPoints(prevCandle);
        
        if (!pivots) {
          return null;
        }
        
        const proximity = CONFIG.SR_PROXIMITY_PERCENT || 0.5;
        let isNear = false;
        
        if (direction === 1) {
          // LONG: Destek seviyelerine yakın mı?
          if (isNearLevel(currentPrice, pivots.s1, proximity) ||
              isNearLevel(currentPrice, pivots.s2, proximity) ||
              isNearLevel(currentPrice, pivots.s3, proximity) ||
              isNearLevel(currentPrice, pivots.pp, proximity)) {
            isNear = true;
          }
        } else {
          // SHORT: Direnç seviyelerine yakın mı?
          if (isNearLevel(currentPrice, pivots.r1, proximity) ||
              isNearLevel(currentPrice, pivots.r2, proximity) ||
              isNearLevel(currentPrice, pivots.r3, proximity) ||
              isNearLevel(currentPrice, pivots.pp, proximity)) {
            isNear = true;
          }
        }
        
        if (!isNear) {
          // Pivot kontrolü geçemedi
          return null;
        }
      }
      
      results.push({
        tf: tf,
        direction: direction,
        k: k,
        d: stoch.currentD
      });
      
    } catch (error) {
      console.error(`${symbol} ${tf} analiz hatası:`, error.message);
      return null;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SON KONTROL: Tüm timeframe'ler aynı yönde mi?
  // ═══════════════════════════════════════════════════════════════
  if (results.length < 3) {
    return null;
  }
  
  // Tüm yönler aynı olmalı
  const firstDirection = results[0].direction;
  for (const r of results) {
    if (r.direction !== firstDirection) {
      return null;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SİNYAL OLUŞTUR
  // ═══════════════════════════════════════════════════════════════
  const direction = firstDirection;
  const entryPrice = lastCandlesH4[0].close;
  const atr = calculateATR(lastCandlesH4, CONFIG.ATR_PERIOD);
  
  // Stop Loss ve Take Profit hesapla
  let stopLoss, tp1, tp2;
  
  if (direction === 1) {
    // LONG
    stopLoss = entryPrice - (atr * CONFIG.ATR_MULTIPLIER_SL);
    tp1 = entryPrice + (atr * CONFIG.ATR_TP1_MULTIPLIER);
    tp2 = entryPrice + (atr * CONFIG.ATR_TP2_MULTIPLIER);
  } else {
    // SHORT
    stopLoss = entryPrice + (atr * CONFIG.ATR_MULTIPLIER_SL);
    tp1 = entryPrice - (atr * CONFIG.ATR_TP1_MULTIPLIER);
    tp2 = entryPrice - (atr * CONFIG.ATR_TP2_MULTIPLIER);
  }
  
  // Stoch K değerlerini string olarak hazırla
  const stochKStr = results.map(r => Math.round(r.k)).join("/");
  
  // Skor hesapla (basit versiyon)
  let score = 100;
  
  // Stoch değerlerine göre skor artır
  for (const r of results) {
    if (direction === 1 && r.k <= 10) score += 10;
    if (direction === -1 && r.k >= 90) score += 10;
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
    score: score,
    h4K: results[0].k,
    d1K: results[1].k,
    w1K: results[2].k,
    timestamp: Date.now()
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════
module.exports = {
  analyzeSingleSymbol,
  calculateStochastic,
  calculateATR,
  calculatePivotPoints,
  isNearLevel,
  getMarketType
};
