const fs = require("fs");
const path = require("path");
const CONFIG = require("./config");
const analysis = require("./analysis");
const telegram = require("./telegram");
const apis = require("./apis");

const DATA_DIR = path.join(__dirname, "..", "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function writeJSON(filename, data) {
  try {
    fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), "utf8");
    console.log(`✅ ${filename} yazıldı`);
  } catch (error) {
    console.error(`❌ ${filename} yazılamadı:`, error.message);
  }
}

function readJSON(filename) {
  try {
    const filepath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, "utf8"));
    }
  } catch (e) {}
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
// MARKET TARAMA
// ═══════════════════════════════════════════════════════════════
async function scanMarket(market) {
  let symbols = [];
  
  if (market === "crypto") symbols = CONFIG.CRYPTO_PAIRS;
  else if (market === "bist") symbols = CONFIG.BIST_SYMBOLS;
  else if (market === "forex") symbols = CONFIG.FOREX_PAIRS;
  else return { signals: [], scanned: 0, errors: 0, market: market.toUpperCase() };
  
  const signals = [];
  let scanned = 0;
  let errors = 0;
  
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🔍 ${market.toUpperCase()} TARAMASI (${symbols.length} sembol)`);
  console.log(`${"═".repeat(60)}\n`);
  
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const isDebug = i < 5;
    
    try {
      scanned++;
      
      if (isDebug) {
        console.log(`📍 [${i+1}] ${symbol}`);
      }
      
      const result = await analysis.analyzeSingleSymbol(symbol, isDebug);
      
      if (result) {
        signals.push(result);
        console.log(`\n✅ SİNYAL: ${symbol} ${result.signal} | Stoch: ${result.stochK || result.stochKStr}\n`);
      }
      
      await sleep(400);
      
    } catch (error) {
      errors++;
      if (isDebug) console.log(`   ❌ ${error.message}`);
    }
  }
  
  console.log(`\n📊 ${market.toUpperCase()}: ${signals.length} sinyal / ${scanned} taranan / ${errors} hata\n`);
  
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
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           🚀 SUPERMEN V16.0 - SCANNER                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  // ═══════════════════════════════════════════════════════════════
  // 1. TELEGRAM KONTROLÜ
  // ═══════════════════════════════════════════════════════════════
  console.log("═".repeat(60));
  console.log("📱 TELEGRAM KONTROLÜ");
  console.log("═".repeat(60));
  
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_CHAT_ID || "";
  
  console.log(`Token: ${token ? "✅ MEVCUT (" + token.substring(0, 15) + "...)" : "❌ YOK!"}`);
  console.log(`Chat ID: ${chatId ? "✅ MEVCUT (" + chatId + ")" : "❌ YOK!"}`);
  
  const telegramOK = token && chatId;
  if (!telegramOK) {
    console.log("\n⚠️  UYARI: Telegram ayarları eksik!");
    console.log("   GitHub Secrets'da TELEGRAM_BOT_TOKEN ve TELEGRAM_CHAT_ID tanımlayın.\n");
  }
  console.log("");
  
  // ═══════════════════════════════════════════════════════════════
  // 2. API TEST
  // ═══════════════════════════════════════════════════════════════
  await apis.testAPIs();
  
  // ═══════════════════════════════════════════════════════════════
  // 3. AYARLAR
  // ═══════════════════════════════════════════════════════════════
  console.log("📋 AYARLAR:");
  console.log(`   Stoch OS: ≤${CONFIG.STOCH_OS_LEVEL} | OB: ≥${CONFIG.STOCH_OB_LEVEL}`);
  console.log(`   Timeframes: ${(CONFIG.TIMEFRAMES || ["H4","D1"]).join(", ")}`);
  console.log(`   Min TF: ${CONFIG.MIN_TF_AGREEMENT || 1}`);
  console.log("");
  
  const startTime = Date.now();
  const mode = process.argv[2] || "all";
  
  let marketsToScan = [];
  if (mode === "all") marketsToScan = ["crypto", "forex", "bist"];
  else if (["crypto", "forex", "bist"].includes(mode)) marketsToScan = [mode];
  
  // ═══════════════════════════════════════════════════════════════
  // 4. TARAMA
  // ═══════════════════════════════════════════════════════════════
  const allResults = {
    crypto: { signals: [], scanned: 0, errors: 0, market: "CRYPTO" },
    forex: { signals: [], scanned: 0, errors: 0, market: "FOREX" },
    bist: { signals: [], scanned: 0, errors: 0, market: "BIST" }
  };
  
  for (const market of marketsToScan) {
    const result = await scanMarket(market);
    allResults[market] = result;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 5. KAYDET
  // ═══════════════════════════════════════════════════════════════
  writeJSON("signals.json", allResults);
  
  // İstatistikler
  let buy = 0, sell = 0, total = 0;
  for (const market of ["crypto", "forex", "bist"]) {
    for (const s of (allResults[market]?.signals || [])) {
      total++;
      if (s.direction === 1) buy++;
      else sell++;
    }
  }
  
  let sentiment = "NÖTR ↔️";
  if (total > 0) {
    if (buy > sell * 2) sentiment = "GÜÇLÜ BOĞA 🐂🔥";
    else if (buy > sell) sentiment = "BOĞA 🐂";
    else if (sell > buy * 2) sentiment = "GÜÇLÜ AYI 🐻🔥";
    else if (sell > buy) sentiment = "AYI 🐻";
  }
  
  writeJSON("status.json", {
    lastRun: new Date().toISOString(),
    duration: Date.now() - startTime,
    mode: mode,
    telegramConfigured: telegramOK,
    summary: { 
      overall: { buy, sell, total, sentiment },
      crypto: { count: allResults.crypto.signals.length, scanned: allResults.crypto.scanned },
      forex: { count: allResults.forex.signals.length, scanned: allResults.forex.scanned },
      bist: { count: allResults.bist.signals.length, scanned: allResults.bist.scanned }
    }
  });
  
  // History
  let history = readJSON("history.json") || [];
  history.push({
    type: "summary",
    timestamp: new Date().toISOString(),
    buyCount: buy,
    sellCount: sell,
    totalCount: total
  });
  if (history.length > 500) history = history.slice(-500);
  writeJSON("history.json", history);
  
  // ═══════════════════════════════════════════════════════════════
  // 6. TELEGRAM GÖNDER
  // ═══════════════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(60));
  console.log("📱 TELEGRAM GÖNDERİMİ");
  console.log("═".repeat(60) + "\n");
  
  if (!telegramOK) {
    console.log("⛔ Telegram ayarları eksik, mesaj gönderilmiyor.\n");
  } else {
    for (const market of marketsToScan) {
      const result = allResults[market];
      const signals = result?.signals || [];
      const marketTitle = market.toUpperCase();
      
      console.log(`📤 ${marketTitle} gönderiliyor...`);
      
      let msg;
      if (signals.length > 0) {
        msg = telegram.buildMarketMessage(marketTitle, signals);
      } else {
        const now = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
        msg = `🚫 <b>${marketTitle}</b>\n\nSinyal bulunamadı.\n📊 Taranan: ${result?.scanned || 0}\n⏰ ${now}`;
      }
      
      const sent = await telegram.sendTelegram(msg);
      console.log(`   ${sent ? "✅ Gönderildi" : "❌ Gönderilemedi"}\n`);
      
      await sleep(1500);
    }
    
    // Özet mesaj
    if (mode === "all" && total > 0) {
      console.log("📤 Özet mesaj gönderiliyor...");
      const now = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
      const summaryMsg = `📊 <b>SUPERMEN V16.0 ÖZET</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⏰ ${now}\n\n` +
        `🪙 Kripto: ${allResults.crypto.signals.length} sinyal\n` +
        `💱 Forex: ${allResults.forex.signals.length} sinyal\n` +
        `🏦 BIST: ${allResults.bist.signals.length} sinyal\n\n` +
        `📈 Toplam: ${total}\n` +
        `🟢 LONG: ${buy} | 🔴 SHORT: ${sell}\n` +
        `${sentiment}`;
      
      await telegram.sendTelegram(summaryMsg);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 7. ÖZET
  // ═══════════════════════════════════════════════════════════════
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log("\n" + "═".repeat(60));
  console.log("🏁 TARAMA TAMAMLANDI");
  console.log("═".repeat(60));
  console.log(`⏱️  Süre: ${duration}s`);
  console.log(`📊 Toplam: ${total} sinyal`);
  console.log(`🟢 LONG: ${buy} | 🔴 SHORT: ${sell}`);
  console.log(`📈 ${sentiment}`);
  console.log("═".repeat(60) + "\n");
}

main().catch(e => {
  console.error("❌ KRİTİK HATA:", e);
  process.exit(1);
});
