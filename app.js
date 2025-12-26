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

// Sovelluksen globaali tila
let currentUser = null;
let currentEventId = null;
let currentEventArchived = false;
let globalEventList = []; 
let isAdminMode = true; 
let wakeLock = null; 

// MÄÄRITÄ TÄHÄN SINUN UID (HOST), jonne vieraiden kirjaukset menevät
const HOST_UID = "T8wI16Gf67W4G4yX3Cq7U0U1H6I2"; 

// Käyttöliittymän elementit
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const userView = document.getElementById('user-view');
const guestbookView = document.getElementById('guestbook-view');
const visitorView = document.getElementById('visitor-view');
const editModal = document.getElementById('edit-modal');
const massModal = document.getElementById('mass-modal');
const logEditModal = document.getElementById('log-edit-modal');
const confirmModal = document.getElementById('confirm-modal');
const userDisplay = document.getElementById('user-display');
const userEmailText = document.getElementById('user-email-text');
const eventStatsEl = document.getElementById('event-stats');
const loadingOverlay = document.getElementById('loading-overlay');

// ==========================================
// 2. KÄYNNISTYS JA VIERASTILA (QR-KOODI)
// ==========================================

window.addEventListener('load', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event');

    if (eventId) {
        console.log("Vierastila aktivoitu miitille:", eventId);
        // Avataan vieraskirja suoraan ilman auth-tarkistusta
        openVisitorGuestbook(HOST_UID, eventId);
    }
});

async function openVisitorGuestbook(uid, eventId) {
    if(loadingOverlay) loadingOverlay.style.display = 'flex';
    
    // Tallennetaan ID talteen vieraskirjausta varten
    currentEventId = eventId;
    
    // Haetaan VAIN tapahtuman tiedot (Säännöt sallivat tämän .read: true)
    db.ref('miitit/' + uid + '/events/' + eventId).once('value', snap => {
        const evt = snap.val();
        
        if(!evt) {
            alert("Miittiä ei löytynyt tai virheellinen linkki!");
            if(loadingOverlay) loadingOverlay.style.display = 'none';
            return;
        }
        
        // Täytetään vierasnäkymän tiedot
        const nameEl = document.getElementById('vv-event-name');
        const infoEl = document.getElementById('vv-event-info');
        
        if(nameEl) nameEl.innerText = evt.name;
        if(infoEl) infoEl.innerText = `${evt.date} klo ${evt.time || '-'}`;
        
        // PAKOTETAAN OIKEA NÄKYMÄ PÄÄLLE JA MUUT POIS
        if(visitorView) visitorView.style.display = 'block';
        if(loginView) loginView.style.display = 'none';
        if(adminView) adminView.style.display = 'none';
        if(userView) userView.style.display = 'none';
        if(guestbookView) guestbookView.style.display = 'none'; 
        const statsView = document.getElementById('stats-view');
        if(statsView) statsView.style.display = 'none';
        
        if(loadingOverlay) loadingOverlay.style.display = 'none';
        
    }, (error) => {
        console.error("Virhe haettaessa miittiä:", error);
        alert("Virhe tietojen haussa. Onko QR-koodi oikein?");
        if(loadingOverlay) loadingOverlay.style.display = 'none';
    });
}

// Vieraskirjan tallennus (VIERAS QR-koodilla)
const btnVisitorSign = document.getElementById('btn-visitor-sign');
if (btnVisitorSign) {
    btnVisitorSign.onclick = function() {
        const nickInput = document.getElementById('vv-nickname');
        const fromInput = document.getElementById('vv-from');
        const msgInput = document.getElementById('vv-message');

        const nick = nickInput ? nickInput.value.trim() : "";
        
        if(!nick) return alert("Kirjoita nimimerkkisi!");
        
        // Tallennetaan Hostin alle
        db.ref('miitit/' + HOST_UID + '/logs/' + currentEventId).push({
            nickname: nick, 
            from: fromInput ? fromInput.value.trim() : "",
            message: msgInput ? msgInput.value.trim() : "", 
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            alert("Kiitos käynnistä! Kirjaus tallennettu.");
            window.location.href = "https://www.geocaching.com"; 
        }).catch(err => {
            console.error("Tallennusvirhe:", err);
            alert("Virhe tallennuksessa: " + err.message);
        });
    };
}


