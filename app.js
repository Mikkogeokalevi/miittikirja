// ==========================================
// 1. ASETUKSET
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
let globalEventList = []; // Kaikki tapahtumat navigointia varten

// UI Elementit
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const guestbookView = document.getElementById('guestbook-view');
const editModal = document.getElementById('edit-modal');
const massModal = document.getElementById('mass-modal');
const logEditModal = document.getElementById('log-edit-modal');
const userDisplay = document.getElementById('user-display');
const eventStatsEl = document.getElementById('event-stats');

let touchStartX = 0;
let touchEndX = 0;

// ==========================================
// 2. KIRJAUTUMINEN & SWIPE LOGIIKKA
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

// Pyyhkäisytoiminnallisuus
guestbookView.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

guestbookView.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    if (touchEndX < touchStartX - 50) {
        navigateEvent(-1); // Seuraava (vasemmalle)
    }
    if (touchEndX > touchStartX + 50) {
        navigateEvent(1);  // Edellinen (oikealle)
    }
}

document.getElementById('btn-login-google').addEventListener('click', () => {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => alert(e.message));
});
document.getElementById('btn-email-login').addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    auth.signInWithEmailAndPassword(email, pass).catch(e => alert(e.message));
});
document.getElementById('btn-email-register').addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    auth.createUserWithEmailAndPassword(email, pass).catch(e => alert(e.message));
});
document.getElementById('btn-logout').addEventListener('click', () => { 
    if(confirm("Ulos?")) auth.signOut().then(() => location.reload()); 
});

function showLoginView() { loginView.style.display = 'flex'; adminView.style.display = 'none'; guestbookView.style.display = 'none'; }
function showAdminView() {
    if (!currentUser) { showLoginView(); return; }
    loginView.style.display = 'none'; adminView.style.display = 'block'; guestbookView.style.display = 'none';
    if(currentEventId) { db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).off(); currentEventId = null; }
}
window.showAdminView = showAdminView;

// ==========================================
// 3. MIITTIEN LISTAUS & NAVIGOINTI
// ==========================================

document.getElementById('btn-find-today').addEventListener('click', () => {
    const today = new Date().toISOString().split('T')[0]; 
    const todayEvent = globalEventList.find(e => e.date === today);
    if (todayEvent) {
        openGuestbook(todayEvent.key);
    } else {
        alert("Ei miittejä tälle päivälle (" + new Date().toLocaleDateString('fi-FI') + ")");
    }
});

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

document.getElementById('new-event-toggle').addEventListener('click', () => {
    const formDiv = document.getElementById('new-event-form');
    if (formDiv.style.display === 'none') {
        formDiv.style.display = 'block';
    } else {
        formDiv.style.display = 'none';
    }
});

// Automaattinen tekstin poiminta uuden miitin lomakkeelle
document.getElementById('btn-process-import').addEventListener('click', () => {
    const text = document.getElementById('import-text').value;
    if (!text) return;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length > 0) {
        const firstLine = lines[0];
        const ignorePrefixes = ["Tapahtuman tekijä", "Tapahtumapäivä", "Alkamisaika", "Loppumisaika", "Vaikeustaso", "Maasto", "Koko", "Maa:", "N ", "E ", "UTM"];
        const isMetadata = ignorePrefixes.some(prefix => firstLine.startsWith(prefix));
        if (!isMetadata) {
            document.getElementById('new-name').value = firstLine;
        }
    }

    const dateMatch = text.match(/Tapahtumapäivä:\s*(\d{1,2}\.\d{1,2}\.\d{4})/);
    if (dateMatch) {
        const parts = dateMatch[1].split('.');
        if(parts.length === 3) {
            const yyyy = parts[2];
            const mm = parts[1].padStart(2, '0');
            const dd = parts[0].padStart(2, '0');
            document.getElementById('new-date').value = `${yyyy}-${mm}-${dd}`;
        }
    }

    const startMatch = text.match(/Alkamisaika:\s*(\d{1,2}[:\.]\d{2})/);
    const endMatch = text.match(/Loppumisaika:\s*(\d{1,2}[:\.]\d{2})/);
    if (startMatch) {
        let start = startMatch[1].replace('.', ':');
        if(start.indexOf(':') === 1) start = '0' + start;
        let end = "";
        if (endMatch) {
            end = endMatch[1].replace('.', ':');
            if(end.indexOf(':') === 1) end = '0' + end;
        }
        document.getElementById('new-time').value = end ? `${start} - ${end}` : start;
    }

    const coordMatch = text.match(/([NS]\s*\d+°\s*[\d\.]+\s*[EW]\s*\d+°\s*[\d\.]+)/);
    if (coordMatch) {
        document.getElementById('new-coords').value = coordMatch[1].trim();
    }

    const gcMatch = text.match(/(GC[A-Z0-9]+)/);
    if (gcMatch) {
        document.getElementById('new-gc').value = gcMatch[1];
    }
    alert("Tiedot haettu tekstistä!");
});

