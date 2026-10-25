// ==========================================
// MK MIITTIKIRJA - WALL.JS
// "Miittiseinä" — live-näkymä isoille ruudoille (iPad/TV miitissä)
// Näyttää live-osallistujalaskurin, viimeisimmät kirjautujat,
// QR-koodin ja sarjan edistymisen. ES2019-yhteensopiva.
// ==========================================

var mkWall = {
    open: false,
    logRefs: [],
    counts: {},
    logs: [],
    event: null,
    eventRef: null,
    seriesEvents: [],
    vuoro: 0,
    lastTotal: null,
    wakeLock: null,
    weather: null,
    eventTimes: {},
    liveTimer: null,
    allEvents: [],
    qrManual: false,
    tickerTimer: null,
    scrollTimer: null,
    feedTimer: null,
    byeTimer: null,
    byeIdx: -1,
    ended: false,
    endShown: false,
    endDismissed: false,
    tickerIdx: -1,
    accentHex: null,
    ordinal: 0,
    ordLabel: '',
    nextEvent: null,
    maskVisible: null,
    fxCode: null,
    countdownTimer: null,
    spotTimer: null,
    spotIdx: 0,
    spotKey: null,
    nickCounts: {},
    boardTimer: null,
    boardOffset: 0,
    boardShown: {},
    factOffset: 0,
    jokeOffset: 0,
    pool: [],
    liveNotes: {},
    poolIdx: 0,
    nextSpawnAt: 0,
    zTop: 0
};

function mkWallSortKey(e) {
    return (e.date || '') + 'T' + (e.time || '00:00');
}

function mkWallDate(d) {
    var p = (d || '').split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : (d || '');
}

function mkWallClock(d) {
    var m = d.getMinutes();
    return d.getHours() + '.' + (m < 10 ? '0' : '') + m;
}

function mkWallParseCoords(str) {
    if (!str) return null;
    var s = String(str).trim();
    var m = s.match(/([NSns])\s*(\d+)\s*°?\s*([\d\.,]+)\s*([EWew])\s*(\d+)\s*°?\s*([\d\.,]+)/);
    if (m) {
        var lat = parseInt(m[2], 10) + parseFloat(m[3].replace(',', '.')) / 60;
        if (m[1].toUpperCase() === 'S') lat = -lat;
        var lon = parseInt(m[5], 10) + parseFloat(m[6].replace(',', '.')) / 60;
        if (m[4].toUpperCase() === 'W') lon = -lon;
        return [lat, lon];
    }
    m = s.match(/(-?\d+[\.,]\d+)\s*[,;\s]\s*(-?\d+[\.,]\d+)/);
    if (m) return [parseFloat(m[1].replace(',', '.')), parseFloat(m[2].replace(',', '.'))];
    return null;
}

// Miitin alku/loppu: time-kentässä voi olla "20:30 - 21:00" tai pelkkä alku
function mkWallEventTimes(ev) {
    var times = (ev.time || '').match(/\d{1,2}[:.]\d{2}/g) || [];
    function toDate(hm) {
        if (!ev.date || !hm) return null;
        var p = hm.replace('.', ':').split(':');
        var d = new Date(ev.date + 'T00:00:00');
        d.setHours(parseInt(p[0], 10), parseInt(p[1], 10), 0, 0);
        return d;
    }
    return { start: toDate(times[0] || null), end: toDate(times[1] || null) };
}

function mkWallDur(ms) {
    var mins = Math.round(ms / 60000);
    if (mins < 60) return mins + ' MIN';
    var h = Math.floor(mins / 60);
    return h + ' H ' + (mins % 60) + ' MIN';
}

function mkWallDistM(a, b) {
    var R = 6371000, rad = Math.PI / 180;
    var dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
}

// --- Miitin teemaväri seinälle ---
function mkWallHexToRgb(hex) {
    var h = (hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mkWallRgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    var l = (mx + mn) / 2;
    if (mx === mn) return { h: 0, s: 0, l: l };
    var d = mx - mn;
    var s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    var h;
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return { h: h * 60, s: s, l: l };
}
function mkWallHslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    function f(n) {
        var k = (n + h / 30) % 12;
        var a = s * Math.min(l, 1 - l);
        return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
    }
    return [f(0), f(8), f(4)];
}
// Sama väri kuin vierasnäkymässä (extractThemeColorFromDescription),
// normalisoituna näkyväksi tummalla seinällä + johdannaisvärit
function mkWallThemeFromColor(hex) {
    var rgb = mkWallHexToRgb(hex);
    if (!rgb) return null;
    var hsl = mkWallRgbToHsl(rgb[0], rgb[1], rgb[2]);
    var h = hsl.h;
    var s = Math.min(1, Math.max(0.55, hsl.s));
    var l = Math.min(0.78, Math.max(0.5, hsl.l));
    var a = mkWallHslToRgb(h, s, l);
    var a2 = mkWallHslToRgb(h + 35, Math.min(1, s * 0.85), Math.min(0.8, l + 0.14));
    var ad = mkWallHslToRgb(h, Math.min(1, s * 0.85), 0.36);
    var a2d = mkWallHslToRgb(h + 35, Math.min(1, s * 0.8), 0.38);
    function css(c) { return 'rgb(' + c.join(',') + ')'; }
    return {
        accent: css(a), accentRgb: a.join(','),
        accent2: css(a2), accent2Rgb: a2.join(','),
        accentDeep: css(ad), accent2Deep: css(a2d)
    };
}
function applyWallTheme(ev) {
    var view = document.getElementById('wall-view');
    if (!view) return;
    var props = ['--w-accent', '--w-accent-rgb', '--w-accent2', '--w-accent2-rgb', '--w-accent-deep', '--w-accent2-deep'];
    var col = (ev.themeColor || '').trim() ||
        (typeof extractThemeColorFromDescription === 'function' ? extractThemeColorFromDescription(ev.descriptionHtml || '') : null);
    var t = col ? mkWallThemeFromColor(col) : null;
    props.forEach(function (p) { view.style.removeProperty(p); });
    mkWall.accentHex = t ? t.accent : null;
    if (!t) return;
    view.style.setProperty('--w-accent', t.accent);
    view.style.setProperty('--w-accent-rgb', t.accentRgb);
    view.style.setProperty('--w-accent2', t.accent2);
    view.style.setProperty('--w-accent2-rgb', t.accent2Rgb);
    view.style.setProperty('--w-accent-deep', t.accentDeep);
    view.style.setProperty('--w-accent2-deep', t.accent2Deep);
}

function mkWmoIcon(c) {
    if (c === 0) return '☀️';
    if (c <= 3) return '⛅';
    if (c === 45 || c === 48) return '🌫️';
    if (c >= 51 && c <= 57) return '🌦️';
    if (c >= 61 && c <= 67) return '🌧️';
    if (c >= 71 && c <= 77) return '🌨️';
    if (c >= 80 && c <= 82) return '🌦️';
    if (c >= 85 && c <= 86) return '🌨️';
    if (c >= 95) return '⛈️';
    return '🌤️';
}

