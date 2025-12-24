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

// Alustetaan Firebase huolellisesti
try { 
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig); 
    }
} catch (e) { 
    console.error("Firebase alustusvirhe:", e); 
}

const db = firebase.database();
const auth = firebase.auth();

let currentUser = null;
let currentEventId = null;
let currentEventArchived = false;
let globalEventList = []; 

// Käyttöliittymän elementit
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
// 2. KIRJAUTUMINEN JA TILAN SEURANTA
// ==========================================

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        if(userDisplay) {
            userDisplay.style.display = 'block';
            userDisplay.innerText = "👤 " + user.email;
        }
        
        // Ohjataan oikeaan näkymään
        if (guestbookView.style.display !== 'block' && 
            document.getElementById('stats-view').style.display !== 'block') {
            showAdminView();
        }
        loadEvents();
    } else {
        currentUser = null;
        if(userDisplay) userDisplay.style.display = 'none';
        showLoginView();
    }
});

function showLoginView() { 
    if(loginView) loginView.style.display = 'flex'; 
    if(adminView) adminView.style.display = 'none'; 
    if(guestbookView) guestbookView.style.display = 'none'; 
    if(document.getElementById('stats-view')) {
        document.getElementById('stats-view').style.display = 'none';
    }
}

function showAdminView() {
    if (!currentUser) { 
        showLoginView(); 
        return; 
    }
    
    if(loginView) loginView.style.display = 'none'; 
    if(adminView) adminView.style.display = 'block'; 
    if(guestbookView) guestbookView.style.display = 'none';
    
    if(document.getElementById('stats-view')) {
        document.getElementById('stats-view').style.display = 'none';
    }
    
    if(currentEventId) { 
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).off(); 
        currentEventId = null; 
    }
}

// Globaali funktio navigointiin
window.showAdminView = showAdminView;


// ==========================================
// 3. TILASTOJEN JA ELEIDEN HALLINTA
// ==========================================

// Tilastonäkymän avaaminen nappulasta
document.getElementById('btn-show-stats').onclick = () => {
    if(adminView) adminView.style.display = 'none';
    const statsView = document.getElementById('stats-view');
    if(statsView) statsView.style.display = 'block';
    
    // Alustetaan tilastodata stats.js tiedostosta
    if (typeof initStats === 'function') {
        initStats();
    }
};

// Pyyhkäisyeleet (Swipe)
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
        navigateEvent(-1); // Seuraava tapahtuma
    }
    if (touchEndX > touchStartX + swipeThreshold) {
        navigateEvent(1); // Edellinen tapahtuma
    }
}

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


// ==========================================
// 4. APUFUNKTIOT (KOORDINAATIT JA SIJAINTI)
// ==========================================

// Muunnetaan desimaalit muotoon N 61° 03.950
function decimalToDMS(lat, lon) {
    const convert = (val, pos, neg) => {
        const abs = Math.abs(val);
        const degrees = Math.floor(abs);
        const minutes = ((abs - degrees) * 60).toFixed(3);
        const direction = val >= 0 ? pos : neg;
        
        const degStr = degrees.toString().padStart(pos === 'E' ? 3 : 2, '0');
        return `${direction} ${degStr}° ${minutes.padStart(6, '0')}`;
    };
    
    return `${convert(lat, 'N', 'S')} ${convert(lon, 'E', 'W')}`;
}

