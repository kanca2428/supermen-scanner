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
  // STOCHASTIC AYARLARI (H4 + D1 + W1 AND SİSTEMİ)
  // ═══════════════════════════════════════════════════════════════
  STOCH_K_PERIOD: 21,
  STOCH_D_PERIOD: 3,
  STOCH_SLOWING: 3,
  STOCH_OB_LEVEL: 85.0,   // 85 üstü = SELL sinyali
  STOCH_OS_LEVEL: 15.0,   // 15 altı = BUY sinyali
  STOCH_USE_M5: false,
  STOCH_USE_M15: false,
  STOCH_USE_H4: true,     // ✅ Aktif
  STOCH_USE_D1: true,     // ✅ Aktif
  STOCH_USE_W1: true,     // ✅ Aktif

  // ═══════════════════════════════════════════════════════════════
  // PIVOT POINT / SUPPORT & RESISTANCE AYARLARI
  // ═══════════════════════════════════════════════════════════════
  PIVOT_USE_H4: true,     // ✅ Stochastic ile aynı
  PIVOT_USE_D1: true,     // ✅ Stochastic ile aynı
  PIVOT_USE_W1: true,     // ✅ Stochastic ile aynı
  PIVOT_METHOD: "classic", // classic, fibonacci, camarilla, woodie

  // S/R Sinyal Kuralları:
  // BUY  → Fiyat S1/S2/S3 seviyesine yakın veya altında
  // SELL → Fiyat R1/R2/R3 seviyesine yakın veya üstünde
  SR_PROXIMITY_PERCENT: 0.5, // Fiyat S/R seviyesine %0.5 yakınsa sinyal

  // ═══════════════════════════════════════════════════════════════
  // ATR AYARLARI
  // ═══════════════════════════════════════════════════════════════
  ATR_PERIOD: 14,
  ATR_MULTIPLIER_SL: 5.0,
  ATR_TP1_MULTIPLIER: 2.0,
  ATR_TP2_MULTIPLIER: 4.0,

  // ═══════════════════════════════════════════════════════════════
  // SİNYAL LİMİTLERİ
  // ═══════════════════════════════════════════════════════════════
  MAX_SIGNALS_PER_MARKET: 10,

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
  // TÜM KRİPTO PARALAR (500+)
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
    "AGIX/USD","OCEAN/USD","NMR/USD","CTXC/USD","DGB/USD",
    "ORAI/USD","OLAS/USD","AIOZ/USD","PHALA/USD","ATOR/USD",
    "UMA/USD","PERP/USD","ALPHA/USD","LQTY/USD","SPELL/USD",
    "BIFI/USD","CAKE/USD","JOE/USD","VELO/USD","AERO/USD",
    "RDNT/USD","GNS/USD","GRAIL/USD","CAMELOT/USD","VELA/USD",
    "GAINS/USD","KWENTA/USD","LYRA/USD","PREMIA/USD","DOPEX/USD",
    "JONES/USD","MAGIC/USD","LODE/USD","PLUTUS/USD","GMD/USD",
    "Y2K/USD","TENDER/USD","MUX/USD","MYCELIUM/USD","CAP/USD",
    "ILV/USD","ALICE/USD","ATLAS/USD","POLIS/USD","GODS/USD",
    "PRIME/USD","BEAM/USD","XPET/USD","BIGTIME/USD",
    "PIXEL/USD","PORTAL/USD","NYAN/USD","HERO/USD","TOWER/USD",
    "MOBOX/USD","STARL/USD","UFO/USD","VRA/USD","WEMIX/USD",
    "GAFI/USD","ACE/USD","YGG/USD","MC/USD","LOKA/USD",
    "DAR/USD","PYR/USD","SUPER/USD","WILD/USD","RFOX/USD",
    "OSMO/USD","SCRT/USD","JUNO/USD","STARS/USD","KUJI/USD",
    "KLAY/USD","BORA/USD",
    "AZERO/USD","CSPR/USD","CKB/USD","ERG/USD","TLOS/USD",
    "WAX/USD","XDC/USD","VLX/USD","CANTO/USD","EVMOS/USD",
    "ASTR/USD","SDN/USD","GLMR/USD","MOVR/USD","ACA/USD",
    "KSM/USD","PARA/USD","CLV/USD","LIT/USD","PHA/USD",
    "REEF/USD","RAMP/USD","CHESS/USD","SFP/USD","TWT/USD",
    "MULTI/USD","DODO/USD","BURGER/USD","BEL/USD","AUTO/USD",
    "STRK/USD","ZKSYNC/USD","BASE/USD","MANTA/USD","SCROLL/USD",
    "LINEA/USD","TAIKO/USD","FUEL/USD","BLAST/USD","MODE/USD",
    "METIS/USD","BOBA/USD","CELR/USD","CTK/USD","OMG/USD",
    "LRC/USD","DUSK/USD","ZKS/USD","ZKSPACE/USD",
    "MYRO/USD","POPCAT/USD","MEW/USD","BOME/USD","SLERF/USD","WEN/USD",
    "ELON/USD","BABYDOGE/USD","SAITAMA/USD",
    "KISHU/USD","AKITA/USD","HOGE/USD","VOLT/USD","BONE/USD",
    "LEASH/USD","SAMO/USD","COPE/USD","CHEEMS/USD","WOJAK/USD",
    "MOCHI/USD","BOBO/USD","BRETT/USD","TOSHI/USD","DEGEN/USD",
    "HIGHER/USD","NORMIE/USD","MFER/USD","BASED/USD",
    "TYBG/USD","FRIEND/USD","BALD/USD","HEX/USD","PULSEX/USD",
    "TURBO/USD","MILADY/USD","AIDOGE/USD","LADYS/USD","PSYOP/USD",
    "BEN/USD","FINALE/USD","SIMPSON/USD","BOB/USD","PEPE2/USD",
    "BLUR/USD","X2Y2/USD","LOOKS/USD","RARI/USD",
    "AUDIO/USD","RAD/USD","DESO/USD","WHALE/USD","GHST/USD",
    "REVV/USD","NFTX/USD","BICO/USD","API3/USD",
    "DIA/USD","TRB/USD",
    "NEST/USD","DOS/USD","RAZOR/USD",
    "XMR/USD",
    "GRIN/USD","ARRR/USD","PIVX/USD","FIRO/USD",
    "ZEN/USD","KMD/USD","DCR/USD","OXEN/USD","ONION/USD",
    "SC/USD","BTT/USD",
    "HNT/USD","MOBILE/USD","IOT/USD","IOTX/USD",
    "RLC/USD","NKN/USD","POKT/USD","LPT/USD",
    "GNO/USD","MLN/USD","BADGER/USD","ROOK/USD","BOND/USD",
    "OKB/USD","CRO/USD","FTT/USD","LEO/USD",
    "HT/USD","KCS/USD","GT/USD","MX/USD","WOO/USD",
    "QUICK/USD","THE/USD","THENA/USD",
    "FXS/USD","CVX/USD","ALCX/USD",
    "ONDO/USD","MPL/USD","TRU/USD","CPOOL/USD","MAPLE/USD",
    "GFI/USD","RBN/USD",
    "SATS/USD","RATS/USD","PUPS/USD",
    "DOG/USD","WZRD/USD","RSIC/USD","NALS/USD",
    "PIPE/USD","TRAC/USD","STAMP/USD","OXBT/USD","MUBI/USD",
    "RAY/USD","SRM/USD","MNGO/USD","ORCA/USD",
    "STEP/USD","SHDW/USD","CHAT/USD",
    "MEAN/USD","TULIP/USD","PORT/USD","LARIX/USD","SLIM/USD",
    "REGEN/USD","CMDX/USD","SOMM/USD","NTRN/USD",
    "MNTA/USD","HARD/USD",
    "SWP/USD","UMEE/USD","MARS/USD","STRIDE/USD","DYM/USD",
    "SAGA/USD","DYMENSION/USD",
    "RING/USD","CFG/USD","NODL/USD","UNQ/USD","INTR/USD","KINT/USD",
    "BNC/USD","ZENLINK/USD","RMRK/USD",
    "PNG/USD","QI/USD","XAVA/USD",
    "YAK/USD","SNOB/USD","TIME/USD","COOK/USD",
    "GRAPE/USD","MORE/USD","GLP/USD",
    "DPEX/USD","STG/USD","STARGATE/USD",
    "ENA/USD","ETHFI/USD","ALT/USD",
    "AEVO/USD","W/USD","TNSR/USD","OMNI/USD",
    "REZ/USD","BB/USD","NOT/USD","IO/USD","ZK/USD",
    "ZRO/USD","LISTA/USD","BANANA/USD","RARE/USD","G/USD",
    "DOGS/USD","HMSTR/USD","CATI/USD","EIGEN/USD","SCR/USD",
    "NEIRO/USD","GOAT/USD","PNUT/USD",
    "CHILLGUY/USD","VIRTUAL/USD","GRIFFAIN/USD","AIXBT/USD","FARTCOIN/USD",
    "AI16Z/USD","ZEREBRO/USD","ARC/USD","SWARM/USD","ELIZA/USD",
    "CGPT/USD","PAAL/USD","RSS3/USD"
  ],

  // ═══════════════════════════════════════════════════════════════
  // TÜM BIST HİSSELERİ (500+)
  // ═══════════════════════════════════════════════════════════════
  BIST_SYMBOLS: [
    "AKBNK","ARCLK","ASELS","BIMAS","EKGYO","ENKAI","EREGL","FROTO","GARAN",
    "GUBRF","HEKTS","ISCTR","KCHOL","KOZAA","KOZAL","KRDMD","MGROS","ODAS",
    "PETKM","PGSUS","SAHOL","SASA","SISE","SOKM","TAVHL","TCELL","THYAO",
    "TKFEN","TOASO","TUPRS",
    "AEFES","AKSA","AKSEN","ALARK","ALFAS","ALGYO","ALKIM","ANSGR",
    "AYGAZ","BAGFS","CCOLA","CEMTS","CIMSA","DOAS","DOHOL","EGEEN",
    "ENJSA","GESAN","GLYHO","GSDHO","HALKB","IPEKE","ISGYO","KAREL",
    "KARTN","KONTR","KORDS","LOGO","MAVI","NETAS","OTKAR","OYAKC",
    "QUAGR","SKBNK","SMRTG","SNGYO","TTKOM","TTRAK","TURSG","ULKER",
    "VAKBN","VESBE","VESTL","YKBNK","YUNSA","ZOREN",
    "ADEL","ADESE","AFYON","AGESA","AGHOL","AHGAZ","AKCNS","AKFGY",
    "AKFYE","AKMGY","AKSGY","AKSUE","ALBRK","ALCAR","ALCTL",
    "ALKA","ALMAD","ALTNY","ANELE","ANGEN","ANHYT",
    "ARENA","ARMDA","ARSAN","ASTOR","ATAGY","ATAKP","ATATP",
    "AVHOL","AVOD","AVPGY","AVTUR","AYCES","AYEN","AZTEK",
    "BAKAB","BALAT","BANVT","BARMA","BASCM","BASGZ","BAYRK",
    "BERA","BEYAZ","BFREN","BIENY","BIGCH","BINHO","BIOEN",
    "BIZIM","BJKAS","BLCYT","BMSCH","BMSTL","BNTAS","BOSSA","BOYP",
    "BRISA","BRKO","BRKSN","BRKVY","BRLSM","BRSAN","BRYAT","BSOKE",
    "BTCIM","BUCIM","BURCE","BURVA","BVSAN","BYDNR","CANTE","CASA",
    "CATES","CELHA","CEMAS","CEOEM","CLEBI",
    "CMBTN","CMENT","CONSE","COSMO","CRDFA","CRFSA","CUSAN","CVKMD",
    "CWENE","DAGHL","DAGI","DAPGM","DARDL","DENGE","DERHL","DERIM",
    "DESA","DESPC","DEVA","DGATE","DGGYO","DGNMO","DIRIT","DITAS",
    "DJIST","DMSAS","DNISI","DOBUR","DOCO","DOGUB",
    "DOKTA","DURDO","DYOBY","DZGYO","EDATA","EDIP","EGEPO",
    "EGGUB","EGPRO","EGSER","EKSUN","ELITE","EMKEL","EMNIS",
    "ENSRI","ENTRA","EPLAS","ERBOS","ERCB",
    "ERSU","ESCAR","ESCOM","ESEN","ETILR","ETYAT","EUHOL","EUPWR",
    "EUREN","EVREN","FADE","FENER","FLAP","FMIZP","FONET","FORMT",
    "FORTE","FRIGO","FZLGY","GARFA","GEDIK","GEDZA",
    "GENIL","GENTS","GEREL","GIPTS","GLBMD","GLCVY","GLRYH",
    "GMTAS","GOKNR","GOLTS","GOODY","GOZDE","GRSEL","GRTRK",
    "GSDDE","GSRAY","GWIND","GZNMI","HATEK","HATSN",
    "HDFFL","HEDEF","HKTM","HLGYO","HOROZ","HRKET","HTTBT",
    "HUBVC","HUNER","HURGZ","ICBCT","ICUGS","IDEAS","IDGYO","IEYHO",
    "IHAAS","IHEVA","IHGZT","IHLAS","IHLGM","IHYAY","IMASM","INDES",
    "INFO","INGRM","INTEM","INVEO","INVES","ISBIR","ISBTR",
    "ISDMR","ISFIN","ISGSY","ISKPL","ISKUR","ISMEN",
    "ISYAT","IZENR","IZFAS","IZINV","IZMDC","JANTS","KAPLM",
    "KARSN","KARYE","KATMR","KAYSE","KBORU","KCAER",
    "KENT","KERVN","KERVT","KFEIN","KGYO","KIMMR","KLGYO","KLKIM",
    "KLMSN","KLNMA","KLRHO","KLSER","KLSYN","KMPUR","KNFRT","KONKA",
    "KONYA","KOPOL","KRGYO","KRONT","KRPLS","KRSTL",
    "KRVGD","KTLEV","KTSKR","KUTPO","KUYAS","KZBGY","KZGYO","LIDER",
    "LIDFA","LKMNH","LRSHO","LUKSK","MAALT","MACKO",
    "MAGEN","MAKIM","MAKTK","MANAS","MARBL","MARKA","MARTI",
    "MEDTR","MEGAP","MEGMT","MEKAG","MERCN","MERIT","MERKO","METRO",
    "METUR","MHRGY","MIATK","MIPAZ","MNDRS","MNDTR","MOBTL",
    "MOGAN","MPARK","MRGYO","MRSHL","MSGYO","MTRKS","MTRYO","MZHLD",
    "NATEN","NIBAS","NUGYO","NUHCM","OBAMS","OBASE",
    "OFSYM","ONCSM","ORCAY","ORGE","ORMA","OSMEN","OSTIM",
    "OTTO","OYLUM","OYYAT","OZGYO","OZKGY","OZRDN","OZSUB",
    "PAGYO","PAMEL","PAPIL","PARSN","PASEU","PCILT","PEHOL","PEKGY",
    "PENGD","PENTA","PETUN","PINSU","PKART","PKENT",
    "PLTUR","PNLSN","PNSUT","POLHO","POLTK","PRDGS","PRKAB","PRKME",
    "PRTAS","PRZMA","PSDTC","PSGYO","QNBFB","QNBFL","RALYH",
    "RAYSG","REEDR","RGYAS","RICOS","RMADA","RODRG","ROYAL","RTALB",
    "RUBNS","RYGYO","RYSAS","SAFKR","SAMAT","SANEL","SANFM",
    "SANKO","SARKY","SAYAS","SDTTR","SEGYO","SEKFK","SEKUR",
    "SELEC","SELGD","SELVA","SEYKM","SILVR","SKTAS",
    "SKYLP","SKYMD","SMART","SNKRN","SNPAM","SODSN",
    "SOKE","SONME","SRVGY","SUMAS","SUNTK","SUWEN","TATGD",
    "TBORG","TDGYO","TEKTU","TERA","TETMT","TEZOL",
    "TGSAS","TKNSA","TLMAN","TMPOL","TMSN","TNZTP",
    "TRCAS","TRGYO","TRILC","TSGYO","TSKB",
    "TUCLK","TUKAS","TUREX","TURGG","UFUK","ULAS",
    "ULUFA","ULUSE","ULUUN","UMPAS","UNLU","USAK","UZERB",
    "VAKFN","VAKKO","VANGD","VBTYZ","VERTU","VERUS",
    "VKFYO","VKGYO","VKING","VOCAS","YAPRK","YATAS","YAYLA",
    "YBTAS","YEOTK","YGGYO","YGYO","YIGIT","YKSLN","YONGA",
    "YYAPI","ZEDUR","ZRGYO"
  ]
};
