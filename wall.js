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
    wakeLock: null
};

function mkWallSortKey(e) {
    return (e.date || '') + 'T' + (e.time || '00:00');
}

function mkWallDate(d) {
    var p = (d || '').split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : (d || '');
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
        badge.style.display = 'none';
    }

    var meta = [];
    if (ev.date) meta.push(mkWallDate(ev.date));
    if (ev.time) meta.push(ev.time);
    if (ev.location) meta.push(ev.location);
    if (ev.gc) meta.push(ev.gc);
    document.getElementById('wall-info').innerText = meta.join('  ·  ');

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