// Haetaan paikkakunta koordinaattien perusteella
async function fetchCityFromCoords(coords, targetId) {
    let lat, lon;
    
    const dmsMatch = coords.match(/([NS])\s*(\d+)°\s*([\d\.]+)\s*([EW])\s*(\d+)°\s*([\d\.]+)/);
    
    if (dmsMatch) {
        lat = parseInt(dmsMatch[2]) + parseFloat(dmsMatch[3]) / 60;
        if (dmsMatch[1] === 'S') lat = -lat;
        lon = parseInt(dmsMatch[5]) + parseFloat(dmsMatch[6]) / 60;
        if (dmsMatch[4] === 'W') lon = -lon;
    } else {
        const parts = coords.replace(/[NE]/g, '').split(/[,\sE]/).filter(s => s.trim().length > 0);
        if (parts.length >= 2) { 
            lat = parseFloat(parts[0]); 
            lon = parseFloat(parts[1]); 
        }
    }

    if (isNaN(lat) || isNaN(lon)) return "";

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await res.json();
        
        if (data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.municipality || "";
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

// Avattavien osioiden logiikka
window.toggleDetails = (id) => {
    const content = document.getElementById(id);
    const arrow = document.getElementById('arrow-' + id);
    
    if (content.style.display === 'block') {
        content.style.display = 'none';
        if(arrow) arrow.innerText = '▼';
    } else {
        content.style.display = 'block';
        if(arrow) arrow.innerText = '▲';
    }
};


// ==========================================
// 5. GPX-PROSESSOINTI (ATTRIBUUTIT JA LOKIT)
// ==========================================

function parseGPX(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");
    const wpt = xml.querySelector("wpt");
    
    if (!wpt) return null;

    const lat = parseFloat(wpt.getAttribute("lat"));
    const lon = parseFloat(wpt.getAttribute("lon"));
    
    // Etsitään kellonaika kuvauksesta
    let timeStr = "";
    const shortDesc = wpt.getElementsByTagNameNS("*", "short_description")[0]?.textContent || "";
    const timeMatch = shortDesc.match(/(\d{1,2}[:\.]\d{2})\s*-\s*(\d{1,2}[:\.]\d{2})/);
    if (timeMatch) {
        timeStr = `${timeMatch[1].replace('.', ':')} - ${timeMatch[2].replace('.', ':')}`;
    }

    // Luetaan attribuutit (mukaanlukien inc="0")
    const attributes = [];
    const attrElements = wpt.getElementsByTagNameNS("*", "attribute");
    
    for (let i = 0; i < attrElements.length; i++) {
        const attr = attrElements[i];
        attributes.push({
            name: attr.textContent.trim(),
            inc: attr.getAttribute("inc") === "1" ? 1 : 0
        });
    }

    // Luetaan "Attended" tyyppiset lokit
    const attendees = [];
    const logs = wpt.getElementsByTagNameNS("*", "log");
    
    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        const type = log.getElementsByTagNameNS("*", "type")[0]?.textContent;
        const finder = log.getElementsByTagNameNS("*", "finder")[0]?.textContent;
        
        if (type === "Attended" && finder && finder.toLowerCase() !== "mikkokalevi") {
            attendees.push(finder);
        }
    }

    return {
        gc: wpt.querySelector("name")?.textContent || "",
        name: wpt.getElementsByTagNameNS("*", "name")[1]?.textContent || wpt.querySelector("urlname")?.textContent || "Nimetön miitti",
        date: wpt.querySelector("time")?.textContent?.split('T')[0] || "",
        time: timeStr,
        coords: decimalToDMS(lat, lon),
        descriptionHtml: wpt.getElementsByTagNameNS("*", "long_description")[0]?.textContent || "",
        attributes: attributes,
        attendees: [...new Set(attendees)]
    };
}


// ==========================================
// 6. TUONTI JA LOMAKETOIMINNOT (MUKANA GC-TARKISTUS)
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
        alert("GPX tiedot haettu!");
    }
};

document.getElementById('btn-sync-gpx-trigger').onclick = () => { 
    document.getElementById('import-gpx-sync').click(); 
};

