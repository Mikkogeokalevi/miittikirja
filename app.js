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
const userDisplay = document.getElementById('user-display');

// ==========================================
// 2. KIRJAUTUMINEN (Google + Email)
// ==========================================
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        // PÄIVITYS: Näytetään käyttäjätieto
        if(userDisplay) {
            userDisplay.style.display = 'block';
            userDisplay.innerText = "👤 Kirjautuneena: " + user.email;
        }
        
        if (guestbookView.style.display !== 'block') showAdminView();
        loadEvents();
    } else {
        currentUser = null;
        if(userDisplay) userDisplay.style.display = 'none';
        showLoginView();
    }
});

// Google Kirjautuminen
document.getElementById('btn-login-google').addEventListener('click', () => {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
        .catch(e => alert("Virhe Google-kirjautumisessa: " + e.message));
});

// Sähköposti Kirjautuminen
document.getElementById('btn-email-login').addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    if(!email || !pass) { alert("Syötä tunnus ja salasana!"); return; }
    
    auth.signInWithEmailAndPassword(email, pass)
        .catch(e => alert("Virhe kirjautumisessa: " + e.message));
});

// Sähköposti Rekisteröinti
document.getElementById('btn-email-register').addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    if(!email || !pass) { alert("Syötä tunnus ja salasana!"); return; }
    
    auth.createUserWithEmailAndPassword(email, pass)
        .then(() => alert("Tunnus luotu! Olet nyt kirjautunut."))
        .catch(e => alert("Virhe luonnissa: " + e.message));
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
// 3. MIITTIEN HALLINTA & LISTAUS
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

    db.ref('miitit/' + currentUser.uid + '/events').orderByChild('date').on('value', (snapshot) => {
        listCce.innerHTML = ""; listCito.innerHTML = ""; listMiitti.innerHTML = "";
        const events = [];
        snapshot.forEach(child => events.push({key: child.key, ...child.val()}));
        events.sort((a,b) => new Date(b.date) - new Date(a.date));

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
// 4. MUOKKAUS (EDIT EVENT)
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

window.closeModal = () => { editModal.style.display = "none"; };
window.deleteEvent = (key) => {
    if(confirm("Poistetaanko miitti ja kaikki sen tiedot?")) {
        db.ref('miitit/' + currentUser.uid + '/events/' + key).remove();
        db.ref('miitit/' + currentUser.uid + '/logs/' + key).remove();
    }
};

// ==========================================
// 5. MIITTIKIRJA & LOGIEN MUOKKAUS
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
        
        // Attribuutit (Uusi!)
        const attrEl = document.getElementById('gb-attrs');
        if (evt.attributes && Array.isArray(evt.attributes)) {
            attrEl.innerText = "⭐ " + evt.attributes.join(", ");
        } else {
            attrEl.innerText = "";
        }
        
        const coordsEl = document.getElementById('gb-coords');
        if(evt.coords) coordsEl.innerHTML = `📍 <a href="https://www.google.com/maps/search/?api=1&query=$?q=${encodeURIComponent(evt.coords)}" target="_blank" style="color:#D2691E; font-weight:bold;">${evt.coords}</a>`;
        else coordsEl.innerText = "📍 -";
    });
    
    showGuestbookView();
    loadAttendees(eventKey);
};

function showGuestbookView() {
    loginView.style.display = 'none'; adminView.style.display = 'none'; guestbookView.style.display = 'block';
}

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
