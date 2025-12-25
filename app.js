// ==========================================
// 1. FIREBASE ASETUKSET JA MUUTTUJAT
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

// Sovelluksen globaali tila
let currentUser = null;
let currentEventId = null;
let currentEventArchived = false;
let globalEventList = []; 
let isAdminMode = true; // Oletuksena hallintatila päällä

// Käyttöliittymän pääelementit
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const userView = document.getElementById('user-view');
const guestbookView = document.getElementById('guestbook-view');
const editModal = document.getElementById('edit-modal');
const massModal = document.getElementById('mass-modal');
const logEditModal = document.getElementById('log-edit-modal');
const confirmModal = document.getElementById('confirm-modal');
const userDisplay = document.getElementById('user-display');
const userEmailText = document.getElementById('user-email-text');
const eventStatsEl = document.getElementById('event-stats');
const loadingOverlay = document.getElementById('loading-overlay');

// Kosketuseleet navigointia varten
let touchStartX = 0;
let touchEndX = 0;


// ==========================================
// 2. KIRJAUTUMINEN JA NÄKYMIEN HALLINTA
// ==========================================

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        if(userDisplay) {
            userDisplay.style.display = 'flex';
            if(userEmailText) {
                userEmailText.innerText = "👤 " + user.email;
            }
        }
        
        // Ohjataan käyttäjä oikeaan aloitusnäkymään
        // Pidetään nykyinen näkymä auki jos se on jo vieraskirja tai tilastot
        const statsView = document.getElementById('stats-view');
        if (guestbookView.style.display !== 'block' && 
            (!statsView || statsView.style.display !== 'block')) {
            showMainView();
        }
        
        // Ladataan tapahtumat tietokannasta
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
    if(userView) userView.style.display = 'none';
    if(guestbookView) guestbookView.style.display = 'none'; 
    
    const statsView = document.getElementById('stats-view');
    if(statsView) statsView.style.display = 'none';
}

function showMainView() {
    if (!currentUser) { 
        showLoginView(); 
        return; 
    }
    
    if(loginView) loginView.style.display = 'none'; 
    if(guestbookView) guestbookView.style.display = 'none';
    
    const statsView = document.getElementById('stats-view');
    if(statsView) statsView.style.display = 'none';

    // Näytetään joko hallinta- tai käyttäjänäkymä valinnan mukaan
    if (isAdminMode) {
        if(adminView) adminView.style.display = 'block';
        if(userView) userView.style.display = 'none';
    } else {
        if(adminView) adminView.style.display = 'none';
        if(userView) userView.style.display = 'block';
    }
    
    // Nollataan nykyinen tapahtuma kun palataan listaukseen
    if(currentEventId) { 
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).off(); 
        currentEventId = null; 
    }
}

// Tehdään tästä globaali HTML-kutsuja varten
window.showMainView = showMainView;

// Näkymän vaihto (Hallinta <-> Miittikirja)
document.getElementById('btn-toggle-mode').onclick = function() {
    isAdminMode = !isAdminMode;
    
    const btn = document.getElementById('btn-toggle-mode');
    if (isAdminMode) {
        btn.innerText = "🔄 Hallinta-tila";
    } else {
        btn.innerText = "🔄 Miittikirja-tila";
    }
    
    showMainView();
    loadEvents(); // Päivitetään listojen tyyli vastaamaan moodia
};


// ==========================================
// 3. OMA VARMISTUSKYSELY (CUSTOM CONFIRM)
// ==========================================

function customConfirm(title, message) {
    return new Promise((resolve) => {
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        const yesBtn = document.getElementById('btn-confirm-yes');
        const noBtn = document.getElementById('btn-confirm-no');

        if(titleEl) titleEl.innerText = title;
        if(msgEl) msgEl.innerText = message;
        if(confirmModal) confirmModal.style.display = 'block';

        const handleResponse = (response) => {
            if(confirmModal) confirmModal.style.display = 'none';
            // Puhdistetaan kuuntelijat
            yesBtn.onclick = null;
            noBtn.onclick = null;
            resolve(response);
        };

        if(yesBtn) yesBtn.onclick = function() { handleResponse(true); };
        if(noBtn) noBtn.onclick = function() { handleResponse(false); };
    });
}


// ==========================================
// 4. APUFUNKTIOT (KOORDINAATIT JA SIJAINTI)
// ==========================================

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