document.getElementById('import-gpx-sync').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentEventId) return;
    
    if(loadingOverlay) loadingOverlay.style.display = 'flex';
    
    const text = await file.text();
    const gpxData = parseGPX(text);
    
    if (!gpxData) {
        if(loadingOverlay) loadingOverlay.style.display = 'none';
        alert("GPX luku epäonnistui.");
        return;
    }

    const currentEvtSnap = await db.ref('miitit/' + currentUser.uid + '/events/' + currentEventId).once('value');
    const currentEvt = currentEvtSnap.val();

    // --- UUSI GC-KOODI TARKISTUS ---
    if (currentEvt.gc && gpxData.gc && currentEvt.gc.trim().toUpperCase() !== gpxData.gc.trim().toUpperCase()) {
        if(loadingOverlay) loadingOverlay.style.display = 'none';
        alert(`⚠️ VIRHE: Tiedosto ei täsmää!\n\nMiitin koodi: ${currentEvt.gc}\nGPX tiedoston koodi: ${gpxData.gc}\n\nValitse oikea tiedosto.`);
        e.target.value = ""; // Tyhjennetään valinta
        return;
    }
    // -------------------------------

    const currentLogsSnap = await db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).once('value');
    const existingNicks = [];
    currentLogsSnap.forEach(child => { 
        existingNicks.push(child.val().nickname.toLowerCase()); 
    });

    const updates = {};

    // Päivitetään puuttuvat kentät
    if (!currentEvt.descriptionHtml) updates.descriptionHtml = gpxData.descriptionHtml;
    
    // Attribuutit päivitetään aina jotta inc="0" tulee mukaan
    updates.attributes = gpxData.attributes;
    
    if (!currentEvt.location) {
        const city = await fetchCityFromCoords(gpxData.coords, 'gb-loc');
        if (city) updates.location = city;
    }
    
    updates.coords = gpxData.coords;
    
    if (Object.keys(updates).length > 0) { 
        await db.ref('miitit/' + currentUser.uid + '/events/' + currentEventId).update(updates); 
    }

    // Lisätään uudet nimet
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

    if(loadingOverlay) loadingOverlay.style.display = 'none';
    alert(`Päivitetty! Lisätty ${addedCount} uutta osallistujaa.`);
    e.target.value = ""; // Tyhjennetään valinta päivityksen jälkeen
};


// ==========================================
// 7. TEKSTINTUONTI JA LISTAN LATAUS
// ==========================================

function processTextImport(text, mode) {
    const prefix = mode === 'new' ? 'new-' : 'edit-';
    const locId = prefix + 'loc';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length > 0) {
        const firstLine = lines[0];
        const ignorePrefixes = ["Tapahtuman tekijä", "Tapahtumapäivä", "Alkamisaika", "Loppumisaika", "Vaikeustaso", "Maasto", "Koko", "Maa:", "N ", "E ", "UTM"];
        if (!ignorePrefixes.some(p => firstLine.startsWith(p))) { 
            document.getElementById(prefix + 'name').value = firstLine; 
        }
    }
    
    const dateMatch = text.match(/Tapahtumapäivä:\s*(\d{1,2}\.\d{1,2}\.\d{4})/);
    if (dateMatch) {
        const parts = dateMatch[1].split('.');
        if(parts.length === 3) { 
            document.getElementById(prefix + 'date').value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; 
        }
    }
    
    const startMatch = text.match(/Alkamisaika:\s*(\d{1,2}[:\.]\d{2})/);
    const endMatch = text.match(/Loppumisaika:\s*(\d{1,2}[:\.]\d{2})/);
    if (startMatch) {
        let start = startMatch[1].replace('.', ':'); if(start.indexOf(':') === 1) start = '0' + start;
        let end = ""; if (endMatch) { end = endMatch[1].replace('.', ':'); if(end.indexOf(':') === 1) end = '0' + end; }
        document.getElementById(prefix + 'time').value = end ? `${start} - ${end}` : start;
    }
    
    const coordMatch = text.match(/([NS]\s*\d+°\s*[\d\.]+\s*[EW]\s*\d+°\s*[\d\.]+)/);
    if (coordMatch) {
        const coords = coordMatch[1].trim();
        document.getElementById(prefix + 'coords').value = coords;
        fetchCityFromCoords(coords, locId);
    }
    
    const gcMatch = text.match(/(GC[A-Z0-9]+)/);
    if (gcMatch) {
        document.getElementById(prefix + 'gc').value = gcMatch[1];
    }
}

document.getElementById('btn-process-import').onclick = () => { 
    processTextImport(document.getElementById('import-text').value, 'new'); 
};

document.getElementById('btn-process-edit-import').onclick = () => { 
    processTextImport(document.getElementById('edit-import-text').value, 'edit'); 
};

