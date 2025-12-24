// ==========================================
// 1. ASETUKSET JA MUUTTUJAT
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCZIupycr2puYrPK2KajAW7PcThW9Pjhb0",
    authDomain: "perhekalenteri-projekti.firebaseapp.com",
    databaseURL: "https://perhekalenteri-projekti-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "perhekalenteri-projekti",
    storageBucket: "perhekalenteri-projekti.appspot.com",
    messagingSenderId: "588536838615",
    appId: "1:588536838615:web:148de0581bbd46c42c7392"
};

try { firebase.initializeApp(firebaseConfig); } catch (e) { console.error(e); }
const db = firebase.database();
const auth = firebase.auth();

let currentUser = null;
let currentEventId = null;
let currentEventArchived = false;
let globalEventList = []; 

// UI Elementit
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const guestbookView = document.getElementById('guestbook-view');
const editModal = document.getElementById('edit-modal');
const massModal = document.getElementById('mass-modal');
const logEditModal = document.getElementById('log-edit-modal');
const userDisplay = document.getElementById('user-display');
const eventStatsEl = document.getElementById('event-stats');
const loadingOverlay = document.getElementById('loading-overlay');

let touchStartX = 0;
let touchEndX = 0;

// ==========================================
// 2. KIRJAUTUMINEN JA SWIPE-LOGIIKKA
// ==========================================
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        if(userDisplay) {
            userDisplay.style.display = 'block';
            userDisplay.innerText = "👤 " + user.email;
        }
        if (guestbookView.style.display !== 'block') {
            showAdminView();
        }
        loadEvents();
    } else {
        currentUser = null;
        if(userDisplay) userDisplay.style.display = 'none';
        showLoginView();
    }
});

// Pyyhkäisy kuuntelijat
guestbookView.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

guestbookView.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
        navigateEvent(-1); // Seuraava (vasemmalle)
    }
    if (touchEndX > touchStartX + swipeThreshold) {
        navigateEvent(1);  // Edellinen (oikealle)
    }
}

document.getElementById('btn-login-google').onclick = () => {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => alert(e.message));
};

document.getElementById('btn-email-login').onclick = () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    auth.signInWithEmailAndPassword(email, pass).catch(e => alert(e.message));
};

document.getElementById('btn-email-register').onclick = () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    auth.createUserWithEmailAndPassword(email, pass).catch(e => alert(e.message));
};

document.getElementById('btn-logout').onclick = () => { 
    if(confirm("Haluatko kirjautua ulos?")) auth.signOut().then(() => location.reload()); 
};

function showLoginView() { 
    loginView.style.display = 'flex'; 
    adminView.style.display = 'none'; 
    guestbookView.style.display = 'none'; 
}

function showAdminView() {
    if (!currentUser) { showLoginView(); return; }
    loginView.style.display = 'none'; 
    adminView.style.display = 'block'; 
    guestbookView.style.display = 'none';
    if(currentEventId) { 
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).off(); 
        currentEventId = null; 
    }
}
window.showAdminView = showAdminView;

// ==========================================
// 3. GPX-PARSERI JA SIJAINTIHAKU
// ==========================================

async function fetchCityFromCoords(coords, targetId) {
    const match = coords.match(/([NS])\s*(\d+)°\s*([\d\.]+)\s*([EW])\s*(\d+)°\s*([\d\.]+)/);
    let lat, lon;
    if (match) {
        lat = parseInt(match[2]) + parseFloat(match[3]) / 60;
        if (match[1] === 'S') lat = -lat;
        lon = parseInt(match[5]) + parseFloat(match[6]) / 60;
        if (match[4] === 'W') lon = -lon;
    } else {
        const parts = coords.split(',');
        if (parts.length === 2) { 
            lat = parseFloat(parts[0]); 
            lon = parseFloat(parts[1]); 
        }
    }

    if (!lat || !lon) return "";

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await res.json();
        if (data.address) {
            const city = data.address.city || data.address.town || data.address.village || "";
            const country = data.address.country || "";
            const result = (city && country) ? `${city}, ${country}` : country;
            const el = document.getElementById(targetId);
            if (el) el.value = result;
            return result;
        }
    } catch (e) { 
        console.error("Sijaintihaku epäonnistui", e); 
    }
    return "";
}