function updateWallLive() {
    var el = document.getElementById('wall-live');
    if (!el || !mkWall.open) return;
    var now = new Date();
    var parts = ['⏰ ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2)];
    var t = mkWall.eventTimes || {};
    if (t.start) {
        if (now < t.start) {
            parts.push('ALKAA ' + mkWallDur(t.start - now) + ' PÄÄSTÄ');
        } else if (t.end && now <= t.end) {
            parts.push('KÄYNNISSÄ — loppuun ' + mkWallDur(t.end - now));
        } else if (t.end) {
            parts.push('PÄÄTTYNYT');
        } else {
            parts.push('KÄYNNISSÄ');
        }
    }
    if (mkWall.weather) parts.push(mkWall.weather.icon + ' ' + mkWall.weather.temp + '°C');
    el.innerText = parts.join('    ·    ');
    // Uutispalkin säälaatikko: kaupunki + kuvake + lämpö
    var wcity = document.getElementById('wt-city');
    if (wcity) {
        var loc = ((mkWall.event || {}).location || '').split(',')[0].trim();
        wcity.innerText = loc;
        var wicon = document.getElementById('wt-icon');
        var wtemp = document.getElementById('wt-temp');
        if (wicon) wicon.innerText = mkWall.weather ? mkWall.weather.icon : '';
        if (wtemp) wtemp.innerText = mkWall.weather ? mkWall.weather.temp + '°' : '';
    }
    // Loppunäyttö: kun miitin loppuaika on ohitettu
    mkWall.ended = !!(t.end && now > t.end);
    updateWallEnd();
    updateWallQrMask();
    updateWallTicker(false);
}

// Loppunäyttö: "KIITOS KAIKILLE!" + lopputilastot koko ruudulle
// Tilastot päivittyvät joka kutsulla — kuuntelijat täyttävät counts-rivit
// vasta hetken viiveellä, joten ensimmäinen näyttö ei saa jäädä nollaksi.
function updateWallEnd() {
    var el = document.getElementById('wall-end');
    if (!el) return;
    if (!mkWall.ended || mkWall.endDismissed) {
        if (mkWall.endShown) { el.style.display = 'none'; mkWall.endShown = false; }
        if (mkWall.byeTimer) { clearInterval(mkWall.byeTimer); mkWall.byeTimer = null; }
        return;
    }
    el.style.display = 'flex';
    // Päättyneen miitin nimi ylimmäiseksi omalle riville
    var nm = document.getElementById('wall-end-name');
    if (nm) nm.innerText = (mkWall.event || {}).name || '';
    var sub = document.getElementById('wall-end-sub');
    if (sub) sub.innerText = '';
    var msgN = 0, places = {};
    mkWall.logs.forEach(function (l) {
        if (l.message) msgN++;
        if (l.from) places[l.from] = 1;
    });
    var stats = document.getElementById('wall-end-stats');
    stats.innerHTML = '';
    var cur = mkWall.counts[mkWall.event.key] || 0;
    var bits = ['🧑‍🤝‍🧑 ' + cur + ' osallistujaa'];
    if (msgN) bits.push('💬 ' + msgN + ' tervehdystä');
    var pc = Object.keys(places).length;
    if (pc) bits.push('📍 ' + pc + ' paikkakuntaa');
    if (mkWall.seriesEvents.length > 1) {
        var tot = 0;
        mkWall.seriesEvents.forEach(function (e) { tot += (mkWall.counts[e.key] || 0); });
        bits.push('🎖️ Sarjassa yhteensä ' + tot + ' kävijää');
    }
    bits.forEach(function (b) {
        var s = document.createElement('span');
        s.className = 'wall-end-stat';
        s.innerText = b;
        stats.appendChild(s);
    });
    // Osallistujien nimilista — henkilökohtainen kiitos
    var namesEl = document.getElementById('wall-end-names');
    if (namesEl) {
        var names = [];
        mkWall.logs.forEach(function (l) {
            if (l.eventKey !== (mkWall.event || {}).key) return;
            var n = (l.nickname || '').trim();
            if (n && names.indexOf(n) < 0) names.push(n);
        });
        namesEl.innerText = names.length ? 'KIITOS:  ' + names.join('  ·  ') : '';
    }
    // Loppunäytön alalaitaan: seuraava tuleva miitti
    var nx = document.getElementById('wall-end-next');
    if (nx) {
        nx.innerHTML = '';
        var now = new Date();
        var nxt = null;
        (mkWall.allEvents || []).forEach(function (e) {
            if (!e || e.key === (mkWall.event || {}).key) return;
            var t = mkWallEventTimes(e);
            var st = t.start || new Date((e.date || '') + 'T00:00:00');
            if (st && st > now && (!nxt || st < nxt.t)) nxt = { e: e, t: st };
        });
        if (nxt) {
            var l1 = document.createElement('div');
            l1.className = 'wall-end-next-label';
            l1.innerText = 'SEURAAVA MIITTI';
            var l2 = document.createElement('div');
            l2.className = 'wall-end-next-when';
            l2.innerText = mkWallDate(nxt.e.date) + (nxt.e.time ? '  ' + nxt.e.time : '');
            var l3 = document.createElement('div');
            l3.className = 'wall-end-next-name';
            l3.innerText = (nxt.e.name || '') + (nxt.e.location ? '  ·  ' + nxt.e.location : '');
            nx.appendChild(l1); nx.appendChild(l2); nx.appendChild(l3);
        }
    }
    if (!mkWall.endShown) {
        mkWall.endShown = true;
        wallConfetti();
        wallConfetti();
        // Heippa-viestit pyörivät loppunäytöllä
        mkWall.byeIdx = -1;
        updateWallBye();
        if (mkWall.byeTimer) clearInterval(mkWall.byeTimer);
        mkWall.byeTimer = setInterval(updateWallBye, 10000);
    }
}

// Loppunäytön heippa-viesti (listat config.js:ssä: WALL_BYE_MESSAGES)
function mkWallByeMessages() {
    var m = (typeof MK_Config !== 'undefined' && MK_Config.WALL_BYE_MESSAGES) ? MK_Config.WALL_BYE_MESSAGES : null;
    if (m && m.length) return m;
    return ['Kiitos että tulitte!'];
}

// Ilmoitustaulun TIESITKÖ-faktalaput (lista config.js:ssä: WALL_FACTS)
function mkWallFacts() {
    var f = (typeof MK_Config !== 'undefined' && MK_Config.WALL_FACTS) ? MK_Config.WALL_FACTS : null;
    return (f && f.length) ? f : [];
}

// Ilmoitustaulun HÖPÖ HÖPÖ -laput (lista config.js:ssä: WALL_NONSENSE)
function mkWallJokes() {
    var j = (typeof MK_Config !== 'undefined' && MK_Config.WALL_NONSENSE) ? MK_Config.WALL_NONSENSE : null;
    return (j && j.length) ? j : [];
}

// Lappujen otsikkotekstit (muokattavissa config.js:ssä)
function mkWallLabel(type) {
    var c = (typeof MK_Config !== 'undefined') ? MK_Config : {};
    if (type === 'fact') return c.WALL_FACT_LABEL || 'TIESITKÖ?';
    if (type === 'joke') return c.WALL_JOKE_LABEL || 'HÖPÖ HÖPÖ';
    if (type === 'pin') return c.WALL_PIN_LABEL || '📌 ISÄNNÄLTÄ';
    return '';
}

function updateWallBye() {
    var el = document.getElementById('wall-end-bye');
    if (!el) return;
    var msgs = mkWallByeMessages();
    if (msgs.length === 1) mkWall.byeIdx = 0;
    else mkWall.byeIdx = (mkWall.byeIdx + 1 + Math.floor(Math.random() * (msgs.length - 1))) % msgs.length;
    el.innerText = msgs[mkWall.byeIdx];
    el.classList.remove('swap');
    void el.offsetWidth;
    el.classList.add('swap');
}

// Tervetuloa-spotlight: uusi kirjautuja välähtää keskelle ruutua
function wallWelcome(l) {
    var el = document.getElementById('wall-welcome');
    if (!el || !l) return;
    document.getElementById('wall-welcome-name').innerText = l.nickname || 'Vieras';
    var sub = [];
    if (l.from) sub.push(l.from);
    if (mkWall.seriesEvents.length > 1) {
        var k = (l.nickname || '').toLowerCase(), evs = {};
        mkWall.logs.forEach(function (x) {
            if ((x.nickname || '').toLowerCase() === k) evs[x.eventKey] = 1;
        });
        var n = Object.keys(evs).length;
        if (n > 1) sub.push(n + '. vuorosi tällä sarjalla!');
    }
    document.getElementById('wall-welcome-sub').innerText = sub.join('  ·  ');
    el.classList.remove('show');
    void el.offsetWidth; // käynnistä animaatio uudelleen
    el.classList.add('show');
}

// Iso keskitetty aikalaskuri sekunneilla — ennen alkuun, käynnissä loppuun
function mkWallHMS(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h > 0 ? h + ':' : '') + ('0' + m).slice(-2) + ':' + ('0' + ss).slice(-2);
}
function updateWallCountdown() {
    var el = document.getElementById('wall-countdown');
    if (!el || !mkWall.open) return;
    var t = mkWall.eventTimes || {};
    var now = new Date();
    var label = null, left = 0, cls = '';
    if (t.start && now < t.start) {
        label = 'MIITTI ALKAA'; left = t.start - now; cls = 'wall-cd-before';
    } else if (t.start && t.end && now >= t.start && now < t.end) {
        label = 'MIITTI LOPPUU'; left = t.end - now; cls = 'wall-cd-running';
    }
    if (label === null) { el.innerHTML = ''; el.className = ''; return; }
    el.innerHTML = '<div class="wall-cd-label">' + label + '</div><div class="wall-cd-time">' + mkWallHMS(left) + '</div>';
    el.className = 'wall-countdown-active ' + cls;
}

