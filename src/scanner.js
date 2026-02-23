// ═══════════════════════════════════════════════════════════════
// SUPERMEN V16.0 - SCANNER MODULE
// ═══════════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");
const CONFIG = require("./config");
const analysis = require("./analysis");
const telegram = require("./telegram");

// ═══════════════════════════════════════════════════════════════
// DATA KLASÖRÜ
// ═══════════════════════════════════════════════════════════════
const DATA_DIR = path.join(__dirname, "..", "data");

// Klasör yoksa oluştur
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log("📁 data klasörü oluşturuldu");
}

// ═══════════════════════════════════════════════════════════════
// DOSYA YAZMA FONKSİYONU
// ═══════════════════════════════════════════════════════════════
function writeJSON(filename, data) {
  try {
    const filepath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");
    console.log(`✅ ${filename} yazıldı`);
  } catch (error) {
    console.error(`❌ Dosya yazma hatası (${filename}):`, error.message);
  }
}

function readJSON(filename) {
  try {
    const filepath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, "utf8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`❌ Dosya okuma hatası (${filename}):`, error.message);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// SLEEP FONKSİYONU
// ═══════════════════════════════════════════════════════════════
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
// TEK MARKET TARAMA
// ═══════════════════════════════════════════════════════════════
async function scanMarket(market) {
  let symbols = [];
  
  if (market === "crypto") {
    symbols = CONFIG.CRYPTO_PAIRS;
  } else if (market === "bist") {
    symbols = CONFIG.BIST_SYMBOLS;
  } else if (market === "forex") {
    symbols = CONFIG.FOREX_PAIRS;
  } else {
    console.log(`⚠️ Bilinmeyen market: ${market}`);
    return { signals: [], scanned: 0 };
  }
  
  const signals = [];
  let scanned = 0;
  let errors = 0;
  
  console.log(`\n🔍 ${market.toUpperCase()} taranıyor (${symbols.length} sembol)...`);
  console.log("━".repeat(50));
  
  for (const symbol of symbols) {
    try {
      scanned++;
      
      // İlerleme göster
      if (scanned % 20 === 0) {
        console.log(`   İlerleme: ${scanned}/${symbols.length} (${((scanned/symbols.length)*100).toFixed(1)}%)`);
      }
      
      const result = await analysis.analyzeSingleSymbol(symbol);
      
      if (result) {
        signals.push(result);
        console.log(`   ✅ Sinyal: ${symbol} - ${result.signal}`);
      }
      
      // Rate limiting - her istek arasında bekle
      await sleep(250);
      
    } catch (error) {
      errors++;
      console.error(`   ❌ Hata (${symbol}): ${error.message}`);
    }
  }
  
  console.log(`\n📊 ${market.toUpperCase()} Sonuç: ${signals.length} sinyal / ${scanned} taranan / ${errors} hata`);
  
  return {
    signals: signals,
    scanned: scanned,
    errors: errors,
    market: market.toUpperCase()
  };
}

// ═══════════════════════════════════════════════════════════════
// ANA FONKSİYON
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║       🚀 SUPERMEN V16.0 - SCANNER BAŞLATILIYOR     ║");
  console.log("╚════════════════════════════════════════════════════╝");
  console.log("\n");
  
  const startTime = Date.now();
  
  // Telegram durumunu kontrol et
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN || CONFIG.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID || CONFIG.TELEGRAM_CHAT_ID;
  
  console.log(`📱 Telegram Token: ${telegramToken ? "✅ Mevcut" : "❌ YOK"}`);
  console.log(`📱 Telegram Chat ID: ${telegramChatId ? "✅ Mevcut" : "❌ YOK"}`);
  
  // Komut satırı argümanı
  const mode = process.argv[2] || "all";
  console.log(`\n🎯 Tarama modu: ${mode.toUpperCase()}`);
  
  // Hangi marketleri tara
  let marketsToScan = [];
  
  if (mode === "all") {
    marketsToScan = ["crypto", "forex", "bist"];
  } else if (["crypto", "forex", "bist"].includes(mode)) {
    marketsToScan = [mode];
  } else {
    console.log(`⚠️ Geçersiz mod: ${mode}`);
    console.log("Kullanım: node scanner.js [all|crypto|forex|bist]");
    return;
  }
  
  // Sonuçları topla
  const allResults = {
    crypto: { signals: [], scanned: 0 },
    forex: { signals: [], scanned: 0 },
    bist: { signals: [], scanned: 0 }
  };
  
  // Her marketi tara
  for (const market of marketsToScan) {
    const result = await scanMarket(market);
    allResults[market] = result;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // VERİLERİ KAYDET
  // ═══════════════════════════════════════════════════════════════
  
  // signals.json - Dashboard için (eski format uyumlu)
  writeJSON("signals.json", allResults);
  
  // status.json - Durum bilgisi
  const statusData = {
    lastRun: new Date().toISOString(),
    lastRunTimestamp: Date.now(),
    duration: Date.now() - startTime,
    mode: mode,
    summary: {
      overall: {
        buy: 0,
        sell: 0,
        total: 0,
        sentiment: "NÖTR"
      }
    }
  };
  
  // Toplam hesapla
  for (const market of ["crypto", "forex", "bist"]) {
    const signals = allResults[market]?.signals || [];
    
    for (const s of signals) {
      statusData.summary.overall.total++;
      if (s.direction === 1 || s.signal === "LONG") {
        statusData.summary.overall.buy++;
      } else {
        statusData.summary.overall.sell++;
      }
    }
  }
  
  // Sentiment belirle
  const { buy, sell, total } = statusData.summary.overall;
  if (total === 0) {
    statusData.summary.overall.sentiment = "NÖTR ↔️";
  } else if (buy > sell * 2) {
    statusData.summary.overall.sentiment = "GÜÇLÜ BOĞA 🐂🔥";
  } else if (buy > sell) {
    statusData.summary.overall.sentiment = "BOĞA 🐂";
  } else if (sell > buy * 2) {
    statusData.summary.overall.sentiment = "GÜÇLÜ AYI 🐻🔥";
  } else if (sell > buy) {
    statusData.summary.overall.sentiment = "AYI 🐻";
  } else {
    statusData.summary.overall.sentiment = "NÖTR ↔️";
  }
  
  writeJSON("status.json", statusData);
  
  // history.json - Geçmiş kayıtları
  let history = readJSON("history.json") || [];
  
  history.push({
    type: "summary",
    timestamp: new Date().toISOString(),
    buyCount: statusData.summary.overall.buy,
    sellCount: statusData.summary.overall.sell,
    totalCount: statusData.summary.overall.total
  });
  
  // Son 500 kayıt tut
  if (history.length > 500) {
    history = history.slice(-500);
  }
  
  writeJSON("history.json", history);
  
  // ═══════════════════════════════════════════════════════════════
  // TELEGRAM BİLDİRİMLERİ
  // ═══════════════════════════════════════════════════════════════
  
  console.log("\n📱 Telegram bildirimleri gönderiliyor...");
  
  for (const market of marketsToScan) {
    const result = allResults[market];
    const signals = result?.signals || [];
    const marketTitle = market.toUpperCase();
    
    if (signals.length > 0) {
      // Sinyal var - detaylı mesaj gönder
      const message = telegram.buildMarketMessage(marketTitle, signals);
      await telegram.sendTelegram(message);
    } else {
      // Sinyal yok - bilgi mesajı
      const now = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
      const noSignalMsg = `🚫 <b>${marketTitle} TARAMASI</b>\n\n` +
        `Şu an kriterlere uygun sinyal bulunamadı.\n\n` +
        `📊 Taranan: ${result?.scanned || 0} sembol\n` +
        `⏰ ${now}\n\n` +
        `🤖 SUPERMEN V16.0`;
      
      await telegram.sendTelegram(noSignalMsg);
    }
    
    // Telegram rate limit
    await sleep(1000);
  }
  
  // Özet mesaj (eğer tüm marketler tarandıysa)
  if (mode === "all") {
    const summaryMsg = telegram.buildSummaryMessage(allResults);
    await telegram.sendTelegram(summaryMsg);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // BİTİŞ
  // ═══════════════════════════════════════════════════════════════
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║           🏁 TARAMA TAMAMLANDI                     ║");
  console.log("╚════════════════════════════════════════════════════╝");
  console.log(`\n⏱️  Süre: ${duration} saniye`);
  console.log(`📊 Toplam Sinyal: ${statusData.summary.overall.total}`);
  console.log(`🟢 LONG: ${statusData.summary.overall.buy}`);
  console.log(`🔴 SHORT: ${statusData.summary.overall.sell}`);
  console.log(`📈 Duyarlılık: ${statusData.summary.overall.sentiment}`);
  console.log("\n");
}

// ═══════════════════════════════════════════════════════════════
// ÇALIŞTIR
// ═══════════════════════════════════════════════════════════════
main().catch(error => {
  console.error("❌ Kritik hata:", error);
  process.exit(1);
});