function parseGPX(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");
    const wpt = xml.querySelector("wpt");
    const cache = xml.querySelector("cache");

    if (!wpt || !cache) return null;

    const lat = wpt.getAttribute("lat");
    const lon = wpt.getAttribute("lon");

    // Kellonajan etsintä
    let timeStr = "";
    const shortDesc = cache.querySelector("short_description")?.textContent || "";
    const timeMatch = shortDesc.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    if (timeMatch) timeStr = `${timeMatch[1]} - ${timeMatch[2]}`;

    // Attribuutit
    const attributes = [];
    cache.querySelectorAll("attribute").forEach(attr => {
        if (attr.getAttribute("inc") === "1") {
            attributes.push(attr.textContent.trim());
        }
    });

    // Osallistujat (Vain Attended, ei mikkokalevi)
    const attendees = [];
    xml.querySelectorAll("log").forEach(log => {
        const type = log.querySelector("type")?.textContent;
        const finder = log.querySelector("finder")?.textContent;
        if (type === "Attended" && finder && finder.toLowerCase() !== "mikkokalevi") {
            attendees.push(finder);
        }
    });

    return {
        gc: xml.querySelector("name")?.textContent || "",
        name: cache.querySelector("name")?.textContent || "",
        date: xml.querySelector("time")?.textContent?.split('T')[0] || "",
        time: timeStr,
        coords: `N ${lat} E ${lon}`,
        descriptionHtml: cache.querySelector("long_description")?.textContent || "",
        attributes: attributes,
        attendees: [...new Set(attendees)]
    };
}

// ==========================================
// 4. TAPAHTUMIEN TUONTI JA LOMAKKEET
// ==========================================

document.getElementById('import-gpx-new').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const data = parseGPX(text);
    if (data) {
        document.getElementById('new-gc').value = data.gc;
        document.getElementById('new-name').value = data.name;
        document.getElementById('new-date').value = data.date;
        document.getElementById('new-time').value = data.time;
        document.getElementById('new-coords').value = data.coords;
        document.getElementById('new-desc').value = data.descriptionHtml;
        fetchCityFromCoords(data.coords, 'new-loc');
        alert("Tiedot haettu GPX-tiedostosta!");
    }
};

document.getElementById('btn-sync-gpx-trigger').onclick = () => {
    document.getElementById('import-gpx-sync').click();
};

document.getElementById('import-gpx-sync').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentEventId) return;
    
    loadingOverlay.style.display = 'flex';
    const text = await file.text();
    const gpxData = parseGPX(text);
    
    if (!gpxData) {
        loadingOverlay.style.display = 'none';
        alert("GPX tiedoston luku epäonnistui.");
        return;
    }

    const currentLogsSnap = await db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).once('value');
    const existingNicks = [];
    currentLogsSnap.forEach(child => { existingNicks.push(child.val().nickname.toLowerCase()); });

    const updates = {};
    const currentEvtSnap = await db.ref('miitit/' + currentUser.uid + '/events/' + currentEventId).once('value');
    const currentEvt = currentEvtSnap.val();

    if (!currentEvt.descriptionHtml) updates.descriptionHtml = gpxData.descriptionHtml;
    if (!currentEvt.attributes) updates.attributes = gpxData.attributes;
    if (!currentEvt.location) {
        const city = await fetchCityFromCoords(gpxData.coords, 'gb-loc');
        if (city) updates.location = city;
    }
    
    if (Object.keys(updates).length > 0) {
        await db.ref('miitit/' + currentUser.uid + '/events/' + currentEventId).update(updates);
    }

    let addedCount = 0;
    for (const nick of gpxData.attendees) {
        if (!existingNicks.includes(nick.toLowerCase())) {
            await db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({
                nickname: nick,
                from: "",
                message: "(GPX Päivitys)",
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            addedCount++;
        }
    }

    loadingOverlay.style.display = 'none';
    alert(`Synkronointi valmis!\n- Lisätty ${addedCount} uutta osallistujaa.\n- Puuttuvat tiedot päivitetty.`);
};

function processTextImport(text, mode) {
    const prefix = mode === 'new' ? 'new-' : 'edit-';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length > 0) {
        const ignore = ["Tapahtuman tekijä", "Tapahtumapäivä", "Alkamisaika", "Loppumisaika", "Vaikeustaso", "Maasto", "Koko", "Maa:", "N ", "E ", "UTM"];
        if (!ignore.some(p => lines[0].startsWith(p))) {
            document.getElementById(prefix + 'name').value = lines[0];
        }
    }

    const dateMatch = text.match(/Tapahtumapäivä:\s*(\d{1,2}\.\d{1,2}\.\d{4})/);
    if (dateMatch) {
        const p = dateMatch[1].split('.');
        document.getElementById(prefix + 'date').value = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }

    const startMatch = text.match(/Alkamisaika:\s*(\d{1,2}[:\.]\d{2})/);
    const endMatch = text.match(/Loppumisaika:\s*(\d{1,2}[:\.]\d{2})/);
    if (startMatch) {
        let s = startMatch[1].replace('.', ':'); if(s.indexOf(':') === 1) s = '0'+s;
        let e = ""; if (endMatch) { e = endMatch[1].replace('.', ':'); if(e.indexOf(':') === 1) e = '0'+e; }
        document.getElementById(prefix + 'time').value = e ? `${s} - ${e}` : s;
    }

    const coordMatch = text.match(/([NS]\s*\d+°\s*[\d\.]+\s*[EW]\s*\d+°\s*[\d\.]+)/);
    if (coordMatch) {
        const coords = coordMatch[1].trim();
        document.getElementById(prefix + 'coords').value = coords;
        fetchCityFromCoords(coords, prefix + 'loc');
    }

    const gcMatch = text.match(/(GC[A-Z0-9]+)/);
    if (gcMatch) document.getElementById(prefix + 'gc').value = gcMatch[1];
}