// Vieraskaruselli — 12 s välein yksi taulun lappu nostautuu esille
function updateWallSpotlight() {
    if (!mkWall.open) return;
    var curKey = (mkWall.event || {}).key;
    var attendees = mkWall.logs.filter(function (l) { return l.eventKey === curKey; });
    attendees.sort(function (a, b) { return (a.timestamp || 0) - (b.timestamp || 0); });
    // Karuselli kiertää mieluiten taululla elossa olevia lappuja
    var live = attendees.filter(function (l) { return mkWall.liveNotes[l.key]; });
    if (live.length) attendees = live;
    if (!attendees.length) { mkWall.spotKey = null; applyWallSpot(null); return; }
    if (mkWall.spotIdx < 0 || mkWall.spotIdx >= attendees.length) mkWall.spotIdx = 0;
    var l = attendees[mkWall.spotIdx];
    mkWall.spotKey = l.key;
    applyWallSpot(l);
}

// Korostaa spotKeyn lapun taululla + täyttää sen lisärivin
function applyWallSpot(l) {
    var feed = document.getElementById('wall-feed');
    if (!feed) return;
    var extra = '';
    if (l) {
        var norm = (l.nickname || '').trim().toLowerCase();
        var bits = [];
        if (l.from) bits.push(l.from);
        var total = (mkWall.nickCounts || {})[norm] || 0;
        if (total > 1) bits.push(total + '. miitti!');
        if (mkWall.seriesEvents.length > 1) {
            var evs = {};
            mkWall.logs.forEach(function (x) {
                if ((x.nickname || '').trim().toLowerCase() === norm) evs[x.eventKey] = 1;
            });
            var n = Object.keys(evs).length;
            if (n > 1) bits.push(n + '. vuoro sarjalla');
        }
        extra = bits.join('  ·  ');
    }
    var kids = feed.children;
    for (var i = 0; i < kids.length; i++) {
        var on = l && kids[i].getAttribute('data-k') === mkWall.spotKey;
        kids[i].classList.toggle('wall-note-spot', !!on);
        // Korostettu lappu päällimmäiseksi — uusien lappujen z-index kasvaa koko ajan
        kids[i].style.zIndex = on ? '9999' : (mkWall.liveNotes[kids[i].getAttribute('data-k')] ? String(mkWall.liveNotes[kids[i].getAttribute('data-k')].z || 1) : '');
        var ex = kids[i].querySelector('.wall-note-extra');
        if (ex) {
            if (on && extra) { ex.innerText = extra; ex.style.display = 'block'; }
            else ex.style.display = 'none';
        }
    }
}

// Lapuille deterministinen kierto/väri — avaimen hash pitää paikat vakaina
function mkWallNoteHash(key) {
    var s = String(key || 'x');
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

// Ambient: hitaasti ajelehtivat valopallot — pitää seinän "elävänä"
function mkWallAmbient() {
    var box = document.getElementById('wall-ambient');
    if (!box) return;
    box.innerHTML = '';
    var n = window.innerWidth < 700 ? 8 : 14;
    for (var i = 0; i < n; i++) {
        var d = document.createElement('div');
        d.className = 'wall-ambient-dot';
        var sz = 6 + Math.random() * 16;
        d.style.width = sz + 'px';
        d.style.height = sz + 'px';
        d.style.left = (Math.random() * 100) + '%';
        d.style.top = (Math.random() * 100) + '%';
        d.style.animationDuration = (16 + Math.random() * 28) + 's';
        d.style.animationDelay = (-Math.random() * 40) + 's';
        box.appendChild(d);
    }
}

// QR näkyy vasta kun miitti alkaa — tai jos käyttäjä on avannut manuaalisesti
function updateWallQrMask() {
    var mask = document.getElementById('wall-qr-mask');
    if (!mask) return;
    var t = mkWall.eventTimes || {};
    var started = !t.start || new Date() >= t.start;
    var show = started || mkWall.qrManual;
    var maskVisible = !show;
    // Paljastus juhlanarvoisesti kun aika koittaa (ei manuaalista avausta)
    if (mkWall.maskVisible === true && !maskVisible && started && !mkWall.qrManual) {
        wallQrReveal();
    }
    mkWall.maskVisible = maskVisible;
    mask.style.display = maskVisible ? 'flex' : 'none';
    // 🔍-nappi näkyy vain kun QR on aktiivinen
    var zb = document.getElementById('wall-qr-zoom-btn');
    if (zb) zb.style.display = maskVisible ? 'none' : 'inline-block';
    var txt = document.getElementById('wall-qr-mask-text');
    if (maskVisible && txt) {
        txt.innerText = t.start ? 'Avautuu ' + mkWallDur(t.start - new Date()) : 'Kirjautuminen avautuu miitin alkaessa';
    }
}

function wallQrReveal() {
    var t = document.getElementById('wall-qr-text');
    if (t) {
        t.innerText = '⚡ KIRJAUTUMINEN AUKI! ⚡';
        t.classList.add('wall-qr-reveal-txt');
    }
    wallConfetti();
    setTimeout(wallConfetti, 400);
    var view = document.getElementById('wall-view');
    if (view) {
        var b = document.createElement('div');
        b.className = 'wall-reveal-banner';
        b.innerText = 'KIRJAUTUMINEN AUKI!';
        view.appendChild(b);
        setTimeout(function () {
            if (b.parentNode) b.parentNode.removeChild(b);
            if (t) { t.innerText = 'Skannaa & kirjaudu'; t.classList.remove('wall-qr-reveal-txt'); }
        }, 4200);
    }
}

// Sää-efektit: lumi / sade / tähdet / sumu — renderöidään vain kun koodi muuttuu
function renderWallFx(code) {
    var fx = document.getElementById('wall-fx');
    if (!fx || mkWall.fxCode === code) return;
    mkWall.fxCode = code;
    fx.innerHTML = '';
    if (code === null || code === undefined) return;
    var i, el;
    var isSnow = (code >= 71 && code <= 77) || code === 79 || code === 85 || code === 86;
    var isRain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
    var isFog = code === 45 || code === 48;
    var isClear = code <= 3;
    if (isSnow) {
        for (i = 0; i < 36; i++) {
            el = document.createElement('span');
            el.className = 'wall-snow';
            el.innerText = '❄';
            el.style.left = (Math.random() * 100) + '%';
            el.style.animationDuration = (4 + Math.random() * 6) + 's';
            el.style.animationDelay = (Math.random() * 6) + 's';
            el.style.fontSize = (8 + Math.random() * 12) + 'px';
            el.style.opacity = 0.3 + Math.random() * 0.5;
            fx.appendChild(el);
        }
    } else if (isRain) {
        for (i = 0; i < 55; i++) {
            el = document.createElement('span');
            el.className = 'wall-rain';
            el.style.left = (Math.random() * 100) + '%';
            el.style.animationDuration = (0.45 + Math.random() * 0.5) + 's';
            el.style.animationDelay = (Math.random() * 2) + 's';
            fx.appendChild(el);
        }
    } else if (isFog) {
        for (i = 0; i < 3; i++) {
            el = document.createElement('div');
            el.className = 'wall-fog wall-fog-' + i;
            fx.appendChild(el);
        }
    } else if (isClear) {
        for (i = 0; i < 32; i++) {
            el = document.createElement('span');
            el.className = 'wall-star';
            el.style.left = (Math.random() * 100) + '%';
            el.style.top = (Math.random() * 65) + '%';
            el.style.animationDuration = (1.5 + Math.random() * 3) + 's';
            el.style.animationDelay = (Math.random() * 3) + 's';
            var sz = (1.5 + Math.random() * 2.5);
            el.style.width = sz + 'px';
            el.style.height = sz + 'px';
            fx.appendChild(el);
        }
    }
}

function fetchWallWeather(ev) {
    var ll = mkWallParseCoords(ev.coords);
    if (!ll) return;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + ll[0].toFixed(5) + '&longitude=' + ll[1].toFixed(5) + '&current=temperature_2m,weather_code&timezone=auto';
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
        if (!mkWall.open || !j || !j.current) return;
        mkWall.weather = { temp: Math.round(j.current.temperature_2m), icon: mkWmoIcon(j.current.weather_code) };
        renderWallFx(j.current.weather_code);
        updateWallLive();
    }).catch(function () {});
}

