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

// Alustetaan Firebase
try { 
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig); 
    }
} catch (e) { 
    console.error("Firebase alustusvirhe:", e); 
}

const db = firebase.database();
const auth = firebase.auth();

// Globaali tila
let currentUser = null;
let currentEventId = null;
let currentEventArchived = false;
let globalEventList = []; 
let isAdminMode = true; 
let wakeLock = null;

// UI Elementit
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const userView = document.getElementById('user-view');
const guestbookView = document.getElementById('guestbook-view');
const visitorView = document.getElementById('visitor-view');
const confirmModal = document.getElementById('confirm-modal');
const loadingOverlay = document.getElementById('loading-overlay');
const userDisplay = document.getElementById('user-display');

// ==========================================
// 2. KÄYNNISTYS JA VIERASTILA
// ==========================================

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event');
    const visitorUid = "T8wI16Gf67W4G4yX3Cq7U0U1H6I2"; // Mikkokalevin UID kovakoodattuna vieraille

    if (eventId) {
        // Ollaanko tultu QR-koodilla?
        console.log("Vierastila aktivoitu miitille:", eventId);
        openVisitorGuestbook(visitorUid, eventId);
    }
};

async function openVisitorGuestbook(uid, eventId) {
    if(loadingOverlay) loadingOverlay.style.display = 'flex';
    currentEventId = eventId;
    
    db.ref('miitit/' + uid + '/events/' + eventId).once('value', snap => {
        const evt = snap.val();
        if(!evt) {
            alert("Miittiä ei löytynyt!");
            location.href = location.origin + location.pathname;
            return;
        }
        
        document.getElementById('vv-event-name').innerText = evt.name;
        document.getElementById('vv-event-info').innerText = `${evt.date} klo ${evt.time || '-'}`;
        
        visitorView.style.display = 'block';
        loginView.style.display = 'none';
        if(loadingOverlay) loadingOverlay.style.display = 'none';
        
        // Aktivoi nimiehdotukset myös vieraalle
        setupAutocomplete('vv-nickname', 'vv-autocomplete', uid);
    });
}

// ==========================================
// 3. NÄYTÖN PÄÄLLÄPITO (WAKE LOCK)
// ==========================================

const requestWakeLock = async () => {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) { console.error("WakeLock virhe:", err); }
};

document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

// ==========================================
// 4. KIRJAUTUMINEN JA NÄKYMÄT
// ==========================================

auth.onAuthStateChanged((user) => {
    // Jos ollaan vierasnäkymässä, ei häiritä
    if (visitorView.style.display === 'block') return;

    if (user) {
        currentUser = user;
        if(userDisplay) {
            userDisplay.style.display = 'flex';
            document.getElementById('user-email-text').innerText = "👤 " + user.email;
        }
        
        const statsView = document.getElementById('stats-view');
        if (guestbookView.style.display !== 'block' && (!statsView || statsView.style.display !== 'block')) {
            showMainView();
        }
        loadEvents();
        requestWakeLock();
    } else {
        currentUser = null;
        if(userDisplay) userDisplay.style.display = 'none';
        showLoginView();
    }
});

function showMainView() {
    if (!currentUser) return showLoginView();
    
    loginView.style.display = 'none'; 
    visitorView.style.display = 'none';
    guestbookView.style.display = 'none';
    if(document.getElementById('stats-view')) document.getElementById('stats-view').style.display = 'none';

    if (isAdminMode) {
        adminView.style.display = 'block';
        userView.style.display = 'none';
    } else {
        adminView.style.display = 'none';
        userView.style.display = 'block';
    }
    
    if(currentEventId) { 
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).off(); 
        currentEventId = null; 
    }
}

window.showMainView = showMainView;

document.getElementById('btn-toggle-mode').onclick = function() {
    isAdminMode = !isAdminMode;
    document.getElementById('btn-toggle-mode').innerText = isAdminMode ? "🔄 Hallinta-tila" : "🔄 Miittikirja-tila";
    showMainView();
    loadEvents();
};

// ==========================================
// 5. QR-KOODI LOGIIKKA
// ==========================================

