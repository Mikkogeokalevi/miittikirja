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

// Elementit
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const guestbookView = document.getElementById('guestbook-view');

// ==========================================
// 2. KIRJAUTUMINEN
// ==========================================
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        if (guestbookView.style.display !== 'block') showAdminView();
        loadEvents();
    } else {
        currentUser = null;
        showLoginView();
    }
});

document.getElementById('btn-login').addEventListener('click', () => {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
});
document.getElementById('btn-logout').addEventListener('click', () => {
    if(confirm("Kirjaudu ulos?")) auth.signOut().then(() => location.reload());
});

function showLoginView() {
    loginView.style.display = 'flex'; adminView.style.display = 'none'; guestbookView.style.display = 'none';
}
function showAdminView() {
    if (!currentUser) { showLoginView(); return; }
    loginView.style.display = 'none'; adminView.style.display = 'block'; guestbookView.style.display = 'none';
    if(currentEventId) { db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).off(); currentEventId = null; }
}
window.showAdminView = showAdminView;

// ==========================================
// 3. ADMIN: MIITIEN HALLINTA
// ==========================================

document.getElementById('btn-add-event').addEventListener('click', () => {
    // Luetaan uudet kentät
    const type = document.getElementById('new-type').value;
    const gc = document.getElementById('new-gc').value.trim();
    const name = document.getElementById('new-name').value.trim();
    const date = document.getElementById('new-date').value;
    const time = document.getElementById('new-time').value.trim();
    const coords = document.getElementById('new-coords').value.trim();
    const loc = document.getElementById('new-loc').value.trim();

    if(!gc || !name || !date) { alert("Täytä vähintään GC, Nimi ja Pvm!"); return; }

    const eventData = {
        type: type, // miitti, cito, cce
        gc: gc.toUpperCase(),
        name: name,
        date: date,
        time: time,
        coords: coords,
        location: loc,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    db.ref('miitit/' + currentUser.uid + '/events').push(eventData)
        .then(() => {
            alert("Tallennettu!");
            document.getElementById('new-gc').value = "";
            document.getElementById('new-name').value = "";
            document.getElementById('new-time').value = "";
            document.getElementById('new-coords').value = "";
            document.getElementById('new-loc').value = "";
        });
});

function loadEvents() {
    if (!currentUser) return;

    // Tyhjennetään kaikki listat
    const listCce = document.getElementById('list-cce');
    const listCito = document.getElementById('list-cito');
    const listMiitti = document.getElementById('list-miitti');
    listCce.innerHTML = ""; listCito.innerHTML = ""; listMiitti.innerHTML = "";

    db.ref('miitit/' + currentUser.uid + '/events').orderByChild('date').on('value', (snapshot) => {
        const events = [];
        snapshot.forEach(child => events.push({key: child.key, ...child.val()}));
        
        // Järjestetään uusin ensin
        events.sort((a,b) => new Date(b.date) - new Date(a.date));

        events.forEach(evt => {
            const div = document.createElement('div');
            div.className = "card";
            
            // Muotoilu
            let dateStr = evt.date;
            try { dateStr = new Date(evt.date).toLocaleDateString('fi-FI'); } catch(e){}
            
            // Ikoni tyypin mukaan
            let icon = "📍";
            if(evt.type === 'cito') icon = "🗑️";
            if(evt.type === 'cce') icon = "🎉";

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <strong>${icon} ${evt.name}</strong>
                    <span>${dateStr}</span>
                </div>
                <div style="font-size:0.9em; color:#ccc;">${evt.gc}</div>
                <div style="margin-top:10px;">
                    <button class="btn btn-green btn-small" onclick="openGuestbook('${evt.key}')">📖 Avaa</button>
                    <button class="btn btn-red btn-small" onclick="deleteEvent('${evt.key}')" style="width:auto;">Poista</button>
                </div>
            `;
            
            // Lisätään oikeaan laatikkoon
            if (evt.type === 'cce') listCce.appendChild(div);
            else if (evt.type === 'cito') listCito.appendChild(div);
            else listMiitti.appendChild(div);
        });
    });
}

window.deleteEvent = (key) => {
    if(confirm("Poista miitti ja kaikki kirjaukset?")) {
        db.ref('miitit/' + currentUser.uid + '/events/' + key).remove();
        db.ref('miitit/' + currentUser.uid + '/logs/' + key).remove();
    }
};

// ==========================================
// 4. MIITTIKIRJAN NÄKYMÄ (Guestbook)
// ==========================================

window.openGuestbook = (eventKey) => {
    currentEventId = eventKey;
    
    db.ref('miitit/' + currentUser.uid + '/events/' + eventKey).once('value').then(snap => {
        const evt = snap.val();
        if (!evt) return;

        // Täytetään tiedot kuten vihkossa
        document.getElementById('gb-event-name').innerText = evt.name;
        
        let dateStr = evt.date;
        try { dateStr = new Date(evt.date).toLocaleDateString('fi-FI'); } catch(e){}
        
        document.getElementById('gb-time').innerText = `🕓 ${evt.time || '-'}`;
        document.getElementById('gb-date').innerText = `📅 ${dateStr}`;
        document.getElementById('gb-gc').innerText = `🆔 ${evt.gc}`;
        document.getElementById('gb-loc').innerText = `🏠 ${evt.location || '-'}`;
        
        // Tehdään koordinaateista linkki karttaan
        const coordsEl = document.getElementById('gb-coords');
        if(evt.coords) {
            coordsEl.innerHTML = `📍 <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evt.coords)}" target="_blank" style="color:#4caf50;">${evt.coords}</a>`;
        } else {
            coordsEl.innerText = "📍 -";
        }

        loginView.style.display = 'none'; adminView.style.display = 'none'; guestbookView.style.display = 'block';
        loadAttendees(eventKey);
    });
};

document.getElementById('btn-sign-log').addEventListener('click', () => {
    const nick = document.getElementById('log-nickname').value.trim();
    const from = document.getElementById('log-from').value.trim(); // Paikkakunta
    const msg = document.getElementById('log-message').value.trim();

    if(!nick) { alert("Nimimerkki vaaditaan!"); return; }

    const logData = {
        nickname: nick,
        from: from,
        message: msg,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push(logData)
        .then(() => {
            alert("Kirjattu!");
            document.getElementById('log-nickname').value = "";
            document.getElementById('log-from').value = "";
            document.getElementById('log-message').value = "";
        });
});

function loadAttendees(eventKey) {
    const listEl = document.getElementById('attendee-list');
    const countEl = document.getElementById('attendee-count');

    db.ref('miitit/' + currentUser.uid + '/logs/' + eventKey).on('value', (snapshot) => {
        listEl.innerHTML = "";
        const logs = [];
        snapshot.forEach(child => logs.push(child.val()));
        logs.reverse();

        logs.forEach(log => {
            const row = document.createElement('div');
            row.className = "log-item";
            const time = new Date(log.timestamp).toLocaleTimeString('fi-FI', {hour: '2-digit', minute:'2-digit'});
            
            // Muotoilu: NIMI / PAIKKAKUNTA
            row.innerHTML = `
                <div>
                    <strong style="color:#4caf50; font-size:1.1em;">${log.nickname}</strong>
                    <span style="color:#ddd;"> / ${log.from || ''}</span>
                    <span class="log-time">${time}</span>
                </div>
                <div style="font-style:italic; color:#888; font-size:0.9em;">${log.message || ''}</div>
            `;
            listEl.appendChild(row);
        });
        countEl.innerText = logs.length;
    });
}