document.getElementById('btn-process-import').onclick = () => {
    processTextImport(document.getElementById('import-text').value, 'new');
};

document.getElementById('btn-process-edit-import').onclick = () => {
    processTextImport(document.getElementById('edit-import-text').value, 'edit');
};

// ==========================================
// 5. MIITTIEN LISTAUS JA NAVIGOINTI
// ==========================================

document.getElementById('btn-find-today').onclick = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayEvent = globalEventList.find(e => e.date === today);
    if (todayEvent) openGuestbook(todayEvent.key); else alert("Ei miittejä tälle päivälle.");
};

window.navigateEvent = (direction) => {
    if (!currentEventId || globalEventList.length === 0) return;
    const currentIndex = globalEventList.findIndex(e => e.key === currentEventId);
    if (currentIndex === -1) return;
    const newIndex = currentIndex - direction;
    if (newIndex >= 0 && newIndex < globalEventList.length) {
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).off();
        openGuestbook(globalEventList[newIndex].key);
    }
};

document.getElementById('new-event-toggle').onclick = () => {
    const f = document.getElementById('new-event-form');
    f.style.display = (f.style.display === 'none') ? 'block' : 'none';
};

document.getElementById('btn-add-event').onclick = () => {
    const data = {
        type: document.getElementById('new-type').value,
        gc: document.getElementById('new-gc').value.trim().toUpperCase(),
        name: document.getElementById('new-name').value.trim(),
        date: document.getElementById('new-date').value,
        time: document.getElementById('new-time').value.trim(),
        coords: document.getElementById('new-coords').value.trim(),
        location: document.getElementById('new-loc').value.trim(),
        descriptionHtml: document.getElementById('new-desc').value.trim(),
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        isArchived: false
    };
    if(!data.gc || !data.name || !data.date) return alert("Täytä GC, Nimi ja Pvm!");
    db.ref('miitit/' + currentUser.uid + '/events').push(data).then(() => {
        ['new-gc','new-name','new-time','new-coords','new-loc', 'new-desc', 'import-text'].forEach(id => document.getElementById(id).value = "");
        document.getElementById('new-event-form').style.display = 'none';
    });
};