document.getElementById('btn-toggle-qr').onclick = function() {
    const area = document.getElementById('qr-display-area');
    const container = document.getElementById('qrcode-container');
    
    if (area.style.display === 'block') {
        area.style.display = 'none';
        return;
    }

    container.innerHTML = "";
    // Rakennetaan linkki: URL + ?event=ID
    const guestUrl = window.location.origin + window.location.pathname + "?event=" + currentEventId;
    document.getElementById('qr-link-text').innerText = guestUrl;

    new QRCode(container, {
        text: guestUrl,
        width: 200,
        height: 200,
        colorDark : "#8B4513",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    area.style.display = 'block';
};

// ==========================================
// 6. NIMIMERKIN AUTOMAATTINEN TÄYDENNYS
// ==========================================

function setupAutocomplete(inputId, listId, uid) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    
    input.oninput = async function() {
        const val = input.value.toLowerCase();
        if (val.length < 2) { list.style.display = 'none'; return; }
        
        // Haetaan kaikki nimet statseista tai suoraan logeista
        // Tässä käytetään yksinkertaista tapaa: haetaan kaikki nimet kaikista miiteistä
        const snap = await db.ref('miitit/' + uid + '/logs').once('value');
        let allNames = [];
        snap.forEach(eventLogs => {
            eventLogs.forEach(log => {
                if(log.val().nickname) allNames.push(log.val().nickname);
            });
        });
        
        const matches = [...new Set(allNames)]
            .filter(n => n.toLowerCase().startsWith(val))
            .sort()
            .slice(0, 5);

        if (matches.length > 0) {
            list.innerHTML = matches.map(m => `<div class="autocomplete-item" onclick="selectNick('${m}', '${inputId}', '${listId}')">${m}</div>`).join('');
            list.style.display = 'block';
        } else {
            list.style.display = 'none';
        }
    };
}

window.selectNick = function(name, inputId, listId) {
    document.getElementById(inputId).value = name;
    document.getElementById(listId).style.display = 'none';
};

// ==========================================
// 7. TAPAHTUMAT JA "TÄNÄÄN TAPAHTUU"
// ==========================================

function loadEvents() {
    if (!currentUser) return;
    const todayStr = new Date().toISOString().split('T')[0];
    
    db.ref('miitit/' + currentUser.uid + '/events').on('value', (snapshot) => {
        const adminContainers = ['list-miitti-future','list-miitti-past','list-cito-future','list-cito-past','list-cce-future','list-cce-past'];
        const userContainers = ['user-list-miitti','user-list-cito','user-list-cce'];
        
        adminContainers.concat(userContainers).forEach(id => {
            const el = document.getElementById(id); if(el) el.innerHTML = "";
        });
        
        document.getElementById('today-notice-admin').innerHTML = "";
        document.getElementById('today-notice-user').innerHTML = "";

        const events = [];
        snapshot.forEach(child => { events.push({key: child.key, ...child.val()}); });
        events.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
        globalEventList = events;

        events.forEach(evt => {
            const isToday = (evt.date === todayStr);
            const isArchived = (evt.isArchived === true);
            const countId = `count-${isAdminMode ? 'adm' : 'usr'}-${evt.key}`;
            
            // Luodaan kortti
            const div = document.createElement('div');
            div.className = "card" + (isArchived ? " archived" : "") + (isToday ? " today-highlight" : "");
            
            if (isAdminMode) {
                const archiveBtn = isArchived 
                    ? `<button class="btn btn-blue btn-small" onclick="toggleArchive('${evt.key}', false)">♻️ Palauta</button>`
                    : `<button class="btn btn-red btn-small" onclick="toggleArchive('${evt.key}', true)">📦 Arkistoi</button>`;

                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between;"><strong>${evt.name}</strong><span>${evt.date}</span></div>
                    <div style="font-size:0.8em; color:#666; margin-bottom:5px;">🕓 ${evt.time || '-'}</div>
                    <div style="font-size:0.9em; color:#A0522D; display:flex; justify-content:space-between;">
                        <span><a href="https://coord.info/${evt.gc}" target="_blank" style="color:#A0522D; font-weight:bold; text-decoration:none;">${evt.gc}</a> • ${evt.location || ''}</span>
                        <span id="${countId}">👤 0</span>
                    </div>
                    <div style="margin-top:10px; display:flex; gap:5px; flex-wrap: wrap;">
                        <button class="btn btn-green btn-small" onclick="openGuestbook('${evt.key}')">📖 Avaa</button>
                        <button class="btn btn-blue btn-small" onclick="openEditModal('${evt.key}')">✏️</button>
                        ${archiveBtn}
                        <button class="btn btn-red btn-small" onclick="deleteEvent('${evt.key}')">🗑</button>
                    </div>`;
                
                if (isToday) {
                    const notice = div.cloneNode(true);
                    notice.prepend(document.createRange().createContextualFragment('<h3 style="color:#4caf50; margin-top:0;">🌟 TÄNÄÄN TAPAHTUU!</h3>'));
                    document.getElementById('today-notice-admin').appendChild(notice);
                }
                const target = document.getElementById(evt.date >= todayStr ? `list-${evt.type}-future` : `list-${evt.type}-past`);
                if (target) target.appendChild(div);

            } else {
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between;"><strong>${evt.name}</strong><span>${evt.date}</span></div>
                    <div style="font-size:0.8em; color:#666; margin-bottom:5px;">🕓 ${evt.time || '-'} • ${evt.location || ''}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                         <span id="${countId}" style="font-weight:bold; font-size:0.9em;">👤 0 osallistujaa</span>
                         <button class="btn btn-green btn-small" style="width:auto;" onclick="openGuestbook('${evt.key}')">📖 Avaa miittikirja</button>
                    </div>`;
                
                if (isToday) {
                    const notice = div.cloneNode(true);
                    notice.prepend(document.createRange().createContextualFragment('<h3 style="color:#4caf50; margin-top:0; text-align:center;">🌟 TÄNÄÄN!</h3>'));
                    document.getElementById('today-notice-user').appendChild(notice);
                }
                const target = document.getElementById(`user-list-${evt.type}`);
                if (target) target.appendChild(div);
            }

            db.ref('miitit/' + currentUser.uid + '/logs/' + evt.key).once('value', s => {
                const el = document.getElementById(countId);
                if (el) el.innerText = isAdminMode ? "👤 " + s.numChildren() : "👤 " + s.numChildren() + " osallistujaa";
            });
        });
    });
}

// ==========================================
// 8. VIERASKIRJA JA KIRJAUKSET
// ==========================================

window.openGuestbook = function(eventKey) {
    if(currentEventId) db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).off();
    currentEventId = eventKey;
    
    db.ref('miitit/' + currentUser.uid + '/events/' + eventKey).on('value', snap => {
        const evt = snap.val(); if(!evt) return;
        currentEventArchived = (evt.isArchived === true);

        document.getElementById('gb-event-name').innerText = evt.name;
        document.getElementById('gb-time').innerText = evt.time || '-';
        document.getElementById('gb-date').innerText = evt.date;
        document.getElementById('gb-gc').innerText = evt.gc;
        document.getElementById('gb-loc').innerText = evt.location || '-';
        
        // Attribuutit ja kuvaus (kuten aiemmin)
        const attrDiv = document.getElementById('gb-attrs');
        if(attrDiv) {
            attrDiv.innerHTML = "";
            if (evt.attributes) {
                evt.attributes.forEach(a => {
                    const span = document.createElement('span');
                    span.className = "attr-tag" + (a.inc === 0 ? " neg" : "");
                    span.innerText = a.name || a; attrDiv.appendChild(span);
                });
                document.getElementById('box-attrs').style.display = 'block';
            } else document.getElementById('box-attrs').style.display = 'none';
        }
        
        const descEl = document.getElementById('gb-description');
        if (descEl && evt.descriptionHtml) {
            descEl.innerHTML = evt.descriptionHtml; document.getElementById('box-desc').style.display = 'block';
        } else document.getElementById('box-desc').style.display = 'none';

        // Nollaa QR-näkymä jos se oli auki
        document.getElementById('qr-display-area').style.display = 'none';
        
        document.getElementById('gb-admin-tools').style.display = isAdminMode ? 'block' : 'none';
        document.getElementById('gb-actions-area').style.display = currentEventArchived ? 'none' : 'block';
        document.getElementById('archived-notice').style.display = currentEventArchived ? 'block' : 'none';
        
        // Aktivoi nimiehdotukset adminille
        setupAutocomplete('log-nickname', 'log-autocomplete', currentUser.uid);
    });

    adminView.style.display = 'none'; 
    userView.style.display = 'none'; 
    guestbookView.style.display = 'block';
    window.scrollTo(0,0);
    loadAttendees(eventKey);
};

