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
  var symbols = market === "crypto" ? CONFIG.CRYPTO_PAIRS : CONFIG.BIST_SYMBOLS;
  var signals = [];
  console.log("Scanning " + market + " (" + symbols.length + " symbols)...");
  
  for (var sym of symbols) {
    try {
      var res = await analysis.analyzeSingleSymbol(sym);
      if (res) {
        signals.push(res);
        console.log("✅ Found: " + sym);
      }
      // Rate limit icin bekleme
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.log("Error scanning " + sym + ": " + e.message);
    }
  }
  return signals;
}

async function main() {
  console.log("🚀 SUPERMEN V16.0 Baslatiliyor...");
  
  // Token kontrolü (Loglara token'in ilk 3 harfini basar, guvenlik icin tamamini basmaz)
  var token = process.env.TELEGRAM_BOT_TOKEN || "";
  console.log("Telegram Token Durumu: " + (token ? "✅ Var (" + token.substring(0,3) + "...)" : "❌ YOK!"));
  
  var mode = process.argv[2] || "all";
  var allSignals = {};
  
  if (mode === "crypto" || mode === "all") {
    allSignals.crypto = await scan("crypto");
  }
  
  if (mode === "bist" || mode === "all") {
    allSignals.bist = await scan("bist");
  }
  
  writeJSON("signals.json", allSignals);
  
  // --- KRITIK DEGISIKLIK: Sinyal olsa da olmasa da mesaj at ---
  
  // Crypto Mesajı
  if (allSignals.crypto) {
    if (allSignals.crypto.length > 0) {
      await telegram.sendTelegram(telegram.buildMarketMessage("CRYPTO", allSignals.crypto));
    } else {
      console.log("Crypto sinyali yok, bos mesaj gonderiliyor...");
      await telegram.sendTelegram("🚫 <b>CRYPTO TARAMASI</b>\n\nŞu an kriterlere uygun sinyal bulunamadı.\n⏰ " + new Date().toLocaleTimeString("tr-TR"));
    }
  }

  // BIST Mesajı
  if (allSignals.bist) {
    if (allSignals.bist.length > 0) {
      await telegram.sendTelegram(telegram.buildMarketMessage("BIST", allSignals.bist));
    } else {
      console.log("BIST sinyali yok, bos mesaj gonderiliyor...");
      await telegram.sendTelegram("🚫 <b>BIST TARAMASI</b>\n\nŞu an kriterlere uygun sinyal bulunamadı.\n⏰ " + new Date().toLocaleTimeString("tr-TR"));
    }
  }
  
  console.log("🏁 Tarama Tamamlandi.");
}

main();