document.getElementById('btn-add-event').addEventListener('click', () => {
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
    if(!data.gc || !data.name || !data.date) { alert("Täytä GC, Nimi ja Pvm!"); return; }
    db.ref('miitit/' + currentUser.uid + '/events').push(data).then(() => {
        alert("Tallennettu!");
        ['new-gc','new-name','new-time','new-coords','new-loc', 'new-desc', 'import-text'].forEach(id => document.getElementById(id).value = "");
        document.getElementById('new-event-form').style.display = 'none';
    });
});

function loadEvents() {
    if (!currentUser) return;
    
    const lists = {
        miitti: { past: document.getElementById('list-miitti-past'), future: document.getElementById('list-miitti-future') },
        cito: { past: document.getElementById('list-cito-past'), future: document.getElementById('list-cito-future') },
        cce: { past: document.getElementById('list-cce-past'), future: document.getElementById('list-cce-future') }
    };

    db.ref('miitit/' + currentUser.uid + '/events').on('value', (snapshot) => {
        Object.values(lists).forEach(l => { l.past.innerHTML = ""; l.future.innerHTML = ""; });
        
        const events = [];
        snapshot.forEach(child => { events.push({key: child.key, ...child.val()}); });
        
        events.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
        globalEventList = events;
        
        if(eventStatsEl) eventStatsEl.innerText = `Löytyi ${events.length} tapahtumaa.`;

        const today = new Date().toISOString().split('T')[0];

        events.forEach(evt => {
            const div = document.createElement('div');
            const isArchived = evt.isArchived === true;
            div.className = "card" + (isArchived ? " archived" : "");
            
            let dateStr = evt.date;
            try { dateStr = new Date(evt.date).toLocaleDateString('fi-FI'); } catch(e){}
            
            let icon = "📍";
            if(evt.type === 'cito') icon = "🗑️";
            if(evt.type === 'cce') icon = "🎉";
            if(isArchived) icon = "🔒 " + icon;

            const gcLink = `<a href="https://coord.info/${evt.gc}" target="_blank" style="font-weight:bold; color:#A0522D; text-decoration:none;">${evt.gc}</a>`;
            const countId = `count-${evt.key}`;

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <strong>${icon} ${evt.name}</strong>
                    <span>${dateStr}</span>
                </div>
                <div style="font-size:0.8em; color:#666; margin-bottom:5px;">🕓 ${evt.time || '-'}</div>
                <div style="font-size:0.9em; color:#A0522D; display:flex; justify-content:space-between;">
                    <span>${gcLink} ${evt.location ? '• ' + evt.location : ''}</span>
                    <span id="${countId}" style="font-weight:bold; color:#333;">👤 0</span>
                </div>
                <div style="margin-top:10px; display:flex; gap:5px;">
                    <button class="btn btn-green btn-small" onclick="openGuestbook('${evt.key}')">📖 Avaa</button>
                    <button class="btn btn-blue btn-small" onclick="openEditModal('${evt.key}')">✏️</button>
                    <button class="btn ${isArchived ? 'btn-blue' : 'btn-gray'} btn-small" onclick="toggleArchiveEvent('${evt.key}', ${!isArchived})">${isArchived ? '♻️ Palauta' : '📁 Arkistoi'}</button>
                    <button class="btn btn-red btn-small" onclick="deleteEvent('${evt.key}')">🗑</button>
                </div>
            `;
            
            db.ref('miitit/' + currentUser.uid + '/logs/' + evt.key).once('value').then((snap) => {
                const num = snap.numChildren();
                const el = document.getElementById(countId);
                if (el) el.innerText = "👤 " + num;
            });
            
            const targetList = (evt.date >= today) ? lists[evt.type].future : lists[evt.type].past;
            if (targetList) targetList.appendChild(div);
        });
        
        ['miitti', 'cito', 'cce'].forEach(type => {
            const fList = lists[type].future;
            if(fList.children.length > 1) {
                const p = fList.querySelector('p');
                if(p) p.remove();
            }
        });
    });
}

// ==========================================
// 4. MIITTIKIRJA (GUESTBOOK)
// ==========================================
window.toggleArchiveEvent = (key, newState) => {
    const msg = newState ? "Haluatko arkistoida miitin?" : "Palautetaanko miitti aktiiviseksi?";
    if(confirm(msg)) {
        db.ref('miitit/' + currentUser.uid + '/events/' + key).update({ isArchived: newState });
    }
};

window.openGuestbook = (eventKey) => {
    currentEventId = eventKey;
    db.ref('miitit/' + currentUser.uid + '/events/' + eventKey).on('value', snap => {
        const evt = snap.val();
        if(!evt) return; 
        
        currentEventArchived = evt.isArchived === true;

        document.getElementById('gb-event-name').innerText = evt.name;
        document.getElementById('gb-time').innerText = `🕓 ${evt.time || '-'}`;
        document.getElementById('gb-date').innerText = `📅 ${evt.date}`;
        document.getElementById('gb-gc').innerText = `🆔 ${evt.gc}`;
        document.getElementById('gb-loc').innerText = `🏠 ${evt.location || '-'}`;
        
        const coordsEl = document.getElementById('gb-coords');
        if(evt.coords) coordsEl.innerHTML = `📍 <a href="http://googleusercontent.com/maps.google.com/maps?q=${encodeURIComponent(evt.coords)}" target="_blank" style="color:#D2691E; font-weight:bold;">${evt.coords}</a>`;
        else coordsEl.innerText = "📍 -";

        const descEl = document.getElementById('gb-description');
        if (evt.descriptionHtml && evt.descriptionHtml.length > 0) {
            descEl.innerHTML = evt.descriptionHtml;
            descEl.style.display = 'block';
        } else {
            descEl.innerHTML = "";
            descEl.style.display = 'none';
        }

        const actionsArea = document.getElementById('gb-actions-area');
        const massBtn = document.getElementById('btn-mass-open');
        const lockedMsg = document.getElementById('archived-notice');

        if(currentEventArchived) {
            if(actionsArea) actionsArea.style.display = 'none';
            if(massBtn) massBtn.style.display = 'none';
            if(lockedMsg) lockedMsg.style.display = 'block';
        } else {
            if(actionsArea) actionsArea.style.display = 'block';
            if(massBtn) massBtn.style.display = 'block';
            if(lockedMsg) lockedMsg.style.display = 'none';
        }
    });
    
    loginView.style.display = 'none'; 
    adminView.style.display = 'none'; 
    guestbookView.style.display = 'block';
    
    window.scrollTo(0,0);
    loadAttendees(eventKey);
};

document.getElementById('btn-sign-log').addEventListener('click', () => {
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
});

// ==========================================
// 5. APUFUNKTIOT & MUOKKAUS
// ==========================================
window.openMassImport = () => {
    document.getElementById('mass-input').value = ""; 
    document.getElementById('mass-output').value = ""; 
    document.getElementById('mass-step-1').style.display = 'block';
    document.getElementById('mass-step-2').style.display = 'none';
    massModal.style.display = "block";
};

window.resetMassModal = () => {
    document.getElementById('mass-step-1').style.display = 'block';
    document.getElementById('mass-step-2').style.display = 'none';
};

document.getElementById('btn-parse-mass').addEventListener('click', () => {
    const text = document.getElementById('mass-input').value;
    if(!text) return;
    
    let names = [];
    const blocks = text.split(/Näytä\s+loki|View\s+Log|Näytä\s+\/\s+Muokkaa|View\s+\/\s+Edit/i);
    
    blocks.forEach(block => {
        const cleanBlock = block.replace(/\s+/g, ' ').trim();
        if (/Osallistui|Attended/i.test(cleanBlock)) {
            const nameMatch = cleanBlock.match(/^(.*?)\s+(?:Premium\s+Member|Member|Reviewer)/i);
            if (nameMatch && nameMatch[1]) {
                let name = nameMatch[1].trim();
                name = name.replace(/lokia\s*\/\s*Kuvia/gi, "").trim();
                name = name.replace(/Log\s*\/\s*Images/gi, "").trim();
                if(!name.includes("Aion osallistua") && name.length > 0 && name.length < 50) {
                    names.push(name);
                }
            }
        }
    });

    names = [...new Set(names)];
    if (names.length === 0) { alert("Ei osallistujia."); return; }
    document.getElementById('mass-output').value = names.join('\n');
    document.getElementById('mass-step-1').style.display = 'none';
    document.getElementById('mass-step-2').style.display = 'block';
});

document.getElementById('btn-save-mass').addEventListener('click', () => {
    const cleanText = document.getElementById('mass-output').value;
    const finalNames = cleanText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    finalNames.forEach(name => {
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({
            nickname: name, from: "", message: "(Massatuonti)", timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    });
    massModal.style.display = "none";
});

function loadAttendees(eventKey) {
    db.ref('miitit/' + currentUser.uid + '/logs/' + eventKey).on('value', (snapshot) => {
        const listEl = document.getElementById('attendee-list');
        listEl.innerHTML = ""; 
        const logs = [];
        snapshot.forEach(child => { logs.push({key: child.key, ...child.val()}); });
        
        logs.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));

        logs.forEach(log => {
            const row = document.createElement('div');
            row.className = "log-item";
            let actionBtns = "";
            if (!currentEventArchived) {
                actionBtns = `
                <div class="log-actions">
                    <button class="btn-blue btn-small" onclick="openLogEditModal('${log.key}')">✏️</button>
                    <button class="btn-red btn-small" onclick="deleteLog('${log.key}')">🗑</button>
                </div>`;
            }
            row.innerHTML = `
                <div>
                    <strong style="color:#4caf50;">${log.nickname}</strong>
                    <span>${log.from ? ' / ' + log.from : ''}</span>
                    <div style="font-style:italic; color:#888; font-size:0.9em;">${log.message || ''}</div>
                </div>
                ${actionBtns}
            `;
            listEl.appendChild(row);
        });
        document.getElementById('attendee-count').innerText = logs.length;
    });
}

window.openEditModal = (key) => {
    db.ref('miitit/' + currentUser.uid + '/events/' + key).once('value').then(snap => {
        const e = snap.val();
        document.getElementById('edit-key').value = key;
        document.getElementById('edit-type').value = e.type || 'miitti';
        document.getElementById('edit-gc').value = e.gc || '';
        document.getElementById('edit-name').value = e.name || '';
        document.getElementById('edit-date').value = e.date || '';
        document.getElementById('edit-time').value = e.time || '';
        document.getElementById('edit-coords').value = e.coords || '';
        document.getElementById('edit-loc').value = e.location || '';
        document.getElementById('edit-desc').value = e.descriptionHtml || '';
        editModal.style.display = "block";
    });
};

document.getElementById('btn-save-edit').addEventListener('click', () => {
    const key = document.getElementById('edit-key').value;
    const updates = {
        type: document.getElementById('edit-type').value,
        gc: document.getElementById('edit-gc').value,
        name: document.getElementById('edit-name').value,
        date: document.getElementById('edit-date').value,
        time: document.getElementById('edit-time').value,
        coords: document.getElementById('edit-coords').value,
        location: document.getElementById('edit-loc').value,
        descriptionHtml: document.getElementById('edit-desc').value
    };
    db.ref('miitit/' + currentUser.uid + '/events/' + key).update(updates).then(() => {
        editModal.style.display = "none";
    });
});

window.openLogEditModal = (logKey) => {
    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId + '/' + logKey).once('value').then(snap => {
        const log = snap.val();
        document.getElementById('log-edit-key').value = logKey;
        document.getElementById('log-edit-nick').value = log.nickname || "";
        document.getElementById('log-edit-from').value = log.from || "";
        document.getElementById('log-edit-msg').value = log.message || "";
        logEditModal.style.display = "block";
    });
};

document.getElementById('btn-save-log-edit').addEventListener('click', () => {
    const key = document.getElementById('log-edit-key').value;
    const updates = {
        nickname: document.getElementById('log-edit-nick').value,
        from: document.getElementById('log-edit-from').value,
        message: document.getElementById('log-edit-msg').value
    };
    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId + '/' + key).update(updates).then(() => {
        logEditModal.style.display = "none";
    });
});

window.closeModal = () => { editModal.style.display = "none"; massModal.style.display = "none"; logEditModal.style.display = "none"; };
window.deleteEvent = (key) => { if(confirm("Poistetaanko miitti?")) { db.ref('miitit/' + currentUser.uid + '/events/' + key).remove(); db.ref('miitit/' + currentUser.uid + '/logs/' + key).remove(); } };
window.deleteLog = (logKey) => { if(confirm("Poista?")) db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId + '/' + logKey).remove(); };