function openWall() {
    var uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
    var evId = (typeof currentEventId !== 'undefined') ? currentEventId : null;
    if (!uid || !evId) {
        if (typeof showToast === 'function') showToast('Avaa ensin miitti', 'error');
        return;
    }

    closeWall(); // nollaa mahdollinen edellinen tila
    mkWall.open = true;

    var view = document.getElementById('wall-view');
    if (!view) return;
    view.style.display = 'flex';

    // Teema: muistetaan localStoragesta
    var savedTheme = 'dark';
    try { savedTheme = localStorage.getItem('mk_wall_theme') || 'dark'; } catch (e) {}
    view.classList.toggle('wall-light', savedTheme === 'light');
    var themeBtn = document.getElementById('wall-theme');
    if (themeBtn) themeBtn.innerText = savedTheme === 'light' ? '🌙' : '☀️';

    // Pyri koko näytölle + pidä ruutu hereillä (molemmat vapaaehtoisia)
    try {
        if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    } catch (e) {}
    if (navigator.wakeLock && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then(function (wl) { mkWall.wakeLock = wl; }).catch(function () {});
    }

    db.ref('miitit/' + uid + '/events/' + evId).once('value').then(function (snap) {
        var ev = snap.val() || {};
        ev.key = evId;
        mkWall.event = ev;
        return db.ref('miitit/' + uid + '/events').once('value');
    }).then(function (allSnap) {
        if (!mkWall.open) return;
        var all = [];
        if (allSnap) allSnap.forEach(function (c) { var v = c.val() || {}; v.key = c.key; all.push(v); });
        mkWall.allEvents = all;

        var seriesEvents = [mkWall.event];
        if (mkWall.event.series) {
            var matched = all.filter(function (e) { return e.series === mkWall.event.series; });
            if (matched.length > 1) seriesEvents = matched;
        }
        seriesEvents.sort(function (a, b) { return mkWallSortKey(a) < mkWallSortKey(b) ? -1 : 1; });
        mkWall.seriesEvents = seriesEvents;
        for (var i = 0; i < seriesEvents.length; i++) {
            if (seriesEvents[i].key === evId) mkWall.vuoro = i + 1;
        }

        renderWallFrame();
        seriesEvents.forEach(function (e) { attachWallLogListener(e); });

        // Live-kuuntelija miittitiedoille — kiinteän seinälapun muutokset näkyvät heti
        mkWall.eventRef = db.ref('miitit/' + uid + '/events/' + evId);
        mkWall.eventRef.on('value', function (snap) {
            if (!mkWall.open) return;
            var v = snap.val() || {}; v.key = evId;
            var prev = mkWall.event || {};
            mkWall.event = v;
            if (v.wallNote !== prev.wallNote || v.wallPhotoUrls !== prev.wallPhotoUrls
                || JSON.stringify(v.wallPhotos || []) !== JSON.stringify(prev.wallPhotos || [])) {
                buildWallPool(mkWall.logs.slice().sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); }));
            }
        });

        // Vieraiden kokonaiskäyntimäärät ("N. miitti" karuselliin) — kertahaku
        db.ref('miitit/' + uid + '/logs').once('value').then(function (snap) {
            var byNick = {};
            snap.forEach(function (evt) {
                evt.forEach(function (lg) {
                    var v = lg.val() || {};
                    var n = (v.nickname || '').trim().toLowerCase();
                    if (n) { if (!byNick[n]) byNick[n] = {}; byNick[n][evt.key] = 1; }
                });
            });
            var totals = {};
            Object.keys(byNick).forEach(function (n) { totals[n] = Object.keys(byNick[n]).length; });
            mkWall.nickCounts = totals;
            updateWallSpotlight();
        }).catch(function () {});

        // Elävyys: ambient-valopallot + iso aikalaskuri (sekunneilla) + karuselli
        mkWallAmbient();
        updateWallCountdown();
        if (mkWall.countdownTimer) clearInterval(mkWall.countdownTimer);
        mkWall.countdownTimer = setInterval(updateWallCountdown, 1000);
        if (mkWall.spotTimer) clearInterval(mkWall.spotTimer);
        mkWall.spotTimer = setInterval(function () { mkWall.spotIdx++; updateWallSpotlight(); }, 12000);
        updateWallSpotlight();
        // Elävä taulu: 1 s scheduleri — laput tippuvat epäsäännöllisesti, vanhat haalistuvat
        if (mkWall.boardTimer) clearInterval(mkWall.boardTimer);
        mkWall.boardTimer = setInterval(tickWallBoard, 1000);
    }).catch(function (err) {
        var feed = document.getElementById('wall-feed');
        if (feed) feed.innerHTML = '<div class="wall-feed-empty">Latausvirhe: ' + err.message + '</div>';
    });
}

function attachWallLogListener(ev) {
    var uid = currentUser.uid;
    var ref = db.ref('miitit/' + uid + '/logs/' + ev.key);
    mkWall.logRefs.push(ref);
    ref.on('value', function (snap) {
        if (!mkWall.open) return;
        var list = [];
        snap.forEach(function (c) {
            var v = c.val() || {};
            v.key = c.key;
            v.eventKey = ev.key;
            list.push(v);
        });
        mkWall.counts[ev.key] = list.length;
        // Korvaa tämän miitin rivit yhdistetyssä listassa
        mkWall.logs = mkWall.logs.filter(function (l) { return l.eventKey !== ev.key; }).concat(list);
        renderWallData();
    });
}