function loadEvents() {
    if (!currentUser) return;
    
    const lists = {
        miitti: { past: document.getElementById('list-miitti-past'), future: document.getElementById('list-miitti-future') },
        cito: { past: document.getElementById('list-cito-past'), future: document.getElementById('list-cito-future') },
        cce: { past: document.getElementById('list-cce-past'), future: document.getElementById('list-cce-future') }
    };

    db.ref('miitit/' + currentUser.uid + '/events').on('value', (snapshot) => {
        Object.values(lists).forEach(l => { 
            if(l.past) l.past.innerHTML = ""; 
            if(l.future) l.future.innerHTML = ""; 
        });
        
        const events = [];
        snapshot.forEach(child => { 
            events.push({key: child.key, ...child.val()}); 
        });
        
        events.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
        globalEventList = events;
        
        if(eventStatsEl) {
            eventStatsEl.innerText = `Löytyi ${events.length} tapahtumaa.`;
        }

        const today = new Date().toISOString().split('T')[0];

        events.forEach(evt => {
            const div = document.createElement('div');
            const isArchived = evt.isArchived === true;
            div.className = "card" + (isArchived ? " archived" : "");
            
            const countId = `count-${evt.key}`;
            
            // Arkistointinapin dynaaminen vaihto
            const archiveBtn = isArchived 
                ? `<button class="btn btn-blue btn-small" onclick="toggleArchive('${evt.key}', false)">♻️ Palauta</button>`
                : `<button class="btn btn-red btn-small" onclick="toggleArchive('${evt.key}', true)">📦 Arkistoi</button>`;

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <strong>${evt.name}</strong>
                    <span>${evt.date}</span>
                </div>
                <div style="font-size:0.8em; color:#666; margin-bottom:5px;">🕓 ${evt.time || '-'}</div>
                <div style="font-size:0.9em; color:#A0522D; display:flex; justify-content:space-between;">
                    <span><a href="https://coord.info/${evt.gc}" target="_blank" style="color:#A0522D; font-weight:bold; text-decoration:none;">${evt.gc}</a> • ${evt.location || ''}</span>
                    <span id="${countId}" style="font-weight:bold; color:#333;">👤 0</span>
                </div>
                <div style="margin-top:10px; display:flex; gap:5px; flex-wrap: wrap;">
                    <button class="btn btn-green btn-small" onclick="openGuestbook('${evt.key}')">📖 Avaa</button>
                    <button class="btn btn-blue btn-small" onclick="openEditModal('${evt.key}')">✏️ Muokkaa</button>
                    ${archiveBtn}
                    <button class="btn btn-red btn-small" onclick="deleteEvent('${evt.key}')">🗑 Poista</button>
                </div>
            `;
            
            db.ref('miitit/' + currentUser.uid + '/logs/' + evt.key).once('value').then((snap) => {
                const el = document.getElementById(countId); 
                if (el) el.innerText = "👤 " + snap.numChildren();
            });
            
            const targetList = (evt.date >= today) ? lists[evt.type].future : lists[evt.type].past;
            if (targetList) targetList.appendChild(div);
        });
    });
}

// Arkistointitoiminto
window.toggleArchive = (key, status) => {
    const msg = status ? "Haluatko varmasti arkistoida?" : "Haluatko palauttaa aktiiviseksi?";
    if (confirm(msg)) {
        db.ref('miitit/' + currentUser.uid + '/events/' + key).update({
            isArchived: status
        });
    }
};


// ==========================================
// 8. TALLENNUS JA MUOKKAUS
// ==========================================

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
    
    if(!data.gc || !data.name || !data.date) { 
        alert("Täytä GC, Nimi ja Pvm!"); 
        return; 
    }
    
    db.ref('miitit/' + currentUser.uid + '/events').push(data).then(() => {
        ['new-gc','new-name','new-time','new-coords','new-loc', 'new-desc', 'import-text', 'import-gpx-new'].forEach(id => {
            const el = document.getElementById(id); if(el) el.value = "";
        });
        document.getElementById('new-event-form').style.display = 'none';
    });
};

document.getElementById('btn-find-today').onclick = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayEvent = globalEventList.find(e => e.date === today);
    if (todayEvent) openGuestbook(todayEvent.key); else alert("Ei miittejä tänään.");
};

document.getElementById('new-event-toggle').onclick = () => {
    const f = document.getElementById('new-event-form');
    if(f) f.style.display = (f.style.display === 'none') ? 'block' : 'none';
};


// ==========================================
// 9. VIERASKIRJA (GUESTBOOK)
// ==========================================

window.openGuestbook = (eventKey) => {
    if(currentEventId) { db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).off(); }
    
    currentEventId = eventKey;
    db.ref('miitit/' + currentUser.uid + '/events/' + eventKey).on('value', snap => {
        const evt = snap.val();
        if(!evt) return; 
        
        currentEventArchived = evt.isArchived === true;

        document.getElementById('gb-event-name').innerText = evt.name;
        document.getElementById('gb-time').innerText = evt.time || '-';
        document.getElementById('gb-date').innerText = evt.date;
        document.getElementById('gb-gc').innerText = evt.gc;
        document.getElementById('gb-loc').innerText = evt.location || '-';
        
        const coordsEl = document.getElementById('gb-coords');
        if(evt.coords) {
            const qCoords = evt.coords.replace(/°/g, "").replace(/\s+/g, "+");
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${qCoords}`;
            coordsEl.innerHTML = `<a href="${mapsUrl}" target="_blank" style="color:#D2691E; font-weight:bold; text-decoration: underline;">${evt.coords}</a>`;
        } else { 
            coordsEl.innerText = "-"; 
        }

        const attrDiv = document.getElementById('gb-attrs');
        if(attrDiv) {
            attrDiv.innerHTML = "";
            if (evt.attributes && Array.isArray(evt.attributes)) {
                evt.attributes.forEach(a => {
                    const span = document.createElement('span');
                    const isNeg = (a.inc === 0);
                    span.className = "attr-tag" + (isNeg ? " neg" : "");
                    span.innerText = a.name || a; 
                    attrDiv.appendChild(span);
                });
                document.getElementById('box-attrs').style.display = 'block';
            } else { 
                document.getElementById('box-attrs').style.display = 'none'; 
            }
        }

        const descEl = document.getElementById('gb-description');
        if (descEl) {
            if (evt.descriptionHtml) {
                descEl.innerHTML = evt.descriptionHtml; 
                document.getElementById('box-desc').style.display = 'block';
            } else { 
                document.getElementById('box-desc').style.display = 'none'; 
            }
        }

        const actionsArea = document.getElementById('gb-actions-area');
        if(actionsArea) actionsArea.style.display = currentEventArchived ? 'none' : 'block';
        
        const notice = document.getElementById('archived-notice');
        if(notice) notice.style.display = currentEventArchived ? 'block' : 'none';
    });
    
    if(loginView) loginView.style.display = 'none'; 
    if(adminView) adminView.style.display = 'none'; 
    if(guestbookView) guestbookView.style.display = 'block';
    if(document.getElementById('stats-view')) document.getElementById('stats-view').style.display = 'none';
    
    window.scrollTo(0,0);
    loadAttendees(eventKey);
};


// ==========================================
// 10. LOKIEN HALLINTA JA MASSA-TOIMINNOT
// ==========================================

document.getElementById('btn-sign-log').onclick = () => {
    const nick = document.getElementById('log-nickname').value.trim();
    if(!nick) { alert("Nimi vaaditaan!"); return; }
    
    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({
        nickname: nick,
        from: document.getElementById('log-from').value.trim(),
        message: document.getElementById('log-message').value.trim(),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => { 
        ['log-nickname','log-from','log-message'].forEach(id => document.getElementById(id).value = ""); 
    });
};

function loadAttendees(eventKey) {
    db.ref('miitit/' + currentUser.uid + '/logs/' + eventKey).on('value', (snapshot) => {
        const listEl = document.getElementById('attendee-list');
        if(!listEl) return;
        
        listEl.innerHTML = ""; 
        const logs = [];
        snapshot.forEach(child => { logs.push({key: child.key, ...child.val()}); });
        
        logs.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));

        logs.forEach(log => {
            const row = document.createElement('div');
            row.className = "log-item";
            
            let btns = !currentEventArchived ? `
                <div class="log-actions">
                    <button class="btn-blue btn-small" onclick="openLogEditModal('${log.key}')">✏️</button>
                    <button class="btn-red btn-small" onclick="deleteLog('${log.key}')">🗑</button>
                </div>` : "";
                
            row.innerHTML = `
                <div>
                    <strong style="color:#4caf50;">${log.nickname}</strong>
                    <span>${log.from ? ' / ' + log.from : ''}</span>
                    <div style="font-style:italic; color:#888; font-size:0.9em;">${log.message || ''}</div>
                </div>
                ${btns}
            `;
            listEl.appendChild(row);
        });
        const countEl = document.getElementById('attendee-count'); 
        if(countEl) countEl.innerText = logs.length;
    });
}