// Kirjaus vieraalle (QR)
document.getElementById('btn-visitor-sign').onclick = function() {
    const nick = document.getElementById('vv-nickname').value.trim();
    if(!nick) return alert("Nimi vaaditaan!");
    const visitorUid = "T8wI16Gf67W4G4yX3Cq7U0U1H6I2";

    db.ref('miitit/' + visitorUid + '/logs/' + currentEventId).push({
        nickname: nick, 
        from: document.getElementById('vv-from').value.trim(),
        message: document.getElementById('vv-message').value.trim(), 
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert("Kiitos käynnistä! Kirjaus tallennettu.");
        location.href = "https://www.geocaching.com"; // Ohjataan pois kirjauksen jälkeen
    });
};

// Kirjaus Admin/User tilassa
document.getElementById('btn-sign-log').onclick = function() {
    const nick = document.getElementById('log-nickname').value.trim();
    if(!nick) return alert("Nimi vaaditaan!");
    
    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({
        nickname: nick, from: document.getElementById('log-from').value.trim(),
        message: document.getElementById('log-message').value.trim(), 
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => { 
        ['log-nickname','log-from','log-message'].forEach(id => document.getElementById(id).value = ""); 
    });
};

function loadAttendees(eventKey) {
    db.ref('miitit/' + (currentUser ? currentUser.uid : "T8wI16Gf67W4G4yX3Cq7U0U1H6I2") + '/logs/' + eventKey).on('value', (snapshot) => {
        const listEl = document.getElementById('attendee-list'); if(!listEl) return;
        listEl.innerHTML = ""; const logs = [];
        snapshot.forEach(child => { logs.push({key: child.key, ...child.val()}); });
        logs.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
        logs.forEach(log => {
            const row = document.createElement('div'); row.className = "log-item";
            let btns = (isAdminMode && !currentEventArchived && currentUser) ? `<div class="log-actions"><button class="btn-blue btn-small" onclick="openLogEditModal('${log.key}')">✏️</button><button class="btn-red btn-small" onclick="deleteLog('${log.key}')">🗑</button></div>` : "";
            row.innerHTML = `<div><strong style="color:#4caf50;">${log.nickname}</strong><span>${log.from ? ' / ' + log.from : ''}</span><div style="font-style:italic; color:#888; font-size:0.9em;">${log.message || ''}</div></div>${btns}`;
            listEl.appendChild(row);
        });
        document.getElementById('attendee-count').innerText = logs.length;
    });
}

// ==========================================
// 9. HALLINTA (GPX, MASSA, MUOKKAUS, POISTO)
// ==========================================

// Tuonti GPX uudelle
document.getElementById('import-gpx-new').onchange = async function(e) {
    const file = e.target.files[0]; if (!file) return;
    const text = await file.text(); const data = parseGPX(text);
    if (data) {
        document.getElementById('new-gc').value = data.gc;
        document.getElementById('new-name').value = data.name;
        document.getElementById('new-date').value = data.date;
        document.getElementById('new-time').value = data.time;
        document.getElementById('new-coords').value = data.coords;
        document.getElementById('new-desc').value = data.descriptionHtml;
        fetchCityFromCoords(data.coords, 'new-loc');
        alert("GPX tiedot haettu!");
    }
};

// GPX Sync vieraskirjassa
document.getElementById('btn-sync-gpx-trigger').onclick = () => document.getElementById('import-gpx-sync').click();
document.getElementById('import-gpx-sync').onchange = async function(e) {
    const file = e.target.files[0]; if (!file || !currentEventId) return;
    loadingOverlay.style.display = 'flex';
    const text = await file.text(); const data = parseGPX(text);
    if (data) {
        db.ref('miitit/' + currentUser.uid + '/events/' + currentEventId).update({ attributes: data.attributes, coords: data.coords });
        alert("Tiedot päivitetty!");
    }
    loadingOverlay.style.display = 'none';
};

// Massatuonti
window.openMassImport = function() {
    document.getElementById('mass-input').value = ""; document.getElementById('mass-output').value = ""; 
    document.getElementById('mass-step-1').style.display = 'block'; document.getElementById('mass-step-2').style.display = 'none';
    document.getElementById('mass-modal').style.display = "block";
};

document.getElementById('btn-parse-mass').onclick = function() {
    const text = document.getElementById('mass-input').value; if(!text) return;
    let names = []; const blocks = text.split(/Näytä\s+loki|View\s+Log/i);
    blocks.forEach(b => {
        if (/Osallistui|Attended/i.test(b)) {
            const m = b.match(/^(.*?)\s+(?:Premium\s+Member|Member|Reviewer)/i);
            if (m && m[1]) names.push(m[1].trim());
        }
    });
    names = [...new Set(names)]; if (names.length === 0) return alert("Ei nimiä!");
    document.getElementById('mass-output').value = names.join('\n');
    document.getElementById('mass-step-1').style.display = 'none'; document.getElementById('mass-step-2').style.display = 'block';
};

document.getElementById('btn-save-mass').onclick = function() {
    const nicks = document.getElementById('mass-output').value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    nicks.forEach(n => { db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({ nickname: n, from: "", message: "(Massa)", timestamp: firebase.database.ServerValue.TIMESTAMP }); });
    document.getElementById('mass-modal').style.display = "none";
};

// Muokkaus ja poisto (Custom Confirm käyttö)
window.openEditModal = function(key) {
    db.ref('miitit/' + currentUser.uid + '/events/' + key).once('value').then(snap => {
        const e = snap.val(); document.getElementById('edit-key').value = key;
        document.getElementById('edit-name').value = e.name || "";
        document.getElementById('edit-date').value = e.date || "";
        document.getElementById('edit-time').value = e.time || "";
        document.getElementById('edit-modal').style.display = "block";
    });
};

document.getElementById('btn-save-edit').onclick = function() {
    const key = document.getElementById('edit-key').value;
    db.ref('miitit/' + currentUser.uid + '/events/' + key).update({
        name: document.getElementById('edit-name').value,
        date: document.getElementById('edit-date').value,
        time: document.getElementById('edit-time').value
    }).then(() => { document.getElementById('edit-modal').style.display = "none"; });
};

window.toggleArchive = async function(key, status) {
    const ok = await customConfirm(status ? "Arkistoi" : "Palauta", "Haluatko muuttaa miitin tilaa?");
    if (ok) db.ref('miitit/' + currentUser.uid + '/events/' + key).update({ isArchived: status });
};

window.deleteEvent = async function(key) {
    const ok = await customConfirm("Poista miitti", "Tätä ei voi perua. Poistetaanko?");
    if (ok) { db.ref('miitit/'+currentUser.uid+'/events/'+key).remove(); db.ref('miitit/'+currentUser.uid+'/logs/'+key).remove(); }
};

window.deleteLog = async function(lk) {
    const ok = await customConfirm("Poista", "Poistetaanko kävijä?");
    if (ok) db.ref('miitit/'+currentUser.uid+'/logs/'+currentEventId+'/'+lk).remove();
};

// ==========================================
// 10. LOPUT (TILASTOT, APUFUNKTIOT)
// ==========================================

const openStats = () => {
    adminView.style.display = 'none'; userView.style.display = 'none';
    document.getElementById('stats-view').style.display = 'block';
    if (typeof initStats === 'function') initStats();
};

document.getElementById('btn-show-stats').onclick = openStats;
document.getElementById('btn-show-stats-user').onclick = openStats;

window.navigateEvent = function(direction) {
    if (!currentEventId || globalEventList.length === 0) return;
    const currentIndex = globalEventList.findIndex(e => e.key === currentEventId);
    const newIndex = currentIndex - direction;
    if (newIndex >= 0 && newIndex < globalEventList.length) {
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).off();
        openGuestbook(globalEventList[newIndex].key);
    }
};

