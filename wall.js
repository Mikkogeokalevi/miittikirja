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
    allEvents: []
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
        if (ord > 0) {
            var nick = (typeof MK_Config !== 'undefined' && MK_Config.OWNER_NICK) ? MK_Config.OWNER_NICK : 'Järjestäjä';
            var label = ty === 'cito' ? 'CITO' : (ty === 'cce' ? 'JUHLA' : 'MIITTI');
            badge.style.display = 'inline-block';
            badge.innerText = nick.toUpperCase() + 'N ' + ord + '. ' + label;
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
        nextEl.style.display = 'block';
        nextEl.innerText = 'SEURAAVAKSI: ' + (n.name || 'Miitti') + '  ·  ' + mkWallDate(n.date) + '  ' + (n.time || '');
    } else {
        nextEl.style.display = 'none';
    }

    // Live-rivi: kello + countdown + sää
    mkWall.eventTimes = mkWallEventTimes(ev);
    updateWallLive();
    if (mkWall.liveTimer) clearInterval(mkWall.liveTimer);
    mkWall.liveTimer = setInterval(updateWallLive, 15000);
    fetchWallWeather(ev);

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

    // Pulssi kun kokonaismäärä kasvaa
    if (mkWall.lastTotal !== null && total > mkWall.lastTotal) {
        el.classList.remove('wall-pulse');
        void el.offsetWidth; // pakota animaation uudelleenkäynnistys
        el.classList.add('wall-pulse');
    }
    mkWall.lastTotal = total;

    // Viimeisimmät kirjaukset (kaikki sarjan miitit sekaisin, uusin ensin)
    var feed = document.getElementById('wall-feed');
    var logs = mkWall.logs.slice().sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); }).slice(0, 8);
    feed.innerHTML = '';
    if (!logs.length) {
        feed.innerHTML = '<div class="wall-feed-empty">Odotetaan ensimmäistä kirjautujaa…</div>';
        return;
    }
    logs.forEach(function (l, idx) {
        var row = document.createElement('div');
        row.className = 'wall-feed-item' + (idx === 0 ? ' wall-new' : '');
        var t = l.timestamp ? new Date(l.timestamp) : null;
        var timeStr = t ? ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2) : '';
        var nick = document.createElement('span');
        nick.className = 'wall-feed-nick';
        nick.innerText = l.nickname || '?';
        var from = document.createElement('span');
        from.className = 'wall-feed-from';
        from.innerText = l.from ? ' / ' + l.from : '';
        var tm = document.createElement('span');
        tm.className = 'wall-feed-time';
        tm.innerText = timeStr;
        row.appendChild(nick);
        row.appendChild(from);
        row.appendChild(tm);
        feed.appendChild(row);
    });
}

function closeWall() {
    mkWall.open = false;
    mkWall.logRefs.forEach(function (r) { try { r.off(); } catch (e) {} });
    mkWall.logRefs = [];
    mkWall.counts = {};
    mkWall.logs = [];
    mkWall.lastTotal = null;
    mkWall.weather = null;
    if (mkWall.liveTimer) { clearInterval(mkWall.liveTimer); mkWall.liveTimer = null; }
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