function renderWallFrame() {
    var ev = mkWall.event || {};
    var isSeries = mkWall.seriesEvents.length > 1;

    applyWallTheme(ev);
    document.getElementById('wall-title').innerText = ev.name || 'Miitti';

    var badge = document.getElementById('wall-series-badge');
    if (isSeries) {
        badge.style.display = 'inline-block';
        badge.innerText = (ev.series || 'SARJA') + ' — VUORO ' + mkWall.vuoro + ' / ' + mkWall.seriesEvents.length;
    } else {
        // Yksittäinen miitti: näytä järjestysnumero (esim. "MIKKOKALEVIN 95. MIITTI")
        var ty = ev.type || 'miitti';
        var same = (mkWall.allEvents || []).filter(function (e) { return (e.type || 'miitti') === ty; });
        same.sort(function (a, b) { return mkWallSortKey(a) < mkWallSortKey(b) ? -1 : 1; });
        var ord = 0;
        for (var i = 0; i < same.length; i++) { if (same[i].key === ev.key) ord = i + 1; }
        mkWall.ordinal = ord;
        if (ord > 0) {
            var nick = (typeof MK_Config !== 'undefined' && MK_Config.OWNER_NICK) ? MK_Config.OWNER_NICK : 'Järjestäjä';
            var label = ty === 'cito' ? 'CITO' : (ty === 'cce' ? 'JUHLA' : 'MIITTI');
            mkWall.ordLabel = nick + 'N ' + ord + '. ' + label;
            badge.style.display = 'inline-block';
            badge.innerText = mkWall.ordLabel.toUpperCase();
        } else {
            badge.style.display = 'none';
        }
    }

    var meta = [];
    if (ev.date) meta.push(mkWallDate(ev.date));
    if (ev.time) meta.push(ev.time);
    if (ev.location) meta.push(ev.location);
    if (ev.gc) meta.push(ev.gc);
    document.getElementById('wall-info').innerText = meta.join('  ·  ');

    // Seuraava vuoro (sarjassa) tai seuraava miitti (muuten)
    var nextEl = document.getElementById('wall-next');
    var scope = isSeries ? mkWall.seriesEvents : (mkWall.allEvents || [ev]);
    var sorted = scope.slice().sort(function (a, b) { return mkWallSortKey(a) < mkWallSortKey(b) ? -1 : 1; });
    var idx = -1;
    for (var i = 0; i < sorted.length; i++) { if (sorted[i].key === ev.key) idx = i; }
    if (idx >= 0 && idx < sorted.length - 1) {
        var n = sorted[idx + 1];
        mkWall.nextEvent = n;
        nextEl.style.display = 'block';
        nextEl.innerText = 'SEURAAVAKSI: ' + (n.name || 'Miitti') + '  ·  ' + mkWallDate(n.date) + '  ' + (n.time || '');
    } else {
        mkWall.nextEvent = null;
        nextEl.style.display = 'none';
    }

    // Paikkatilastot: miitit samalla paikalla (koordinaatit ±150 m tai sama location)
    var ll = mkWallParseCoords(ev.coords);
    var pTot = 0, pYear = 0;
    var curYear = (ev.date || '').slice(0, 4);
    (mkWall.allEvents || []).forEach(function (e) {
        var same = false;
        if (ll) {
            var ll2 = mkWallParseCoords(e.coords);
            if (ll2 && mkWallDistM(ll, ll2) <= 150) same = true;
        }
        if (!same && e.location && ev.location &&
            e.location.trim().toLowerCase() === ev.location.trim().toLowerCase()) same = true;
        if (!same && e.key === ev.key) same = true;
        if (same) {
            pTot++;
            if ((e.date || '').slice(0, 4) === curYear) pYear++;
        }
    });
    mkWall.placeStats = { total: pTot, year: pYear };

    // Live-rivi: kello + countdown + sää
    mkWall.eventTimes = mkWallEventTimes(ev);
    updateWallLive();
    if (mkWall.liveTimer) clearInterval(mkWall.liveTimer);
    mkWall.liveTimer = setInterval(updateWallLive, 15000);
    fetchWallWeather(ev);
    updateWallQrMask();

    // Uutispalkki: oma ajoitus — pitkät tekstit scrollataan ensin loppuun
    mkWall.tickerIdx = -1;
    updateWallTicker(true);

    var q = document.getElementById('wall-qr');
    var big = document.getElementById('wall-qr-big');
    if (big) big.innerHTML = '';
    if (q && typeof QRCode !== 'undefined') {
        q.innerHTML = '';
        var baseUrl = window.location.href.split('?')[0];
        var guestUrl = baseUrl + '?event=' + encodeURIComponent(mkWall.event.key) + '&uid=' + encodeURIComponent(currentUser.uid);
        new QRCode(q, {
            text: guestUrl,
            width: 130,
            height: 130,
            colorDark: '#0d1b2a',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        // 🔍-nappi: iso QR koko ruudulle (luotu laiskasti vasta avattaessa)
        var zb = document.getElementById('wall-qr-zoom-btn');
        if (zb) zb.onclick = function () {
            var z = document.getElementById('wall-qr-zoom');
            if (!z) return;
            if (big && !big.innerHTML) {
                var size = Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.7);
                new QRCode(big, {
                    text: guestUrl,
                    width: size,
                    height: size,
                    colorDark: '#0d1b2a',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
            z.style.display = 'flex';
        };
    }
    var zoomOv = document.getElementById('wall-qr-zoom');
    if (zoomOv) zoomOv.onclick = function () { zoomOv.style.display = 'none'; };
}

function renderWallData() {
    var isSeries = mkWall.seriesEvents.length > 1;
    var total = 0;
    mkWall.seriesEvents.forEach(function (e) { total += (mkWall.counts[e.key] || 0); });
    var cur = mkWall.counts[mkWall.event.key] || 0;

    var el = document.getElementById('wall-count');
    el.innerText = cur;

    var st = document.getElementById('wall-series-total');
    var dots = document.getElementById('wall-dots');
    if (isSeries) {
        st.style.display = 'block';
        st.innerText = 'Sarjassa yhteensä: ' + total;
        dots.innerHTML = '';
        mkWall.seriesEvents.forEach(function (e, i) {
            var d = document.createElement('span');
            var c = 'wall-dot';
            if ((mkWall.counts[e.key] || 0) > 0) c += ' filled';
            if (e.key === mkWall.event.key) c += ' current';
            d.className = c;
            d.innerText = (i + 1);
            dots.appendChild(d);
        });
    } else {
        st.style.display = 'none';
        dots.innerHTML = '';
    }

    // Pulssi + konfetti + tervetuloa kun kokonaismäärä kasvaa
    var freshKey = null;
    if (mkWall.lastTotal !== null && total > mkWall.lastTotal) {
        el.classList.remove('wall-pulse');
        void el.offsetWidth; // pakota animaation uudelleenkäynnistys
        el.classList.add('wall-pulse');
        wallConfetti();
        mkWallPlayDing();
        var newest = null;
        mkWall.logs.forEach(function (l) {
            if (!newest || (l.timestamp || 0) > (newest.timestamp || 0)) newest = l;
        });
        wallWelcome(newest);
        freshKey = newest && newest.key;
    }
    mkWall.lastTotal = total;

    var logs = mkWall.logs.slice().sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });

    // Pikatilastot laskurin alle: viestejä, paikkakuntia, viimeisin
    var qs = document.getElementById('wall-quickstats');
    if (qs) {
        var msgCount = 0, places = {};
        logs.forEach(function (l) {
            if (l.message) msgCount++;
            if (l.from) places[l.from] = 1;
        });
        var bits = [];
        if (msgCount) bits.push('💬 ' + msgCount);
        var pc = Object.keys(places).length;
        if (pc) bits.push('📍 ' + pc + ' paikkaa');
        if (logs.length && logs[0].timestamp) {
            var lt = new Date(logs[0].timestamp);
            bits.push('🕐 ' + ('0' + lt.getHours()).slice(-2) + ':' + ('0' + lt.getMinutes()).slice(-2));
        }
        qs.innerText = bits.join('   ');
    }

    // Kirjautuneiden laatat (seinä täyttyy — uusin ensin)
    // Elävä taulu: pooli uusiksi, uusi kirjaus ilmestyy heti; ei pyyhitä feediä
    buildWallPool(logs);
    if (freshKey) ensureWallNote(freshKey);
    if (!logs.length) {
        updateWallEnd();
        return;
    }
    // Uusi kirjautuja näkyy palkissa heti (kohta 1 = uusin kirjautuja)
    mkWall.tickerIdx = -1;
    updateWallTicker(true);
    // Karusellin korostus takaisin paikalleen (feed renderöitiin uusiksi)
    updateWallSpotlight();
    // Loppunäytön tilastot tuoreena heti kun kuuntelija palauttaa dataa
    updateWallEnd();
}

// Ilmoitustaulun kapasiteetti: montako lappua mahtuu näkyviin ruudukkoon
function wallBoardCapacity() {
    var feed = document.getElementById('wall-feed');
    if (!feed) return { cap: 12, cols: 4, rows: 3 };
    var W = feed.clientWidth || 600, H = feed.clientHeight || 400;
    var cols = Math.max(1, Math.floor(W / 150));
    var rows = Math.max(1, Math.floor(H / 122));
    // Matalalla ruudulla max 3 riviä — alimman rivin laput näkyvät kokonaan
    if (H < 720 && rows > 3) rows = 3;
    return { cap: cols * rows, cols: cols, rows: rows };
}

// --- Elävä ilmoitustaulu ---
// Laput ilmestyvät yksitellen epäsäännöllisin väliajoin sinne tänne;
// vanhimmat haalistuvat pois ja palaavat myöhemmin kierron kautta.

// Pool: kirjautujat + täyttölaput (fakta/höpö). Elävät laput säilyvät.
function buildWallPool(logs) {
    var dims = wallBoardCapacity();
    var facts = mkWallFacts(), jokes = mkWallJokes();
    var pool = [];
    if (!logs.length) pool.push({ type: 'empty', key: 'empty' });
    logs.forEach(function (l) { pool.push({ type: 'log', l: l, key: l.key }); });
    for (var i = 0; i < dims.cap; i++) {
        if (jokes.length && (!facts.length || i % 3 === 2)) pool.push({ type: 'joke', key: 'j' + i });
        else if (facts.length) pool.push({ type: 'fact', key: 'f' + i });
    }
    // Kiinteät 📌-laput isännältä — yksi rivi = yksi lappu (max 4), ei kierrä eikä haalistu
    var pinTexts = mkWallPinTexts();
    for (var pi = 0; pi < pinTexts.length; pi++) pool.push({ type: 'pin', key: 'wallpin' + pi, text: pinTexts[pi] });
    // Polaroid-kuvalaput — kiertävät muiden mukana
    var photos = mkWallPhotos();
    for (var ph = 0; ph < photos.length; ph++) pool.push({ type: 'photo', key: 'photo' + ph, src: photos[ph] });
    mkWall.pool = pool;
    var ok = {};
    pool.forEach(function (p) { ok[p.key] = 1; });
    for (var k in mkWall.liveNotes) if (!ok[k]) fadeWallNote(k);
    updateWallPin(pinTexts);
}

function mkWallPinTexts() {
    return (((mkWall.event || {}).wallNote || '').split('\n'))
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length > 0; })
        .slice(0, 4);
}