window.openEditModal = (key) => {
    db.ref('miitit/' + currentUser.uid + '/events/' + key).once('value').then(snap => {
        const e = snap.val();
        document.getElementById('edit-key').value = key;
        document.getElementById('edit-import-text').value = "";
        
        ['type','gc','name','date','time','coords'].forEach(f => {
            const el = document.getElementById('edit-'+f); 
            if(el) el.value = e[f] || "";
        });
        
        const loc = document.getElementById('edit-loc'); if(loc) loc.value = e.location || "";
        const desc = document.getElementById('edit-desc'); if(desc) desc.value = e.descriptionHtml || "";
        
        if(editModal) editModal.style.display = "block";
    });
};

document.getElementById('btn-save-edit').onclick = () => {
    const key = document.getElementById('edit-key').value;
    const u = {
        type: document.getElementById('edit-type').value,
        gc: document.getElementById('edit-gc').value,
        name: document.getElementById('edit-name').value,
        date: document.getElementById('edit-date').value,
        time: document.getElementById('edit-time').value,
        coords: document.getElementById('edit-coords').value,
        location: document.getElementById('edit-loc').value,
        descriptionHtml: document.getElementById('edit-desc').value
    };
    
    db.ref('miitit/' + currentUser.uid + '/events/' + key).update(u).then(() => { 
        if(editModal) editModal.style.display = "none"; 
    });
};

