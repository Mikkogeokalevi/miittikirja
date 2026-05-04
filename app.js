// ==========================================
// MK MIITTIKIRJA - APP.JS
// Versio: 7.12.1 - TXT-raportin sanalaskurit
// ==========================================

const APP_VERSION = "7.12.1";

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
let currentEventGcCode = null; 
let currentEventArchived = false;
let globalEventList = []; 
let isAdminMode = true; 
let wakeLock = null; 

// Tilamuuttuja live-päivityksille
let lastAttendeeCount = null;

// OLETUS HOST_UID (Varmuuskopio)
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
    const verLogin = document.getElementById('version-display-login');
    if(verLogin) verLogin.innerText = "v" + APP_VERSION;

    const verUser = document.getElementById('version-display-user');
    if(verUser) verUser.innerText = "Versio " + APP_VERSION;

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event');
    const paramUid = urlParams.get('uid');
    const targetUid = paramUid ? paramUid.trim() : HOST_UID;

    if (eventId) {
        console.log("Vierastila aktivoitu. Event:", eventId, "UID:", targetUid);
        if(visitorView) visitorView.style.display = 'block';
        if(loginView) loginView.style.display = 'none';
        if(adminView) adminView.style.display = 'none';
        openVisitorGuestbook(targetUid, eventId.trim());
    }
});

function isQrExpired(eventDateStr) {
    if (!eventDateStr) return false;
    const eventDate = new Date(`${eventDateStr}T00:00:00`);
    if (isNaN(eventDate.getTime())) return false;
    const expiryDate = new Date(eventDate);
    expiryDate.setDate(expiryDate.getDate() + 3);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today > expiryDate;
}