// ==========================================
// 3. OMA VARMISTUSKYSELY
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
            yesBtn.onclick = null;
            noBtn.onclick = null;
            resolve(response);
        };

        if(yesBtn) yesBtn.onclick = function() { handleResponse(true); };
        if(noBtn) noBtn.onclick = function() { handleResponse(false); };
    });
}

// ==========================================
// 4. NÄYTÖN PÄÄLLÄPITO (WAKE LOCK)
// ==========================================

const requestWakeLock = async () => {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) { 
        console.error(`Wake Lock virhe: ${err.name}, ${err.message}`); 
    }
};

document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

// ==========================================
// 5. KIRJAUTUMINEN JA NÄKYMIEN HALLINTA
// ==========================================

auth.onAuthStateChanged((user) => {
    // TÄRKEÄÄ: Jos ollaan vierasnäkymässä (QR-koodi), ÄLÄ tee mitään kirjautumislogiikkaa
    if (visitorView && visitorView.style.display === 'block') return;

    if (user) {
        currentUser = user;
        if(userDisplay) {
            userDisplay.style.display = 'flex';
            if(userEmailText) userEmailText.innerText = "👤 " + user.email;
        }
        
        // Jos käyttäjä on Admin/User tilassa, ladataan pääsivu
        const statsView = document.getElementById('stats-view');
        if (guestbookView.style.display !== 'block' && 
            (!statsView || statsView.style.display !== 'block')) {
            showMainView();
        }
        
        loadEvents();
        requestWakeLock();
    } else {
        currentUser = null;
        if(userDisplay) userDisplay.style.display = 'none';
        showLoginView();
        if (wakeLock) { wakeLock.release(); wakeLock = null; }
    }
});

function showLoginView() { 
    if(loginView) loginView.style.display = 'flex'; 
    if(adminView) adminView.style.display = 'none'; 
    if(userView) userView.style.display = 'none';
    if(guestbookView) guestbookView.style.display = 'none'; 
    if(visitorView) visitorView.style.display = 'none';
}

function showMainView() {
    if (!currentUser) { showLoginView(); return; }
    
    if(loginView) loginView.style.display = 'none'; 
    if(visitorView) visitorView.style.display = 'none';
    if(guestbookView) guestbookView.style.display = 'none';
    
    const statsView = document.getElementById('stats-view');
    if(statsView) statsView.style.display = 'none';

    if (isAdminMode) {
        if(adminView) adminView.style.display = 'block';
        if(userView) userView.style.display = 'none';
    } else {
        if(adminView) adminView.style.display = 'none';
        if(userView) userView.style.display = 'block';
    }
    
    if(currentEventId) { 
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).off(); 
        currentEventId = null; 
    }
}

window.showMainView = showMainView;

const btnToggleMode = document.getElementById('btn-toggle-mode');
if(btnToggleMode) {
    btnToggleMode.onclick = function() {
        isAdminMode = !isAdminMode;
        btnToggleMode.innerText = isAdminMode ? "🔄 Hallinta-tila" : "🔄 Miittikirja-tila";
        showMainView();
        loadEvents();
    };
}

// ==========================================
// 6. QR-KOODI (HOST NÄKYMÄ) & AUTOCOMPLETE
// ==========================================

const btnToggleQr = document.getElementById('btn-toggle-qr');
if(btnToggleQr) {
    btnToggleQr.onclick = function() {
        const area = document.getElementById('qr-display-area');
        const container = document.getElementById('qrcode-container');
        const linkText = document.getElementById('qr-link-text');
        
        if (area.style.display === 'block') {
            area.style.display = 'none';
            return;
        }

        container.innerHTML = "";
        // Luodaan linkki: nykyinenSivu?event=EVENT_ID
        const baseUrl = window.location.href.split('?')[0];
        const guestUrl = baseUrl + "?event=" + currentEventId;
        
        if(linkText) linkText.innerText = guestUrl;

        new QRCode(container, {
            text: guestUrl,
            width: 180,
            height: 180,
            colorDark : "#8B4513",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });

        area.style.display = 'block';
    };
}

