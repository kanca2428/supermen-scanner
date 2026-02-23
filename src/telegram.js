var apis = require("./apis");
var safeFetch = apis.safeFetch;
var CONFIG = require("./config");

// ═══════════════════════════════════════════════════════════════
// FORMATLAMA FONKSİYONLARI
// ═══════════════════════════════════════════════════════════════

function formatPrice(p, marketType) {
  if (p == null || isNaN(p)) return "N/A";
  var a = Math.abs(p);
  var type = (marketType || "").toUpperCase();

  if (type === "CRYPTO") {
    if (a < 0.00001) return p.toFixed(8);
    if (a < 0.001) return p.toFixed(6);
    if (a < 0.1) return p.toFixed(4);
    if (a < 100) return p.toFixed(3);
    return p.toFixed(2);
  }
  return p.toFixed(2);
}

function formatPercent(p) {
  if (p == null || isNaN(p)) return "N/A";
  var sign = p >= 0 ? "+" : "";
  return sign + (p * 100).toFixed(2) + "%";
}

function getNow() {
  return new Date().toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getDirectionEmoji(direction) {
  if (direction > 0) return "🟢";
  if (direction < 0) return "🔴";
  return "⚪";
}

// ═══════════════════════════════════════════════════════════════
// TELEGRAM GÖNDERME (Gelişmiş)
// ═══════════════════════════════════════════════════════════════

async function sendTelegram(message) {
  if (!message || message.trim().length === 0) {
    console.log("[TELEGRAM] Mesaj boş, gönderilmedi.");
    return false;
  }

  if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) {
    console.log("[TELEGRAM] Token veya Chat ID eksik! Config dosyasını veya Secrets ayarlarını kontrol et.");
    return false;
  }

  // Mesaj çok uzunsa parçala (Telegram limiti 4096 karakter)
  if (message.length > 4000) {
    console.log("[TELEGRAM] Mesaj çok uzun, bölünüyor...");
    var splitPoint = message.lastIndexOf("\n", 3800);
    if (splitPoint < 200) splitPoint = 3800;
    
    await sendTelegram(message.substring(0, splitPoint));
    await new Promise(function(r) { setTimeout(r, 1500); }); // Spam olmaması için bekle
    await sendTelegram(message.substring(splitPoint));
    return true;
  }

  var url = "https://api.telegram.org/bot" + CONFIG.TELEGRAM_BOT_TOKEN + "/sendMessage";
  
  var payload = {
    chat_id: CONFIG.TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "HTML",
    disable_web_page_preview: true
  };

  // 1. Deneme: HTML Modunda Gönder
  var r = await safeFetch(url, {
    method: "post",
    headers: { "Content-Type": "application/json" },
    data: payload
  });

  if (r.ok) {
    console.log("[TELEGRAM] Mesaj başarıyla gönderildi ✅");
    return true;
  }

  // Hata Analizi
  console.log("[TELEGRAM] HTML Gönderimi Başarısız: " + (r.data ? JSON.stringify(r.data) : "Bilinmeyen Hata"));

  // 2. Deneme: HTML Parse Hatası varsa Düz Metin olarak tekrar dene
  // (Bazen sembollerdeki < > & karakterleri HTML modunu bozar)
  if (r.data && r.data.description && r.data.description.includes("parse")) {
    console.log("[TELEGRAM] HTML hatası algılandı, düz metin olarak tekrar deneniyor...");
    delete payload.parse_mode; // HTML modunu kapat
    var r2 = await safeFetch(url, {
      method: "post",
      headers: { "Content-Type": "application/json" },
      data: payload
    });
    
    if (r2.ok) {
      console.log("[TELEGRAM] Düz metin olarak gönderildi ✅");
      return true;
    } else {
      console.log("[TELEGRAM] Düz metin gönderimi de başarısız ❌: " + JSON.stringify(r2.data));
    }
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════
// MESAJ OLUŞTURUCU
// ═══════════════════════════════════════════════════════════════

function buildMarketMessage(marketTitle, signals) {
  if (!signals || signals.length === 0) return "";

  var msg = "╔═══════════════════════╗\n";
  msg += "║   🚀 <b>SUPERMEN V16.0</b> 🚀   ║\n";
  msg += "╚═══════════════════════╝\n\n";
  
  msg += "📊 <b>" + marketTitle + " TARAMASI</b>\n";
  msg += "⏰ " + getNow() + "\n";
  msg += "━━━━━━━━━━━━━━━━━━━━━\n\n";

  for (var i = 0; i < signals.length; i++) {
    var s = signals[i];
    var emoji = getDirectionEmoji(s.direction);
    var dirText = s.direction === 1 ? "LONG (AL)" : "SHORT (SAT)";
    
    msg += emoji + " <b>" + s.symbol + "</b>\n";
    msg += "Yön: " + dirText + "\n";
    msg += "💰 Giriş: " + formatPrice(s.entryPrice, s.marketType) + "\n";
    msg += "🛑 SL: " + formatPrice(s.sl, s.marketType) + "\n";
    msg += "🎯 TP1: " + formatPrice(s.tp1, s.marketType) + "\n";
    msg += "🎯 TP2: " + formatPrice(s.tp2, s.marketType) + "\n";
    msg += "📉 AT: " + formatPrice(s.atr, s.marketType) + "\n";
    msg += "━━━━━━━━━━━━━━━━━━━━━\n";
  }

  msg += "\n⚠️ <i>Yatırım tavsiyesi değildir.</i>";
  return msg;
}

module.exports = {
  sendTelegram: sendTelegram,
  buildMarketMessage: buildMarketMessage
};
