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
    lastTickerIdx: -1,
    ordinal: 0,
    ordLabel: '',
    nextEvent: null
};

function mkWallSortKey(e) {
    return (e.date || '') + 'T' + (e.time || '00:00');
}

function mkWallDate(d) {
    var p = (d || '').split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : (d || '');
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
    updateWallQrMask();
    updateWallTicker();
}

// QR näkyy vasta kun miitti alkaa — tai jos käyttäjä on avannut manuaalisesti
function updateWallQrMask() {
    var mask = document.getElementById('wall-qr-mask');
    if (!mask) return;
    var t = mkWall.eventTimes || {};
    var started = !t.start || new Date() >= t.start;
    var show = started || mkWall.qrManual;
    mask.style.display = show ? 'none' : 'flex';
    var txt = document.getElementById('wall-qr-mask-text');
    if (!show && txt) {
        txt.innerText = t.start ? 'Avautuu ' + mkWallDur(t.start - new Date()) : 'Kirjautuminen avautuu miitin alkaessa';
    }
}

function fetchWallWeather(ev) {
    var ll = mkWallParseCoords(ev.coords);
    if (!ll) return;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + ll[0].toFixed(5) + '&longitude=' + ll[1].toFixed(5) + '&current=temperature_2m,weather_code&timezone=auto';
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
        if (!mkWall.open || !j || !j.current) return;
        mkWall.weather = { temp: Math.round(j.current.temperature_2m), icon: mkWmoIcon(j.current.weather_code) };
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

    // Live-rivi: kello + countdown + sää
    mkWall.eventTimes = mkWallEventTimes(ev);
    updateWallLive();
    if (mkWall.liveTimer) clearInterval(mkWall.liveTimer);
    mkWall.liveTimer = setInterval(updateWallLive, 15000);
    fetchWallWeather(ev);
    updateWallQrMask();

    // Uutispalkki (päivittyy datan mukana renderWallData/liveTimer-kutsuilla)
    mkWall.tickerJoined = null;
    updateWallTicker();

    var q = document.getElementById('wall-qr');
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
    }
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

    // Pulssi + konfetti kun kokonaismäärä kasvaa
    if (mkWall.lastTotal !== null && total > mkWall.lastTotal) {
        el.classList.remove('wall-pulse');
        void el.offsetWidth; // pakota animaation uudelleenkäynnistys
        el.classList.add('wall-pulse');
        wallConfetti();
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
    var feed = document.getElementById('wall-feed');
    feed.innerHTML = '';
    if (!logs.length) {
        feed.innerHTML = '<div class="wall-feed-empty">Odotetaan ensimmäistä kirjautujaa…</div>';
        return;
    }
    var colors = ['#64ffda', '#ffd9a0', '#ff7b9c', '#7fff9f', '#a0c4ff', '#ffc6ff', '#fdffb6', '#9bf6ff'];
    logs.forEach(function (l, idx) {
        var chip = document.createElement('span');
        chip.className = 'wall-chip' + (idx === 0 ? ' wall-new' : '');
        chip.style.background = colors[idx % colors.length];
        chip.innerText = l.nickname || '?';
        var t = l.timestamp ? new Date(l.timestamp) : null;
        chip.title = (l.from ? l.from + ' · ' : '') + (t ? ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2) : '') + (l.message ? '\n"' + l.message + '"' : '');
        feed.appendChild(chip);
    });
    updateWallTicker();
}