function setupAutocomplete(inputId, listId, uid) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    if(!input || !list) return;

    input.oninput = async function() {
        const val = input.value.toLowerCase();
        if (val.length < 2) { list.style.display = 'none'; return; }
        
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
    const el = document.getElementById(inputId);
    if(el) el.value = name;
    const list = document.getElementById(listId);
    if(list) list.style.display = 'none';
};

// ==========================================
// 7. APUFUNKTIOT
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
    const dmsMatch = coords.match(/([NS])\s*(\d+)°\s*([\d\.]+)\s*([EW])\s*(\d+)°\s*([\d\.]+)/);
    if (dmsMatch) {
        lat = parseInt(dmsMatch[2]) + parseFloat(dmsMatch[3]) / 60;
        if (dmsMatch[1] === 'S') lat = -lat;
        lon = parseInt(dmsMatch[5]) + parseFloat(dmsMatch[6]) / 60;
        if (dmsMatch[4] === 'W') lon = -lon;
    } else {
        const parts = coords.replace(/[NE]/g, '').split(/[,\sE]/).filter(s => s.trim().length > 0);
        if (parts.length >= 2) { lat = parseFloat(parts[0]); lon = parseFloat(parts[1]); }
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
    } catch (e) { console.error("Sijaintihaku epäonnistui", e); }
    return "";
}

function parseGPX(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");
    const wpt = xml.querySelector("wpt");
    
    // Perustiedot
    let result = {
        attributes: [],
        coords: "",
        logs: []
    };

    if (wpt) {
        const lat = parseFloat(wpt.getAttribute("lat"));
        const lon = parseFloat(wpt.getAttribute("lon"));
        result.coords = decimalToDMS(lat, lon);
        
        let timeStr = "";
        const shortDesc = wpt.getElementsByTagNameNS("*", "short_description")[0]?.textContent || "";
        const timeMatch = shortDesc.match(/(\d{1,2}[:\.]\d{2})\s*-\s*(\d{1,2}[:\.]\d{2})/);
        if (timeMatch) timeStr = `${timeMatch[1].replace('.', ':')} - ${timeMatch[2].replace('.', ':')}`;
        
        const attrElements = wpt.getElementsByTagNameNS("*", "attribute");
        for (let i = 0; i < attrElements.length; i++) {
            const attr = attrElements[i];
            result.attributes.push({ name: attr.textContent.trim(), inc: attr.getAttribute("inc") === "1" ? 1 : 0 });
        }
    }

    // Parsitaan logit (osallistujat)
    const logElements = xml.getElementsByTagNameNS("*", "log");
    for (let i = 0; i < logElements.length; i++) {
        const l = logElements[i];
        const finder = l.getElementsByTagNameNS("*", "finder")[0]?.textContent || "";
        const text = l.getElementsByTagNameNS("*", "text")[0]?.textContent || "";
        const date = l.getElementsByTagNameNS("*", "date")[0]?.textContent || "";
        const type = l.getElementsByTagNameNS("*", "type")[0]?.textContent || "";

        // Otetaan vain 'Attended' tyyppiset, tai jos tyyppiä ei määritelty (varmuuden vuoksi)
        if (finder && (type === "Attended" || type === "Webcam Photo Taken" || type === "")) {
             result.logs.push({
                 finder: finder.trim(),
                 text: text.trim(),
                 date: date
             });
        }
    }

    return result;
}

