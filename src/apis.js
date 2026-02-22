var axios = require("axios");
var CONFIG = require("./config");
var memCache = {};
var CACHE_TTL = { M5: 300, M15: 900, H4: 7200, D1: 21600, W1: 43200 };

function getCached(key) {
    var entry = memCache[key];
    if (!entry) return null;
    if (Date.now() - entry.time > (entry.ttl || 900) * 1000) {
        delete memCache[key];
        return null;
    }
    return entry.data;
}

function setCache(key, data, ttlSec) {
    memCache[key] = { data: data, time: Date.now(), ttl: ttlSec || 900 };
}

function getCacheStats() {
    return { total: Object.keys(memCache).length };
}

async function safeFetch(url, options) {
    if (!options) options = {};
    try {
        var resp = await axios({
            url: url,
            method: options.method || "get",
            headers: options.headers || {},
            data: options.data || undefined,
            timeout: options.timeout || 15000,
            validateStatus: function() { return true; }
        });
        return { code: resp.status, data: resp.data, ok: resp.status === 200 };
    } catch (e) {
        console.error("Fetch error:", e.message);
        return { code: 0, data: null, ok: false, error: e.message };
    }
}

async function getKlinesBinance(symbol, tfKey, limit) {
    var interval = CONFIG.BINANCE_TF_MAP[tfKey];
    if (!interval) {
        console.log("Geçersiz zaman dilimi:", tfKey);
        return null;
    }
    
    var url = CONFIG.BINANCE_BASE + "/api/v3/klines?symbol=" + symbol + "&interval=" + interval + "&limit=" + limit;
    console.log("Binance URL:", url);
    
    var r = await safeFetch(url);
    if (!r.ok) {
        console.log("Binance API hatası:", r.code);
        return null;
    }
    
    if (!Array.isArray(r.data)) {
        console.log("Binance veri formatı hatalı:", typeof r.data);
        return null;
    }
    
    var candles = [];
    for (var i = r.data.length - 1; i >= 0; i--) {
        var d = r.data[i];
        candles.push({
            time: Math.floor(parseInt(d[0]) / 1000),
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            volume: parseFloat(d[5])
        });
    }
    return candles.length > 0 ? candles : null;
}

async function getKlinesYahoo(yahooSymbol, interval, range) {
    var url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(yahooSymbol) + "?interval=" + interval + "&range=" + range;
    console.log("Yahoo URL:", url);
    
    var r = await safeFetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok || !r.data || !r.data.chart || !r.data.chart.result) {
        console.log("Yahoo API hatası:", r.code);
        return null;
    }
    
    var cr = r.data.chart.result[0];
    var ts = cr.timestamp;
    var q = cr.indicators.quote[0];
    if (!ts || !q) {
        console.log("Yahoo veri formatı hatalı");
        return null;
    }
    
    var candles = [];
    for (var i = ts.length - 1; i >= 0; i--) {
        if (q.close[i] == null) continue;
        candles.push({
            time: ts[i],
            open: q.open[i],
            high: q.high[i],
            low: q.low[i],
            close: q.close[i],
            volume: q.volume[i] || 0
        });
    }
    return candles.length > 0 ? candles : null;
}

function toBinanceSymbol(pair) {
    console.log("Giriş sembolü:", pair);
    
    // Farklı formatları normalize et
    let symbol = pair
        .replace("/", "")
        .replace("-", "")
        .replace("_", "")
        .replace(".", "")
        .toUpperCase();
    
    // Eğer zaten USDT/BUSD ile bitmiyorsa ekle
    if (!symbol.endsWith("USDT") && !symbol.endsWith("BUSD") && !symbol.endsWith("BTC") && !symbol.endsWith("ETH")) {
        symbol = symbol.replace("USD", "USDT");
    }
    
    console.log("Çıkış sembolü:", symbol);
    return symbol;
}

function toYahooSymbol(displaySymbol, marketType) {
    if (marketType === "BIST") {
        const symbol = displaySymbol.includes(".IS") ? displaySymbol : displaySymbol + ".IS";
        console.log("BIST sembolü:", symbol);
        return symbol;
    }
    if (marketType === "FOREX") {
        const symbol = displaySymbol + "=X";
        console.log("Forex sembolü:", symbol);
        return symbol;
    }
    return displaySymbol;
}

async function fetchCandles(displaySymbol, marketType, tfKey, limit) {
    var cKey = ("C_" + marketType + "_" + displaySymbol + "_" + tfKey).replace(/[^a-zA-Z0-9_]/g, "_");
    console.log("Cache anahtarı:", cKey);
    
    var cached = getCached(cKey);
    if (cached) {
        console.log("Cache'den veri bulundu:", cKey);
        return cached;
    }
    
    var candles = null;
    if (marketType === "CRYPTO") {
        try {
            const binanceSymbol = toBinanceSymbol(displaySymbol);
            candles = await getKlinesBinance(binanceSymbol, tfKey, limit);
            if (candles) {
                console.log("Binance'den veri alındı:", binanceSymbol);
            }
        } catch (e) {
            console.error("Binance API hatası:", e);
        }
    } else if (marketType === "BIST" || marketType === "FOREX") {
        var yt = CONFIG.YAHOO_TF_MAP[tfKey];
        if (yt) {
            const yahooSymbol = toYahooSymbol(displaySymbol, marketType);
            candles = await getKlinesYahoo(yahooSymbol, yt.interval, yt.range);
            if (candles) {
                console.log("Yahoo'dan veri alındı:", yahooSymbol);
            }
        }
    }
    
    if (candles) {
        setCache(cKey, candles, CACHE_TTL[tfKey]);
        console.log("Veri cache'e eklendi:", cKey);
    } else {
        console.log("Veri alınamadı:", displaySymbol, marketType, tfKey);
    }
    
    return candles;
}

async function checkAPIHealth() {
    const binanceHealth = await safeFetch(CONFIG.BINANCE_BASE + "/api/v3/ping");
    const yahooHealth = await safeFetch("https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d");
    
    console.log("API Durumları:");
    console.log("Binance:", binanceHealth.ok ? "Aktif" : "Pasif");
    console.log("Yahoo:", yahooHealth.ok ? "Aktif" : "Pasif");
    
    return {
        binance: binanceHealth.ok,
        yahoo: yahooHealth.ok
    };
}

module.exports = { safeFetch, fetchCandles, checkAPIHealth, getCacheStats };
