var fs = require("fs");
var path = require("path");
var CONFIG = require("./config");
var analysis = require("./analysis");
var telegram = require("./telegram");
var DATA_DIR = path.join(__dirname, "..", "data");
function writeJSON(file, data) { fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2)); }
async function scan(market) {
  var symbols = market === "crypto" ? CONFIG.CRYPTO_PAIRS : CONFIG.BIST_SYMBOLS;
  var signals = [];
  console.log("Scanning " + market + "...");
  for (var sym of symbols) {
    try {
      var res = await analysis.analyzeSingleSymbol(sym);
      if (res) { signals.push(res); console.log("Found: " + sym); }
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {}
  }
  return signals;
}
async function main() {
  var mode = process.argv[2] || "all";
  var allSignals = {};
  if (mode === "crypto" || mode === "all") allSignals.crypto = await scan("crypto");
  if (mode === "bist" || mode === "all") allSignals.bist = await scan("bist");
  writeJSON("signals.json", allSignals);
  if (allSignals.crypto && allSignals.crypto.length) await telegram.sendTelegram(telegram.buildMarketMessage("CRYPTO", allSignals.crypto));
  if (allSignals.bist && allSignals.bist.length) await telegram.sendTelegram(telegram.buildMarketMessage("BIST", allSignals.bist));
  console.log("Done.");
}
main();