window.closeModal = () => { 
    ['edit-modal','mass-modal','log-edit-modal'].forEach(id => {
        const el = document.getElementById(id); if(el) el.style.display = "none";
    });
};

document.getElementById('btn-logout').onclick = async () => {
    const ok = await customConfirm("Ulos", "Kirjaudutaanko ulos?");
    if (ok) auth.signOut().then(() => location.reload());
};

document.getElementById('btn-login-google').onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
document.getElementById('btn-email-login').onclick = () => auth.signInWithEmailAndPassword(document.getElementById('email-input').value, document.getElementById('password-input').value);
document.getElementById('btn-email-register').onclick = () => auth.createUserWithEmailAndPassword(document.getElementById('email-input').value, document.getElementById('password-input').value);

document.getElementById('btn-find-today').onclick = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayEvent = globalEventList.find(e => e.date === today);
    if (todayEvent) openGuestbook(todayEvent.key); else alert("Ei miittejä tänään.");
};

function processTextImport(text, mode) {
    const prefix = mode === 'new' ? 'new-' : 'edit-';
    const gcMatch = text.match(/(GC[A-Z0-9]+)/);
    if (gcMatch) document.getElementById(prefix + 'gc').value = gcMatch[1];
    const coordMatch = text.match(/([NS]\s*\d+°\s*[\d\.]+\s*[EW]\s*\d+°\s*[\d\.]+)/);
    if (coordMatch) {
        document.getElementById(prefix + 'coords').value = coordMatch[1].trim();
        fetchCityFromCoords(coordMatch[1].trim(), prefix + 'loc');
    }
}