window.openMassImport = () => {
    document.getElementById('mass-input').value = ""; 
    document.getElementById('mass-output').value = ""; 
    document.getElementById('mass-step-1').style.display = 'block';
    document.getElementById('mass-step-2').style.display = 'none';
    if(massModal) massModal.style.display = "block";
};

document.getElementById('btn-parse-mass').onclick = () => {
    const text = document.getElementById('mass-input').value;
    if(!text) return;
    
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
    
    names = [...new Set(names)]; 
    if (names.length === 0) return alert("Ei nimiä löytynyt!");
    
    document.getElementById('mass-output').value = names.join('\n');
    document.getElementById('mass-step-1').style.display = 'none'; 
    document.getElementById('mass-step-2').style.display = 'block';
};

document.getElementById('btn-save-mass').onclick = () => {
    const nicks = document.getElementById('mass-output').value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    nicks.forEach(n => {
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({ 
            nickname: n, from: "", message: "(Massatuonti)", 
            timestamp: firebase.database.ServerValue.TIMESTAMP 
        });
    });
    if(massModal) massModal.style.display = "none";
};


// ==========================================
// 11. MUOKKAUS, POISTO JA KIRJAUTUMINEN
// ==========================================

window.openLogEditModal = (logKey) => {
    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId + '/' + logKey).once('value').then(snap => {
        const log = snap.val();
        document.getElementById('log-edit-key').value = logKey;
        document.getElementById('log-edit-nick').value = log.nickname || "";
        document.getElementById('log-edit-from').value = log.from || "";
        document.getElementById('log-edit-msg').value = log.message || "";
        if(logEditModal) logEditModal.style.display = "block";
    });
};

document.getElementById('btn-save-log-edit').onclick = () => {
    const key = document.getElementById('log-edit-key').value;
    const u = { 
        nickname: document.getElementById('log-edit-nick').value, 
        from: document.getElementById('log-edit-from').value, 
        message: document.getElementById('log-edit-msg').value 
    };
    
    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId + '/' + key).update(u).then(() => { 
        if(logEditModal) logEditModal.style.display = "none"; 
    });
};

window.closeModal = () => { 
    if(editModal) editModal.style.display = "none"; 
    if(massModal) massModal.style.display = "none"; 
    if(logEditModal) logEditModal.style.display = "none"; 
};

window.deleteEvent = (k) => { 
    if(confirm("Poista miitti lopullisesti?")) { 
        db.ref('miitit/'+currentUser.uid+'/events/'+k).remove(); 
        db.ref('miitit/'+currentUser.uid+'/logs/'+k).remove(); 
    } 
};

window.deleteLog = (lk) => { 
    if(confirm("Poista kirjaus?")) db.ref('miitit/'+currentUser.uid+'/logs/'+currentEventId+'/'+lk).remove(); 
};

window.resetMassModal = () => { 
    document.getElementById('mass-step-1').style.display = 'block'; 
    document.getElementById('mass-step-2').style.display = 'none'; 
};

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
    if(confirm("Ulos?")) auth.signOut().then(() => location.reload()); 
};
