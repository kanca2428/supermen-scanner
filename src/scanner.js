const fs = require("fs");
const path = require("path");
const CONFIG = require("./config");
const analysis = require("./analysis");
const telegram = require("./telegram");

const DATA_DIR = path.join(__dirname, "..", "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
      return JSON.parse(fs.readFileSync(filepath, "utf8"));
    }
  } catch (error) {}
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
// DEBUG: İlk 5 sembol için detaylı log
// ═══════════════════════════════════════════════════════════════
async function scanMarket(market) {
  let symbols = [];
  
  if (market === "crypto") symbols = CONFIG.CRYPTO_PAIRS;
  else if (market === "bist") symbols = CONFIG.BIST_SYMBOLS;
  else if (market === "forex") symbols = CONFIG.FOREX_PAIRS;
  else return { signals: [], scanned: 0 };
  
  const signals = [];
  let scanned = 0;
  let errors = 0;
  
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🔍 ${market.toUpperCase()} TARAMASI`);
  console.log(`📊 Toplam sembol: ${symbols.length}`);
  console.log(`📈 Stoch OS: ≤${CONFIG.STOCH_OS_LEVEL} | OB: ≥${CONFIG.STOCH_OB_LEVEL}`);
  console.log(`${"═".repeat(60)}\n`);
  
  // İlk 5 sembol için debug mod
  const debugCount = 5;
  
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const isDebug = i < debugCount;
    
    try {
      scanned++;
      
      if (isDebug) {
        console.log(`\n🔎 [${i+1}/${symbols.length}] ${symbol} analiz ediliyor...`);
      } else if (scanned % 20 === 0) {
        console.log(`   İlerleme: ${scanned}/${symbols.length}`);
      }
      
      const result = await analysis.analyzeSingleSymbol(symbol, isDebug);
      
      if (result) {
        signals.push(result);
        console.log(`\n✅ SİNYAL BULUNDU: ${symbol}`);
        console.log(`   📍 Yön: ${result.signal}`);
        console.log(`   💰 Giriş: ${result.entryPrice}`);
        console.log(`   🛑 SL: ${result.stopLoss}`);
        console.log(`   🎯 TP1: ${result.tp1}`);
        console.log(`   📊 Stoch: ${result.stochK}`);
        console.log(`   ⭐ Skor: ${result.score}\n`);
      }
      
      await sleep(300);
      
    } catch (error) {
      errors++;
      if (isDebug) console.log(`   ❌ ${symbol}: ${error.message}`);
    }
  }
  
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📊 ${market.toUpperCase()} SONUÇ:`);
  console.log(`   ✅ Sinyal: ${signals.length}`);
  console.log(`   📈 Taranan: ${scanned}`);
  console.log(`   ❌ Hata: ${errors}`);
  console.log(`${"─".repeat(60)}\n`);
  
  return {
    signals: signals,
    scanned: scanned,
    errors: errors,
    market: market.toUpperCase()
  };
}

async function main() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         🚀 SUPERMEN V16.0 - DEBUG MODE                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");
  
  console.log("📋 MEVCUT AYARLAR:");
  console.log(`   • Stoch K Period: ${CONFIG.STOCH_K_PERIOD}`);
  console.log(`   • Stoch Oversold: ≤${CONFIG.STOCH_OS_LEVEL}`);
  console.log(`   • Stoch Overbought: ≥${CONFIG.STOCH_OB_LEVEL}`);
  console.log(`   • Timeframes: ${(CONFIG.TIMEFRAMES || ["H4", "D1"]).join(", ")}`);
  console.log(`   • Min TF Agreement: ${CONFIG.MIN_TF_AGREEMENT || 1}`);
  console.log(`   • Pivot Filter: ${CONFIG.USE_PIVOT_FILTER ? "AÇIK" : "KAPALI"}`);
  console.log("\n");
  
  const startTime = Date.now();
  const mode = process.argv[2] || "all";
  
  let marketsToScan = [];
  if (mode === "all") marketsToScan = ["crypto", "forex", "bist"];
  else if (["crypto", "forex", "bist"].includes(mode)) marketsToScan = [mode];
  
  const allResults = {
    crypto: { signals: [], scanned: 0 },
    forex: { signals: [], scanned: 0 },
    bist: { signals: [], scanned: 0 }
  };
  
  for (const market of marketsToScan) {
    const result = await scanMarket(market);
    allResults[market] = result;
  }
  
  // Kaydet
  writeJSON("signals.json", allResults);
  
  // Status
  const statusData = {
    lastRun: new Date().toISOString(),
    lastRunTimestamp: Date.now(),
    duration: Date.now() - startTime,
    mode: mode,
    summary: { overall: { buy: 0, sell: 0, total: 0, sentiment: "NÖTR ↔️" } }
  };
  
  for (const market of ["crypto", "forex", "bist"]) {
    const signals = allResults[market]?.signals || [];
    for (const s of signals) {
      statusData.summary.overall.total++;
      if (s.direction === 1) statusData.summary.overall.buy++;
      else statusData.summary.overall.sell++;
    }
  }
  
  const { buy, sell, total } = statusData.summary.overall;
  if (total === 0) statusData.summary.overall.sentiment = "NÖTR ↔️";
  else if (buy > sell * 2) statusData.summary.overall.sentiment = "GÜÇLÜ BOĞA 🐂🔥";
  else if (buy > sell) statusData.summary.overall.sentiment = "BOĞA 🐂";
  else if (sell > buy * 2) statusData.summary.overall.sentiment = "GÜÇLÜ AYI 🐻🔥";
  else if (sell > buy) statusData.summary.overall.sentiment = "AYI 🐻";
  
  writeJSON("status.json", statusData);
  
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
  
  // Telegram
  console.log("\n📱 Telegram bildirimleri...");
  
  for (const market of marketsToScan) {
    const result = allResults[market];
    const signals = result?.signals || [];
    const marketTitle = market.toUpperCase();
    
    if (signals.length > 0) {
      const message = telegram.buildMarketMessage(marketTitle, signals);
      await telegram.sendTelegram(message);
    } else {
      const now = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
      await telegram.sendTelegram(
        `🚫 <b>${marketTitle} TARAMASI</b>\n\n` +
        `Kriterlere uygun sinyal bulunamadı.\n\n` +
        `📊 Taranan: ${result?.scanned || 0}\n` +
        `⏰ ${now}\n\n` +
        `🤖 SUPERMEN V16.0`
      );
    }
    await sleep(1000);
  }
  
  // Özet
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                   🏁 TARAMA TAMAMLANDI                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`\n⏱️  Süre: ${duration} saniye`);
  console.log(`📊 Toplam Sinyal: ${total}`);
  console.log(`🟢 LONG: ${buy}`);
  console.log(`🔴 SHORT: ${sell}`);
  console.log("\n");
}

main().catch(error => {
  console.error("❌ Kritik hata:", error);
  process.exit(1);
});
