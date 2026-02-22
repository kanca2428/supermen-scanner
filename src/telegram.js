var apis = require("./apis");
var CONFIG = require("./config");
async function sendTelegram(message) {
  if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) return;
  var url = "https://api.telegram.org/bot" + CONFIG.TELEGRAM_BOT_TOKEN + "/sendMessage";
  await apis.safeFetch(url, { method: "post", headers: { "Content-Type": "application/json" }, data: { chat_id: CONFIG.TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" } });
}
function buildMarketMessage(title, signals) {
  if (!signals.length) return "";
  var msg = "🚀 <b>" + title + "</b>\n\n";
  signals.forEach(s => { msg += (s.direction===1?"🟢":"🔴") + " <b>" + s.symbol + "</b> " + s.signal + "\nEntry: " + s.entryPrice.toFixed(2) + "\nSL: " + s.sl.toFixed(2) + "\nTP1: " + s.tp1.toFixed(2) + "\nTP2: " + s.tp2.toFixed(2) + "\nStoch: " + s.stochKStr + "\n\n"; });
  return msg;
}
module.exports = { sendTelegram, buildMarketMessage };