function extractThemeColorFromDescription(descriptionHtml) {
    if (!descriptionHtml) return null;
    const dataMatch = descriptionHtml.match(/data-theme-color\s*=\s*["'](#?[0-9a-fA-F]{3,8})["']/);
    if (dataMatch) {
        const val = dataMatch[1];
        return val.startsWith('#') ? val : `#${val}`;
    }
    const hexMatch = descriptionHtml.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
    if (hexMatch) return `#${hexMatch[1]}`;
    return null;
}

function applyVisitorThemeColor(color) {
    const visitorView = document.getElementById('visitor-view');
    if (!visitorView) return;
    if (!color) {
        visitorView.style.removeProperty('--primary-color');
        visitorView.style.removeProperty('--secondary-color');
        visitorView.style.removeProperty('--highlight-border');
        visitorView.style.removeProperty('--border-color');
        visitorView.style.removeProperty('--link-color');
        return;
    }
    visitorView.style.setProperty('--primary-color', color);
    visitorView.style.setProperty('--secondary-color', color);
    visitorView.style.setProperty('--highlight-border', color);
    visitorView.style.setProperty('--border-color', color);
    visitorView.style.setProperty('--link-color', color);
}

function formatDateFi(dateObj) {
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

function getEventEndTime(timeStr) {
    if (!timeStr) return "23:59";
    const matches = timeStr.match(/\b\d{1,2}:\d{2}\b/g);
    if (matches && matches.length > 0) {
        return matches[matches.length - 1];
    }
    return "23:59";
}

async function openVisitorGuestbook(uid, eventId) {
    if(loadingOverlay) loadingOverlay.style.display = 'flex';
    
    // Asetetaan globaalit muuttujat, joita visitor.js käyttää
    window.currentEventId = eventId;
    window.currentVisitorTargetUid = uid; 
    window.currentVisitorPreSignMessage = "";
    window.currentVisitorSpecialMessage = "";
    currentEventId = eventId; // Varmuuden vuoksi myös app.js:n omaan muuttujaan
    lastAttendeeCount = null;
    
    db.ref('miitit/' + uid + '/events/' + eventId).once('value', snap => {
        const evt = snap.val();
        
        if(!evt) {
            alert(`Miittiä ei löytynyt!\n\nEtsintätiedot:\nEventID: ${eventId}\nOmistaja-UID: ${uid}\n\nTarkista onko miitti poistettu tai onko QR-koodi vanhentunut.`);
            if(loadingOverlay) loadingOverlay.style.display = 'none';
            return;
        }
        
        currentEventGcCode = evt.gc || null;
        window.currentVisitorPreSignMessage = (typeof evt.preSignMessage === 'string') ? evt.preSignMessage.trim() : "";
        window.currentVisitorSpecialMessage = (typeof evt.specialMessage === 'string') ? evt.specialMessage.trim() : "";
        applyVisitorThemeColor(extractThemeColorFromDescription(evt.descriptionHtml));

        if (typeof window.renderVisitorPreSignMessage === 'function') {
            window.renderVisitorPreSignMessage();
        }

        const nameEl = document.getElementById('vv-event-name');
        const infoEl = document.getElementById('vv-event-info');
        
        // Asetetaan miitin nimi ja aika
        if(nameEl) nameEl.innerText = evt.name;
        if(infoEl) infoEl.innerText = `${evt.date} klo ${evt.time || '-'}`;

        const expired = isQrExpired(evt.date);
        if (window.setVisitorExpiredState) {
            window.setVisitorExpiredState(expired);
        }

        if (evt.date) {
            const eventDate = new Date(`${evt.date}T00:00:00`);
            if (!isNaN(eventDate.getTime())) {
                const expiryDate = new Date(eventDate);
                expiryDate.setDate(expiryDate.getDate() + 3);
                const expiryTime = getEventEndTime(evt.time);
                window.visitorExpiryUntil = {
                    date: formatDateFi(expiryDate),
                    time: expiryTime
                };
                if (window.updateVisitorExpiryNotice) {
                    window.updateVisitorExpiryNotice();
                }
            }
        }
        
        // Varmistetaan näkymät
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
        alert("Virhe tietokantayhteydessä:\n" + error.message);
        if(loadingOverlay) loadingOverlay.style.display = 'none';
    });
}

// HUOM: Vanha 'btnVisitorSign.onclick' poistettu täältä.
// Logiikka on siirretty visitor.js -tiedostoon 'handleVisitorSign' -funktioon.

window.proceedToGeo = function() {
    if (currentEventGcCode && currentEventGcCode.startsWith('GC')) {
        window.location.href = "https://coord.info/" + currentEventGcCode;
    } else {
        window.location.href = "https://www.geocaching.com";
    }
};

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
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('event')) return;

    if (user) {
        currentUser = user;
        if(userDisplay) {
            userDisplay.style.display = 'flex'; 
            if(userEmailText) userEmailText.innerText = "👤 " + user.email;
        }
        
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

const qrTranslations = {
    fi: { instruction: "Skannaa QR-koodi\nja kirjaa käynti" },
    en: { instruction: "Scan the QR code\nand sign the guestbook" },
    sv: { instruction: "Skanna QR-koden\noch signera gästboken" },
    et: { instruction: "Skanni QR‑kood\nja kirjuta külalisteraamatusse" }
};

let currentQrLang = 'fi';
window.setQrLanguage = function(lang) {
    if (!qrTranslations[lang]) return;
    currentQrLang = lang;
    const instructionEl = document.getElementById('qr-instructions');
    if (instructionEl) instructionEl.innerText = qrTranslations[lang].instruction;
};

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
        const ownerUid = currentUser ? currentUser.uid : HOST_UID;
        const baseUrl = window.location.href.split('?')[0];
        const guestUrl = `${baseUrl}?event=${currentEventId}&uid=${ownerUid}`;
        
        if(linkText) linkText.innerText = guestUrl;
        window.setQrLanguage(currentQrLang);

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
    if (!wpt) return null;
    const lat = parseFloat(wpt.getAttribute("lat"));
    const lon = parseFloat(wpt.getAttribute("lon"));
    
    let timeStr = "";
    const shortDesc = wpt.getElementsByTagNameNS("*", "short_description")[0]?.textContent || "";
    const timeMatch = shortDesc.match(/(\d{1,2}[:\.]\d{2})\s*-\s*(\d{1,2}[:\.]\d{2})/);
    if (timeMatch) timeStr = `${timeMatch[1].replace('.', ':')} - ${timeMatch[2].replace('.', ':')}`;
    
    const attributes = [];
    const attrElements = wpt.getElementsByTagNameNS("*", "attribute");
    for (let i = 0; i < attrElements.length; i++) {
        const attr = attrElements[i];
        attributes.push({ name: attr.textContent.trim(), inc: attr.getAttribute("inc") === "1" ? 1 : 0 });
    }
    
    return {
        gc: wpt.querySelector("name")?.textContent || "",
        name: wpt.getElementsByTagNameNS("*", "name")[1]?.textContent || wpt.querySelector("urlname")?.textContent || "Nimetön miitti",
        date: wpt.querySelector("time")?.textContent?.split('T')[0] || "",
        time: timeStr,
        coords: decimalToDMS(lat, lon),
        descriptionHtml: wpt.getElementsByTagNameNS("*", "long_description")[0]?.textContent || "",
        attributes: attributes
    };
}

// ==========================================
// 8. TAPAHTUMIEN LATAUS & NUMEROINTI
// ==========================================

const newEventToggle = document.getElementById('new-event-toggle');
if (newEventToggle) {
    newEventToggle.onclick = function() {
        const form = document.getElementById('new-event-form');
        if (form.style.display === 'none') {
            form.style.display = 'block';
        } else {
            form.style.display = 'none';
        }
    };
}

const fileInputNew = document.getElementById('import-gpx-new');
if (fileInputNew) {
    fileInputNew.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        if(loadingOverlay) loadingOverlay.style.display = 'flex';

        try {
            const text = await file.text();
            const data = parseGPX(text);

            if (data) {
                document.getElementById('new-gc').value = data.gc || "";
                document.getElementById('new-name').value = data.name || "";
                document.getElementById('new-date').value = data.date || "";
                document.getElementById('new-time').value = data.time || "";
                document.getElementById('new-coords').value = data.coords || "";
                document.getElementById('new-desc').value = data.descriptionHtml || "";
                
                if(data.coords) fetchCityFromCoords(data.coords, 'new-loc');
                
            } else {
                alert("GPX-tiedoston luku epäonnistui.");
            }
        } catch (err) {
            console.error(err);
            alert("Virhe tiedoston käsittelyssä.");
        } finally {
            if(loadingOverlay) loadingOverlay.style.display = 'none';
            fileInputNew.value = ""; 
        }
    };
}

const btnAddEvent = document.getElementById('btn-add-event');
if (btnAddEvent) {
    btnAddEvent.onclick = function() {
        const type = document.getElementById('new-type').value;
        const gc = document.getElementById('new-gc').value.trim();
        const name = document.getElementById('new-name').value.trim();
        const date = document.getElementById('new-date').value;
        const time = document.getElementById('new-time').value.trim();
        const coords = document.getElementById('new-coords').value.trim();
        const loc = document.getElementById('new-loc').value.trim();
        const preSignMessage = document.getElementById('new-presign-message').value.trim();
        const specialMessage = document.getElementById('new-special-message').value.trim();
        const desc = document.getElementById('new-desc').value.trim();

        if (!name || !date) {
            alert("Nimi ja päivämäärä ovat pakollisia!");
            return;
        }

        db.ref('miitit/' + currentUser.uid + '/events').push({
            type: type,
            gc: gc,
            name: name,
            date: date,
            time: time,
            coords: coords,
            location: loc,
            preSignMessage: preSignMessage,
            specialMessage: specialMessage,
            descriptionHtml: desc,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            alert("Tapahtuma lisätty!");
            document.getElementById('new-event-form').style.display = 'none';
            ['new-gc', 'new-name', 'new-date', 'new-time', 'new-coords', 'new-loc', 'new-presign-message', 'new-special-message', 'new-desc'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = "";
            });
        });
    };
}

