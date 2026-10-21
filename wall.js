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
    scrollTimer: null,
    feedTimer: null,
    ended: false,
    endShown: false,
    endDismissed: false,
    tickerIdx: -1,
    ordinal: 0,
    ordLabel: '',
    nextEvent: null,
    maskVisible: null,
    fxCode: null
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
        return;
    }
    el.style.display = 'flex';
    var sub = document.getElementById('wall-end-sub');
    if (sub) sub.innerText = (mkWall.event || {}).name || '';
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
    if (!mkWall.endShown) {
        mkWall.endShown = true;
        wallConfetti();
        wallConfetti();
    }
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

    // Pulssi + konfetti + tervetuloa kun kokonaismäärä kasvaa
    if (mkWall.lastTotal !== null && total > mkWall.lastTotal) {
        el.classList.remove('wall-pulse');
        void el.offsetWidth; // pakota animaation uudelleenkäynnistys
        el.classList.add('wall-pulse');
        wallConfetti();
        var newest = null;
        mkWall.logs.forEach(function (l) {
            if (!newest || (l.timestamp || 0) > (newest.timestamp || 0)) newest = l;
        });
        wallWelcome(newest);
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
        updateWallEnd();
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
    // Ylivuoto: tiiviimpi asettelu + hidas edestakainen automaattiskrollaus
    var box = feed.parentNode;
    if (box) box.classList.toggle('wall-feed-dense', logs.length > 24);
    setupWallFeedScroll();
    // Uusi kirjautuja näkyy palkissa heti (kohta 1 = uusin kirjautuja)
    mkWall.tickerIdx = -1;
    updateWallTicker(true);
    // Loppunäytön tilastot tuoreena heti kun kuuntelija palauttaa dataa
    updateWallEnd();
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
    mkWall.counts = {};
    mkWall.logs = [];
    mkWall.lastTotal = null;
    mkWall.weather = null;
    mkWall.qrManual = false;
    if (mkWall.tickerTimer) { clearTimeout(mkWall.tickerTimer); mkWall.tickerTimer = null; }
    if (mkWall.scrollTimer) { clearTimeout(mkWall.scrollTimer); mkWall.scrollTimer = null; }
    if (mkWall.feedTimer) { clearInterval(mkWall.feedTimer); mkWall.feedTimer = null; }
    mkWall.ended = false;
    mkWall.endShown = false;
    mkWall.endDismissed = false;
    var endEl = document.getElementById('wall-end');
    if (endEl) endEl.style.display = 'none';
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
