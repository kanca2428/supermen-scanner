module.exports = {
  // TELEGRAM
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",

  // API
  BINANCE_BASE: "https://api.binance.com",
  BYBIT_BASE: "https://api.bybit.com",
  KUCOIN_BASE: "https://api.kucoin.com",

  // --- TEST MODU AYARLARI (GEVSEK) ---
  STOCH_K_PERIOD: 14,
  STOCH_D_PERIOD: 3,
  STOCH_SLOWING: 3,
  
  // 30 ve 70 yaparak sinyal bulmayi kolaylastirdik
  STOCH_OB_LEVEL: 70.0,
  STOCH_OS_LEVEL: 30.0,

  // Sadece H4 kullaniyoruz, digerlerini kapattik
  STOCH_USE_M5: false,
  STOCH_USE_M15: false,
  STOCH_USE_H4: true,
  STOCH_USE_D1: false,
  STOCH_USE_W1: false,

  // Pivotu kapattik
  PIVOT_USE_H4: false,
  PIVOT_USE_D1: false,
  PIVOT_USE_W1: false,
  PIVOT_METHOD: "classic",
  SR_PROXIMITY_PERCENT: 2.0,

  // ATR
  ATR_PERIOD: 14,
  ATR_MULTIPLIER_SL: 3.0,
  ATR_TP1_MULTIPLIER: 1.5,
  ATR_TP2_MULTIPLIER: 3.0,

  MAX_SIGNALS_PER_MARKET: 10,

  // TIMEFRAMES
  BINANCE_TF_MAP: { M5: "5m", M15: "15m", H4: "4h", D1: "1d", W1: "1w" },
  BYBIT_TF_MAP: { M5: "5", M15: "15", H4: "240", D1: "D", W1: "W" },
  KUCOIN_TF_MAP: { M5: { code: "5min", minutes: 5 }, M15: { code: "15min", minutes: 15 }, H4: { code: "4hour", minutes: 240 }, D1: { code: "1day", minutes: 1440 }, W1: { code: "1week", minutes: 10080 } },
  YAHOO_TF_MAP: { M5: { interval: "5m", range: "5d" }, M15: { interval: "15m", range: "5d" }, H4: { interval: "1d", range: "3mo" }, D1: { interval: "1d", range: "6mo" }, W1: { interval: "1wk", range: "2y" } },

  // LISTELER
  CRYPTO_PAIRS: ["BTC/USD","ETH/USD","BNB/USD","XRP/USD","SOL/USD","ADA/USD","AVAX/USD","DOGE/USD"],
  BIST_SYMBOLS: ["THYAO","GARAN","AKBNK","ASELS","SASA"]
};