function wallConfetti() {
    var box = document.getElementById('wall-confetti');
    if (!box) return;
    var colors = ['#64ffda', '#ffd9a0', '#ff7b9c', '#7fff9f', '#ffd700', '#ff8c42', '#a0c4ff'];
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

// --- Pyörivä statistiikkapalkki: satunnaisia faktatietoja 12 s välein ---
function wallTickerMessages() {
    var msgs = [];
    var ev = mkWall.event || {};
    var isSeries = mkWall.seriesEvents.length > 1;
    var logs = mkWall.logs.slice().sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });

    if (logs.length) {
        var l0 = logs[0];
        msgs.push('🆕 Uusin kirjautuja: ' + (l0.nickname || '?') + (l0.from ? ' · ' + l0.from : ''));
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
        if (msgN) msgs.push('💬 ' + msgN + ' tervehdystä kirjoitettu vieraskirjaan');
        var pc = Object.keys(places).length;
        if (pc > 1) msgs.push('📍 Kirjautujia ' + pc + ' eri paikkakunnalta');
        if (isSeries) {
            var top = null, topN = 0;
            Object.keys(per).forEach(function (k) {
                var c = Object.keys(per[k].evs).length;
                if (c > topN) { topN = c; top = per[k].name; }
            });
            if (top && topN > 1) msgs.push('🔥 Sarjan ahkerin vieras: ' + top + ' — ' + topN + ' vuoroa');
        }
        var first = logs[logs.length - 1];
        if (first && first.nickname && logs.length > 1) msgs.push('🥇 Avauskirjauksen teki ' + first.nickname);
        if (l0.message) msgs.push('📢 "' + l0.message.slice(0, 60) + '"' + (l0.message.length > 60 ? '…' : '') + ' — ' + l0.nickname);
    } else {
        msgs.push('🎪 Vieraskirja odottaa ensimmäistä kirjautujaa…');
        var st = mkWall.eventTimes.start;
        if (st && st > new Date()) msgs.push('⏳ Kirjautuminen avautuu ' + mkWallDur(st - new Date()) + ' päästä');
    }

    if (isSeries) {
        var tot = 0;
        mkWall.seriesEvents.forEach(function (e) { tot += (mkWall.counts[e.key] || 0); });
        msgs.push('📊 Sarjassa yhteensä ' + tot + ' kävijää');
        msgs.push('🎖️ Vuoro ' + mkWall.vuoro + ' / ' + mkWall.seriesEvents.length);
    }
    if (mkWall.ordinal > 0) msgs.push('📈 Tämä on ' + mkWall.ordLabel);
    if (mkWall.weather) msgs.push(mkWall.weather.icon + ' Ulkona nyt ' + mkWall.weather.temp + '°C');
    if (mkWall.nextEvent) msgs.push('➡️ Seuraavaksi: ' + mkWall.nextEvent.name + ' ' + (mkWall.nextEvent.time || ''));
    msgs.push('📱 Skannaa QR-koodi ja kirjaudu vieraskirjaan!');
    return msgs;
}

// Uutispalkki: tilastot vyöryvät oikealta vasemmalle saumattomana looppina
function updateWallTicker() {
    var track = document.getElementById('wall-ticker-track');
    if (!track || !mkWall.open) return;
    var msgs = wallTickerMessages();
    if (!msgs.length) return;
    var joined = msgs.join('      •      ') + '      •      ';
    if (joined === mkWall.tickerJoined) return; // ei muutoksia — älä keskeytä vyöryä
    mkWall.tickerJoined = joined;
    track.innerHTML = '';
    // Kaksi identtistä palaa — translateX(-50%) tekee saumattoman loopin
    for (var i = 0; i < 2; i++) {
        var s = document.createElement('span');
        s.className = 'wall-ticker-chunk';
        s.innerText = joined;
        track.appendChild(s);
    }
    var dur = Math.max(15, Math.round(joined.length * 0.16));
    track.style.animationDuration = dur + 's';
}

function closeWall() {
    mkWall.open = false;
    mkWall.logRefs.forEach(function (r) { try { r.off(); } catch (e) {} });
    mkWall.logRefs = [];
    mkWall.counts = {};
    mkWall.logs = [];
    mkWall.lastTotal = null;
    mkWall.weather = null;
    mkWall.qrManual = false;
    mkWall.lastTickerIdx = -1;
    if (mkWall.liveTimer) { clearInterval(mkWall.liveTimer); mkWall.liveTimer = null; }
    if (mkWall.tickerTimer) { clearInterval(mkWall.tickerTimer); mkWall.tickerTimer = null; }
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
