var fs = require("fs");
var path = require("path");
var CONFIG = require("./config");
var apis = require("./apis");
var analysis = require("./analysis");
var telegram = require("./telegram");

var DATA_DIR = path.join(__dirname, "..", "data");
var SIGNALS_FILE = path.join(DATA_DIR, "signals.json");
var HISTORY_FILE = path.join(DATA_DIR, "history.json");
var STATUS_FILE = path.join(DATA_DIR, "status.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filePath, defaultVal) {
  try { if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (e) {}
  return defaultVal;
}

function writeJSON(filePath, data) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function saveSignals(market, signals, scanned) {
  var current = readJSON(SIGNALS_FILE, {});
  current[market] = { signals: signals || [], scanned: scanned, total: (signals || []).length, updatedAt: new Date().toISOString() };
  writeJSON(SIGNALS_FILE, current);
}

function saveHistory(market, signals) {
  var history = readJSON(HISTORY_FILE, []);
  var now = new Date().toISOString();
  for (var i = 0; i < (signals || []).length; i++) {
    var s = signals[i];
    history.push({ market: market, symbol: s.displaySymbol, direction: s.direction, price: s.lastPrice, score: s.score, tp1: s.tp1, tp2: s.tp2, sl: s.stopLoss, vol24h: s.vol24h, timestamp: now });
  }
  var buyC = 0, sellC = 0;
  for (var i = 0; i < (signals || []).length; i++) {
    if (signals[i].direction > 0) buyC++; else sellC++;
  }
  history.push({ market: market, type: "summary", buyCount: buyC, sellCount: sellC, totalSignals: (signals || []).length, timestamp: now });
  writeJSON(HISTORY_FILE, history.slice(-500));
}

function updateStatus(market, status, details) {
  var current = readJSON(STATUS_FILE, {});
  var obj = { status: status, updatedAt: new Date().toISOString() };
  if (details) { for (var k in details) obj[k] = details[k]; }
  current[market] = obj;
  current.lastRun = new Date().toISOString();
  current.version = "V15.0";
  writeJSON(STATUS_FILE, current);
}

async function scanCrypto() {
  console.log("\n=== KRIPTO TARAMA ===");
  updateStatus("crypto", "scanning");
  var tickers = {};
  try { tickers = await apis.getCryptoTickers(); } catch (e) {}
  var signals = [], scanned = 0;
  for (var i = 0; i < CONFIG.CRYPTO_PAIRS.length; i++) {
    var pair = CONFIG.CRYPTO_PAIRS[i];
    var tk = apis.getPriceFromTickers(pair, tickers);
    if (!tk || tk.lastPrice <= 0) continue;
    try {
      scanned++;
      var sig = await analysis.analyzeSingle(pair, "crypto", tk.lastPrice, tk.vol24h, tk.changeRate);
      if (sig) { signals.push(sig); console.log("  + " + pair + " " + (sig.direction > 0 ? "AL" : "SAT") + " " + sig.score.toFixed(1)); }
    } catch (e) {}
  }
  signals.sort(function(a, b) { return b.score - a.score; });
  var top = signals.slice(0, CONFIG.MAX_SIGNALS_PER_MARKET);
  saveSignals("crypto", top, scanned);
  saveHistory("crypto", top);
  updateStatus("crypto", "done", { scanned: scanned, found: signals.length });
  await telegram.sendTelegram(telegram.buildMarketMessage("🪙 KRİPTO", top, scanned, signals.length));
  console.log("=== KRIPTO BITTI: " + scanned + " tarandi, " + signals.length + " sinyal ===\n");
}

async function scanForex() {
  console.log("\n=== FOREX TARAMA ===");
  updateStatus("forex", "scanning");
  var signals = [], scanned = 0;
  for (var i = 0; i < CONFIG.FOREX_PAIRS.length; i++) {
    var pair = CONFIG.FOREX_PAIRS[i];
    try {
      scanned++;
      await new Promise(function(r) { setTimeout(r, 300); });
      var q = await apis.getYahooQuote(pair.replace("/", "") + "=X");
      if (!q || q.lastPrice <= 0) continue;
      var sig = await analysis.analyzeSingle(pair, "forex", q.lastPrice, q.vol24h, q.changeRate);
      if (sig) { signals.push(sig); console.log("  + " + pair + " " + (sig.direction > 0 ? "AL" : "SAT") + " " + sig.score.toFixed(1)); }
    } catch (e) {}
  }
  signals.sort(function(a, b) { return b.score - a.score; });
  var top = signals.slice(0, CONFIG.MAX_SIGNALS_PER_MARKET);
  saveSignals("forex", top, scanned);
  saveHistory("forex", top);
  updateStatus("forex", "done", { scanned: scanned, found: signals.length });
  await telegram.sendTelegram(telegram.buildMarketMessage("💱 FOREX", top, scanned, signals.length));
  console.log("=== FOREX BITTI: " + scanned + " tarandi, " + signals.length + " sinyal ===\n");
}

async function scanBist() {
  console.log("\n=== BIST TARAMA ===");
  updateStatus("bist", "scanning");
  var signals = [], scanned = 0;
  for (var i = 0; i < CONFIG.BIST_SYMBOLS.length; i++) {
    var sym = CONFIG.BIST_SYMBOLS[i];
    try {
      scanned++;
      await new Promise(function(r) { setTimeout(r, 300); });
      var q = await apis.getYahooQuote(sym + ".IS");
      if (!q || q.lastPrice <= 0) continue;
      var sig = await analysis.analyzeSingle(sym, "bist", q.lastPrice, q.vol24h, q.changeRate);
      if (sig) { signals.push(sig); console.log("  + " + sym + " " + (sig.direction > 0 ? "AL" : "SAT") + " " + sig.score.toFixed(1)); }
    } catch (e) {}
  }
  signals.sort(function(a, b) { return b.score - a.score; });
  var top = signals.slice(0, CONFIG.MAX_SIGNALS_PER_MARKET);
  saveSignals("bist", top, scanned);
  saveHistory("bist", top);
  updateStatus("bist", "done", { scanned: scanned, found: signals.length });
  await telegram.sendTelegram(telegram.buildMarketMessage("🏦 BIST", top, scanned, signals.length));
  console.log("=== BIST BITTI: " + scanned + " tarandi, " + signals.length + " sinyal ===\n");
}

async function testAPIs() {
  console.log("\n=== API TESTI ===\n");
  console.log("1) Binance kline:");
  try {
    var c = await apis.fetchCandles("BTC/USD", "crypto", "D1", 5);
    console.log(c && c.length > 0 ? "  OK " + c.length + " mum, $" + c[0].close : "  FAIL");
  } catch (e) { console.log("  FAIL " + e.message); }
  console.log("\n2) Ticker:");
  try {
    var t = await apis.getCryptoTickers();
    var btc = t["BTCUSDT"];
    console.log("  OK " + Object.keys(t).length + " sembol | BTC: $" + (btc ? btc.lastPrice : "?"));
  } catch (e) { console.log("  FAIL " + e.message); }
  console.log("\n3) Telegram:");
  await telegram.sendTelegram("🧪 <b>SUPERMEN V15.0</b>\n\n✅ Test OK!\n⏰ " + telegram.getNow());
}

async function main() {
  var mode = process.argv[2] || "all";
  console.log("\n🚀 SUPERMEN V15.0 — Mod: " + mode);
  try {
    if (mode === "crypto") await scanCrypto();
    else if (mode === "forex") await scanForex();
    else if (mode === "bist") await scanBist();
    else if (mode === "test") await testAPIs();
    else if (mode === "all") {
      await scanCrypto();
      await scanForex();
      await scanBist();
    }
    else console.log("Kullanim: node src/scanner.js [crypto|forex|bist|all|test]");
  } catch (e) { console.error("HATA:", e); }
  console.log("\nTamamlandi.\n");
}

main();
