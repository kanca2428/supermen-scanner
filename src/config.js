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

  // ═══════════════════════════════════════════════════════════════
  // STOCHASTIC AYARLARI (GEVŞETİLMİŞ)
  // ═══════════════════════════════════════════════════════════════
  STOCH_K_PERIOD: 14,        // 21'den 14'e düşürüldü
  STOCH_D_PERIOD: 3,
  STOCH_SLOWING: 3,
  STOCH_OB_LEVEL: 80.0,      // 85'ten 80'e düşürüldü (daha fazla sinyal)
  STOCH_OS_LEVEL: 20.0,      // 15'ten 20'ye yükseltildi (daha fazla sinyal)
  
  // ═══════════════════════════════════════════════════════════════
  // TIMEFRAME AYARLARI
  // ═══════════════════════════════════════════════════════════════
  TIMEFRAMES: ["H4", "D1"],   // W1 kaldırıldı (daha hızlı sinyal)
  MIN_TF_AGREEMENT: 2,        // Kaç TF'nin uyuşması gerekiyor (2/2)
  
  // ═══════════════════════════════════════════════════════════════
  // PIVOT AYARLARI (GEVŞETİLMİŞ)
  // ═══════════════════════════════════════════════════════════════
  USE_PIVOT_FILTER: false,    // Pivot filtresi KAPALI (daha fazla sinyal)
  SR_PROXIMITY_PERCENT: 2.0,  // 0.5'ten 2.0'a yükseltildi

  // ═══════════════════════════════════════════════════════════════
  // ATR AYARLARI
  // ═══════════════════════════════════════════════════════════════
  ATR_PERIOD: 14,
  ATR_MULTIPLIER_SL: 3.0,     // 5.0'dan 3.0'a düşürüldü
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
    M5: "5m", 
    M15: "15m", 
    H1: "1h",
    H4: "4h", 
    D1: "1d", 
    W1: "1w" 
  },
  
  YAHOO_TF_MAP: {
    M5: { interval: "5m", range: "5d" },
    M15: { interval: "15m", range: "5d" },
    H1: { interval: "1h", range: "1mo" },
    H4: { interval: "1h", range: "1mo" },   // Yahoo'da H4 yok, H1 kullanılıyor
    D1: { interval: "1d", range: "6mo" },
    W1: { interval: "1wk", range: "2y" }
  },

  // ═══════════════════════════════════════════════════════════════
  // KRİPTO PARALAR (Popüler olanlar - hızlı tarama için)
  // ═══════════════════════════════════════════════════════════════
  CRYPTO_PAIRS: [
    "BTC/USD", "ETH/USD", "BNB/USD", "XRP/USD", "SOL/USD",
    "ADA/USD", "DOGE/USD", "AVAX/USD", "DOT/USD", "LINK/USD",
    "MATIC/USD", "SHIB/USD", "LTC/USD", "ATOM/USD", "UNI/USD",
    "XLM/USD", "ALGO/USD", "NEAR/USD", "ICP/USD", "FIL/USD",
    "ARB/USD", "OP/USD", "APT/USD", "SUI/USD", "SEI/USD",
    "TIA/USD", "INJ/USD", "FET/USD", "RENDER/USD", "TON/USD",
    "HBAR/USD", "FTM/USD", "IMX/USD", "MINA/USD",
    "TRX/USD", "BCH/USD", "ETC/USD", "VET/USD", "AAVE/USD",
    "EOS/USD", "XTZ/USD", "THETA/USD", "AXS/USD", "SAND/USD",
    "MANA/USD", "GALA/USD", "ENJ/USD", "CHZ/USD", "CRV/USD",
    "LDO/USD", "DYDX/USD", "SNX/USD", "MKR/USD",
    "GRT/USD", "ENS/USD", "GMX/USD", "PENDLE/USD", "STX/USD",
    "PEPE/USD", "FLOKI/USD", "WLD/USD", "BONK/USD",
    "JTO/USD", "PYTH/USD", "JUP/USD", "WIF/USD", "ORDI/USD",
    "RUNE/USD", "AR/USD", "RNDR/USD",
    "JASMY/USD", "IOTA/USD", "OCEAN/USD",
    "BLUR/USD", "STRK/USD", "MANTA/USD",
    "ENA/USD", "ETHFI/USD", "W/USD", "TNSR/USD",
    "NOT/USD", "IO/USD", "ZK/USD", "ZRO/USD",
    "DOGS/USD", "HMSTR/USD", "EIGEN/USD", "NEIRO/USD", "GOAT/USD"
  ],

  // ═══════════════════════════════════════════════════════════════
  // BIST HİSSELERİ (En likit olanlar)
  // ═══════════════════════════════════════════════════════════════
  BIST_SYMBOLS: [
    "AKBNK", "ARCLK", "ASELS", "BIMAS", "EKGYO", "ENKAI", "EREGL", "FROTO", "GARAN",
    "GUBRF", "HEKTS", "ISCTR", "KCHOL", "KOZAA", "KOZAL", "KRDMD", "MGROS", "ODAS",
    "PETKM", "PGSUS", "SAHOL", "SASA", "SISE", "SOKM", "TAVHL", "TCELL", "THYAO",
    "TKFEN", "TOASO", "TUPRS", "AEFES", "AKSA", "AKSEN", "ALARK", "ALFAS",
    "AYGAZ", "BAGFS", "CCOLA", "CEMTS", "CIMSA", "DOAS", "DOHOL", "EGEEN",
    "ENJSA", "GESAN", "HALKB", "ISGYO", "KAREL", "KONTR", "KORDS", "LOGO", 
    "MAVI", "NETAS", "OTKAR", "OYAKC", "SKBNK", "TTKOM", "TTRAK", "ULKER",
    "VAKBN", "VESBE", "VESTL", "YKBNK", "ZOREN"
  ],

  // ═══════════════════════════════════════════════════════════════
  // FOREX PARİTELERİ
  // ═══════════════════════════════════════════════════════════════
  FOREX_PAIRS: [
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
    "EURGBP", "EURJPY", "GBPJPY", "CHFJPY", "EURCHF", "AUDJPY", "CADJPY",
    "EURAUD", "EURCAD", "GBPAUD", "GBPCAD", "AUDNZD", "AUDCAD", "USDSGD"
  ]
};
