module.exports = {
  // ═══════════════════════════════════════════════════════════════
  // TELEGRAM AYARLARI
  // ═══════════════════════════════════════════════════════════════
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_CHAT_ID:   process.env.TELEGRAM_CHAT_ID   || "",

  // ═══════════════════════════════════════════════════════════════
  // API BASE URLs
  // ═══════════════════════════════════════════════════════════════
  BINANCE_BASE: "https://api.binance.com",
  BYBIT_BASE:   "https://api.bybit.com",
  KUCOIN_BASE:  "https://api.kucoin.com",
  CRYPTOCOMPARE_API_KEY: process.env.CRYPTOCOMPARE_API_KEY || "",

  // ═══════════════════════════════════════════════════════════════
  // STOCHASTIC AYARLARI — TÜM TIMEFRAME'LER AÇIK!
  // M5+M15 dönüş sinyali için KRİTİK
  // ═══════════════════════════════════════════════════════════════
  STOCH_K_PERIOD: 21,
  STOCH_D_PERIOD: 3,
  STOCH_SLOWING:  3,
  STOCH_OB_LEVEL: 80.0,
  STOCH_OS_LEVEL: 20.0,
  STOCH_USE_M5:   true,    // ✅ AÇIK — dönüş sinyali
  STOCH_USE_M15:  true,    // ✅ AÇIK — dönüş sinyali
  STOCH_USE_H4:   true,    // ✅ AÇIK — ana trend
  STOCH_USE_D1:   true,    // ✅ AÇIK — ana trend
  STOCH_USE_W1:   true,    // ✅ AÇIK — ana trend

  // ═══════════════════════════════════════════════════════════════
  // PIVOT POINT AYARLARI
  // ═══════════════════════════════════════════════════════════════
  PIVOT_USE_H4:         false,
  PIVOT_USE_D1:         true,
  PIVOT_USE_W1:         false,
  SR_PROXIMITY_PERCENT: 1.0,

  // ═══════════════════════════════════════════════════════════════
  // ATR AYARLARI
  // ═══════════════════════════════════════════════════════════════
  ATR_PERIOD:         14,
  ATR_MULTIPLIER_SL:  3.0,
  ATR_TP1_MULTIPLIER: 2.0,
  ATR_TP2_MULTIPLIER: 4.0,

  // ═══════════════════════════════════════════════════════════════
  // SİNYAL LİMİTLERİ
  // ═══════════════════════════════════════════════════════════════
  MAX_SIGNALS_PER_MARKET: 20,

  // ═══════════════════════════════════════════════════════════════
  // TIMEFRAME MAPPING
  // ═══════════════════════════════════════════════════════════════
  BINANCE_TF_MAP: {
    M5:  "5m",
    M15: "15m",
    H4:  "4h",
    D1:  "1d",
    W1:  "1w"
  },
  BYBIT_TF_MAP: {
    M5:  "5",
    M15: "15",
    H4:  "240",
    D1:  "D",
    W1:  "W"
  },
  KUCOIN_TF_MAP: {
    M5:  { code: "5min",  minutes: 5     },
    M15: { code: "15min", minutes: 15    },
    H4:  { code: "4hour", minutes: 240   },
    D1:  { code: "1day",  minutes: 1440  },
    W1:  { code: "1week", minutes: 10080 }
  },
  YAHOO_TF_MAP: {
    M5:  { interval: "5m",  range: "5d"  },
    M15: { interval: "15m", range: "5d"  },
    H4:  { interval: "1h",  range: "60d" },
    D1:  { interval: "1d",  range: "1y"  },
    W1:  { interval: "1wk", range: "3y"  }
  },

  // ═══════════════════════════════════════════════════════════════
  // KRİPTO — TOP 30 (en likit, en hacimli)
  // 5 TF açık olduğu için sembol AZALTMAK zorundayız
  // 30 sembol × 5 TF = 150 API çağrısı (makul)
  // ═══════════════════════════════════════════════════════════════
  CRYPTO_PAIRS: [
    "BTC/USD",  "ETH/USD",  "BNB/USD",  "XRP/USD",  "SOL/USD",
    "ADA/USD",  "DOGE/USD", "AVAX/USD", "DOT/USD",  "LINK/USD",
    "MATIC/USD","LTC/USD",  "ATOM/USD", "UNI/USD",  "TON/USD",
    "TRX/USD",  "BCH/USD",  "NEAR/USD", "ICP/USD",  "FIL/USD",
    "ARB/USD",  "OP/USD",   "APT/USD",  "SUI/USD",  "INJ/USD",
    "FET/USD",  "RENDER/USD","PEPE/USD","AAVE/USD", "HBAR/USD"
  ],

  // ═══════════════════════════════════════════════════════════════
  // FOREX — 20 PARİTE (28'den düşürüldü)
  // En likit pariteler, spread düşük olanlar
  // ═══════════════════════════════════════════════════════════════
  FOREX_PAIRS: [
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
    "EURGBP", "EURJPY", "GBPJPY", "CHFJPY", "EURCHF", "AUDJPY", "CADJPY",
    "EURAUD", "EURCAD", "GBPAUD", "GBPCAD", "AUDNZD", "GBPCHF"
  ],

  // ═══════════════════════════════════════════════════════════════
  // BIST — TOP 30 (BIST-30 endeksi, en likit)
  // 478 → 30 = %94 azalma! Ama en kaliteli sinyaller bunlar
  // ═══════════════════════════════════════════════════════════════
  BIST_SYMBOLS: [
    "AKBNK", "ARCLK", "ASELS", "BIMAS", "EKGYO", "ENKAI", "EREGL",
    "FROTO", "GARAN", "GUBRF", "HEKTS", "ISCTR", "KCHOL", "KOZAA",
    "KOZAL", "KRDMD", "MGROS", "ODAS",  "PETKM", "PGSUS", "SAHOL",
    "SASA",  "SISE",  "SOKM",  "TAVHL", "TCELL", "THYAO", "TKFEN",
    "TOASO", "TUPRS"
  ]
};
