// ==========================================
// 1. ASETUKSET
// ==========================================

// Nämä on nyt täytetty sinun projektisi tiedoilla
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
    firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.error("Firebase alustus epäonnistui.", e);
    alert("Virhe: Firebase alustus epäonnistui!");
}

const db = firebase.database();
const auth = firebase.auth();

// Globaalit muuttujat
let currentUser = null;
let currentEventId = null; 

// HTML-elementit
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const guestbookView = document.getElementById('guestbook-view');

// ==========================================
// 2. KIRJAUTUMINEN JA NAVIGOINTI
// ==========================================

// Kuunnellaan kirjautumistilan muutosta
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        console.log("Kirjauduttu sisään:", user.email);
        
        // Jos ollaan vieraskirja-tilassa, ei heitetä adminiin väkisin
        // (Tämä mahdollistaa sivun päivityksen kesken miitin ilman että heittää ulos)
        if (guestbookView.style.display !== 'block') {
            showAdminView();
        }
        
        loadEvents(); // Ladataan miitit
    } else {
        currentUser = null;
        showLoginView();
    }
});

// Kirjaudu sisään -nappi
document.getElementById('btn-login').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => alert("Kirjautumisvirhe: " + e.message));
});

// Kirjaudu ulos -nappi
document.getElementById('btn-logout').addEventListener('click', () => {
    if(confirm("Haluatko varmasti kirjautua ulos?")) {
        auth.signOut().then(() => location.reload());
    }
});

// Näkymien vaihtoapulaiset
function showLoginView() {
    loginView.style.display = 'flex';
    adminView.style.display = 'none';
    guestbookView.style.display = 'none';
}

function showAdminView() {
    // Vain jos käyttäjä on kirjautunut
    if (!currentUser) { showLoginView(); return; }
    
    loginView.style.display = 'none';
    adminView.style.display = 'block';
    guestbookView.style.display = 'none';
    
    // Lopeta edellisen miitin logien kuuntelu resurssien säästämiseksi
    if(currentEventId) {
        db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).off();
        currentEventId = null;
    }
}

// Tämä pitää sitoa window-objektiin, jotta HTML-napit löytävät sen
window.showAdminView = showAdminView;

// ==========================================
// 3. ADMIN: MIITIEN HALLINTA
// ==========================================

