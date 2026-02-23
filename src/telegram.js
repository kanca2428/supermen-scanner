const axios = require("axios");
const CONFIG = require("./config");

// ═══════════════════════════════════════════════════════════════
// TELEGRAM MESAJ GÖNDERME
// ═══════════════════════════════════════════════════════════════
async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN || CONFIG.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || CONFIG.TELEGRAM_CHAT_ID;
  
  console.log(`📱 Telegram gönderiliyor...`);
  console.log(`   Token: ${token ? "✅ VAR (" + token.substring(0, 10) + "...)" : "❌ YOK"}`);
  console.log(`   Chat ID: ${chatId ? "✅ VAR (" + chatId + ")" : "❌ YOK"}`);
  
  if (!token || !chatId) {
    console.log("⚠️ Telegram ayarları eksik! Mesaj gönderilmedi.");
    return false;
  }
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  try {
    const response = await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true
    }, {
      timeout: 15000
    });
    
    if (response.data && response.data.ok) {
      console.log("✅ Telegram mesajı gönderildi!");
      return true;
    } else {
      console.log("❌ Telegram API yanıtı:", JSON.stringify(response.data));
      return false;
    }
  } catch (error) {
    console.log("❌ Telegram hatası:", error.message);
    if (error.response) {
      console.log("   Response:", JSON.stringify(error.response.data));
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// FİYAT FORMATLAMA
// ═══════════════════════════════════════════════════════════════
function formatPrice(price) {
  if (price == null || isNaN(price)) return "N/A";
  
  const abs = Math.abs(price);
  if (abs >= 1000) return price.toFixed(2);
  if (abs >= 1) return price.toFixed(4);
  if (abs >= 0.0001) return price.toFixed(6);
  return price.toFixed(8);
}

// ═══════════════════════════════════════════════════════════════
// MARKET MESAJI OLUŞTURMA
// ═══════════════════════════════════════════════════════════════
function buildMarketMessage(marketTitle, signals) {
  const now = new Date().toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  
  let icon = "📊";
  if (marketTitle === "CRYPTO") icon = "🪙";
  else if (marketTitle === "FOREX") icon = "💱";
  else if (marketTitle === "BIST") icon = "🏦";
  
  let msg = `${icon} <b>${marketTitle} SİNYALLERİ</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `⏰ ${now}\n\n`;
  
  if (!signals || signals.length === 0) {
    msg += `🚫 Sinyal bulunamadı.\n`;
    return msg;
  }
  
  const longCount = signals.filter(s => s.direction === 1 || s.signal === "LONG").length;
  const shortCount = signals.filter(s => s.direction === -1 || s.signal === "SHORT").length;
  
  msg += `📈 LONG: ${longCount} | 📉 SHORT: ${shortCount}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  for (const s of signals.slice(0, 10)) { // Max 10 sinyal
    const isLong = s.direction === 1 || s.signal === "LONG";
    const dirIcon = isLong ? "🟢" : "🔴";
    const dirText = isLong ? "LONG" : "SHORT";
    
    msg += `${dirIcon} <b>${s.symbol || s.displaySymbol}</b> ${dirText}\n`;
    msg += `├ Giriş: ${formatPrice(s.entryPrice || s.lastPrice)}\n`;
    msg += `├ SL: ${formatPrice(s.stopLoss || s.sl)}\n`;
    msg += `├ TP1: ${formatPrice(s.tp1)}\n`;
    msg += `├ TP2: ${formatPrice(s.tp2)}\n`;
    msg += `└ Stoch: ${s.stochK || s.stochKStr || "N/A"}\n\n`;
  }
  
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🤖 SUPERMEN V16.0`;
  
  return msg;
}

// ═══════════════════════════════════════════════════════════════
// TEST FONKSİYONU
// ═══════════════════════════════════════════════════════════════
async function testTelegram() {
  console.log("\n🔌 TELEGRAM TEST");
  console.log("─".repeat(40));
  
  const result = await sendTelegram("🧪 <b>SUPERMEN V16.0</b>\n\nTelegram bağlantı testi başarılı! ✅");
  
  if (result) {
    console.log("✅ Telegram testi BAŞARILI\n");
  } else {
    console.log("❌ Telegram testi BAŞARISIZ\n");
  }
  
  return result;
}

module.exports = {
  sendTelegram,
  buildMarketMessage,
  formatPrice,
  testTelegram
};
