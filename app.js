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

// UI Elementit
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const guestbookView = document.getElementById('guestbook-view');
const editModal = document.getElementById('edit-modal');
const massModal = document.getElementById('mass-modal');
const logEditModal = document.getElementById('log-edit-modal');
const userDisplay = document.getElementById('user-display');
const eventStatsEl = document.getElementById('event-stats');

// ==========================================
// 2. KIRJAUTUMINEN
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
// 3. MIITTIEN LISTAUS & ARKISTOINTI
// ==========================================

// UUSI: Lomakkeen piilotus/näyttö logiikka
document.getElementById('new-event-toggle').addEventListener('click', () => {
    const formDiv = document.getElementById('new-event-form');
    if (formDiv.style.display === 'none') {
        formDiv.style.display = 'block';
    } else {
        formDiv.style.display = 'none';
    }
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
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        isArchived: false
    };
    if(!data.gc || !data.name || !data.date) { alert("Täytä GC, Nimi ja Pvm!"); return; }
    db.ref('miitit/' + currentUser.uid + '/events').push(data).then(() => {
        alert("Tallennettu!");
        ['new-gc','new-name','new-time','new-coords','new-loc'].forEach(id => document.getElementById(id).value = "");
        document.getElementById('new-event-form').style.display = 'none'; // Piilotetaan tallennuksen jälkeen
    });
});

