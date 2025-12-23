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

// UI Elementit
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const guestbookView = document.getElementById('guestbook-view');
const editModal = document.getElementById('edit-modal');
const massModal = document.getElementById('mass-modal');
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
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
        .catch(e => alert("Virhe: " + e.message));
});

document.getElementById('btn-email-login').addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    if(!email || !pass) { alert("Syötä tunnus ja salasana!"); return; }
    auth.signInWithEmailAndPassword(email, pass).catch(e => alert(e.message));
});

document.getElementById('btn-email-register').addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    if(!email || !pass) { alert("Syötä tunnus ja salasana!"); return; }
    auth.createUserWithEmailAndPassword(email, pass)
        .then(() => alert("Tunnus luotu!"))
        .catch(e => alert(e.message));
});

document.getElementById('btn-logout').addEventListener('click', () => { 
    if(confirm("Ulos?")) auth.signOut().then(() => location.reload()); 
});

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
// 3. MIITTIEN LISTAUS
// ==========================================

document.getElementById('btn-add-event').addEventListener('click', () => {
    const data = {
        type: document.getElementById('new-type').value,
        gc: document.getElementById('new-gc').value.trim().toUpperCase(),
        name: document.getElementById('new-name').value.trim(),
        date: document.getElementById('new-date').value,
        time: document.getElementById('new-time').value.trim(),
        coords: document.getElementById('new-coords').value.trim(),
        location: document.getElementById('new-loc').value.trim(),
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    if(!data.gc || !data.name || !data.date) { alert("Täytä GC, Nimi ja Pvm!"); return; }

    db.ref('miitit/' + currentUser.uid + '/events').push(data).then(() => {
        alert("Tallennettu!");
        ['new-gc','new-name','new-time','new-coords','new-loc'].forEach(id => document.getElementById(id).value = "");
    });
});

function loadEvents() {
    if (!currentUser) return;
    
    const listCce = document.getElementById('list-cce');
    const listCito = document.getElementById('list-cito');
    const listMiitti = document.getElementById('list-miitti');
    listCce.innerHTML = ""; listCito.innerHTML = ""; listMiitti.innerHTML = "";

    db.ref('miitit/' + currentUser.uid + '/events').on('value', (snapshot) => {
        listCce.innerHTML = ""; listCito.innerHTML = ""; listMiitti.innerHTML = "";
        
        const events = [];
        let count = 0;
        
        snapshot.forEach(child => {
            events.push({key: child.key, ...child.val()});
            count++;
        });

        if(eventStatsEl) eventStatsEl.innerText = `Löytyi ${count} tapahtumaa.`;

        events.sort((a,b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });

        events.forEach(evt => {
            const div = document.createElement('div');
            div.className = "card";
            
            let dateStr = evt.date;
            try { dateStr = new Date(evt.date).toLocaleDateString('fi-FI'); } catch(e){}
            
            let icon = "📍";
            if(evt.type === 'cito') icon = "🗑️";
            if(evt.type === 'cce') icon = "🎉";

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <strong>${icon} ${evt.name}</strong>
                    <span>${dateStr}</span>
                </div>
                <div style="font-size:0.9em; color:#A0522D;">${evt.gc} ${evt.location ? '• ' + evt.location : ''}</div>
                <div style="margin-top:10px; display:flex; gap:5px;">
                    <button class="btn btn-green btn-small" onclick="openGuestbook('${evt.key}')">📖 Avaa</button>
                    <button class="btn btn-blue btn-small" onclick="openEditModal('${evt.key}')">✏️</button>
                    <button class="btn btn-red btn-small" onclick="deleteEvent('${evt.key}')">🗑</button>
                </div>
            `;
            
            if (evt.type === 'cce') listCce.appendChild(div);
            else if (evt.type === 'cito') listCito.appendChild(div);
            else listMiitti.appendChild(div); 
        });
    });
}

// ==========================================
// 4. MIITTIKIRJA (GUESTBOOK)
// ==========================================

window.openGuestbook = (eventKey) => {
    currentEventId = eventKey;
    db.ref('miitit/' + currentUser.uid + '/events/' + eventKey).on('value', snap => {
        const evt = snap.val();
        if(!evt) return; 
        
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
        if(evt.coords) {
            coordsEl.innerHTML = `📍 <a href="http://googleusercontent.com/maps.google.com/maps?q=${encodeURIComponent(evt.coords)}" target="_blank" style="color:#D2691E; font-weight:bold;">${evt.coords}</a>`;
        } else {
            coordsEl.innerText = "📍 -";
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

// --- MASSALISÄYS (2-VAIHEINEN) ---
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

// VAIHE 1: ETSI NIMET
document.getElementById('btn-parse-mass').addEventListener('click', () => {
    const text = document.getElementById('mass-input').value;
    if(!text) return;
    
    let names = [];
    
    // Yritetään "Smart Parse" geocaching copy-pasteen
    // Etsii: [jotain tekstiä] + [vähintään 2 välilyöntiä] + (Premium) Member
    const lines = text.split('\n');
    lines.forEach(line => {
        // Regex nappaa tekstin ennen isoa väliä ja Member-sanaa
        const match = line.match(/^\s*(.*?)\s{2,}(?:Premium\s+)?Member/);
        if (match) {
            let cleanName = match[1].trim();
            if(cleanName.length > 0) names.push(cleanName);
        }
    });
    
    // Jos Smart Parse ei löytänyt mitään, oletetaan että käyttäjä syötti pelkän listan
    if (names.length === 0) {
        names = text.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
    }
    
    names = [...new Set(names)]; // Poista tuplat
    
    if (names.length === 0) {
        alert("Ei löytynyt nimiä. Tarkista teksti.");
        return;
    }
    
    // Näytä tulokset vaiheessa 2
    document.getElementById('mass-output').value = names.join('\n');
    document.getElementById('mass-step-1').style.display = 'none';
    document.getElementById('mass-step-2').style.display = 'block';
});

// VAIHE 2: TALLENNA
document.getElementById('btn-save-mass').addEventListener('click', () => {
    const cleanText = document.getElementById('mass-output').value;
    const finalNames = cleanText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    
    if (finalNames.length === 0) return;
    
    let count = 0;
    finalNames.forEach(name => {
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push({
            nickname: name,
            from: "", 
            message: "(Massatuonti)",
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        count++;
    });
    
    alert(`Tallennettu ${count} osallistujaa!`);
    massModal.style.display = "none";
});

function loadAttendees(eventKey) {
    db.ref('miitit/' + currentUser.uid + '/logs/' + eventKey).on('value', (snapshot) => {
        const listEl = document.getElementById('attendee-list');
        listEl.innerHTML = "";
        const logs = [];
        snapshot.forEach(child => logs.push({key: child.key, ...child.val()}));
        logs.reverse();

        logs.forEach(log => {
            const row = document.createElement('div');
            row.className = "log-item";
            row.innerHTML = `
                <div>
                    <strong style="color:#4caf50; font-size:1.1em;">${log.nickname}</strong>
                    <span style="color:#A0522D;"> / ${log.from || ''}</span>
                    <div style="font-style:italic; color:#888; font-size:0.9em;">${log.message || ''}</div>
                </div>
                <div class="log-actions">
                    <button class="btn-blue btn-small" onclick="editLog('${log.key}', '${log.nickname}', '${log.from}')">✏️</button>
                    <button class="btn-red btn-small" onclick="deleteLog('${log.key}')">🗑</button>
                </div>
            `;
            listEl.appendChild(row);
        });
        document.getElementById('attendee-count').innerText = logs.length;
    });
}

// ==========================================
// 5. APUFUNKTIOT
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

window.closeModal = () => { 
    editModal.style.display = "none"; 
    massModal.style.display = "none"; 
};

window.deleteEvent = (key) => {
    if(confirm("Poistetaanko miitti ja kaikki sen tiedot?")) {
        db.ref('miitit/' + currentUser.uid + '/events/' + key).remove();
        db.ref('miitit/' + currentUser.uid + '/logs/' + key).remove();
    }
};

window.editLog = (logKey, oldNick, oldFrom) => {
    const newNick = prompt("Muokkaa nimeä:", oldNick);
    if(newNick !== null) {
        const newFrom = prompt("Muokkaa paikkakuntaa:", oldFrom);
        if(newFrom !== null) {
            db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId + '/' + logKey).update({
                nickname: newNick,
                from: newFrom
            });
        }
    }
};

window.deleteLog = (logKey) => {
    if(confirm("Poista osallistuja listalta?")) {
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId + '/' + logKey).remove();
    }
};
