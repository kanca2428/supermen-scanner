var fs = require("fs");
var path = require("path");
var CONFIG = require("./config");
var analysis = require("./analysis");
var telegram = require("./telegram");
var DATA_DIR = path.join(__dirname, "..", "data");

function writeJSON(file, data) {
  try {
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
  } catch (e) {
    console.log("Dosya yazma hatasi: " + e.message);
  }
}

async function scan(market) {
  var symbols = [];
  if (market === "crypto") symbols = CONFIG.CRYPTO_PAIRS;
  else if (market === "bist") symbols = CONFIG.BIST_SYMBOLS;
  else if (market === "forex") symbols = CONFIG.FOREX_PAIRS;
  else return []; // Bilinmeyen market tipi

  var signals = [];
  console.log("Taraniyor: " + market.toUpperCase() + " (" + symbols.length + " sembol)...");
  for (var sym of symbols) {
    try {
      var res = await analysis.analyzeSingleSymbol(sym);
      if (res) {
        signals.push(res);
        console.log("✅ Sinyal Bulundu: " + sym);
      }
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.log("Hata (" + sym + "): " + e.message);
    }
  }
  return signals;
}

async function main() {
  console.log("🚀 SUPERMEN V16.0 Baslatiliyor...");
  var token = process.env.TELEGRAM_BOT_TOKEN || "";
  console.log("Telegram Token Durumu: " + (token ? "✅ Var (" + token.substring(0,3) + "...)" : "❌ YOK!"));

  var mode = process.argv[2] || "all";
  var allSignals = {};

  var marketsToScan = [];
  if (mode === "all") {
    marketsToScan.push("crypto", "bist", "forex");
  } else if (["crypto", "bist", "forex"].includes(mode)) {
    marketsToScan.push(mode);
  }

  for (var market of marketsToScan) {
    allSignals[market] = await scan(market);
  }

  writeJSON("signals.json", allSignals);

  for (var market of marketsToScan) {
    var signals = allSignals[market];
    var marketTitle = market.toUpperCase();
    if (signals && signals.length > 0) {
      await telegram.sendTelegram(telegram.buildMarketMessage(marketTitle, signals));
    } else {
      console.log(marketTitle + " icin sinyal yok, bos mesaj gonderiliyor...");
      await telegram.sendTelegram("🚫 <b>" + marketTitle + " TARAMASI</b>\n\nŞu an kriterlere uygun sinyal bulunamadı.\n⏰ " + new Date().toLocaleTimeString("tr-TR"));
    }
  }

  console.log("🏁 Tarama Tamamlandi.");
}

main();