function loadEvents() {
    if (!currentUser) return;
    const todayStr = new Date().toISOString().split('T')[0];
    
    db.ref('miitit/' + currentUser.uid + '/events').on('value', (snapshot) => {
        const adminContainers = ['list-miitti-future','list-miitti-past','list-cito-future','list-cito-past','list-cce-future','list-cce-past'];
        const userContainers = [
            'user-list-miitti-future','user-list-miitti-past',
            'user-list-cito-future','user-list-cito-past',
            'user-list-cce-future','user-list-cce-past'
        ];
        
        adminContainers.concat(userContainers).forEach(id => {
            const el = document.getElementById(id); if(el) el.innerHTML = "";
        });
        
        const noticeAdmin = document.getElementById('today-notice-admin');
        const noticeUser = document.getElementById('today-notice-user');
        if(noticeAdmin) noticeAdmin.innerHTML = "";
        if(noticeUser) noticeUser.innerHTML = "";

        const events = [];
        snapshot.forEach(child => { events.push({key: child.key, ...child.val()}); });
        
        // 1. LAJITTELLAAN VANHIN -> UUSIN (Järjestysnumerointia varten)
        events.sort((a,b) => new Date(a.date || 0) - new Date(b.date || 0));
        
        // 2. LASKETAAN JÄRJESTYSNUMEROT TYYPITTÄIN
        const counts = { miitti: 0, cito: 0, cce: 0 };
        events.forEach(e => {
            const type = (e.type || 'miitti').toLowerCase();
            if (counts[type] !== undefined) {
                counts[type]++;
                e.seqNumber = counts[type]; // Tallennetaan numero objektiin
            }
        });

        // Tallennetaan globaali lista (tässä aikajärjestyksessä Vanhin -> Uusin)
        globalEventList = events;

        if(eventStatsEl) eventStatsEl.innerText = `Löytyi ${events.length} tapahtumaa.`;

        // 3. EROTELLAAN TULEVAT JA MENNEET + JÄRJESTETÄÄN NÄKYMÄT
        
        // Tulevat: Tänään tai tulevaisuudessa -> NOUSEVA järjestys (Tänään, Huomenna...)
        const futureEvents = events.filter(e => e.date >= todayStr);
        
        // Menneet: Ennen tätä päivää -> LASKEVA järjestys (Eilinen, Viime vuonna...)
        const pastEvents = events.filter(e => e.date < todayStr).reverse();

        // Yhdistetään renderöintijonoon
        const displayQueue = [...futureEvents, ...pastEvents];

        displayQueue.forEach(evt => {
            const isToday = (evt.date === todayStr);
            const isArchived = (evt.isArchived === true);
            const hasPreSignMessage = typeof evt.preSignMessage === 'string' && evt.preSignMessage.trim().length > 0;
            const hasSpecialMessage = typeof evt.specialMessage === 'string' && evt.specialMessage.trim().length > 0;
            const countId = `count-${isAdminMode ? 'adm' : 'usr'}-${evt.key}`;
            
            // Muotoillaan nimi numeron kanssa
            const displayName = `#${evt.seqNumber || '?'} ${evt.name}`;
            
            const div = document.createElement('div');
            div.className = "card" + (isArchived ? " archived" : "") + (isToday ? " today-highlight" : "");
            
            if (isAdminMode) {
                // LISTAKORTTI (Admin)
                const archiveBtn = isArchived 
                    ? `<button class="btn btn-blue btn-small" onclick="toggleArchive('${evt.key}', false)">♻️ Palauta</button>`
                    : `<button class="btn btn-red btn-small" onclick="toggleArchive('${evt.key}', true)">📦 Arkistoi</button>`;

                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between;"><strong>${displayName}</strong><span>${evt.date}</span></div>
                    <div style="font-size:0.8em; color:#666; margin-bottom:5px;">🕓 ${evt.time || '-'}</div>
                    ${(hasPreSignMessage || hasSpecialMessage)
                        ? `<div style="margin:2px 0 6px 0; display:flex; gap:6px; flex-wrap:wrap;">
                            ${hasPreSignMessage ? '<span style="font-size:0.75em; color:#8B4513; font-weight:bold; background:#fff7e6; border:1px solid #d8b48a; border-radius:999px; padding:2px 8px;">📝 Viesti ennen kirjausta</span>' : ''}
                            ${hasSpecialMessage ? '<span style="font-size:0.75em; color:#8B4513; font-weight:bold; background:#fff7e6; border:1px solid #d8b48a; border-radius:999px; padding:2px 8px;">🎁 Viesti kirjauksen jälkeen</span>' : ''}
                        </div>`
                        : ''}
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
                
                // TÄNÄÄN TAPAHTUU -HERO KORTTI (Ylhäällä)
                if (isToday && noticeAdmin) {
                    const hero = document.createElement('div');
                    hero.className = "card today-highlight";
                    hero.style.textAlign = "center";
                    hero.style.padding = "20px";
                    hero.style.border = "4px solid #D2691E"; // Vahvempi reunus
                    hero.style.backgroundColor = "#FFF8DC";  // Hieman erottuva tausta

                    hero.innerHTML = `
                        <h2 style="color:#D2691E; margin:0 0 10px 0; text-transform:uppercase; letter-spacing:1px;">🌟 Tänään tapahtuu! 🌟</h2>
                        <h3 style="margin:5px 0; font-size:1.4em;">${displayName}</h3>
                        <p style="font-size:1.2em; color:#555; margin:5px 0 15px 0;">⏰ klo ${evt.time || '??:??'}</p>
                        <button class="btn btn-green" style="font-size:1.3em; padding:15px; width:100%; font-weight:bold; box-shadow: 0 4px 6px rgba(0,0,0,0.2);" onclick="openGuestbook('${evt.key}')">
                            📖 AVAA MIITTIKIRJA NYT
                        </button>
                    `;
                    noticeAdmin.appendChild(hero);
                }

                // Lisätään myös normaaliin listaan
                const target = document.getElementById(evt.date >= todayStr ? `list-${evt.type}-future` : `list-${evt.type}-past`);
                if (target) target.appendChild(div);

            } else {
                // USER MODE (Katselija)
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between;"><strong>${displayName}</strong><span>${evt.date}</span></div>
                    <div style="font-size:0.8em; color:#666; margin-bottom:5px;">🕓 ${evt.time || '-'} • ${evt.location || ''}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                         <span id="${countId}" style="font-weight:bold; font-size:0.9em;">👤 0 osallistujaa</span>
                         <button class="btn btn-green btn-small" style="width:auto;" onclick="openGuestbook('${evt.key}')">📖 Avaa miittikirja</button>
                    </div>`;
                
                if (isToday && noticeUser) {
                    const heroUser = div.cloneNode(true);
                    heroUser.style.border = "4px solid #4caf50";
                    heroUser.prepend(document.createRange().createContextualFragment('<h3 style="color:#4caf50; margin-top:0; text-align:center;">🌟 TÄNÄÄN!</h3>'));
                    noticeUser.appendChild(heroUser);
                }
                const target = document.getElementById(evt.date >= todayStr ? `user-list-${evt.type}-future` : `user-list-${evt.type}-past`);
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
    
    // NOLLATAAN LIVE-LASKURI
    lastAttendeeCount = null;
    
    db.ref('miitit/' + currentUser.uid + '/events/' + eventKey).on('value', snap => {
        const evt = snap.val(); if(!evt) return;
        currentEventArchived = (evt.isArchived === true);
        
        // PÄIVITETÄÄN GLOBAALI MUUTTUJA NAPPIA VARTEN
        currentEventGcCode = evt.gc;

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

// UUSI: Tarkista nettilogi -toiminto
window.checkNetLog = function() {
    if (currentEventGcCode && currentEventGcCode.startsWith('GC')) {
        window.open("https://coord.info/" + currentEventGcCode, "_blank");
    } else {
        alert("Ei validia GC-koodia.");
    }
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
    // Tässä käytetään aina kirjautunutta käyttäjää logien lataukseen
    if (!currentUser) return;
    
    db.ref('miitit/' + currentUser.uid + '/logs/' + eventKey).on('value', (snapshot) => {
        const listEl = document.getElementById('attendee-list'); if(!listEl) return;
        listEl.innerHTML = ""; const logs = [];
        snapshot.forEach(child => { logs.push({key: child.key, ...child.val()}); });
        
        // Lajittelu: Uusin ensin
        logs.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        // --- 1. LISÄTÄÄN JÄRJESTÄJÄ VISUAALISESTI LISTAN ALKUUN ---
        const hostRow = document.createElement('div');
        hostRow.className = "log-item";
        hostRow.style.backgroundColor = "rgba(255, 140, 0, 0.05)"; // Haalea oranssi tausta
        hostRow.innerHTML = `
            <div>
                <strong style="color:var(--primary-color);">Mikkokalevi</strong> 
                <span style="font-size:0.8em; background:var(--primary-color); color:#fff; border-radius:4px; padding:2px 6px; margin-left:5px; vertical-align:middle;">Järjestäjä</span>
                <div style="font-style:italic; color:#888; font-size:0.9em;">(Paikalla aina)</div>
            </div>
        `;
        listEl.appendChild(hostRow);
        // -----------------------------------------------------------

        logs.forEach(log => {
            const row = document.createElement('div'); row.className = "log-item";
            let btns = (isAdminMode && !currentEventArchived && currentUser) ? `
                <div class="log-actions">
                    <button class="btn-blue btn-small" onclick="openLogEditModal('${log.key}')">✏️</button>
                    <button class="btn-red btn-small" onclick="deleteLog('${log.key}')">🗑</button>
                </div>` : "";
            row.innerHTML = `<div><strong style="color:#4caf50;">${log.nickname}</strong><span>${log.from ? ' / ' + log.from : ''}</span><div style="font-style:italic; color:#888; font-size:0.9em;">${log.message || ''}</div></div>${btns}`;
            listEl.appendChild(row);
        });
        
        const countEl = document.getElementById('attendee-count');
        if(countEl) {
            const currentCount = logs.length;
            countEl.innerText = currentCount;
            
            // --- LIVE ANIMAATIO LOGIIKKA ---
            // Jos luku on olemassa ja se on SUUREMPI kuin viimeksi muistissa ollut
            if (lastAttendeeCount !== null && currentCount > lastAttendeeCount) {
                // Väläytetään vihreänä ja suurennetaan hetkeksi
                countEl.style.transition = "transform 0.2s, background-color 0.5s";
                countEl.style.backgroundColor = "#00FF00"; // Kirkas vihreä
                countEl.style.transform = "scale(1.6)";
                
                // Palautetaan normaaliksi pienen viiveen jälkeen
                setTimeout(() => {
                    countEl.style.backgroundColor = "#8B4513"; // Alkuperäinen ruskea
                    countEl.style.transform = "scale(1.0)";
                }, 1500);
            }
            
            // Päivitetään muistijälki
            lastAttendeeCount = currentCount;
        }
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
        document.getElementById('edit-presign-message').value = e.preSignMessage || "";
        document.getElementById('edit-special-message').value = e.specialMessage || "";
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
            preSignMessage: document.getElementById('edit-presign-message').value,
            specialMessage: document.getElementById('edit-special-message').value,
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
        const data = parseGPX(text); // Parsitaan tiedosto heti alussa

        // --- 1. TARKISTETAAN GC-KOODI (TURVALLISUUS) ---
        const fileGC = (data.gc || "").trim().toUpperCase();
        const eventGC = (currentEventGcCode || "").trim().toUpperCase();

        // Jos miitillä on GC-koodi (yli 2 merkkiä), vaaditaan täsmäys
        if (eventGC.length > 2) {
            if (!fileGC) {
                alert("⛔ VIRHE: GPX-tiedostosta ei löytynyt GC-koodia.");
                if(loadingOverlay) loadingOverlay.style.display = 'none';
                fileInputSync.value = "";
                return;
            }
            if (fileGC !== eventGC) {
                alert(`⛔ VIRHE: GPX-tiedoston koodi (${fileGC}) ei vastaa tätä miittiä (${eventGC})!\n\nTuonti keskeytetty tietojen suojaamiseksi.`);
                if(loadingOverlay) loadingOverlay.style.display = 'none';
                fileInputSync.value = "";
                return;
            }
        } else {
            // Jos miitillä EI ole vielä koodia, kysytään lupa
            if (!confirm(`Tällä miitillä ei ole vielä GC-koodia.\nGPX-tiedoston koodi on: ${fileGC}\n\nHaluatko varmasti tuoda tiedot tähän?`)) {
                if(loadingOverlay) loadingOverlay.style.display = 'none';
                fileInputSync.value = "";
                return;
            }
        }

        // --- 2. JOS TARKISTUS MENI LÄPI, JATKETAAN ---
        if (data) {
            db.ref('miitit/' + currentUser.uid + '/events/' + currentEventId).update({ attributes: data.attributes, coords: data.coords });
        }
        
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        const logs = xml.getElementsByTagName("groundspeak:log");
        const totalLogsInFile = logs.length;
        
        if (logs.length > 0) {
            // Haetaan ensin olemassa olevat MAP-rakenteeseen
            const snap = await db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).once('value');
            const existingLogsMap = new Map();
            
            snap.forEach(child => {
                const val = child.val();
                if (val.nickname) {
                    existingLogsMap.set(val.nickname.trim().toLowerCase(), {
                        key: child.key,
                        message: val.message || ""
                    });
                }
            });

            let addedCount = 0;
            let updatedCount = 0;
            let attendedLikeCount = 0;
            let skippedNonAttendedCount = 0;
            let skippedEmptyFinderCount = 0;
            let skippedOwnerCount = 0;

            for (let i = 0; i < logs.length; i++) {
                const logNode = logs[i];
                const typeNode = logNode.getElementsByTagName("groundspeak:type")[0];
                const type = typeNode ? typeNode.textContent : "";

                // Vain Attended-lokit (ja webcam photo)
                if (type !== "Attended" && type !== "Webcam Photo Taken") {
                    skippedNonAttendedCount++;
                    continue;
                }
                attendedLikeCount++;

                const finderNode = logNode.getElementsByTagName("groundspeak:finder")[0];
                const finder = finderNode ? finderNode.textContent.trim() : "";
                
                if (!finder) {
                    skippedEmptyFinderCount++;
                    continue;
                } // Ei tyhjiä nimiä
                if (finder.toLowerCase() === "mikkokalevi") {
                    skippedOwnerCount++;
                    continue;
                } // Ei omistajaa

                const textNode = logNode.getElementsByTagName("groundspeak:text")[0];
                const netMessageRaw = textNode ? textNode.textContent.trim() : "";
                const netMessageFormatted = "🌐: " + netMessageRaw; // Lisätään AINA pallo nettilogiin
                const finderLower = finder.toLowerCase();

                if (existingLogsMap.has(finderLower)) {
                    // TAPAUS 1: KÄYTTÄJÄ LÖYTYY JO
                    const existing = existingLogsMap.get(finderLower);
                    
                    // Tarkistetaan, onko nettilogi jo viestissä (ettei tule tuplana)
                    if (netMessageRaw && !existing.message.includes(netMessageRaw)) {
                        // YHDISTETÄÄN viestit: "Vanha | 🌐: Uusi"
                        // Jos vanha viesti on tyhjä, käytetään suoraan "🌐: Uusi"
                        const combinedMessage = existing.message 
                            ? `${existing.message} | ${netMessageFormatted}`
                            : netMessageFormatted;
                        
                        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId + '/' + existing.key).update({
                            message: combinedMessage
                        });
                        updatedCount++;
                    }
                } else {
                    // TAPAUS 2: UUSI KÄYTTÄJÄ
                    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({
                        nickname: finder,
                        from: "", // Emme arvaa paikkakuntaa
                        message: netMessageFormatted, // Tässä on jo pallo alussa
                        timestamp: firebase.database.ServerValue.TIMESTAMP
                    });
                    // Lisätään mappiin jotta saman gpx:n sisäiset tuplat eivät haittaa
                    existingLogsMap.set(finderLower, { key: "temp", message: netMessageFormatted });
                    addedCount++;
                }
            }

            const lowLogWarning = totalLogsInFile <= 10
                ? `\n\n⚠ HUOM: Tiedostossa oli vain ${totalLogsInFile} lokia.\nJos geocaching.com antaa rajatun GPX:n, kaikki osallistujat eivät näy tässä synkronoinnissa.`
                : "";
            
            alert(`GPX-synkronointi valmis!\n\n- Kätkön tiedot päivitetty.\n- Tiedoston lokit yhteensä: ${totalLogsInFile}\n- Attended/Webcam-lokit tiedostossa: ${attendedLikeCount}\n- Ohitettu (ei Attended/Webcam): ${skippedNonAttendedCount}\n- Ohitettu (tyhjä nimimerkki): ${skippedEmptyFinderCount}\n- Ohitettu (järjestäjä): ${skippedOwnerCount}\n- Lisätty ${addedCount} uutta kävijää.\n- Päivitetty viesti ${updatedCount} olemassa olevalle kävijälle.${lowLogWarning}`);
        } else {
            alert("Kätkön tiedot päivitetty GPX-tiedostosta!\n\n- Tiedoston lokit yhteensä: 0\n(Tiedostossa ei ollut lokimerkintöjä tai lukeminen epäonnistui).");
        }

        if(loadingOverlay) loadingOverlay.style.display = 'none';
        
        // Nollataan input jotta saman tiedoston voi valita uudelleen tarvittaessa
        fileInputSync.value = "";
    };
}

window.openMassImport = function() {
    const input = document.getElementById('mass-input');
    const output = document.getElementById('mass-output');
    parsedMassEntries = [];
    setMassDebugText('');
    if(input) input.value = ""; if(output) output.value = ""; 
    document.getElementById('mass-step-1').style.display = 'block'; 
    document.getElementById('mass-step-2').style.display = 'none';
    if(massModal) massModal.style.display = "block";
};

const btnParseMass = document.getElementById('btn-parse-mass');
let parsedMassEntries = [];

function buildMassDebugSummary(entries, sourceLabel = "") {
    const total = entries.length;
    const withMessage = entries.filter(e => (e.message || '').trim().length > 0).length;
    const withoutMessage = total - withMessage;
    const preview = entries.slice(0, 5).map(e => `- ${e.nickname}${e.message ? ': ' + e.message.slice(0, 80) : ''}`).join('\n');
    return [
        sourceLabel ? `Lähde: ${sourceLabel}` : '',
        `Rivejä löydetty: ${total}`,
        `Rivejä viestillä: ${withMessage}`,
        `Rivejä ilman viestiä: ${withoutMessage}`,
        preview ? `\nEsikatselu:\n${preview}` : ''
    ].filter(Boolean).join('\n');
}

function setMassDebugText(text) {
    const debugEl = document.getElementById('mass-debug');
    if (debugEl) debugEl.textContent = text;
}

function upsertNetMessage(existingMessage, rawMessage) {
    const existing = (existingMessage || '').trim();
    const cleanRaw = (rawMessage || '').trim();

    if (!cleanRaw) {
        return { nextMessage: existing, changed: false };
    }

    const netPart = `🌐: ${cleanRaw}`;
    const parts = existing
        ? existing.split(' | ').map(p => p.trim()).filter(Boolean)
        : [];

    // Poistetaan kaikki aiemmat 🌐-osat ja lisätään vain viimeisin -> ei duplikaatteja
    const nonNetParts = parts.filter(p => !p.startsWith('🌐:'));
    const nextMessage = nonNetParts.length > 0
        ? `${nonNetParts.join(' | ')} | ${netPart}`
        : netPart;

    return {
        nextMessage,
        changed: nextMessage !== existing
    };
}

function parseMassEntriesFromClipboard(rawText) {
    const lines = rawText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const memberLineRegex = /^(Premium\s+Member|Member|Reviewer)$/i;
    const attendedLineRegex = /^(Osallistui|Attended)\b/i;
    const dateLineRegex = /^(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2})$/;
    const endLineRegex = /^(Hieno\s+kertomus|Hyödyllinen|Found\s+this\s+log\s+useful|Näytä\s+loki|View\s+Log)\b/i;

    const memberIndexes = [];
    for (let i = 0; i < lines.length; i++) {
        if (memberLineRegex.test(lines[i])) memberIndexes.push(i);
    }

    const entries = [];

    for (let m = 0; m < memberIndexes.length; m++) {
        const memberIdx = memberIndexes[m];

        // Nimimerkki on yleensä jäsenyysrivin yläpuolella
        let nickname = "";
        for (let p = memberIdx - 1; p >= 0; p--) {
            if (lines[p].length > 0) {
                nickname = lines[p];
                break;
            }
        }
        if (!nickname) continue;

        const nextMemberIdx = (m + 1 < memberIndexes.length) ? memberIndexes[m + 1] : lines.length;
        const segment = lines.slice(memberIdx + 1, nextMemberIdx);
        if (segment.length === 0) continue;

        const attendedIdx = segment.findIndex(line => attendedLineRegex.test(line));
        if (attendedIdx === -1) continue;

        let msgStart = attendedIdx + 1;
        if (msgStart < segment.length && dateLineRegex.test(segment[msgStart])) {
            msgStart++;
        }

        const messageLines = [];
        for (let s = msgStart; s < segment.length; s++) {
            const line = segment[s];
            if (endLineRegex.test(line)) break;
            messageLines.push(line);
        }

        const message = messageLines.join(' ').replace(/\s+/g, ' ').trim();
        entries.push({ nickname, message });
    }

    // Dedup: pidetään viimeisin osuma samalla nimimerkillä
    const byNick = new Map();
    entries.forEach(entry => {
        const key = entry.nickname.trim().toLowerCase();
        if (!key) return;
        byNick.set(key, entry);
    });

    return Array.from(byNick.values());
}

function parseMassEntriesFromOutput(rawText) {
    return rawText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            const tabIndex = line.indexOf('\t');
            if (tabIndex === -1) {
                return { nickname: line, message: "" };
            }
            const nickname = line.slice(0, tabIndex).trim();
            const message = line.slice(tabIndex + 1).trim();
            return { nickname, message };
        })
        .filter(entry => entry.nickname.length > 0);
}

if (btnParseMass) {
    btnParseMass.onclick = function() {
        const text = document.getElementById('mass-input').value; if(!text) return;
        parsedMassEntries = parseMassEntriesFromClipboard(text);
        if (parsedMassEntries.length === 0) return alert("Nimiä/lokeja ei löytynyt!\nVarmista että liitit lokilistaa geocaching.com-sivulta.");

        const outputRows = parsedMassEntries.map(entry => {
            // Muoto: nimimerkki<TAB>viesti (viesti voi olla tyhjä)
            return entry.message ? `${entry.nickname}\t${entry.message}` : entry.nickname;
        });
        document.getElementById('mass-output').value = outputRows.join('\n');
        setMassDebugText(buildMassDebugSummary(parsedMassEntries, "Clipboard-parseri"));
        document.getElementById('mass-step-1').style.display = 'none'; 
        document.getElementById('mass-step-2').style.display = 'block';
    };
}

const btnSaveMass = document.getElementById('btn-save-mass');
if(btnSaveMass) {
    btnSaveMass.onclick = async function() {
        if (!currentUser || !currentEventId) return;

        const outputText = document.getElementById('mass-output').value;
        let entries = parseMassEntriesFromOutput(outputText);
        if (entries.length === 0 && parsedMassEntries.length > 0) {
            entries = parsedMassEntries;
        }
        if (entries.length === 0) return alert("Ei tallennettavaa dataa.");

        setMassDebugText(buildMassDebugSummary(entries, "Tallennettava data"));

        const logsRef = db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId);
        const snap = await logsRef.once('value');
        const existingLogsMap = new Map();

        snap.forEach(child => {
            const val = child.val() || {};
            const nick = (val.nickname || '').trim();
            if (!nick) return;
            existingLogsMap.set(nick.toLowerCase(), {
                key: child.key,
                message: val.message || ''
            });
        });

        let addedCount = 0;
        let updatedCount = 0;
        let unchangedCount = 0;

        for (const entry of entries) {
            const nickname = (entry.nickname || '').trim();
            const rawMessage = (entry.message || '').trim();
            if (!nickname) continue;

            const normalizedNick = nickname.toLowerCase();

            if (existingLogsMap.has(normalizedNick)) {
                const existing = existingLogsMap.get(normalizedNick);
                const existingMessage = existing.message || '';

                // Idempotentti: .com-viesti korvataan/ylläpidetään yhtenä 🌐-osana (ei tuplia)
                const netUpdate = upsertNetMessage(existingMessage, rawMessage);
                if (netUpdate.changed) {
                    await logsRef.child(existing.key).update({ message: netUpdate.nextMessage });
                    existingLogsMap.set(normalizedNick, { key: existing.key, message: netUpdate.nextMessage });
                    updatedCount++;
                } else {
                    unchangedCount++;
                }
            } else {
                const importedMessage = rawMessage ? `🌐: ${rawMessage}` : '(Massa)';
                await logsRef.push({
                    nickname,
                    from: "",
                    message: importedMessage,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                existingLogsMap.set(normalizedNick, { key: 'temp', message: importedMessage });
                addedCount++;
            }
        }

        alert(`Massatuonti valmis!\n\n- Lisätty uusia: ${addedCount}\n- Päivitetty olemassa olevia: ${updatedCount}\n- Ei muutosta: ${unchangedCount}`);
        if(massModal) massModal.style.display = "none";
    };
}

window.resetMassModal = function() { 
    setMassDebugText('');
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

const btnCalendar = document.getElementById('btn-show-calendar');
if(btnCalendar) btnCalendar.onclick = openStats; // Avaa tilastot, jossa on kalenteri-tab

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

// ==========================================
// 13. CONFETTI EFFECT (CSS GPU Optimized)
// ==========================================
window.triggerConfetti = function(amount, durationSec, type = 'normal') {
    // Luodaan hiutaleita "amount" kappaletta, mutta ei kaikkia kerralla, 
    // vaan ripotellaan niitä durationSec-ajan kuluessa.
    const interval = (durationSec * 1000) / amount;
    
    let count = 0;
    const rain = setInterval(() => {
        createParticle(type);
        count++;
        if (count >= amount) clearInterval(rain);
    }, interval);
};

// Uusi funktio erikoistehosteille
window.triggerSpecialEffect = function(effectName, amount = 100, duration = 2) {
    switch(effectName) {
        case 'matrix':
            triggerMatrixRain(amount, duration);
            break;
        case 'hearts':
            triggerConfetti(amount, duration, 'hearts');
            break;
        case 'stars':
            triggerConfetti(amount, duration, 'stars');
            break;
        case 'snow':
            triggerConfetti(amount, duration, 'snow');
            break;
        case 'fireworks':
            triggerFireworks(amount, duration);
            break;
        case 'coins':
            triggerConfetti(amount, duration, 'coins');
            break;
        default:
            triggerConfetti(amount, duration, 'normal');
    }
};

function createParticle(type = 'normal') {
    const p = document.createElement('div');
    p.classList.add('confetti-particle');
    
    // Satunnainen sijainti
    p.style.left = Math.random() * 100 + 'vw';
    
    // Tyypin mukaan värit ja muodot
    switch(type) {
        case 'hearts':
            p.style.backgroundColor = '#e91e63';
            p.style.borderRadius = '0 0 50% 50%';
            p.style.transform = 'rotate(-45deg)';
            break;
        case 'stars':
            p.style.backgroundColor = '#FFD700';
            p.style.borderRadius = '0';
            p.innerHTML = '⭐';
            p.style.fontSize = '16px';
            p.style.color = '#FFD700';
            p.style.backgroundColor = 'transparent';
            break;
        case 'snow':
            p.style.backgroundColor = '#ffffff';
            p.style.borderRadius = '50%';
            p.style.opacity = '0.8';
            break;
        case 'coins':
            p.style.backgroundColor = '#FFD700';
            p.style.borderRadius = '50%';
            p.style.border = '2px solid #FFA500';
            p.innerHTML = '€';
            p.style.fontSize = '12px';
            p.style.color = '#8B4513';
            p.style.backgroundColor = '#FFD700';
            break;
        default: // normal
            const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];
            p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            p.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    }
    
    // Satunnainen koko (5px - 12px)
    if (type !== 'stars') {
        const size = Math.random() * 7 + 5 + 'px';
        p.style.width = size;
        p.style.height = size;
    }
    
    // Satunnainen putoamisnopeus (CSS animation duration) 2s - 5s
    const fallDuration = Math.random() * 3 + 2 + 's';
    p.style.animationDuration = fallDuration;
    
    document.body.appendChild(p);
    
    // Siivous: Poistetaan elementti kun animaatio on varmasti ohi (6s varoaika)
    setTimeout(() => {
        if (p && p.parentNode) p.parentNode.removeChild(p);
    }, 6000);
}

// Matrix-sade efekti
function triggerMatrixRain(amount, duration) {
    const matrixChars = ['0', '1', 'メ', 'カ', 'ナ', 'タ', 'ム', 'コ', 'ト', 'ミ', 'ッ', 'キ'];
    
    for (let i = 0; i < amount; i++) {
        setTimeout(() => {
            const char = document.createElement('div');
            char.style.position = 'fixed';
            char.style.top = '-20px';
            char.style.left = Math.random() * 100 + 'vw';
            char.style.color = '#00ff00';
            char.style.fontSize = '20px';
            char.style.fontFamily = 'monospace';
            char.style.zIndex = '9999';
            char.style.pointerEvents = 'none';
            char.style.animation = 'matrix-fall linear forwards';
            char.style.animationDuration = (Math.random() * 2 + 1) + 's';
            char.textContent = matrixChars[Math.floor(Math.random() * matrixChars.length)];
            
            document.body.appendChild(char);
            
            setTimeout(() => {
                if (char && char.parentNode) char.parentNode.removeChild(char);
            }, 3000);
        }, (duration * 1000 / amount) * i);
    }
}

// Ilotulitus efekti
function triggerFireworks(amount, duration) {
    for (let i = 0; i < amount; i++) {
        setTimeout(() => {
            const x = Math.random() * 80 + 10; // 10-90% leveydestä
            const y = Math.random() * 30 + 20; // 20-50% korkeudesta
            
            createFireworkExplosion(x, y);
        }, (duration * 1000 / amount) * i);
    }
}

function createFireworkExplosion(x, y) {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
    const particles = 20;
    
    for (let i = 0; i < particles; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = x + '%';
        particle.style.top = y + '%';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.borderRadius = '50%';
        particle.style.zIndex = '9999';
        particle.style.pointerEvents = 'none';
        
        const angle = (Math.PI * 2 * i) / particles;
        const velocity = Math.random() * 100 + 50;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        particle.style.animation = 'firework-burst 1s ease-out forwards';
        particle.style.setProperty('--vx', vx + 'px');
        particle.style.setProperty('--vy', vy + 'px');
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            if (particle && particle.parentNode) particle.parentNode.removeChild(particle);
        }, 1000);
    }
}
