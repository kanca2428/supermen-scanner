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

  // CryptoCompare — ücretsiz hesap aç: https://www.cryptocompare.com/cryptopian/api-keys
  // Boş bırakılırsa da çalışır ama limitler daha düşük olur
  CRYPTOCOMPARE_API_KEY: process.env.CRYPTOCOMPARE_API_KEY || "",

  // ═══════════════════════════════════════════════════════════════
  // STOCHASTIC AYARLARI (H4 + D1 + W1 AND SİSTEMİ)
  // ═══════════════════════════════════════════════════════════════
  STOCH_K_PERIOD: 21,
  STOCH_D_PERIOD: 3,
  STOCH_SLOWING:  3,
  STOCH_OB_LEVEL: 80.0,   // 85 üstü = SELL sinyali
  STOCH_OS_LEVEL: 20.0,   // 15 altı = BUY sinyali
  STOCH_USE_M5:   false,
  STOCH_USE_M15:  false,
  STOCH_USE_H4:   true,
  STOCH_USE_D1:   true,
  STOCH_USE_W1:   true,

  // ═══════════════════════════════════════════════════════════════
  // PIVOT POINT AYARLARI (H4 + D1 + W1 AND SİSTEMİ)
  // ═══════════════════════════════════════════════════════════════
  PIVOT_USE_H4:         false,
  PIVOT_USE_D1:         true,
  PIVOT_USE_W1:         false,
  SR_PROXIMITY_PERCENT: 1.0,  // Fiyatın pivot seviyesine % yakınlık toleransı

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
    H4:  { interval: "1h",  range: "60d" },  // Yahoo'da H4 yok → 1h çekip aggregate
    D1:  { interval: "1d",  range: "1y"  },
    W1:  { interval: "1wk", range: "3y"  }
  },

  // ═══════════════════════════════════════════════════════════════
  // KRİPTO PARİTELER
  // "BTC/USD" formatı — apis.js otomatik BTCUSDT'ye dönüştürür
  // ═══════════════════════════════════════════════════════════════
  CRYPTO_PAIRS: [
    "BTC/USD","ETH/USD","BNB/USD","XRP/USD","SOL/USD",
    "ADA/USD","DOGE/USD","AVAX/USD","DOT/USD","LINK/USD",
    "MATIC/USD","SHIB/USD","LTC/USD","ATOM/USD","UNI/USD",
    "XLM/USD","ALGO/USD","NEAR/USD","ICP/USD","FIL/USD",
    "ARB/USD","OP/USD","APT/USD","SUI/USD","SEI/USD",
    "TIA/USD","INJ/USD","FET/USD","RENDER/USD","TON/USD",
    "KAS/USD","HBAR/USD","FTM/USD","IMX/USD","MINA/USD",
    "TRX/USD","BCH/USD","ETC/USD","VET/USD","AAVE/USD",
    "EOS/USD","XTZ/USD","THETA/USD","AXS/USD","SAND/USD",
    "MANA/USD","GALA/USD","ENJ/USD","CHZ/USD","CRV/USD",
    "LDO/USD","DYDX/USD","SNX/USD","COMP/USD","MKR/USD",
    "SUSHI/USD","YFI/USD","1INCH/USD","BAL/USD","ZRX/USD",
    "KNC/USD","CELO/USD","FLOW/USD","EGLD/USD","ROSE/USD",
    "ONE/USD","QTUM/USD","ZIL/USD","ICX/USD","ONT/USD",
    "IOST/USD","ZEC/USD","DASH/USD","NEO/USD","WAVES/USD",
    "KAVA/USD","ANKR/USD","SKL/USD","STORJ/USD","BAND/USD",
    "REN/USD","BAT/USD","MASK/USD","GRT/USD","ENS/USD",
    "SSV/USD","RPL/USD","GMX/USD","PENDLE/USD","STX/USD",
    "CFX/USD","PEPE/USD","FLOKI/USD","WLD/USD","BONK/USD",
    "JTO/USD","PYTH/USD","JUP/USD","WIF/USD","ORDI/USD",
    "RUNE/USD","TAO/USD","AR/USD","RNDR/USD","AKT/USD",
    "JASMY/USD","IOTA/USD","RVN/USD","FLUX/USD",
    "AGIX/USD","OCEAN/USD","NMR/USD","DGB/USD",
    "UMA/USD","PERP/USD","LQTY/USD","SPELL/USD",
    "CAKE/USD","RDNT/USD","GNS/USD","RAY/USD",
    "MAGIC/USD","AUDIO/USD","API3/USD","DIA/USD",
    "TRB/USD","STG/USD","ENA/USD","ETHFI/USD",
    "TNSR/USD","OMNI/USD","ZRO/USD","EIGEN/USD",
    "NEIRO/USD","GOAT/USD","PNUT/USD","VIRTUAL/USD",
    "AIXBT/USD","AI16Z/USD","CGPT/USD"
  ],

  // ═══════════════════════════════════════════════════════════════
  // FOREX PARİTELER (28 MAJÖR)
  // apis.js Yahoo'da "EURUSD=X" formatına çevirir
  // ═══════════════════════════════════════════════════════════════
  FOREX_PAIRS: [
    "EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD",
    "EURGBP","EURJPY","GBPJPY","CHFJPY","EURCHF","AUDJPY","CADJPY",
    "EURAUD","EURCAD","EURNZD","GBPAUD","GBPCAD","GBPNZD","GBPCHF",
    "AUDNZD","AUDCAD","AUDCHF","NZDCAD","NZDCHF","CADCHF","USDSGD"
  ],

  // ═══════════════════════════════════════════════════════════════
  // BIST HİSSELERİ
  // apis.js Yahoo'da "AKBNK.IS" formatına çevirir
  // ═══════════════════════════════════════════════════════════════
  BIST_SYMBOLS: [
    "AKBNK","ARCLK","ASELS","BIMAS","EKGYO","ENKAI","EREGL","FROTO","GARAN",
    "GUBRF","HEKTS","ISCTR","KCHOL","KOZAA","KOZAL","KRDMD","MGROS","ODAS",
    "PETKM","PGSUS","SAHOL","SASA","SISE","SOKM","TAVHL","TCELL","THYAO",
    "TKFEN","TOASO","TUPRS","AEFES","AKSA","AKSEN","ALARK","ALFAS","ALGYO",
    "ALKIM","ANSGR","AYGAZ","BAGFS","CCOLA","CEMTS","CIMSA","DOAS","DOHOL",
    "EGEEN","ENJSA","GESAN","GLYHO","GSDHO","HALKB","IPEKE","ISGYO","KAREL",
    "KARTN","KONTR","KORDS","LOGO","MAVI","NETAS","OTKAR","OYAKC","SKBNK",
    "SMRTG","SNGYO","TTKOM","TTRAK","TURSG","ULKER","VAKBN","VESBE","VESTL",
    "YKBNK","YUNSA","ZOREN","ADEL","ADESE","AFYON","AGESA","AGHOL","AKCNS",
    "AKFYE","AKMGY","AKSGY","ALBRK","ALCAR","ALCTL","ALKA","ALMAD","ALTNY",
    "ANELE","ANGEN","ANHYT","ARENA","ARMDA","ARSAN","ASTOR","ATAGY","ATATP",
    "AVHOL","AVOD","AVTUR","AYCES","AYEN","AZTEK","BAKAB","BALAT","BANVT",
    "BARMA","BAYRK","BERA","BEYAZ","BFREN","BIENY","BINHO","BIOEN","BIZIM",
    "BJKAS","BLCYT","BMSTL","BNTAS","BOSSA","BOYP","BRISA","BRKO","BRKSN",
    "BRSAN","BRYAT","BSOKE","BTCIM","BUCIM","BURCE","BURVA","BVSAN","BYDNR",
    "CANTE","CASA","CATES","CELHA","CEMAS","CEOEM","CLEBI","CMBTN","CMENT",
    "CONSE","COSMO","CRDFA","CRFSA","CUSAN","CVKMD","CWENE","DAGHL","DAGI",
    "DAPGM","DARDL","DENGE","DERHL","DERIM","DESA","DESPC","DEVA","DGATE",
    "DGGYO","DGNMO","DIRIT","DITAS","DJIST","DMSAS","DNISI","DOBUR","DOCO",
    "DOGUB","DOKTA","DURDO","DYOBY","DZGYO","EDATA","EDIP","EGEPO","EGGUB",
    "EGPRO","EGSER","EKSUN","ELITE","EMKEL","EMNIS","ENSRI","ENTRA","EPLAS",
    "ERBOS","ERSU","ESCAR","ESCOM","ESEN","ETILR","ETYAT","EUHOL","EUPWR",
    "EUREN","EVREN","FADE","FENER","FLAP","FONET","FORMT","FORTE","FRIGO",
    "FZLGY","GARFA","GEDIK","GEDZA","GENIL","GENTS","GEREL","GIPTS","GLBMD",
    "GLCVY","GLRYH","GMTAS","GOKNR","GOLTS","GOODY","GOZDE","GRSEL","GRTRK",
    "GSDDE","GSRAY","GWIND","GZNMI","HATEK","HATSN","HEDEF","HKTM","HLGYO",
    "HOROZ","HRKET","HTTBT","HUBVC","HUNER","HURGZ","ICBCT","ICUGS","IDEAS",
    "IDGYO","IEYHO","IHAAS","IHEVA","IHGZT","IHLAS","IHLGM","IHYAY","IMASM",
    "INDES","INFO","INTEM","INVEO","INVES","ISBIR","ISBTR","ISDMR","ISFIN",
    "ISGSY","ISKPL","ISKUR","ISMEN","ISYAT","IZENR","IZFAS","IZINV","IZMDC",
    "JANTS","KAPLM","KARSN","KARYE","KATMR","KAYSE","KBORU","KENT","KERVN",
    "KERVT","KFEIN","KIMMR","KLGYO","KLKIM","KLMSN","KLNMA","KLSER","KLSYN",
    "KMPUR","KNFRT","KONKA","KONYA","KOPOL","KRGYO","KRONT","KRSTL","KRVGD",
    "KTLEV","KTSKR","KUTPO","KUYAS","KZBGY","KZGYO","LIDER","LIDFA","LKMNH",
    "LRSHO","LUKSK","MAALT","MACKO","MAGEN","MAKIM","MAKTK","MANAS","MARBL",
    "MARKA","MARTI","MEDTR","MEGAP","MEGMT","MEKAG","MERCN","MERIT","MERKO",
    "METRO","METUR","MHRGY","MIATK","MIPAZ","MNDRS","MNDTR","MOBTL","MOGAN",
    "MPARK","MRGYO","MRSHL","MSGYO","MTRKS","MTRYO","MZHLD","NATEN","NIBAS",
    "NUGYO","NUHCM","OBAMS","OBASE","OFSYM","ONCSM","ORCAY","ORGE","ORMA",
    "OSMEN","OSTIM","OTTO","OYLUM","OYYAT","OZGYO","OZKGY","OZRDN","OZSUB",
    "PAGYO","PAMEL","PAPIL","PARSN","PASEU","PEHOL","PEKGY","PENGD","PENTA",
    "PETUN","PINSU","PKART","PKENT","PLTUR","PNSUT","POLHO","POLTK","PRDGS",
    "PRKAB","PRKME","PRTAS","PRZMA","PSDTC","PSGYO","QNBFB","QNBFL","RALYH",
    "RAYSG","REEDR","RGYAS","RICOS","RMADA","RODRG","ROYAL","RTALB","RUBNS",
    "RYGYO","RYSAS","SAFKR","SAMAT","SANEL","SANFM","SANKO","SARKY","SAYAS",
    "SDTTR","SEGYO","SEKFK","SEKUR","SELEC","SELGD","SELVA","SEYKM","SILVR",
    "SKTAS","SKYLP","SKYMD","SMART","SNKRN","SNPAM","SODSN","SOKE","SONME",
    "SRVGY","SUMAS","SUNTK","SUWEN","TATGD","TBORG","TDGYO","TEKTU","TERA",
    "TETMT","TEZOL","TGSAS","TKNSA","TLMAN","TMPOL","TMSN","TNZTP","TRCAS",
    "TRGYO","TRILC","TSGYO","TSKB","TUCLK","TUKAS","TUREX","TURGG","UFUK",
    "ULAS","ULUFA","ULUSE","ULUUN","UMPAS","UNLU","USAK","UZERB","VAKFN",
    "VAKKO","VANGD","VBTYZ","VERTU","VERUS","VKFYO","VKGYO","VKING","VOCAS",
    "YAPRK","YATAS","YAYLA","YBTAS","YEOTK","YGGYO","YGYO","YIGIT","YKSLN",
    "YONGA","YYAPI","ZEDUR","ZRGYO"
  ]
};
