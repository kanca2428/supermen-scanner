// config.js
module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // TELEGRAM AYARLARI
  // ═══════════════════════════════════════════════════════════════
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",

  // ═══════════════════════════════════════════════════════════════
  // API BASE URLs
  // ═══════════════════════════════════════════════════════════════
  BINANCE_BASE: "https://api.binance.com",
  BYBIT_BASE: "https://api.bybit.com",
  KUCOIN_BASE: "https://api.kucoin.com",

  // ═══════════════════════════════════════════════════════════════
  // STOCHASTIC AYARLARI (DAHA ESNEK)
  // ═══════════════════════════════════════════════════════════════
  STOCH_K_PERIOD: 14,     // 21 yerine 14 (Daha hızlı tepki)
  STOCH_D_PERIOD: 3,
  STOCH_SLOWING: 3,
  STOCH_OB_LEVEL: 80.0,   // 85 yerine 80 (Daha kolay SAT sinyali)
  STOCH_OS_LEVEL: 20.0,   // 15 yerine 20 (Daha kolay AL sinyali)
  
  // Sadece H4 ve D1 kullanıyoruz, W1'i kapattık (Sinyal bulmak kolaylaşsın)
  STOCH_USE_M5: false,
  STOCH_USE_M15: false,
  STOCH_USE_H4: true,     // ✅ Aktif
  STOCH_USE_D1: true,     // ✅ Aktif
  STOCH_USE_W1: false,    // ❌ Kapalı (Test için)

  // ═══════════════════════════════════════════════════════════════
  // PIVOT POINT AYARLARI
  // ═══════════════════════════════════════════════════════════════
  PIVOT_USE_H4: true,
  PIVOT_USE_D1: true,
  PIVOT_USE_W1: false,    // ❌ Kapalı
  PIVOT_METHOD: "classic",

  // Toleransı artırdık (%0.5 -> %1.5)
  SR_PROXIMITY_PERCENT: 1.5, 

  // ═══════════════════════════════════════════════════════════════
  // ATR AYARLARI
  // ═══════════════════════════════════════════════════════════════
  ATR_PERIOD: 14,
  ATR_MULTIPLIER_SL: 3.0, // Stop Loss biraz daha yakın
  ATR_TP1_MULTIPLIER: 1.5,
  ATR_TP2_MULTIPLIER: 3.0,

  // ═══════════════════════════════════════════════════════════════
  // SİNYAL LİMİTLERİ
  // ═══════════════════════════════════════════════════════════════
  MAX_SIGNALS_PER_MARKET: 15,

  // ═══════════════════════════════════════════════════════════════
  // TIMEFRAME MAPPING
  // ═══════════════════════════════════════════════════════════════
  BINANCE_TF_MAP: { M5: "5m", M15: "15m", H4: "4h", D1: "1d", W1: "1w" },
  BYBIT_TF_MAP: { M5: "5", M15: "15", H4: "240", D1: "D", W1: "W" },
  KUCOIN_TF_MAP: {
    M5: { code: "5min", minutes: 5 },
    M15: { code: "15min", minutes: 15 },
    H4: { code: "4hour", minutes: 240 },
    D1: { code: "1day", minutes: 1440 },
    W1: { code: "1week", minutes: 10080 }
  },
  YAHOO_TF_MAP: {
    M5: { interval: "5m", range: "5d" },
    M15: { interval: "15m", range: "5d" },
    H4: { interval: "1d", range: "3mo" },
    D1: { interval: "1d", range: "6mo" },
    W1: { interval: "1wk", range: "2y" }
  },

  // ═══════════════════════════════════════════════════════════════
  // KRİPTO LİSTESİ (Popüler Olanlar)
  // ═══════════════════════════════════════════════════════════════
  CRYPTO_PAIRS: [
    "BTC/USD","ETH/USD","BNB/USD","XRP/USD","SOL/USD",
    "ADA/USD","DOGE/USD","AVAX/USD","DOT/USD","LINK/USD",
    "MATIC/USD","SHIB/USD","LTC/USD","ATOM/USD","UNI/USD",
    "ARB/USD","OP/USD","APT/USD","SUI/USD","FIL/USD",
    "NEAR/USD","RENDER/USD","FET/USD","INJ/USD","TIA/USD",
    "SEI/USD","PEPE/USD","FLOKI/USD","BONK/USD","WIF/USD"
  ],

  // ═══════════════════════════════════════════════════════════════
  // BIST LİSTESİ (BIST 30)
  // ═══════════════════════════════════════════════════════════════
  BIST_SYMBOLS: [
    "AKBNK","ARCLK","ASELS","BIMAS","EKGYO","ENKAI","EREGL","FROTO","GARAN",
    "GUBRF","HEKTS","ISCTR","KCHOL","KOZAA","KOZAL","KRDMD","MGROS","ODAS",
    "PETKM","PGSUS","SAHOL","SASA","SISE","SOKM","TAVHL","TCELL","THYAO",
    "TKFEN","TOASO","TUPRS"
  ]
};