function loadEvents() {
    if (!currentUser) return;
    const listCce = document.getElementById('list-cce');
    const listCito = document.getElementById('list-cito');
    const listMiitti = document.getElementById('list-miitti');
    
    db.ref('miitit/' + currentUser.uid + '/events').on('value', (snapshot) => {
        listCce.innerHTML = ""; listCito.innerHTML = ""; listMiitti.innerHTML = "";
        const events = [];
        let count = 0;
        
        snapshot.forEach(child => { events.push({key: child.key, ...child.val()}); count++; });
        if(eventStatsEl) eventStatsEl.innerText = `Löytyi ${count} tapahtumaa.`;

        events.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));

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

            const archiveBtnText = isArchived ? "♻️ Palauta" : "📁 Arkistoi";
            const archiveBtnClass = isArchived ? "btn-blue" : "btn-gray";

            // Luodaan linkki GC-koodista
            const gcLink = `<a href="https://coord.info/${evt.gc}" target="_blank" style="font-weight:bold; color:#A0522D; text-decoration:none;">${evt.gc}</a>`;

            // ID osallistujamäärälle
            const countId = `count-${evt.key}`;

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <strong>${icon} ${evt.name}</strong>
                    <span>${dateStr}</span>
                </div>
                <div style="font-size:0.9em; color:#A0522D; display:flex; justify-content:space-between;">
                    <span>${gcLink} ${evt.location ? '• ' + evt.location : ''}</span>
                    <span id="${countId}" style="font-weight:bold; color:#333;">👤 0</span>
                </div>
                <div style="margin-top:10px; display:flex; gap:5px;">
                    <button class="btn btn-green btn-small" onclick="openGuestbook('${evt.key}')">📖 Avaa</button>
                    <button class="btn btn-blue btn-small" onclick="openEditModal('${evt.key}')">✏️</button>
                    <button class="btn ${archiveBtnClass} btn-small" onclick="toggleArchiveEvent('${evt.key}', ${!isArchived})">${archiveBtnText}</button>
                    <button class="btn btn-red btn-small" onclick="deleteEvent('${evt.key}')">🗑</button>
                </div>
            `;
            
            // Käytetään .once() -komentoa, jotta haku tehdään varmasti vain kerran per päivitys.
            db.ref('miitit/' + currentUser.uid + '/logs/' + evt.key).once('value').then((snap) => {
                const num = snap.numChildren();
                const el = document.getElementById(countId);
                if (el) el.innerText = "👤 " + num;
            });
            
            if (evt.type === 'cce') listCce.appendChild(div);
            else if (evt.type === 'cito') listCito.appendChild(div);
            else listMiitti.appendChild(div); 
        });
    });
}

window.toggleArchiveEvent = (key, newState) => {
    const msg = newState ? "Haluatko arkistoida miitin? (Piilottaa muokkauksen)" : "Palautetaanko miitti aktiiviseksi?";
    if(confirm(msg)) {
        db.ref('miitit/' + currentUser.uid + '/events/' + key).update({ isArchived: newState });
    }
};

// ==========================================
// 4. MIITTIKIRJA (GUESTBOOK)
// ==========================================

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
        
        const attrEl = document.getElementById('gb-attrs');
        if (evt.attributes && Array.isArray(evt.attributes)) {
            attrEl.innerText = "⭐ " + evt.attributes.join(", ");
        } else {
            attrEl.innerText = "";
        }
        
        const coordsEl = document.getElementById('gb-coords');
        if(evt.coords) coordsEl.innerHTML = `📍 <a href="http://googleusercontent.com/maps.google.com/maps?q=${encodeURIComponent(evt.coords)}" target="_blank" style="color:#D2691E; font-weight:bold;">${evt.coords}</a>`;
        else coordsEl.innerText = "📍 -";

        // PIILOTUSLOGIIKKA
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

// MASSALISÄYS LOGIIKKA (PÄIVITETTY)
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
    
    // Pilkotaan teksti
    const blocks = text.split(/Näytä\s+loki|View\s+Log|Näytä\s+\/\s+Muokkaa|View\s+\/\s+Edit/i);
    
    blocks.forEach(block => {
        const cleanBlock = block.replace(/\s+/g, ' ').trim();
        
        // Tarkistetaan onko lokityyppi "Osallistui" tai "Attended"
        const isAttended = /Osallistui|Attended/i.test(cleanBlock);
        
        if (isAttended) {
            const nameMatch = cleanBlock.match(/^(.*?)\s+(?:Premium\s+Member|Member|Reviewer)/i);
            
            if (nameMatch && nameMatch[1]) {
                let name = nameMatch[1].trim();

                // --- SIIVOUS ---
                // Poistetaan "lokia / Kuvia" ja muut vastaavat roskat nimimerkin alusta
                name = name.replace(/lokia\s*\/\s*Kuvia/gi, "").trim();
                name = name.replace(/Log\s*\/\s*Images/gi, "").trim();
                name = name.replace(/Näytä\s+loki/gi, "").trim();

                // Lisätarkistus, ettei sekoitu Arkistointi-lokeihin joissa mainitaan osallistuminen tekstissä
                if(!name.includes("Aion osallistua") && name.length > 0 && name.length < 50) {
                    names.push(name);
                }
            }
        }
    });

    // Poistetaan duplikaatit
    names = [...new Set(names)];
    
    if (names.length === 0) { alert("Ei löydettyjä osallistujia. Tarkista että kopioit oikein."); return; }
    
    document.getElementById('mass-output').value = names.join('\n');
    document.getElementById('mass-step-1').style.display = 'none';
    document.getElementById('mass-step-2').style.display = 'block';
});

document.getElementById('btn-save-mass').addEventListener('click', () => {
    const cleanText = document.getElementById('mass-output').value;
    const finalNames = cleanText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    if (finalNames.length === 0) return;
    finalNames.forEach(name => {
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({
            nickname: name, from: "", message: "(Massatuonti)", timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    });
    alert(`Tallennettu!`);
    massModal.style.display = "none";
});

// --- LISTAUKSEN KORJAUS ---
function loadAttendees(eventKey) {
    db.ref('miitit/' + currentUser.uid + '/logs/' + eventKey).on('value', (snapshot) => {
        const listEl = document.getElementById('attendee-list');
        listEl.innerHTML = ""; // Tyhjennys tärkeä!
        
        const logs = [];
        
        snapshot.forEach(child => { 
            logs.push({key: child.key, ...child.val()}); 
        });
        
        // Järjestetään aikajärjestykseen (viimeisin ylös)
        logs.sort((a,b) => {
            const timeA = a.timestamp || 0;
            const timeB = b.timestamp || 0;
            return timeB - timeA;
        });

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
                    <strong style="color:#4caf50; font-size:1.1em;">${log.nickname}</strong>
                    <span style="color:#A0522D;">${log.from ? ' / ' + log.from : ''}</span>
                    <div style="font-style:italic; color:#888; font-size:0.9em;">${log.message || ''}</div>
                </div>
                ${actionBtns}
            `;
            listEl.appendChild(row);
        });
        document.getElementById('attendee-count').innerText = logs.length;
    });
}

// ==========================================
// 5. APUFUNKTIOT & MODALIT
// ==========================================

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
        location: document.getElementById('edit-loc').value
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

window.closeModal = () => { 
    editModal.style.display = "none"; 
    massModal.style.display = "none"; 
    logEditModal.style.display = "none"; 
};

window.deleteEvent = (key) => {
    if(confirm("Poistetaanko miitti ja kaikki sen tiedot?")) {
        db.ref('miitit/' + currentUser.uid + '/events/' + key).remove();
        db.ref('miitit/' + currentUser.uid + '/logs/' + key).remove();
    }
};

window.deleteLog = (logKey) => {
    if(confirm("Poista osallistuja listalta?")) {
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId + '/' + logKey).remove();
    }
};