function loadEvents() {
    if (!currentUser) return;
    const lists = {
        miitti: { past: document.getElementById('list-miitti-past'), future: document.getElementById('list-miitti-future') },
        cito: { past: document.getElementById('list-cito-past'), future: document.getElementById('list-cito-future') },
        cce: { past: document.getElementById('list-cce-past'), future: document.getElementById('list-cce-future') }
    };
    db.ref('miitit/' + currentUser.uid + '/events').on('value', (snapshot) => {
        Object.values(lists).forEach(l => { l.past.innerHTML = ""; l.future.innerHTML = ""; });
        const events = []; snapshot.forEach(child => { events.push({key: child.key, ...child.val()}); });
        events.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
        globalEventList = events;
        if(eventStatsEl) eventStatsEl.innerText = `Löytyi ${events.length} tapahtumaa.`;
        const today = new Date().toISOString().split('T')[0];
        events.forEach(evt => {
            const div = document.createElement('div');
            const isArchived = evt.isArchived === true;
            div.className = "card" + (isArchived ? " archived" : "");
            const countId = `count-${evt.key}`;
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between;"><strong>${evt.name}</strong><span>${evt.date}</span></div>
                <div style="font-size:0.8em; color:#666;">🕓 ${evt.time || '-'}</div>
                <div style="font-size:0.9em; color:#A0522D; display:flex; justify-content:space-between;">
                    <span>${evt.gc} • ${evt.location || ''}</span>
                    <span id="${countId}" style="font-weight:bold; color:#333;">👤 0</span>
                </div>
                <div style="margin-top:10px; display:flex; gap:5px;">
                    <button class="btn btn-green btn-small" onclick="openGuestbook('${evt.key}')">📖 Avaa</button>
                    <button class="btn btn-blue btn-small" onclick="openEditModal('${evt.key}')">✏️</button>
                    <button class="btn btn-red btn-small" onclick="deleteEvent('${evt.key}')">🗑</button>
                </div>`;
            db.ref('miitit/' + currentUser.uid + '/logs/' + evt.key).once('value').then(s => { const el = document.getElementById(countId); if (el) el.innerText = "👤 " + s.numChildren(); });
            lists[evt.type][(evt.date >= today) ? "future" : "past"].appendChild(div);
        });
    });
}

// ==========================================
// 6. VIERASKIRJA JA MUOKKAUKSET
// ==========================================

window.openGuestbook = (eventKey) => {
    currentEventId = eventKey;
    db.ref('miitit/' + currentUser.uid + '/events/' + eventKey).on('value', snap => {
        const evt = snap.val(); if(!evt) return; 
        currentEventArchived = evt.isArchived === true;
        document.getElementById('gb-event-name').innerText = evt.name;
        document.getElementById('gb-time').innerText = evt.time || '-';
        document.getElementById('gb-date').innerText = evt.date;
        document.getElementById('gb-gc').innerText = evt.gc;
        document.getElementById('gb-loc').innerText = evt.location || '-';
        
        const coordsEl = document.getElementById('gb-coords');
        if(evt.coords) {
            const cleanCoords = evt.coords.replace(/[^a-zA-Z0-9.,°\s]/g, "");
            coordsEl.innerHTML = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanCoords)}" target="_blank" style="color:#D2691E; font-weight:bold;">${evt.coords}</a>`;
        } else { coordsEl.innerText = "-"; }

        const attrDiv = document.getElementById('gb-attrs');
        attrDiv.innerHTML = "";
        if (evt.attributes && Array.isArray(evt.attributes)) {
            evt.attributes.forEach(a => {
                const span = document.createElement('span');
                span.className = "attr-tag";
                span.innerText = a;
                attrDiv.appendChild(span);
            });
        }

        const descEl = document.getElementById('gb-description');
        if (evt.descriptionHtml) { descEl.innerHTML = evt.descriptionHtml; descEl.style.display = 'block'; } else descEl.style.display = 'none';
        
        document.getElementById('gb-actions-area').style.display = currentEventArchived ? 'none' : 'block';
        document.getElementById('archived-notice').style.display = currentEventArchived ? 'block' : 'none';
    });
    loginView.style.display = 'none'; adminView.style.display = 'none'; guestbookView.style.display = 'block';
    window.scrollTo(0,0); loadAttendees(eventKey);
};

document.getElementById('btn-sign-log').onclick = () => {
    const nick = document.getElementById('log-nickname').value.trim(); if(!nick) return alert("Nimimerkki vaaditaan!");
    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({
        nickname: nick, from: document.getElementById('log-from').value.trim(),
        message: document.getElementById('log-message').value.trim(), timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => { ['log-nickname','log-from','log-message'].forEach(id => document.getElementById(id).value = ""); });
};

function loadAttendees(eventKey) {
    db.ref('miitit/' + currentUser.uid + '/logs/' + eventKey).on('value', (snapshot) => {
        const listEl = document.getElementById('attendee-list'); listEl.innerHTML = ""; const logs = [];
        snapshot.forEach(child => logs.push({key: child.key, ...child.val()}));
        logs.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
        logs.forEach(log => {
            const row = document.createElement('div'); row.className = "log-item";
            let btns = !currentEventArchived ? `<div class="log-actions"><button class="btn-blue btn-small" onclick="openLogEditModal('${log.key}')">✏️</button><button class="btn-red btn-small" onclick="deleteLog('${log.key}')">🗑</button></div>` : "";
            row.innerHTML = `<div><strong style="color:#4caf50;">${log.nickname}</strong><span>${log.from ? ' / ' + log.from : ''}</span><div style="font-style:italic; color:#888;">${log.message || ''}</div></div>${btns}`;
            listEl.appendChild(row);
        });
        document.getElementById('attendee-count').innerText = logs.length;
    });
}

window.openEditModal = (key) => {
    db.ref('miitit/' + currentUser.uid + '/events/' + key).once('value').then(snap => {
        const e = snap.val(); document.getElementById('edit-key').value = key;
        document.getElementById('edit-import-text').value = "";
        ['type','gc','name','date','time','coords'].forEach(f => document.getElementById('edit-'+f).value = e[f] || "");
        document.getElementById('edit-loc').value = e.location || "";
        document.getElementById('edit-desc').value = e.descriptionHtml || "";
        editModal.style.display = "block";
    });
};

document.getElementById('btn-save-edit').onclick = () => {
    const k = document.getElementById('edit-key').value;
    const u = { 
        type: document.getElementById('edit-type').value, gc: document.getElementById('edit-gc').value, 
        name: document.getElementById('edit-name').value, date: document.getElementById('edit-date').value, 
        time: document.getElementById('edit-time').value, coords: document.getElementById('edit-coords').value, 
        location: document.getElementById('edit-loc').value, descriptionHtml: document.getElementById('edit-desc').value 
    };
    db.ref('miitit/' + currentUser.uid + '/events/' + k).update(u).then(() => editModal.style.display = "none");
};

window.openLogEditModal = (logKey) => {
    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId + '/' + logKey).once('value').then(snap => {
        const log = snap.val(); document.getElementById('log-edit-key').value = logKey;
        document.getElementById('log-edit-nick').value = log.nickname; document.getElementById('log-edit-from').value = log.from;
        document.getElementById('log-edit-msg').value = log.message; logEditModal.style.display = "block";
    });
};

document.getElementById('btn-save-log-edit').onclick = () => {
    const k = document.getElementById('log-edit-key').value;
    const u = { nickname: document.getElementById('log-edit-nick').value, from: document.getElementById('log-edit-from').value, message: document.getElementById('log-edit-msg').value };
    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId + '/' + k).update(u).then(() => logEditModal.style.display = "none");
};