// Polaroid-kuvalaput: URL-linkit + laitteelta ladatut (data-URL) — max 6
function mkWallPhotos() {
    var ev = mkWall.event || {};
    var urls = (ev.wallPhotoUrls || '').split('\n')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return /^https?:\/\//i.test(s); });
    var ups = Array.isArray(ev.wallPhotos) ? ev.wallPhotos.filter(function (s) { return typeof s === 'string' && s.length > 10; }) : [];
    return urls.concat(ups).slice(0, 6);
}

// Kiinteät laput: lätkäistään heti, tekstit päivittyvät lennossa, eivät poistu koskaan
function updateWallPin(pinTexts) {
    if (pinTexts === undefined) pinTexts = mkWallPinTexts();
    for (var i = 0; i < 4; i++) {
        var key = 'wallpin' + i;
        var txt = pinTexts[i];
        var rec = mkWall.liveNotes[key];
        if (!txt) { if (rec) fadeWallNote(key); continue; }
        if (!rec) { spawnWallNote({ type: 'pin', key: key, text: txt }); continue; }
        var tx = rec.el.querySelector('.wall-note-fact-text');
        if (tx && tx.innerText !== txt) tx.innerText = txt;
    }
}

function makeWallNoteEl(it) {
    var note = document.createElement('div');
    note.className = 'wall-note wall-note-new';
    if (it.type === 'fact') note.className += ' wall-note-fact';
    if (it.type === 'joke') note.className += ' wall-note-joke';
    if (it.type === 'pin') note.className += ' wall-note-pin';
    if (it.type === 'photo') note.className += ' wall-note-photo';
    if (it.type === 'empty') note.className += ' wall-note-empty';
    note.setAttribute('data-k', it.key);
    note.style.setProperty('--rot', (Math.round(Math.random() * 12) - 6) + 'deg');
    var palette = ['#fff9a3', '#ffd0dc', '#cde7ff', '#d5f5c0', '#ffe0b3', '#e8d7ff'];
    var colr = it.type === 'fact' ? '#dcecff' : (it.type === 'joke' ? '#ffe3ef' : (it.type === 'empty' ? '#eeeeee' : (it.type === 'pin' ? '#ffe9a8' : (it.type === 'photo' ? '#ffffff' : palette[Math.floor(Math.random() * palette.length)]))));
    note.style.background = 'linear-gradient(180deg, #ffffff88 0%, ' + colr + ' 18%, ' + colr + ' 100%)';
    if (it.type === 'log') {
        var l = it.l;
        var nm = document.createElement('div');
        nm.className = 'wall-note-name';
        nm.innerText = l.nickname || '?';
        note.appendChild(nm);
        var sbits = [];
        if (l.from) sbits.push(l.from);
        var t = l.timestamp ? new Date(l.timestamp) : null;
        if (t) sbits.push(('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2));
        if (sbits.length) {
            var sb = document.createElement('div');
            sb.className = 'wall-note-sub';
            sb.innerText = sbits.join(' · ');
            note.appendChild(sb);
        }
        if (l.message) {
            var mg = document.createElement('div');
            mg.className = 'wall-note-msg';
            mg.innerText = '"' + l.message + '"';
            note.appendChild(mg);
        }
        var ex = document.createElement('div');
        ex.className = 'wall-note-extra';
        ex.style.display = 'none';
        note.appendChild(ex);
    } else if (it.type === 'pin') {
        var plbl = document.createElement('div');
        plbl.className = 'wall-note-label';
        plbl.innerText = mkWallLabel('pin');
        var ptx = document.createElement('div');
        ptx.className = 'wall-note-fact-text';
        ptx.innerText = it.text || ((mkWall.event || {}).wallNote || '').trim();
        note.appendChild(plbl);
        note.appendChild(ptx);
    } else if (it.type === 'photo') {
        var im = document.createElement('img');
        im.className = 'wall-note-img';
        im.alt = '';
        im.src = it.src;
        im.onerror = function () { fadeWallNote(it.key); };
        note.appendChild(im);
    } else if (it.type === 'fact' || it.type === 'joke') {
        var list = it.type === 'fact' ? mkWallFacts() : mkWallJokes();
        var lbl = document.createElement('div');
        lbl.className = 'wall-note-label';
        lbl.innerText = mkWallLabel(it.type);
        var tx = document.createElement('div');
        tx.className = 'wall-note-fact-text';
        if (it.type === 'fact') {
            tx.innerText = list[mkWall.factOffset % list.length] || '';
            mkWall.factOffset = (mkWall.factOffset + 1) % list.length;
        } else {
            tx.innerText = list[mkWall.jokeOffset % list.length] || '';
            mkWall.jokeOffset = (mkWall.jokeOffset + 1) % list.length;
        }
        note.appendChild(lbl);
        note.appendChild(tx);
    } else {
        var em = document.createElement('div');
        em.className = 'wall-note-fact-text';
        em.innerText = 'Odotetaan ensimmäistä kirjautujaa…';
        note.appendChild(em);
    }
    return note;
}

// Satunnainen paikka — preferoidaan kohtaa joka ei ole toisen lapun päällä
function mkWallPickPos(W, H) {
    var best = null, bestScore = -1;
    for (var t = 0; t < 7; t++) {
        var x = Math.random() * Math.max(1, W - 160);
        var y = Math.random() * Math.max(1, H - 150);
        var minD = 1e9;
        for (var k in mkWall.liveNotes) {
            var r = mkWall.liveNotes[k];
            var dx = r.x - x, dy = r.y - y;
            var d = dx * dx + dy * dy;
            if (d < minD) minD = d;
        }
        var score = Math.min(minD, 30000);
        if (score > bestScore) { bestScore = score; best = { x: x, y: y }; }
    }
    return best || { x: 10, y: 10 };
}

function spawnWallNote(it) {
    var feed = document.getElementById('wall-feed');
    if (!feed || !it || mkWall.liveNotes[it.key]) return;
    var el = makeWallNoteEl(it);
    var W = feed.clientWidth || 600, H = feed.clientHeight || 400;
    var pos = mkWallPickPos(W, H);
    el.style.left = Math.round(pos.x) + 'px';
    el.style.top = Math.round(pos.y) + 'px';
    el.style.zIndex = String(++mkWall.zTop);
    feed.appendChild(el);
    // Kiinteä lappu ei koskaan haalistu eikä väisty — muut elävät 18-44 s
    var dieAt = it.type === 'pin' ? Infinity : Date.now() + 18000 + Math.random() * 26000;
    mkWall.liveNotes[it.key] = { el: el, x: pos.x, y: pos.y, z: mkWall.zTop, dieAt: dieAt };
}

function fadeWallNote(key) {
    var rec = mkWall.liveNotes[key];
    if (!rec) return;
    delete mkWall.liveNotes[key];
    rec.el.classList.add('wall-note-out');
    setTimeout(function () { if (rec.el.parentNode) rec.el.parentNode.removeChild(rec.el); }, 950);
}

// Uusi kirjautuminen taululle heti — tarvittaessa vanhin väistää
function ensureWallNote(key) {
    if (!key || mkWall.liveNotes[key]) return;
    var it = null;
    for (var i = 0; i < mkWall.pool.length; i++) if (mkWall.pool[i].key === key) it = mkWall.pool[i];
    if (!it) return;
    var dims = wallBoardCapacity();
    var keys = Object.keys(mkWall.liveNotes);
    if (keys.length >= dims.cap) {
        var oldest = null, t = Infinity;
        keys.forEach(function (k) { if (mkWall.liveNotes[k].dieAt < t) { t = mkWall.liveNotes[k].dieAt; oldest = k; } });
        if (oldest) fadeWallNote(oldest);
    }
    spawnWallNote(it);
    mkWall.nextSpawnAt = Date.now() + 1400;
}

// Scheduleri 1 s välein: vanhat haalistuvat, uusia tippuu epäsäännöllisesti
function tickWallBoard() {
    if (!mkWall.open) return;
    var feed = document.getElementById('wall-feed');
    if (!feed) return;
    var now = Date.now();
    for (var k in mkWall.liveNotes) {
        if (mkWall.liveNotes[k].dieAt && now > mkWall.liveNotes[k].dieAt) fadeWallNote(k);
    }
    var dims = wallBoardCapacity();
    var liveN = Object.keys(mkWall.liveNotes).length;
    if (liveN < dims.cap && mkWall.pool.length && now >= (mkWall.nextSpawnAt || 0)) {
        for (var t = 0; t < mkWall.pool.length; t++) {
            var it = mkWall.pool[mkWall.poolIdx % mkWall.pool.length];
            mkWall.poolIdx++;
            if (!mkWall.liveNotes[it.key]) { spawnWallNote(it); break; }
        }
        mkWall.nextSpawnAt = now + 1400 + Math.random() * 3200;
    }
}

// Hidas ping-pong-skrollaus kun laatat eivät mahdu ruudulle (TV:llä ei scrollata)
function setupWallFeedScroll() {
    if (mkWall.feedTimer) { clearInterval(mkWall.feedTimer); mkWall.feedTimer = null; }
    var feed = document.getElementById('wall-feed');
    var box = feed ? feed.parentNode : null;
    if (!box) return;
    if (box.scrollHeight <= box.clientHeight + 8) { box.scrollTop = 0; return; }
    var dir = 1, pause = 0;
    mkWall.feedTimer = setInterval(function () {
        if (!mkWall.open) return;
        if (pause > 0) { pause -= 60; return; }
        box.scrollTop += dir;
        if (dir > 0 && box.scrollTop + box.clientHeight >= box.scrollHeight - 2) { dir = -1; pause = 2500; }
        else if (dir < 0 && box.scrollTop <= 0) { dir = 1; pause = 2500; }
    }, 60);
}

function wallConfetti() {
    var box = document.getElementById('wall-confetti');
    if (!box) return;
    var colors = ['#64ffda', '#ffd9a0', '#ff7b9c', '#7fff9f', '#ffd700', '#ff8c42', '#a0c4ff'];
    if (mkWall.accentHex) colors.push(mkWall.accentHex, mkWall.accentHex);
    for (var i = 0; i < 26; i++) {
        var c = document.createElement('span');
        c.className = 'wall-confetti-piece';
        c.style.left = (Math.random() * 100) + '%';
        c.style.background = colors[i % colors.length];
        c.style.animationDelay = (Math.random() * 0.5) + 's';
        var sz = (6 + Math.random() * 8);
        c.style.width = sz + 'px';
        c.style.height = sz + 'px';
        box.appendChild(c);
        (function (el) {
            setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3400);
        })(c);
    }
}

// --- Uutispalkki (MTV-tyyli): faktat kiertävät yksitellen kategorioittain ---
function wallTickerMessages() {
    var msgs = [];
    var isSeries = mkWall.seriesEvents.length > 1;
    var logs = mkWall.logs.slice().sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
    function M(cat, text, ts) { msgs.push({ cat: cat, text: text, time: ts ? mkWallClock(new Date(ts)) : null }); }

    if (logs.length) {
        var l0 = logs[0];
        M('KÄVIJÄT', 'Uusin kirjautuja: ' + (l0.nickname || '?') + (l0.from ? ' · ' + l0.from : ''), l0.timestamp);
        var msgN = 0, places = {}, per = {};
        logs.forEach(function (l) {
            if (l.message) msgN++;
            if (l.from) places[l.from] = 1;
            if (l.nickname) {
                var k = l.nickname.toLowerCase();
                per[k] = per[k] || { name: l.nickname, evs: {} };
                per[k].evs[l.eventKey] = 1;
            }
        });
        if (msgN) M('VIESTIT', msgN + ' tervehdystä kirjoitettu vieraskirjaan');
        var pc = Object.keys(places).length;
        if (pc > 1) M('PAIKAT', 'Kirjautujia ' + pc + ' eri paikkakunnalta');
        if (isSeries) {
            var top = null, topN = 0;
            Object.keys(per).forEach(function (k) {
                var c = Object.keys(per[k].evs).length;
                if (c > topN) { topN = c; top = per[k].name; }
            });
            if (top && topN > 1) M('SARJA', 'Sarjan ahkerin vieras: ' + top + ' — ' + topN + ' vuoroa');
        }
        var first = logs[logs.length - 1];
        if (first && first.nickname && logs.length > 1) M('KÄVIJÄT', 'Avauskirjauksen teki ' + first.nickname, first.timestamp);
        if (l0.message) M('VIESTIT', '"' + l0.message.slice(0, 60) + '"' + (l0.message.length > 60 ? '…' : '') + ' — ' + l0.nickname, l0.timestamp);
    } else {
        M('KÄVIJÄT', 'Vieraskirja odottaa ensimmäistä kirjautujaa…');
        var st = mkWall.eventTimes.start;
        if (st && st > new Date()) M('AIKA', 'Kirjautuminen avautuu ' + mkWallDur(st - new Date()) + ' päästä');
    }

    if (isSeries) {
        var tot = 0;
        mkWall.seriesEvents.forEach(function (e) { tot += (mkWall.counts[e.key] || 0); });
        M('SARJA', 'Sarjassa yhteensä ' + tot + ' kävijää');
        M('SARJA', 'Vuoro ' + mkWall.vuoro + ' / ' + mkWall.seriesEvents.length);
    }
    if (mkWall.ordinal > 0) M('TILASTOT', 'Tämä on ' + mkWall.ordLabel);
    if (mkWall.placeStats && mkWall.placeStats.total > 1) M('PAIKAT', mkWall.placeStats.total + '. miitti tällä paikalla');
    if (mkWall.placeStats && mkWall.placeStats.year > 1) M('PAIKAT', mkWall.placeStats.year + ' miittiä tällä paikalla tänä vuonna');
    if (mkWall.weather) M('SÄÄ', 'Ulkona nyt ' + mkWall.weather.temp + '°C ' + mkWall.weather.icon);
    if (mkWall.nextEvent) M('SEURAAVAKSI', 'Seuraavaksi: ' + mkWall.nextEvent.name + ' ' + (mkWall.nextEvent.time || ''));
    M('KIRJAUDU', 'Skannaa QR-koodi ja kirjaudu vieraskirjaan!');
    return msgs;
}

// Uutispalkki: yksi otsikko kerrallaan. Pitkä teksti scrollataan ensin
// kokonaan näkyviin — seuraavaan vaihdetaan vasta sen jälkeen.
function scheduleWallTicker() {
    if (mkWall.tickerTimer) clearTimeout(mkWall.tickerTimer);
    if (mkWall.scrollTimer) { clearTimeout(mkWall.scrollTimer); mkWall.scrollTimer = null; }
    var textEl = document.getElementById('wt-text');
    var wrap = textEl ? textEl.parentNode : null;
    var wait = 4500;
    if (wrap && textEl) {
        textEl.style.transition = 'none';
        textEl.style.transform = 'translateX(0)';
        var over = textEl.scrollWidth - wrap.clientWidth;
        if (over > 4) {
            var dur = Math.round(over / 0.045); // ~45 px/s
            wait = 1200 + dur + 1800;
            mkWall.scrollTimer = setTimeout(function () {
                textEl.style.transition = 'transform ' + dur + 'ms linear';
                textEl.style.transform = 'translateX(-' + over + 'px)';
            }, 1200);
        }
    }
    mkWall.tickerTimer = setTimeout(function () { updateWallTicker(true); }, wait);
}

function updateWallTicker(advance) {
    if (!mkWall.open) return;
    var textEl = document.getElementById('wt-text');
    if (!textEl) return;
    var msgs = wallTickerMessages();
    if (!msgs.length) return;
    if (advance) mkWall.tickerIdx = (mkWall.tickerIdx + 1) % msgs.length;
    if (mkWall.tickerIdx < 0 || mkWall.tickerIdx >= msgs.length) mkWall.tickerIdx = 0;
    var m = msgs[mkWall.tickerIdx];

    var changed = textEl.innerText !== m.text;
    if (changed) {
        textEl.innerText = m.text;
        var hl = document.getElementById('wt-headline');
        if (hl) { hl.classList.remove('wt-swap'); void hl.offsetWidth; hl.classList.add('wt-swap'); }
    }
    var kicker = document.getElementById('wt-kicker');
    if (kicker) kicker.innerText = m.cat;
    var timeEl = document.getElementById('wt-time');
    if (timeEl) timeEl.innerText = m.time || mkWallClock(new Date());
    var catsEl = document.getElementById('wt-cats');
    if (catsEl) {
        var seen = {};
        catsEl.innerHTML = '';
        msgs.forEach(function (mm) {
            if (seen[mm.cat]) return;
            seen[mm.cat] = 1;
            var s = document.createElement('span');
            s.innerText = mm.cat;
            if (mm.cat === m.cat) s.className = 'on';
            catsEl.appendChild(s);
        });
    }
    if (changed || !mkWall.tickerTimer) scheduleWallTicker();
}

function closeWall() {
    mkWall.open = false;
    mkWall.logRefs.forEach(function (r) { try { r.off(); } catch (e) {} });
    mkWall.logRefs = [];
    if (mkWall.eventRef) { try { mkWall.eventRef.off(); } catch (e) {} mkWall.eventRef = null; }
    mkWall.counts = {};
    mkWall.logs = [];
    mkWall.lastTotal = null;
    mkWall.weather = null;
    mkWall.qrManual = false;
    if (mkWall.tickerTimer) { clearTimeout(mkWall.tickerTimer); mkWall.tickerTimer = null; }
    if (mkWall.scrollTimer) { clearTimeout(mkWall.scrollTimer); mkWall.scrollTimer = null; }
    if (mkWall.feedTimer) { clearInterval(mkWall.feedTimer); mkWall.feedTimer = null; }
    if (mkWall.byeTimer) { clearInterval(mkWall.byeTimer); mkWall.byeTimer = null; }
    mkWall.ended = false;
    mkWall.endShown = false;
    mkWall.endDismissed = false;
    var endEl = document.getElementById('wall-end');
    if (endEl) endEl.style.display = 'none';
    var zoomEl = document.getElementById('wall-qr-zoom');
    if (zoomEl) zoomEl.style.display = 'none';
    var wEl = document.getElementById('wall-welcome');
    if (wEl) wEl.classList.remove('show');
    mkWall.tickerIdx = -1;
    mkWall.maskVisible = null;
    mkWall.fxCode = null;
    mkWall.placeStats = null;
    var fxEl = document.getElementById('wall-fx');
    if (fxEl) fxEl.innerHTML = '';
    if (mkWall.liveTimer) { clearInterval(mkWall.liveTimer); mkWall.liveTimer = null; }
    if (mkWall.tickerTimer) { clearInterval(mkWall.tickerTimer); mkWall.tickerTimer = null; }
    if (mkWall.countdownTimer) { clearInterval(mkWall.countdownTimer); mkWall.countdownTimer = null; }
    if (mkWall.spotTimer) { clearInterval(mkWall.spotTimer); mkWall.spotTimer = null; }
    mkWall.spotIdx = 0;
    mkWall.spotKey = null;
    mkWall.nickCounts = {};
    if (mkWall.boardTimer) { clearInterval(mkWall.boardTimer); mkWall.boardTimer = null; }
    mkWall.boardOffset = 0;
    mkWall.boardShown = {};
    mkWall.factOffset = 0;
    mkWall.jokeOffset = 0;
    mkWall.pool = [];
    mkWall.liveNotes = {};
    mkWall.poolIdx = 0;
    mkWall.nextSpawnAt = 0;
    mkWall.zTop = 0;
    var feedEl = document.getElementById('wall-feed');
    if (feedEl) feedEl.innerHTML = '';
    var amb = document.getElementById('wall-ambient');
    if (amb) amb.innerHTML = '';
    var cd = document.getElementById('wall-countdown');
    if (cd) { cd.innerHTML = ''; cd.className = ''; }
    var view = document.getElementById('wall-view');
    if (view) view.style.display = 'none';
    if (mkWall.wakeLock && mkWall.wakeLock.release) {
        mkWall.wakeLock.release();
        mkWall.wakeLock = null;
    }
    try {
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    } catch (e) {}
}

// Kytkennät
var wallBtn = document.getElementById('btn-open-wall');
if (wallBtn) wallBtn.onclick = openWall;

// Äänimerkki uudesta kirjautujasta — pehmeä ding-dong (Web Audio, ei tiedostoa)
function mkWallPlayDing() {
    if (!mkWall.soundOn) return;
    try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!mkWall.ac) mkWall.ac = new AC();
        var ac = mkWall.ac;
        if (ac.state === 'suspended') ac.resume();
        var t0 = ac.currentTime;
        [880, 660].forEach(function (f, i) {
            var o = ac.createOscillator();
            var g = ac.createGain();
            o.type = 'sine';
            o.frequency.value = f;
            var st = t0 + i * 0.18;
            g.gain.setValueAtTime(0.0001, st);
            g.gain.exponentialRampToValueAtTime(0.25, st + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, st + 0.35);
            o.connect(g);
            g.connect(ac.destination);
            o.start(st);
            o.stop(st + 0.4);
        });
    } catch (e) {}
}