async function fetchCityFromCoords(coords, targetId) {
    let lat, lon;
    
    // Tarkistetaan onko koordinaatit DMS-muodossa
    const dmsMatch = coords.match(/([NS])\s*(\d+)°\s*([\d\.]+)\s*([EW])\s*(\d+)°\s*([\d\.]+)/);
    
    if (dmsMatch) {
        lat = parseInt(dmsMatch[2]) + parseFloat(dmsMatch[3]) / 60;
        if (dmsMatch[1] === 'S') lat = -lat;
        lon = parseInt(dmsMatch[5]) + parseFloat(dmsMatch[6]) / 60;
        if (dmsMatch[4] === 'W') lon = -lon;
    } else {
        // Oletetaan desimaalimuoto
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
        
        if (data && data.address) {
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

window.toggleDetails = function(id) {
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
// 5. GPX-PARSERI (LUKEE TIEDOSTON SISÄLLÖN)
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

    // Luetaan attribuutit (inc=1 Kyllä, inc=0 Ei)
    const attributes = [];
    const attrElements = wpt.getElementsByTagNameNS("*", "attribute");
    
    for (let i = 0; i < attrElements.length; i++) {
        const attr = attrElements[i];
        attributes.push({
            name: attr.textContent.trim(),
            inc: attr.getAttribute("inc") === "1" ? 1 : 0
        });
    }

    // Poimitaan osallistuneet (Attended-logit)
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
// 6. UUDEN TAPAHTUMAN TUONTI (GPX TAI TEKSTI)
// ==========================================

// --- GPX-TIEDOSTON VALINTA UUDELLE MIITILLE ---
document.getElementById('import-gpx-new').onchange = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const text = await file.text();
    const data = parseGPX(text);
    
    if (data) {
        // Täytetään lomakkeen kentät GPX-datalla
        const gcInput = document.getElementById('new-gc');
        const nameInput = document.getElementById('new-name');
        const dateInput = document.getElementById('new-date');
        const timeInput = document.getElementById('new-time');
        const coordsInput = document.getElementById('new-coords');
        const descInput = document.getElementById('new-desc');

        if(gcInput) gcInput.value = data.gc;
        if(nameInput) nameInput.value = data.name;
        if(dateInput) dateInput.value = data.date;
        if(timeInput) timeInput.value = data.time;
        if(coordsInput) coordsInput.value = data.coords;
        if(descInput) descInput.value = data.descriptionHtml;
        
        // Haetaan paikkakunta koordinaattien perusteella
        fetchCityFromCoords(data.coords, 'new-loc');
        alert("Miitin tiedot ladattu GPX-tiedostosta!");
    } else {
        alert("GPX-tiedoston luku epäonnistui. Tarkista tiedosto.");
    }
};

document.getElementById('new-event-toggle').onclick = function() {
    const f = document.getElementById('new-event-form');
    if(f) {
        f.style.display = (f.style.display === 'none') ? 'block' : 'none';
    }
};

document.getElementById('btn-process-import').onclick = function() { 
    processTextImport(document.getElementById('import-text').value, 'new'); 
};

function processTextImport(text, mode) {
    const prefix = mode === 'new' ? 'new-' : 'edit-';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length > 0) {
        const ignore = ["Tapahtuman tekijä", "Tapahtumapäivä", "Alkamisaika", "Loppumisaika", "Maasto", "Koko", "Maa:"];
        if (!ignore.some(p => lines[0].startsWith(p))) {
            const nameField = document.getElementById(prefix + 'name');
            if(nameField) nameField.value = lines[0];
        }
    }
    
    const gcMatch = text.match(/(GC[A-Z0-9]+)/);
    if (gcMatch) {
        const gcField = document.getElementById(prefix + 'gc');
        if(gcField) gcField.value = gcMatch[1];
    }
    
    const coordMatch = text.match(/([NS]\s*\d+°\s*[\d\.]+\s*[EW]\s*\d+°\s*[\d\.]+)/);
    if (coordMatch) {
        const coordField = document.getElementById(prefix + 'coords');
        if(coordField) coordField.value = coordMatch[1].trim();
        fetchCityFromCoords(coordMatch[1].trim(), prefix + 'loc');
    }
}


// ==========================================
// 7. TALLENNUS JA LISTOJEN GENERONTII
// ==========================================

document.getElementById('btn-add-event').onclick = function() {
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
        alert("Täytä vähintään GC-koodi, nimi ja päivämäärä!"); 
        return; 
    }
    
    db.ref('miitit/' + currentUser.uid + '/events').push(data).then(() => {
        // Nollataan lomake onnistumisen jälkeen
        const fields = ['new-gc','new-name','new-date','new-time','new-coords','new-loc','new-desc','import-text','import-gpx-new'];
        fields.forEach(id => {
            const el = document.getElementById(id); if(el) el.value = "";
        });
        document.getElementById('new-event-form').style.display = 'none';
    });
};

function loadEvents() {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    
    db.ref('miitit/' + currentUser.uid + '/events').on('value', (snapshot) => {
        // Puhdistetaan kaikki mahdolliset listakontit
        const allIds = [
            'list-miitti-future','list-miitti-past',
            'list-cito-future','list-cito-past',
            'list-cce-future','list-cce-past',
            'user-list-miitti','user-list-cito','user-list-cce'
        ];
        allIds.forEach(id => { 
            const el = document.getElementById(id); if(el) el.innerHTML = ""; 
        });

        const events = [];
        snapshot.forEach(child => { 
            events.push({key: child.key, ...child.val()}); 
        });
        
        // Järjestetään pvm mukaan (uusin ensin)
        events.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
        globalEventList = events;
        
        if(eventStatsEl) eventStatsEl.innerText = `Löytyi ${events.length} tapahtumaa.`;

        events.forEach(evt => {
            const isArchived = evt.isArchived === true;
            // Uniikki ID laskurille riippuen moodista
            const countId = `count-${isAdminMode ? 'adm' : 'usr'}-${evt.key}`;
            
            if (isAdminMode) {
                // --- ADMIN-NÄKYMÄN KORTTI ---
                const div = document.createElement('div');
                div.className = "card" + (isArchived ? " archived" : "");
                
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
                    </div>`;
                
                const targetId = (evt.date >= today) ? `list-${evt.type}-future` : `list-${evt.type}-past`;
                const target = document.getElementById(targetId);
                if (target) target.appendChild(div);

            } else {
                // --- KÄYTTÄJÄNÄKYMÄN KORTTI (MIITTIKIRJA) ---
                const div = document.createElement('div');
                div.className = "card" + (isArchived ? " archived" : "");
                
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between;">
                        <strong>${evt.name}</strong>
                        <span>${evt.date}</span>
                    </div>
                    <div style="font-size:0.8em; color:#666; margin-bottom:5px;">🕓 ${evt.time || '-'} • ${evt.location || ''}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                         <span id="${countId}" style="font-weight:bold; color:#333; font-size:0.9em;">👤 0 osallistujaa</span>
                         <button class="btn btn-green btn-small" style="width:auto; min-width:120px;" onclick="openGuestbook('${evt.key}')">📖 Avaa miittikirja</button>
                    </div>`;
                
                const target = document.getElementById(`user-list-${evt.type}`);
                if (target) target.appendChild(div);
            }

            // Haetaan ja päivitetään osallistujamäärä dynaamisesti
            db.ref('miitit/' + currentUser.uid + '/logs/' + evt.key).once('value').then((snap) => {
                const el = document.getElementById(countId); 
                if (el) {
                    const count = snap.numChildren();
                    if(isAdminMode) {
                        el.innerText = "👤 " + count;
                    } else {
                        el.innerText = "👤 " + count + " osallistujaa";
                    }
                }
            });
        });
    });
}


// ==========================================
// 8. VIERASKIRJA (GUESTBOOK) JA LOKIT
// ==========================================

window.openGuestbook = function(eventKey) {
    if(currentEventId) { 
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).off(); 
    }
    
    currentEventId = eventKey;
    
    db.ref('miitit/' + currentUser.uid + '/events/' + eventKey).on('value', function(snap) {
        const evt = snap.val();
        if(!evt) return; 
        
        currentEventArchived = (evt.isArchived === true);

        // Perustiedot
        document.getElementById('gb-event-name').innerText = evt.name;
        document.getElementById('gb-time').innerText = evt.time || '-';
        document.getElementById('gb-date').innerText = evt.date;
        document.getElementById('gb-gc').innerText = evt.gc;
        document.getElementById('gb-loc').innerText = evt.location || '-';
        
        // Karttalinkki
        const coordsEl = document.getElementById('gb-coords');
        if(evt.coords) {
            const qCoords = evt.coords.replace(/°/g, "").replace(/\s+/g, "+");
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${qCoords}`;
            coordsEl.innerHTML = `<a href="${mapsUrl}" target="_blank" style="color:#D2691E; font-weight:bold; text-decoration: underline;">${evt.coords}</a>`;
        } else { 
            coordsEl.innerText = "-"; 
        }

        // Attribuutit
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

        // Miittikuvaus HTML
        const descEl = document.getElementById('gb-description');
        if (descEl) {
            if (evt.descriptionHtml) {
                descEl.innerHTML = evt.descriptionHtml; 
                document.getElementById('box-desc').style.display = 'block';
            } else { 
                document.getElementById('box-desc').style.display = 'none'; 
            }
        }

        // --- NÄKYMÄN RAJOITUKSET ---
        
        // Admin-työkalut (Sync/Massa) vain Admin-tilassa
        const adminTools = document.getElementById('gb-admin-tools');
        if(adminTools) {
            adminTools.style.display = isAdminMode ? 'block' : 'none';
        }

        // Kirjaa käynti -lomake piiloon jos arkistoitu
        const actionsArea = document.getElementById('gb-actions-area');
        if(actionsArea) {
            actionsArea.style.display = currentEventArchived ? 'none' : 'block';
        }
        
        // Arkistoitu-ilmoitus
        const notice = document.getElementById('archived-notice');
        if(notice) {
            notice.style.display = currentEventArchived ? 'block' : 'none';
        }
    });
    
    // Näytetään vieraskirja-osio
    if(adminView) adminView.style.display = 'none'; 
    if(userView) userView.style.display = 'none'; 
    if(guestbookView) guestbookView.style.display = 'block';
    
    const statsView = document.getElementById('stats-view');
    if(statsView) statsView.style.display = 'none';
    
    window.scrollTo(0,0);
    loadAttendees(eventKey);
};

document.getElementById('btn-sign-log').onclick = function() {
    const nickInput = document.getElementById('log-nickname');
    const nick = nickInput.value.trim();
    
    if(!nick) { 
        alert("Nimi vaaditaan!"); 
        return; 
    }
    
    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({
        nickname: nick,
        from: document.getElementById('log-from').value.trim(),
        message: document.getElementById('log-message').value.trim(),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => { 
        const fields = ['log-nickname','log-from','log-message'];
        fields.forEach(id => {
            const el = document.getElementById(id); if(el) el.value = "";
        });
    });
};

function loadAttendees(eventKey) {
    db.ref('miitit/' + currentUser.uid + '/logs/' + eventKey).on('value', (snapshot) => {
        const listEl = document.getElementById('attendee-list');
        if(!listEl) return;
        
        listEl.innerHTML = ""; 
        const logs = [];
        snapshot.forEach(child => { 
            logs.push({key: child.key, ...child.val()}); 
        });
        
        // Järjestetään uusin ensin
        logs.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        logs.forEach(log => {
            const row = document.createElement('div');
            row.className = "log-item";
            
            // Editointi-napit vain adminille ja jos miitti ei ole arkistoitu
            let btns = (isAdminMode && !currentEventArchived) ? `
                <div class="log-actions">
                    <button class="btn-blue btn-small" onclick="openLogEditModal('${log.key}')">✏️</button>
                    <button class="btn-red btn-small" onclick="deleteLog('${log.key}')">🗑</button>
                </div>` : "";
                
            row.innerHTML = `
                <div>
                    <strong style="color:#4caf50;">${log.nickname}</strong>
                    <span>${log.from ? ' / ' + log.from : ''}</span>
                    <div style="font-style:italic; color:#888; font-size:0.9em; margin-top:3px;">${log.message || ''}</div>
                </div>
                ${btns}`;
            listEl.appendChild(row);
        });
        
        const countEl = document.getElementById('attendee-count'); 
        if(countEl) countEl.innerText = logs.length;
    });
}


// ==========================================
// 9. MUOKKAUS, ARKISTOINTI JA POISTO
// ==========================================

window.openEditModal = function(key) {
    db.ref('miitit/' + currentUser.uid + '/events/' + key).once('value').then(snap => {
        const e = snap.val();
        document.getElementById('edit-key').value = key;
        
        const fields = ['type','gc','name','date','time','coords'];
        fields.forEach(f => {
            const el = document.getElementById('edit-'+f); 
            if(el) el.value = e[f] || "";
        });
        
        const locField = document.getElementById('edit-loc'); 
        if(locField) locField.value = e.location || "";
        
        const descField = document.getElementById('edit-desc'); 
        if(descField) descField.value = e.descriptionHtml || "";
        
        if(editModal) editModal.style.display = "block";
    });
};

document.getElementById('btn-save-edit').onclick = function() {
    const key = document.getElementById('edit-key').value;
    const updateData = {
        type: document.getElementById('edit-type').value,
        gc: document.getElementById('edit-gc').value,
        name: document.getElementById('edit-name').value,
        date: document.getElementById('edit-date').value,
        time: document.getElementById('edit-time').value,
        coords: document.getElementById('edit-coords').value,
        location: document.getElementById('edit-loc').value,
        descriptionHtml: document.getElementById('edit-desc').value
    };
    
    db.ref('miitit/' + currentUser.uid + '/events/' + key).update(updateData).then(() => { 
        if(editModal) editModal.style.display = "none"; 
    });
};

window.toggleArchive = async function(key, status) {
    const title = status ? "Arkistoi miitti" : "Palauta miitti";
    const msg = status ? "Haluatko varmasti arkistoida tämän miitin?" : "Haluatko palauttaa miitin aktiiviseksi?";
    
    const confirmed = await customConfirm(title, msg);
    if (confirmed) {
        db.ref('miitit/' + currentUser.uid + '/events/' + key).update({ isArchived: status });
    }
};

window.deleteEvent = async function(key) { 
    const confirmed = await customConfirm("Poista miitti", "Haluatko varmasti poistaa miitin ja sen kaikki kirjaukset lopullisesti?");
    if (confirmed) { 
        db.ref('miitit/'+currentUser.uid+'/events/'+key).remove(); 
        db.ref('miitit/'+currentUser.uid+'/logs/'+key).remove(); 
    } 
};

window.deleteLog = async function(logKey) { 
    const confirmed = await customConfirm("Poista kirjaus", "Haluatko varmasti poistaa tämän kävijän kirjauksen?");
    if (confirmed) {
        db.ref('miitit/'+currentUser.uid+'/logs/'+currentEventId+'/'+logKey).remove(); 
    }
};


// ==========================================
// 10. GPX-SYNCHRONOINTI JA MASSA-TOIMINNOT
// ==========================================

document.getElementById('btn-sync-gpx-trigger').onclick = function() { 
    document.getElementById('import-gpx-sync').click(); 
};

document.getElementById('import-gpx-sync').onchange = async function(e) {
    const file = e.target.files[0];
    if (!file || !currentEventId) return;
    
    if(loadingOverlay) loadingOverlay.style.display = 'flex';
    const text = await file.text();
    const gpxData = parseGPX(text);
    
    if (!gpxData) { 
        alert("GPX luku epäonnistui."); 
        if(loadingOverlay) loadingOverlay.style.display = 'none'; 
        return; 
    }

    const currentEvtSnap = await db.ref('miitit/' + currentUser.uid + '/events/' + currentEventId).once('value');
    const currentEvt = currentEvtSnap.val();

    // Tarkistus: onko kyseessä sama miitti?
    if (currentEvt.gc && gpxData.gc && currentEvt.gc.trim().toUpperCase() !== gpxData.gc.trim().toUpperCase()) {
        if(loadingOverlay) loadingOverlay.style.display = 'none';
        alert(`⚠️ VIRHE: Tiedosto ei täsmää!\n\nLaitteen miitti: ${currentEvt.gc}\nGPX tiedosto: ${gpxData.gc}`);
        return;
    }

    const updates = {
        attributes: gpxData.attributes,
        coords: gpxData.coords
    };
    
    // Päivitetään kuvaus vain jos se puuttuu tai on tyhjä
    if (!currentEvt.descriptionHtml) {
        updates.descriptionHtml = gpxData.descriptionHtml;
    }
    
    await db.ref('miitit/' + currentUser.uid + '/events/' + currentEventId).update(updates);
    if(loadingOverlay) loadingOverlay.style.display = 'none';
    alert(`Tiedot synkronoitu GPX-tiedostosta!`);
};

window.openMassImport = function() {
    const input = document.getElementById('mass-input');
    const output = document.getElementById('mass-output');
    if(input) input.value = ""; 
    if(output) output.value = ""; 
    
    document.getElementById('mass-step-1').style.display = 'block'; 
    document.getElementById('mass-step-2').style.display = 'none';
    if(massModal) massModal.style.display = "block";
};

document.getElementById('btn-parse-mass').onclick = function() {
    const text = document.getElementById('mass-input').value; 
    if(!text) return;
    
    let names = []; 
    // Erotetaan osallistujat tekstistä (Geocaching.com osallistujalistan perusteella)
    const blocks = text.split(/Näytä\s+loki|View\s+Log|Näytä\s+\/\s+Muokkaa|View\s+\/\s+Edit/i);
    
    blocks.forEach(b => {
        const clean = b.replace(/\s+/g, ' ').trim();
        if (/Osallistui|Attended/i.test(clean)) {
            const m = clean.match(/^(.*?)\s+(?:Premium\s+Member|Member|Reviewer)/i);
            if (m && m[1]) {
                let n = m[1].trim().replace(/lokia\s*\/\s*Kuvia/gi, "").trim();
                if(!n.includes("Aion osallistua") && n.length > 0 && n.length < 50) {
                    names.push(n);
                }
            }
        }
    });
    
    names = [...new Set(names)]; // Vain uniikit nimet
    if (names.length === 0) {
        alert("Nimiä ei löytynyt. Varmista että kopioit koko listan.");
        return;
    }
    
    document.getElementById('mass-output').value = names.join('\n');
    document.getElementById('mass-step-1').style.display = 'none'; 
    document.getElementById('mass-step-2').style.display = 'block';
};

document.getElementById('btn-save-mass').onclick = function() {
    const nicks = document.getElementById('mass-output').value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    nicks.forEach(n => {
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({ 
            nickname: n, 
            from: "", 
            message: "(Massa)", 
            timestamp: firebase.database.ServerValue.TIMESTAMP 
        });
    });
    if(massModal) massModal.style.display = "none";
};


// ==========================================
// 11. TILASTOT JA NAVIGOINTI
// ==========================================

const openStats = function() {
    if(adminView) adminView.style.display = 'none'; 
    if(userView) userView.style.display = 'none';
    
    const statsView = document.getElementById('stats-view');
    if(statsView) statsView.style.display = 'block';
    
    if (typeof initStats === 'function') initStats();
};

document.getElementById('btn-show-stats').onclick = openStats;
document.getElementById('btn-show-stats-user').onclick = openStats;

window.navigateEvent = function(direction) {
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
// 12. KIRJAUTUMINEN JA MUUT LOPUT FUNKTIOT
// ==========================================

window.closeModal = function() { 
    if(editModal) editModal.style.display = "none"; 
    if(massModal) massModal.style.display = "none"; 
    if(logEditModal) logEditModal.style.display = "none"; 
    if(confirmModal) confirmModal.style.display = "none";
};

document.getElementById('btn-login-google').onclick = function() { 
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => alert(e.message)); 
};

document.getElementById('btn-email-login').onclick = function() { 
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    auth.signInWithEmailAndPassword(email, pass).catch(e => alert(e.message)); 
};

document.getElementById('btn-email-register').onclick = function() { 
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    auth.createUserWithEmailAndPassword(email, pass).catch(e => alert(e.message)); 
};

document.getElementById('btn-logout').onclick = async function() { 
    const confirmed = await customConfirm("Kirjaudu ulos", "Haluatko varmasti kirjautua ulos sovelluksesta?");
    if (confirmed) auth.signOut().then(() => location.reload()); 
};

document.getElementById('btn-find-today').onclick = function() {
    const today = new Date().toISOString().split('T')[0];
    const todayEvent = globalEventList.find(e => e.date === today);
    if (todayEvent) openGuestbook(todayEvent.key); else alert("Tälle päivälle ei ole miittiä.");
};

window.openLogEditModal = function(logKey) {
    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId + '/' + logKey).once('value').then(snap => {
        const log = snap.val();
        document.getElementById('log-edit-key').value = logKey;
        document.getElementById('log-edit-nick').value = log.nickname || "";
        document.getElementById('log-edit-from').value = log.from || "";
        document.getElementById('log-edit-msg').value = log.message || "";
        if(logEditModal) logEditModal.style.display = "block";
    });
};

document.getElementById('btn-save-log-edit').onclick = function() {
    const key = document.getElementById('log-edit-key').value;
    const update = { 
        nickname: document.getElementById('log-edit-nick').value, 
        from: document.getElementById('log-edit-from').value, 
        message: document.getElementById('log-edit-msg').value 
    };
    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId + '/' + key).update(update).then(() => { 
        if(logEditModal) logEditModal.style.display = "none"; 
    });
};

window.resetMassModal = function() { 
    document.getElementById('mass-step-1').style.display = 'block'; 
    document.getElementById('mass-step-2').style.display = 'none'; 
};