window.closeModal = () => { editModal.style.display = "none"; massModal.style.display = "none"; logEditModal.style.display = "none"; };
window.deleteEvent = (k) => { if(confirm("Poistetaanko tapahtuma?")) { db.ref('miitit/'+currentUser.uid+'/events/'+k).remove(); db.ref('miitit/'+currentUser.uid+'/logs/'+k).remove(); } };
window.deleteLog = (lk) => { if(confirm("Poistetaanko kirjaus?")) db.ref('miitit/'+currentUser.uid+'/logs/'+currentEventId+'/'+lk).remove(); };
window.resetMassModal = () => { document.getElementById('mass-step-1').style.display = 'block'; document.getElementById('mass-step-2').style.display = 'none'; };

window.openMassImport = () => {
    document.getElementById('mass-input').value = ""; 
    document.getElementById('mass-output').value = ""; 
    document.getElementById('mass-step-1').style.display = 'block'; 
    document.getElementById('mass-step-2').style.display = 'none';
    massModal.style.display = "block";
};

document.getElementById('btn-parse-mass').onclick = () => {
    const text = document.getElementById('mass-input').value; if(!text) return;
    let names = []; 
    const blocks = text.split(/Näytä\s+loki|View\s+Log|Näytä\s+\/\s+Muokkaa|View\s+\/\s+Edit/i);
    blocks.forEach(b => {
        const clean = b.replace(/\s+/g, ' ').trim();
        if (/Osallistui|Attended/i.test(clean)) {
            const m = clean.match(/^(.*?)\s+(?:Premium\s+Member|Member|Reviewer)/i);
            if (m && m[1]) {
                let n = m[1].trim().replace(/lokia\s*\/\s*Kuvia/gi, "").trim();
                if(!n.includes("Aion osallistua") && n.length > 0 && n.length < 50) names.push(n);
            }
        }
    });
    names = [...new Set(names)]; if (names.length === 0) return alert("Ei nimiä löytynyt!");
    document.getElementById('mass-output').value = names.join('\n');
    document.getElementById('mass-step-1').style.display = 'none'; 
    document.getElementById('mass-step-2').style.display = 'block';
};

document.getElementById('btn-save-mass').onclick = () => {
    document.getElementById('mass-output').value.split('\n').map(s => s.trim()).filter(s => s.length > 0).forEach(n => {
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({ nickname: n, from: "", message: "(Massatuonti)", timestamp: firebase.database.ServerValue.TIMESTAMP });
    });
    massModal.style.display = "none";
};