// Äänimerkki-toggle seinän kulmassa (muistetaan localStoragessa)
try { mkWall.soundOn = (localStorage.getItem('mk_wall_sound') === '1'); } catch (e) {}
var wallSoundBtn = document.getElementById('wall-sound');
if (wallSoundBtn) {
    wallSoundBtn.innerText = mkWall.soundOn ? '🔊' : '🔇';
    wallSoundBtn.onclick = function () {
        mkWall.soundOn = !mkWall.soundOn;
        try { localStorage.setItem('mk_wall_sound', mkWall.soundOn ? '1' : '0'); } catch (e) {}
        wallSoundBtn.innerText = mkWall.soundOn ? '🔊' : '🔇';
        if (mkWall.soundOn) mkWallPlayDing(); // testisoitto — myös aktivoi AudioContextin napautuksesta
    };
}

// Vaalea/tumma teema seinälle (muistetaan localStoragessa)
var wallThemeBtn = document.getElementById('wall-theme');
if (wallThemeBtn) wallThemeBtn.onclick = function () {
    var v = document.getElementById('wall-view');
    var light = !v.classList.contains('wall-light');
    v.classList.toggle('wall-light', light);
    try { localStorage.setItem('mk_wall_theme', light ? 'light' : 'dark'); } catch (e) {}
    wallThemeBtn.innerText = light ? '🌙' : '☀️';
};

// Loppunäytön voi sulkea — seinä palaa normaaliksi kunnes se avataan uudelleen
var wallEndCloseBtn = document.getElementById('wall-end-close');
if (wallEndCloseBtn) wallEndCloseBtn.onclick = function () {
    mkWall.endDismissed = true;
    updateWallEnd();
};
var wallCloseBtn = document.getElementById('wall-close');
if (wallCloseBtn) wallCloseBtn.onclick = closeWall;
document.addEventListener('keydown', function (e) {
    if (mkWall.open && e.key === 'Escape') closeWall();
});

// QR-alueen napautus: ennen alkua vaihtaa manuaalista näyttöä/piilottamista
var wallQrWrap = document.getElementById('wall-qr-wrap');
if (wallQrWrap) {
    wallQrWrap.onclick = function () {
        var t = mkWall.eventTimes || {};
        var started = !t.start || new Date() >= t.start;
        if (!started) {
            mkWall.qrManual = !mkWall.qrManual;
            updateWallQrMask();
        }
    };
}