// ==========================================
// 8. TAPAHTUMIEN LATAUS
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
        
        const noticeAdmin = document.getElementById('today-notice-admin');
        const noticeUser = document.getElementById('today-notice-user');
        if(noticeAdmin) noticeAdmin.innerHTML = "";
        if(noticeUser) noticeUser.innerHTML = "";

        const events = [];
        snapshot.forEach(child => { events.push({key: child.key, ...child.val()}); });
        events.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
        globalEventList = events;

        if(eventStatsEl) eventStatsEl.innerText = `Löytyi ${events.length} tapahtumaa.`;

        events.forEach(evt => {
            const isToday = (evt.date === todayStr);
            const isArchived = (evt.isArchived === true);
            const countId = `count-${isAdminMode ? 'adm' : 'usr'}-${evt.key}`;
            
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
                        <button class="btn btn-blue btn-small" onclick="openEditModal('${evt.key}')">✏️ Muokkaa</button>
                        ${archiveBtn}
                        <button class="btn btn-red btn-small" onclick="deleteEvent('${evt.key}')">🗑 Poista</button>
                    </div>`;
                
                if (isToday && noticeAdmin) {
                    const notice = div.cloneNode(true);
                    notice.prepend(document.createRange().createContextualFragment('<h3 style="color:#4caf50; margin-top:0;">🌟 TÄNÄÄN TAPAHTUU!</h3>'));
                    noticeAdmin.appendChild(notice);
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
                
                if (isToday && noticeUser) {
                    const notice = div.cloneNode(true);
                    notice.prepend(document.createRange().createContextualFragment('<h3 style="color:#4caf50; margin-top:0; text-align:center;">🌟 TÄNÄÄN!</h3>'));
                    noticeUser.appendChild(notice);
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
// 9. HOST-PUOLEN VIERASKIRJA (ADMIN/USER)
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
        
        const coordsEl = document.getElementById('gb-coords');
        if(evt.coords) {
            const qCoords = evt.coords.replace(/°/g, "").replace(/\s+/g, "+");
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${qCoords}`;
            coordsEl.innerHTML = `<a href="${mapsUrl}" target="_blank" style="color:#D2691E; font-weight:bold; text-decoration: underline;">${evt.coords}</a>`;
        } else { coordsEl.innerText = "-"; }

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

        const qrArea = document.getElementById('qr-display-area');
        if(qrArea) qrArea.style.display = 'none';
        
        // --- QR-OSION NÄYTTÄMINEN ---
        // Näytä QR-alue AINA jos ollaan kirjautuneena (currentUser)
        const qrSection = document.getElementById('qr-section');
        if (qrSection) {
            qrSection.style.display = currentUser ? 'block' : 'none';
        }
        
        // --- HALLINTATYÖKALUT (GPX / MASSA) ---
        // Näytä VAIN jos isAdminMode = true
        const adminTools = document.getElementById('gb-admin-tools');
        if(adminTools) {
             adminTools.style.display = (currentUser && isAdminMode) ? 'block' : 'none';
        }
        
        const actionsArea = document.getElementById('gb-actions-area');
        if(actionsArea) actionsArea.style.display = currentEventArchived ? 'none' : 'block';
        
        const notice = document.getElementById('archived-notice');
        if(notice) notice.style.display = currentEventArchived ? 'block' : 'none';
        
        // Aktivoi nimiehdotukset admin-kirjaukseen
        if(currentUser) setupAutocomplete('log-nickname', 'log-autocomplete', currentUser.uid);
    });

    if(adminView) adminView.style.display = 'none'; 
    if(userView) userView.style.display = 'none'; 
    if(guestbookView) guestbookView.style.display = 'block';
    
    const statsView = document.getElementById('stats-view');
    if(statsView) statsView.style.display = 'none';
    
    window.scrollTo(0,0);
    loadAttendees(eventKey);
};

