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

  // ═══════════════════════════════════════════════════════════════
  // STOCHASTIC AYARLARI (SÜPER GEVŞEK)
  // ═══════════════════════════════════════════════════════════════
  STOCH_K_PERIOD: 14,
  STOCH_D_PERIOD: 3,
  STOCH_SLOWING: 3,
  STOCH_OB_LEVEL: 70.0,      // 80'den 70'e düşürüldü
  STOCH_OS_LEVEL: 30.0,      // 20'den 30'a yükseltildi
  
  // ═══════════════════════════════════════════════════════════════
  // TIMEFRAME AYARLARI  
  // ═══════════════════════════════════════════════════════════════
  TIMEFRAMES: ["H4", "D1"],
  MIN_TF_AGREEMENT: 1,        // Tek TF bile yeterli!
  
  // ═══════════════════════════════════════════════════════════════
  // PIVOT AYARLARI
  // ═══════════════════════════════════════════════════════════════
  USE_PIVOT_FILTER: false,

  // ═══════════════════════════════════════════════════════════════
  // ATR AYARLARI
  // ═══════════════════════════════════════════════════════════════
  ATR_PERIOD: 14,
  ATR_MULTIPLIER_SL: 2.5,
  ATR_TP1_MULTIPLIER: 2.0,
  ATR_TP2_MULTIPLIER: 4.0,

  // ═══════════════════════════════════════════════════════════════
  // TIMEFRAME MAPPING
  // ═══════════════════════════════════════════════════════════════
  BINANCE_TF_MAP: { 
    H1: "1h",
    H4: "4h", 
    D1: "1d", 
    W1: "1w" 
  },
  
  YAHOO_TF_MAP: {
    H1: { interval: "1h", range: "1mo" },
    H4: { interval: "1h", range: "1mo" },
    D1: { interval: "1d", range: "6mo" },
    W1: { interval: "1wk", range: "2y" }
  },

  // ═══════════════════════════════════════════════════════════════
  // KRİPTO (SADECE TOP 30 - TEST İÇİN)
  // ═══════════════════════════════════════════════════════════════
  CRYPTO_PAIRS: [
    "BTC/USD", "ETH/USD", "BNB/USD", "XRP/USD", "SOL/USD",
    "ADA/USD", "DOGE/USD", "AVAX/USD", "DOT/USD", "LINK/USD",
    "MATIC/USD", "SHIB/USD", "LTC/USD", "ATOM/USD", "UNI/USD",
    "XLM/USD", "NEAR/USD", "INJ/USD", "FET/USD", "RENDER/USD",
    "ARB/USD", "OP/USD", "APT/USD", "SUI/USD", "SEI/USD",
    "PEPE/USD", "WIF/USD", "BONK/USD", "FLOKI/USD", "WLD/USD"
  ],

  // ═══════════════════════════════════════════════════════════════
  // BIST (TOP 30)
  // ═══════════════════════════════════════════════════════════════
  BIST_SYMBOLS: [
    "AKBNK", "ARCLK", "ASELS", "BIMAS", "EKGYO", "ENKAI", "EREGL", "FROTO", "GARAN",
    "GUBRF", "HEKTS", "ISCTR", "KCHOL", "KOZAL", "KRDMD", "MGROS", "PETKM", "PGSUS",
    "SAHOL", "SASA", "SISE", "SOKM", "TAVHL", "TCELL", "THYAO", "TKFEN", "TOASO",
    "TUPRS", "VAKBN", "YKBNK"
  ],

  // ═══════════════════════════════════════════════════════════════
  // FOREX (MAJÖRLER)
  // ═══════════════════════════════════════════════════════════════
  FOREX_PAIRS: [
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
    "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "EURAUD", "GBPAUD", "AUDNZD"
  ]
};