// Lisää uusi miitti
document.getElementById('btn-add-event').addEventListener('click', () => {
    const gc = document.getElementById('new-gc').value.trim();
    const name = document.getElementById('new-name').value.trim();
    const date = document.getElementById('new-date').value;
    const loc = document.getElementById('new-loc').value.trim();

    if(!gc || !name || !date) { 
        alert("Täytä vähintään GC-koodi, Nimi ja Päivämäärä!"); 
        return; 
    }

    const eventData = {
        gc: gc.toUpperCase(),
        name: name,
        date: date,
        location: loc,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    // Tallennetaan polkuun: miitit/USER_ID/events/
    db.ref('miitit/' + currentUser.uid + '/events').push(eventData)
        .then(() => {
            // Tyhjennä kentät onnistumisen jälkeen
            document.getElementById('new-gc').value = "";
            document.getElementById('new-name').value = "";
            document.getElementById('new-loc').value = "";
        })
        .catch(e => alert("Virhe tallennuksessa: " + e.message));
});

// Lataa miitit listaan
function loadEvents() {
    if (!currentUser) return;

    const listEl = document.getElementById('event-list');
    
    // Kuunnellaan muutoksia reaaliajassa
    db.ref('miitit/' + currentUser.uid + '/events').orderByChild('date').on('value', (snapshot) => {
        listEl.innerHTML = "";
        
        const events = [];
        snapshot.forEach(child => {
            events.push({key: child.key, ...child.val()});
        });

        if (events.length === 0) {
            listEl.innerHTML = "<p style='color:#888;'>Ei miittejä. Luo ensimmäinen yllä!</p>";
            return;
        }

        // Järjestetään päivämäärän mukaan (uusin ensin)
        events.sort((a,b) => new Date(b.date) - new Date(a.date));

        events.forEach(evt => {
            const div = document.createElement('div');
            div.className = "card";
            
            // Muotoillaan päivämäärä kivasti (esim. 1.5.2024)
            let dateStr = evt.date;
            try {
                dateStr = new Date(evt.date).toLocaleDateString('fi-FI');
            } catch(e) {}

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <strong style="font-size:1.1em; color:#4caf50;">${evt.name}</strong>
                        <div style="font-size:0.9em; color:#ccc;">${evt.gc} • ${dateStr}</div>
                        <div style="font-size:0.8em; color:#888;">${evt.location || ''}</div>
                    </div>
                </div>
                <div style="margin-top:15px; display:flex; gap:10px;">
                    <button class="btn btn-blue btn-small" onclick="openGuestbook('${evt.key}')">📖 Avaa Miittikirja</button>
                    <button class="btn btn-red btn-small" onclick="deleteEvent('${evt.key}')" style="width:auto;">🗑 Poista</button>
                </div>
            `;
            listEl.appendChild(div);
        });
    });
}

// Poista miitti
window.deleteEvent = (key) => {
    if(confirm("HUOMIO! ⚠️\n\nHaluatko varmasti poistaa tämän miitin?\nSamalla poistuvat myös KAIKKI sen kirjaukset.\n\nToimintoa ei voi perua.")) {
        // Poistetaan miitti
        db.ref('miitit/' + currentUser.uid + '/events/' + key).remove();
        // Poistetaan miitin logit
        db.ref('miitit/' + currentUser.uid + '/logs/' + key).remove()
            .then(() => alert("Miitti poistettu."))
            .catch(e => alert("Virhe poistossa: " + e.message));
    }
};

// ==========================================
// 4. VIERASKIRJA (GUESTBOOK)
// ==========================================

window.openGuestbook = (eventKey) => {
    currentEventId = eventKey;
    
    // Haetaan miitin tiedot otsikkoa varten
    db.ref('miitit/' + currentUser.uid + '/events/' + eventKey).once('value').then(snap => {
        const evt = snap.val();
        if (!evt) return;

        document.getElementById('gb-event-name').innerText = evt.name;
        
        let dateStr = evt.date;
        try { dateStr = new Date(evt.date).toLocaleDateString('fi-FI'); } catch(e){}
        
        document.getElementById('gb-event-details').innerText = `${evt.gc} • ${dateStr} • ${evt.location || ''}`;
        
        // Vaihdetaan näkymä
        loginView.style.display = 'none';
        adminView.style.display = 'none';
        guestbookView.style.display = 'block';

        // Ladataan osallistujat
        loadAttendees(eventKey);
    });
};

// Vieras painaa "Kirjaa käynti"
document.getElementById('btn-sign-log').addEventListener('click', () => {
    if (!currentEventId) return;

    const nick = document.getElementById('log-nickname').value.trim();
    const msg = document.getElementById('log-message').value.trim();
    const kk = document.getElementById('log-kk').value;

    if(!nick) { 
        alert("Kirjoita edes nimimerkki!"); 
        return; 
    }

    const logData = {
        nickname: nick,
        message: msg,
        kk_count: kk || 0,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    // Tallenna polkuun: miitit/USER_ID/logs/EVENT_ID/
    db.ref('miitit/' + currentUser.uid + '/logs/' + currentEventId).push(logData)
        .then(() => {
            // "Visuaalinen palaute"
            alert("Käynti kirjattu! Kiitos käynnistä, " + nick + "! 👋");
            
            // Tyhjennetään kentät seuraavaa vierasta varten
            document.getElementById('log-nickname').value = "";
            document.getElementById('log-message').value = "";
            document.getElementById('log-kk').value = "";
        })
        .catch(e => alert("Virhe kirjauksessa: " + e.message));
});

// Lataa osallistujalista reaaliajassa
function loadAttendees(eventKey) {
    const listEl = document.getElementById('attendee-list');
    const countEl = document.getElementById('attendee-count');

    db.ref('miitit/' + currentUser.uid + '/logs/' + eventKey).on('value', (snapshot) => {
        listEl.innerHTML = "";
        const logs = [];
        
        snapshot.forEach(child => logs.push(child.val()));
        
        // Uusin kirjaus ylhäällä
        logs.reverse(); 

        logs.forEach(log => {
            const row = document.createElement('div');
            row.className = "log-item";
            
            const time = new Date(log.timestamp).toLocaleTimeString('fi-FI', {hour: '2-digit', minute:'2-digit'});
            const kkText = (log.kk_count && log.kk_count > 0) ? ` • KK: ${log.kk_count}` : "";
            
            row.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <strong style="color:#4caf50; font-size:1.1em;">${log.nickname}</strong>
                    <span class="log-time">${time}</span>
                </div>
                <div style="font-style:italic; color:#ddd;">${log.message || '-'}</div>
                ${kkText ? `<div style="font-size:0.8em; color:#888;">${kkText}</div>` : ''}
            `;
            listEl.appendChild(row);
        });

        countEl.innerText = logs.length;
    });
}