// Kirjaus (Admin/User tila)
const btnSignLog = document.getElementById('btn-sign-log');
if (btnSignLog) {
    btnSignLog.onclick = function() {
        const nick = document.getElementById('log-nickname').value.trim();
        if(!nick) return alert("Nimi vaaditaan!");
        
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({
            nickname: nick, 
            from: document.getElementById('log-from').value.trim(),
            message: document.getElementById('log-message').value.trim(), 
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => { 
            ['log-nickname','log-from','log-message'].forEach(id => {
                const el = document.getElementById(id); if(el) el.value = "";
            });
        });
    };
}

function loadAttendees(eventKey) {
    if (!currentUser) return;
    
    db.ref('miitit/' + currentUser.uid + '/logs/' + eventKey).on('value', (snapshot) => {
        const listEl = document.getElementById('attendee-list'); if(!listEl) return;
        listEl.innerHTML = ""; const logs = [];
        snapshot.forEach(child => { logs.push({key: child.key, ...child.val()}); });
        logs.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        logs.forEach(log => {
            const row = document.createElement('div'); row.className = "log-item";
            
            // Viestien näyttäminen: Miittikirja vs Nettilogi
            let messageHtml = "";
            if (log.message) {
                messageHtml += `<div style="font-style:italic; color:#888; font-size:0.9em;">📖 ${log.message}</div>`;
            }
            if (log.gpxMessage) {
                 messageHtml += `<div style="font-style:italic; color:#2196f3; font-size:0.85em; margin-top:2px;">🌐 ${log.gpxMessage.substring(0, 100)}${log.gpxMessage.length > 100 ? '...' : ''}</div>`;
            }

            let btns = (isAdminMode && !currentEventArchived && currentUser) ? `
                <div class="log-actions">
                    <button class="btn-blue btn-small" onclick="openLogEditModal('${log.key}')">✏️</button>
                    <button class="btn-red btn-small" onclick="deleteLog('${log.key}')">🗑</button>
                </div>` : "";
            
            row.innerHTML = `<div><strong style="color:#4caf50;">${log.nickname}</strong><span>${log.from ? ' / ' + log.from : ''}</span>
            ${messageHtml}</div>${btns}`;
            listEl.appendChild(row);
        });
        const countEl = document.getElementById('attendee-count');
        if(countEl) countEl.innerText = logs.length;
    });
}

// ==========================================
// 10. MUOKKAUS, ARKISTOINTI JA POISTO
// ==========================================

window.openEditModal = function(key) {
    db.ref('miitit/' + currentUser.uid + '/events/' + key).once('value').then(snap => {
        const e = snap.val(); 
        document.getElementById('edit-key').value = key;
        document.getElementById('edit-name').value = e.name || "";
        document.getElementById('edit-gc').value = e.gc || "";
        document.getElementById('edit-date').value = e.date || "";
        document.getElementById('edit-time').value = e.time || "";
        document.getElementById('edit-type').value = e.type || "miitti";
        document.getElementById('edit-coords').value = e.coords || "";
        document.getElementById('edit-loc').value = e.location || "";
        document.getElementById('edit-desc').value = e.descriptionHtml || "";
        if(editModal) editModal.style.display = "block";
    });
};

const btnSaveEdit = document.getElementById('btn-save-edit');
if (btnSaveEdit) {
    btnSaveEdit.onclick = function() {
        const key = document.getElementById('edit-key').value;
        const updateData = {
            name: document.getElementById('edit-name').value,
            type: document.getElementById('edit-type').value,
            gc: document.getElementById('edit-gc').value,
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
}

window.toggleArchive = async function(key, status) {
    const ok = await customConfirm(status ? "Arkistoi miitti" : "Palauta miitti", "Haluatko varmasti muuttaa miitin tilaa?");
    if (ok) db.ref('miitit/' + currentUser.uid + '/events/' + key).update({ isArchived: status });
};

window.deleteEvent = async function(key) {
    const ok = await customConfirm("Poista miitti", "Tätä ei voi perua. Haluatko varmasti poistaa miitin ja kaikki sen kirjaukset?");
    if (ok) { 
        db.ref('miitit/'+currentUser.uid+'/events/'+key).remove(); 
        db.ref('miitit/'+currentUser.uid+'/logs/'+key).remove(); 
    }
};

window.deleteLog = async function(logKey) {
    const ok = await customConfirm("Poista kirjaus", "Haluatko varmasti poistaa tämän kävijän kirjauksen?");
    if (ok) db.ref('miitit/'+currentUser.uid+'/logs/'+currentEventId+'/'+logKey).remove();
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

const btnSaveLogEdit = document.getElementById('btn-save-log-edit');
if (btnSaveLogEdit) {
    btnSaveLogEdit.onclick = function() {
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
}

// ==========================================
// 11. GPX-SYNCHRONOINTI JA MASSA-TOIMINNOT
// ==========================================

const btnSyncGpx = document.getElementById('btn-sync-gpx-trigger');
if(btnSyncGpx) btnSyncGpx.onclick = () => document.getElementById('import-gpx-sync').click();

const fileInputSync = document.getElementById('import-gpx-sync');
if (fileInputSync) {
    fileInputSync.onchange = async function(e) {
        const file = e.target.files[0]; if (!file || !currentEventId) return;
        if(loadingOverlay) loadingOverlay.style.display = 'flex';
        
        const text = await file.text(); 
        const data = parseGPX(text);

        if (data) {
            // 1. Päivitä attribuutit ja koordinaatit
            const updates = {};
            if(data.attributes && data.attributes.length > 0) updates.attributes = data.attributes;
            if(data.coords) updates.coords = data.coords;
            
            if(Object.keys(updates).length > 0) {
                await db.ref('miitit/' + currentUser.uid + '/events/' + currentEventId).update(updates);
            }

            // 2. Älykäs kävijöiden yhdistäminen (Smart Merge)
            if (data.logs && data.logs.length > 0) {
                const logsRef = db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId);
                const snapshot = await logsRef.once('value');
                const existingLogs = snapshot.val() || {};
                
                // Luodaan kartta olemassa olevista: "nimimerkki" -> "key"
                const existingMap = {};
                Object.keys(existingLogs).forEach(key => {
                    const l = existingLogs[key];
                    if(l.nickname) existingMap[l.nickname.toLowerCase()] = key;
                });

                let addedCount = 0;
                let updatedCount = 0;

                for (const gpxLog of data.logs) {
                    const nickLower = gpxLog.finder.toLowerCase();

                    // ESTO: Älä koskaan lisää mikkokalevia
                    if (nickLower === "mikkokalevi") continue;

                    if (existingMap[nickLower]) {
                        // LÖYTYI: Päivitä vain gpxMessage, älä koske 'message' kenttään (joka on miittikirjan viesti)
                        const existingKey = existingMap[nickLower];
                        await logsRef.child(existingKey).update({
                            gpxMessage: gpxLog.text // Tallenna nettilogi omaksi tiedokseen
                        });
                        updatedCount++;
                    } else {
                        // UUSI: Luo uusi rivi
                        await logsRef.push({
                            nickname: gpxLog.finder,
                            message: "", // Miittikirjan viesti tyhjäksi
                            gpxMessage: gpxLog.text, // Nettilogi
                            from: "",
                            timestamp: firebase.database.ServerValue.TIMESTAMP
                        });
                        addedCount++;
                    }
                }
                alert(`GPX Sync valmis!\n\nLisättiin uusia: ${addedCount}\nPäivitettiin vanhoja: ${updatedCount}`);
            } else {
                alert("GPX-tiedostosta päivitettiin tiedot, mutta ei löytynyt loggauksia.");
            }
        }
        
        // Tyhjennä input jotta saman tiedoston voi valita uudelleen
        e.target.value = '';
        if(loadingOverlay) loadingOverlay.style.display = 'none';
    };
}

window.openMassImport = function() {
    const input = document.getElementById('mass-input');
    const output = document.getElementById('mass-output');
    if(input) input.value = ""; if(output) output.value = ""; 
    document.getElementById('mass-step-1').style.display = 'block'; 
    document.getElementById('mass-step-2').style.display = 'none';
    if(massModal) massModal.style.display = "block";
};

const btnParseMass = document.getElementById('btn-parse-mass');
if (btnParseMass) {
    btnParseMass.onclick = function() {
        const text = document.getElementById('mass-input').value; if(!text) return;
        let names = []; const blocks = text.split(/Näytä\s+loki|View\s+Log/i);
        blocks.forEach(b => {
            if (/Osallistui|Attended/i.test(b)) {
                const m = b.match(/^(.*?)\s+(?:Premium\s+Member|Member|Reviewer)/i);
                if (m && m[1]) names.push(m[1].trim());
            }
        });
        names = [...new Set(names)]; if (names.length === 0) return alert("Nimiä ei löytynyt!");
        document.getElementById('mass-output').value = names.join('\n');
        document.getElementById('mass-step-1').style.display = 'none'; 
        document.getElementById('mass-step-2').style.display = 'block';
    };
}

const btnSaveMass = document.getElementById('btn-save-mass');
if(btnSaveMass) {
    btnSaveMass.onclick = function() {
        const nicks = document.getElementById('mass-output').value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        nicks.forEach(n => { 
            db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({ nickname: n, from: "", message: "(Massa)", timestamp: firebase.database.ServerValue.TIMESTAMP }); 
        });
        if(massModal) massModal.style.display = "none";
    };
}

window.resetMassModal = function() { 
    document.getElementById('mass-step-1').style.display = 'block'; 
    document.getElementById('mass-step-2').style.display = 'none'; 
};

// ==========================================
// 12. KIRJAUTUMINEN JA LOPUT
// ==========================================

const btnLogout = document.getElementById('btn-logout');
if(btnLogout) {
    btnLogout.onclick = async function() {
        const ok = await customConfirm("Kirjaudu ulos", "Haluatko varmasti kirjautua ulos sovelluksesta?");
        if (ok) auth.signOut().then(() => location.reload());
    };
}

const btnGoogle = document.getElementById('btn-login-google');
if(btnGoogle) btnGoogle.onclick = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());

const btnEmailLogin = document.getElementById('btn-email-login');
if(btnEmailLogin) btnEmailLogin.onclick = () => auth.signInWithEmailAndPassword(document.getElementById('email-input').value, document.getElementById('password-input').value);

const btnEmailReg = document.getElementById('btn-email-register');
if(btnEmailReg) btnEmailReg.onclick = () => auth.createUserWithEmailAndPassword(document.getElementById('email-input').value, document.getElementById('password-input').value);

window.closeModal = () => { 
    ['edit-modal','mass-modal','log-edit-modal','confirm-modal'].forEach(id => {
        const el = document.getElementById(id); if(el) el.style.display = "none";
    });
};

const openStats = () => {
    if(adminView) adminView.style.display = 'none'; 
    if(userView) userView.style.display = 'none';
    const statsView = document.getElementById('stats-view');
    if(statsView) statsView.style.display = 'block';
    if (typeof initStats === 'function') initStats();
};

const btnStats = document.getElementById('btn-show-stats');
if(btnStats) btnStats.onclick = openStats;

const btnStatsUser = document.getElementById('btn-show-stats-user');
if(btnStatsUser) btnStatsUser.onclick = openStats;

const btnFindToday = document.getElementById('btn-find-today');
if(btnFindToday) {
    btnFindToday.onclick = () => {
        const today = new Date().toISOString().split('T')[0];
        const todayEvent = globalEventList.find(e => e.date === today);
        if (todayEvent) openGuestbook(todayEvent.key); else alert("Tälle päivälle ei ole miittiä.");
    };
}

const btnProcessImport = document.getElementById('btn-process-import');
if(btnProcessImport) {
    btnProcessImport.onclick = function() {
        const text = document.getElementById('import-text').value;
        const gcMatch = text.match(/(GC[A-Z0-9]+)/);
        if (gcMatch) document.getElementById('new-gc').value = gcMatch[1];
        const coordMatch = text.match(/([NS]\s*\d+°\s*[\d\.]+\s*[EW]\s*\d+°\s*[\d\.]+)/);
        if (coordMatch) {
            document.getElementById('new-coords').value = coordMatch[1].trim();
            fetchCityFromCoords(coordMatch[1].trim(), 'new-loc');
        }
    };
}

window.navigateEvent = function(direction) {
    if (!currentEventId || globalEventList.length === 0) return;
    const currentIndex = globalEventList.findIndex(e => e.key === currentEventId);
    const newIndex = currentIndex - direction; // -1 on seuraava, 1 edellinen
    if (newIndex >= 0 && newIndex < globalEventList.length) {
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).off();
        openGuestbook(globalEventList[newIndex].key);
    }
};

window.toggleDetails = function(id) {
    const content = document.getElementById(id);
    if(content) content.style.display = (content.style.display === 'block') ? 'none' : 'block';
};
