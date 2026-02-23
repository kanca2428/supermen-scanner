// ═══════════════════════════════════════════════════════════════
// SUPERMEN V16.0 - TELEGRAM MODULE
// ═══════════════════════════════════════════════════════════════

const axios = require("axios");
const CONFIG = require("./config");

// ═══════════════════════════════════════════════════════════════
// TELEGRAM MESAJ GÖNDERME
// ═══════════════════════════════════════════════════════════════
async function sendTelegram(message) {
  const token = CONFIG.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = CONFIG.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  
  if (!token || !chatId) {
    console.log("⚠️ Telegram ayarları eksik, mesaj gönderilmedi.");
    console.log("Mesaj içeriği:", message.substring(0, 100) + "...");
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
      timeout: 10000
    });
    
    if (response.data.ok) {
      console.log("✅ Telegram mesajı gönderildi");
      return true;
    } else {
      console.error("❌ Telegram API hatası:", response.data);
      return false;
    }
  } catch (error) {
    console.error("❌ Telegram gönderim hatası:", error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// FİYAT FORMATLAMA
// ═══════════════════════════════════════════════════════════════
function formatPrice(price) {
  if (price == null || isNaN(price)) return "N/A";
  
  const absPrice = Math.abs(price);
  
  if (absPrice >= 1000) {
    return price.toFixed(2);
  } else if (absPrice >= 1) {
    return price.toFixed(4);
  } else if (absPrice >= 0.01) {
    return price.toFixed(6);
  } else {
    return price.toFixed(8);
  }
}

// ═══════════════════════════════════════════════════════════════
// MARKET MESAJI OLUŞTURMA
// ═══════════════════════════════════════════════════════════════
function buildMarketMessage(marketTitle, signals) {
  const now = new Date().toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
  
  // Market ikonu
  let icon = "📊";
  if (marketTitle === "CRYPTO") icon = "🪙";
  else if (marketTitle === "FOREX") icon = "💱";
  else if (marketTitle === "BIST") icon = "🏦";
  
  let msg = `${icon} <b>${marketTitle} SİNYALLERİ</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `⏰ ${now}\n\n`;
  
  if (!signals || signals.length === 0) {
    msg += `🚫 Aktif sinyal bulunamadı.\n`;
    return msg;
  }
  
  // Long ve Short sayıları
  const longCount = signals.filter(s => s.signal === "LONG" || s.direction === 1).length;
  const shortCount = signals.filter(s => s.signal === "SHORT" || s.direction === -1).length;
  
  msg += `📈 LONG: ${longCount} | 📉 SHORT: ${shortCount}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Sinyalleri listele
  for (const s of signals) {
    const isLong = s.signal === "LONG" || s.direction === 1;
    const dirIcon = isLong ? "🟢" : "🔴";
    const dirText = isLong ? "LONG" : "SHORT";
    
    msg += `${dirIcon} <b>${s.symbol}</b> - ${dirText}\n`;
    msg += `├ Giriş: ${formatPrice(s.entryPrice || s.lastPrice)}\n`;
    msg += `├ Stop: ${formatPrice(s.stopLoss || s.sl)}\n`;
    msg += `├ TP1: ${formatPrice(s.tp1)}\n`;
    msg += `├ TP2: ${formatPrice(s.tp2)}\n`;
    
    if (s.stochK || s.stochKStr) {
      msg += `└ Stoch: ${s.stochK || s.stochKStr}\n`;
    }
    
    msg += `\n`;
  }
  
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🤖 <b>SUPERMEN V16.0</b>\n`;
  msg += `⚠️ <i>Finansal tavsiye değildir</i>`;
  
  return msg;
}

// ═══════════════════════════════════════════════════════════════
// ÖZET MESAJ OLUŞTURMA
// ═══════════════════════════════════════════════════════════════
function buildSummaryMessage(allResults) {
  const now = new Date().toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul"
  });
  
  let totalSignals = 0;
  let totalLong = 0;
  let totalShort = 0;
  
  let msg = `🚀 <b>SUPERMEN V16.0 ÖZET</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `⏰ ${now}\n\n`;
  
  for (const market of ["CRYPTO", "FOREX", "BIST"]) {
    const data = allResults[market.toLowerCase()];
    if (!data) continue;
    
    const signals = data.signals || [];
    const longCount = signals.filter(s => s.signal === "LONG" || s.direction === 1).length;
    const shortCount = signals.filter(s => s.signal === "SHORT" || s.direction === -1).length;
    
    totalSignals += signals.length;
    totalLong += longCount;
    totalShort += shortCount;
    
    let icon = "📊";
    if (market === "CRYPTO") icon = "🪙";
    else if (market === "FOREX") icon = "💱";
    else if (market === "BIST") icon = "🏦";
    
    msg += `${icon} <b>${market}</b>\n`;
    msg += `   Taranan: ${data.scanned || 0}\n`;
    msg += `   Sinyal: ${signals.length} (🟢${longCount} / 🔴${shortCount})\n\n`;
  }
  
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 <b>TOPLAM:</b> ${totalSignals} sinyal\n`;
  msg += `🟢 LONG: ${totalLong} | 🔴 SHORT: ${totalShort}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🤖 <b>SUPERMEN V16.0</b>`;
  
  return msg;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════
module.exports = {
  sendTelegram,
  buildMarketMessage,
  buildSummaryMessage,
  formatPrice
};
