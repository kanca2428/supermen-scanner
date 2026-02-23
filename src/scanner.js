var fs       = require("fs");
var path     = require("path");
var CONFIG   = require("./config");
var analysis = require("./analysis");
var telegram = require("./telegram");

var DATA_DIR = path.join(__dirname, "..", "data");

// ───────────────────────────────────────────────────────────────────
// YARDIMCI: Türkiye saati (GitHub Actions UTC'de çalışır!)
// ───────────────────────────────────────────────────────────────────
function getNowTR() {
  return new Date().toLocaleString("tr-TR", {
    timeZone:  "Europe/Istanbul",
    day:       "2-digit",
    month:     "2-digit",
    year:      "numeric",
    hour:      "2-digit",
    minute:    "2-digit",
    second:    "2-digit"
  });
}

// ───────────────────────────────────────────────────────────────────
// JSON YAZICI
// ───────────────────────────────────────────────────────────────────
function writeJSON(file, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
    console.log("✅ " + file + " yazıldı.");
  } catch (e) {
    console.log("❌ Dosya yazma hatası: " + e.message);
  }
}

// ───────────────────────────────────────────────────────────────────
// MARKET TARAMA
// ───────────────────────────────────────────────────────────────────
async function scan(market) {
  var symbols = [];
  if      (market === "crypto") symbols = CONFIG.CRYPTO_PAIRS;
  else if (market === "bist")   symbols = CONFIG.BIST_SYMBOLS;
  else if (market === "forex")  symbols = CONFIG.FOREX_PAIRS;
  else { console.log("⚠️ Bilinmeyen market: " + market); return []; }

  var signals = [];
  console.log("\n🔍 Taraniyor: " + market.toUpperCase() + " (" + symbols.length + " sembol) — " + getNowTR());

  for (var i = 0; i < symbols.length; i++) {
    var sym = symbols[i];
    try {
      var res = await analysis.analyzeSingleSymbol(sym);
      if (res) {
        signals.push(res);
        console.log("  ✅ Sinyal: " + sym + " → " + res.signal + " | St:" + res.stochKStr);
      }
    } catch (e) {
      console.log("  ❌ Hata (" + sym + "): " + e.message);
    }
    // Rate limit koruması
    await new Promise(function(r) { setTimeout(r, 200); });
  }

  console.log("📊 " + market.toUpperCase() + " tamamlandı: " + signals.length + " sinyal bulundu.");
  return signals;
}

// ───────────────────────────────────────────────────────────────────
// ANA FONKSİYON
// ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   SUPERMEN V16.0 — SCANNER           ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("🕐 Başlangıç: " + getNowTR());

  // Token kontrolü
  var token = process.env.TELEGRAM_BOT_TOKEN || "";
  console.log("Telegram Token: " + (token ? "✅ (" + token.substring(0, 4) + "...)" : "❌ YOK!"));

  // Hangi marketleri tara?
  var mode = process.argv[2] || "all";
  var marketsToScan = [];
  if (mode === "all") {
    marketsToScan = ["crypto", "bist", "forex"];
  } else if (["crypto", "bist", "forex"].includes(mode)) {
    marketsToScan = [mode];
  } else {
    console.log("⚠️ Geçersiz mod: " + mode + " — 'all' kullanılıyor.");
    marketsToScan = ["crypto", "bist", "forex"];
  }

  // Tara
  var allSignals = {};
  for (var i = 0; i < marketsToScan.length; i++) {
    allSignals[marketsToScan[i]] = await scan(marketsToScan[i]);
  }

  // signals.json'a yaz (dashboard için)
  writeJSON("signals.json", allSignals);

  // Telegram'a gönder
  for (var i = 0; i < marketsToScan.length; i++) {
    var market  = marketsToScan[i];
    var signals = allSignals[market];
    var title   = market.toUpperCase();

    if (signals && signals.length > 0) {
      // Sinyal var → güzel mesaj
      await telegram.sendTelegram(telegram.buildMarketMessage(title, signals));
    } else {
      // Sinyal yok → boş mesaj (getNowTR() ile Istanbul saati)
      await telegram.sendTelegram(
        "🚫 <b>" + title + " TARAMASI</b>\n\n" +
        "Şu an kriterlere uygun sinyal bulunamadı.\n" +
        "⏰ " + getNowTR()
      );
    }

    // Mesajlar arası kısa bekleme (Telegram spam koruması)
    await new Promise(function(r) { setTimeout(r, 1500); });
  }

  console.log("\n🏁 Tarama Tamamlandı: " + getNowTR());
}

main().catch(function(err) {
  console.error("💥 Kritik hata: " + err.message);
  process.exit(1);
});
