// ==========================================
// MK MIITTIKIRJA - VISITOR.JS
// Versio: 1.2.1 - Button & Layout Fix
// ==========================================

const visitorTranslations = {
    fi: {
        title: "Mikkokalevin Sähköinen Vieraskirja",
        subtitle: "Kirjaa käyntisi vieraskirjaan",
        nickPlaceholder: "Nimimerkkisi (kuten Geocaching.com)",
        fromPlaceholder: "Mistä tulet? (Paikkakunta)",
        msgPlaceholder: "Terveiset Mikkokaleville",
        btnSign: "TALLENNA KÄYNTI ✅",
        reminder: "⚠️ Muista logata käyntisi myös virallisesti Geocaching.comiin!",
        alertNick: "Kirjoita nimimerkkisi!",
        alertDup: "Hei {0}, olet jo kirjannut käynnin tähän miittiin!\n\nEi tarvitse kirjata uudelleen.",
        welcomeTitle: "Kiitos käynnistä!",
        savedMsg: "Kirjaus tallennettu!",
        closeBtn: "Sulje",
        visitGeoBtn: "Jatka miittisivulle ➡",
        logAnotherBtn: "Kirjaa toinen kävijä 👤",
        nextEventTitle: "🔮 Seuraava miitti:",
        noNextEvent: "Ei tiedossa olevia tulevia miittejä."
    },
    en: {
        title: "Mikkokalevi's Digital Guestbook",
        subtitle: "Sign the Event Guestbook",
        nickPlaceholder: "Your Nickname (Geocaching.com)",
        fromPlaceholder: "Where are you from?",
        msgPlaceholder: "Greetings to Mikkokalevi",
        btnSign: "SIGN LOGBOOK ✅",
        reminder: "⚠️ Remember to log your visit officially on Geocaching.com!",
        alertNick: "Please enter your nickname!",
        alertDup: "Hi {0}, you have already signed this guestbook!\n\nNo need to sign again.",
        welcomeTitle: "Thanks for visiting!",
        savedMsg: "Entry saved!",
        closeBtn: "Close",
        visitGeoBtn: "Go to Event Page ➡",
        logAnotherBtn: "Log another person 👤",
        nextEventTitle: "🔮 Next Event:",
        noNextEvent: "No upcoming events known."
    },
    sv: {
        title: "Mikkokalevis Digitala Gästbok",
        subtitle: "Signera gästboken",
        nickPlaceholder: "Ditt Användarnamn (Geocaching.com)",
        fromPlaceholder: "Var kommer du ifrån?",
        msgPlaceholder: "Hälsningar till Mikkokalevi",
        btnSign: "SIGNERA LOGGBOKEN ✅",
        reminder: "⚠️ Kom ihåg att logga ditt besök officiellt på Geocaching.com!",
        alertNick: "Ange ditt användarnamn!",
        alertDup: "Hej {0}, du har redan signerat gästboken!\n\nIngen anledning att signera igen.",
        welcomeTitle: "Tack för besöket!",
        savedMsg: "Loggen sparad!",
        closeBtn: "Stäng",
        visitGeoBtn: "Gå till eventsidan ➡",
        logAnotherBtn: "Logga en annan person 👤",
        nextEventTitle: "🔮 Nästa event:",
        noNextEvent: "Inga kommande event kända."
    }
};

let currentLang = 'fi';

// Kutsutaan index.html:stä kun lippua painetaan
window.setVisitorLanguage = function(lang) {
    if (!visitorTranslations[lang]) return;
    currentLang = lang;
    
    const t = visitorTranslations[lang];
    
    // Päivitetään tekstit ID:n perusteella
    const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
    const setAttr = (id, attr, txt) => { const el = document.getElementById(id); if(el) el.setAttribute(attr, txt); };

    setTxt('vv-ui-title', t.title);
    setTxt('vv-ui-subtitle', t.subtitle);
    setTxt('vv-ui-reminder', t.reminder);
    setTxt('btn-visitor-sign', t.btnSign);

    setAttr('vv-nickname', 'placeholder', t.nickPlaceholder);
    setAttr('vv-from', 'placeholder', t.fromPlaceholder);
    setAttr('vv-message', 'placeholder', t.msgPlaceholder);

    // Päivitetään aktiivinen lippu
    ['btn-lang-fi', 'btn-lang-en', 'btn-lang-sv'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.opacity = (id === `btn-lang-${lang}`) ? "1" : "0.5";
    });
};

// Pääfunktio: Kirjauksen käsittely
window.handleVisitorSign = async function() {
    const t = visitorTranslations[currentLang];
    
    const nickInput = document.getElementById('vv-nickname');
    const fromInput = document.getElementById('vv-from');
    const msgInput = document.getElementById('vv-message');

    const nick = nickInput ? nickInput.value.trim() : "";
    if(!nick) return alert(t.alertNick);

    const targetHost = window.currentVisitorTargetUid || "T8wI16Gf67W4G4yX3Cq7U0U1H6I2"; 
    const eventId = window.currentEventId;

    if (!eventId) return alert("Virhe: Tapahtuman tunnistetta ei löytynyt.");

    const loadOverlay = document.getElementById('loading-overlay');
    if(loadOverlay) loadOverlay.style.display = 'flex';

    try {
        const currentLogsSnap = await firebase.database().ref('miitit/' + targetHost + '/logs/' + eventId).once('value');
        let alreadyLogged = false;
        currentLogsSnap.forEach(child => {
            const val = child.val();
            if (val.nickname && val.nickname.toLowerCase() === nick.toLowerCase()) {
                alreadyLogged = true;
            }
        });

        if (alreadyLogged) {
            if(loadOverlay) loadOverlay.style.display = 'none';
            alert(t.alertDup.replace('{0}', nick));
            return;
        }

        await firebase.database().ref('miitit/' + targetHost + '/logs/' + eventId).push({
            nickname: nick, 
            from: fromInput ? fromInput.value.trim() : "",
            message: msgInput ? msgInput.value.trim() : "", 
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

    } catch (saveErr) {
        console.error("Virhe:", saveErr);
        if(loadOverlay) loadOverlay.style.display = 'none';
        alert("System Error: " + saveErr.message);
        return;
    }

    let userHistory = null;
    let stats = { isFirstTime: false, totalVisits: 0, title: "", greeting: "", streakText: "", isMilestone: false, nextEvent: null };

    try {
        const eventsSnap = await firebase.database().ref('miitit/' + targetHost + '/events').once('value');
        const logsSnap = await firebase.database().ref('miitit/' + targetHost + '/logs').once('value');
        
        const eventsMap = {};
        const allHostEvents = [];
        eventsSnap.forEach(child => { 
            const e = child.val(); e.key = child.key;
            eventsMap[child.key] = e; allHostEvents.push(e);
        });
        
        allHostEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // --- SEURAAVA TULEVA MIITTI ---
        const tzOffset = (new Date()).getTimezoneOffset() * 60000; 
        const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);
        const todayStr = localISOTime.split('T')[0];

        const upcomingEvents = allHostEvents.filter(e => e.date > todayStr && !e.name.includes("/ PERUTTU /"));
        if (upcomingEvents.length > 0) {
            stats.nextEvent = upcomingEvents[0];
        }

        userHistory = [];
        const nickLower = nick.toLowerCase();

        logsSnap.forEach(evtLogs => {
            const eventKey = evtLogs.key;
            const evtData = eventsMap[eventKey];
            if (evtData) {
                let attended = false;
                evtLogs.forEach(log => {
                    const val = log.val();
                    if (val && val.nickname && val.nickname.toLowerCase() === nickLower) attended = true;
                });
                if (attended) userHistory.push(evtData);
            }
        });

        userHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        stats.totalVisits = userHistory.length;
        stats.isFirstTime = (stats.totalVisits <= 1);
        stats.isMilestone = (stats.totalVisits % 10 === 0) || stats.isFirstTime;

        if (window.MK_Messages) {
            stats.title = window.MK_Messages.getRankTitle(stats.totalVisits);
            stats.greeting = window.MK_Messages.getRandomGreeting(nick, stats.isFirstTime);
            
            if (!stats.isFirstTime && allHostEvents.length > 0) {
                const currentEventIndex = allHostEvents.findIndex(e => e.key === eventId);
                if (currentEventIndex > 0) {
                    const previousEventKey = allHostEvents[currentEventIndex - 1].key;
                    const attendedPrevious = userHistory.some(e => e.key === previousEventKey);
                    if (attendedPrevious) {
                        let streak = 0;
                        let globalIdx = currentEventIndex;
                        let historyIdx = userHistory.length - 1;
                        while (globalIdx >= 0 && historyIdx >= 0) {
                            if (allHostEvents[globalIdx].key === userHistory[historyIdx].key) { streak++; globalIdx--; historyIdx--; } else { break; }
                        }
                        stats.streakText = window.MK_Messages.getStreakMessage(streak);
                    } else {
                        const lastVisitEvent = userHistory[userHistory.length - 2];
                        if (lastVisitEvent) {
                            const daysDiff = Math.floor((new Date() - new Date(lastVisitEvent.date)) / (1000 * 60 * 60 * 24));
                            const lastVisitGlobalIndex = allHostEvents.findIndex(e => e.key === lastVisitEvent.key);
                            const missedCount = (currentEventIndex - lastVisitGlobalIndex) - 1;
                            stats.streakText = window.MK_Messages.getMissedMessage(daysDiff, missedCount);
                        }
                    }
                }
            }
        } else {
            stats.greeting = `Tervetuloa ${nick}!`;
        }

    } catch (statsErr) {
        console.warn("Stats error:", statsErr);
        userHistory = null;
    }

    if(loadOverlay) loadOverlay.style.display = 'none';
    showVisitorModalWithLang(nick, userHistory, stats);
};

function showVisitorModalWithLang(nick, history, stats) {
    const modal = document.getElementById('user-profile-modal');
    if(!modal) return;
    const t = visitorTranslations[currentLang];

    // Tekstit kuntoon
    document.getElementById('up-nickname').innerHTML = `<div style="font-size:0.8em; color:#888; margin-bottom:5px;">${stats.title || ""}</div>${stats.greeting}`;
    document.getElementById('up-nickname').style.color = stats.isFirstTime ? "#d32f2f" : "var(--header-color)";
    document.getElementById('up-total').innerText = stats.totalVisits;
    
    // Listan nollaus
    const listEl = document.getElementById('up-history-list');
    listEl.innerHTML = "";
    
    // 1. POISTETAAN VANHAT ELEMENTIT (Jotta ei tule tuplia tai väärää järjestystä)
    const oldFuture = document.getElementById('visitor-next-event-box');
    if(oldFuture) oldFuture.remove();
    
    const oldButtons = document.getElementById('visitor-action-buttons');
    if(oldButtons) oldButtons.remove();
    
    const defaultClose = modal.querySelector('button.btn-red');
    if(defaultClose) defaultClose.style.display = 'none'; // Piilotetaan oletus "Sulje" varmuuden vuoksi

    // 2. LUODAAN SEURAAVA MIITTI -LAATIKKO
    const futureBox = document.createElement('div');
    futureBox.id = 'visitor-next-event-box';
    futureBox.style.marginTop = "15px";
    futureBox.style.marginBottom = "5px";
    futureBox.style.padding = "10px";
    futureBox.style.background = "var(--highlight-bg)";
    futureBox.style.border = "1px solid var(--border-color)";
    futureBox.style.borderRadius = "5px";
    futureBox.style.textAlign = "center";
    futureBox.style.fontSize = "0.95em";
    
    if (stats.nextEvent) {
         futureBox.innerHTML = `<strong style="color:var(--secondary-color);">${t.nextEventTitle}</strong><br><span style="font-size:1.1em; font-weight:bold;">${stats.nextEvent.date}</span><br>${stats.nextEvent.name}`;
    } else {
         futureBox.innerHTML = `<span style="color:#888; font-style:italic;">${t.noNextEvent}</span>`;
    }

    // 3. LUODAAN NAPIT
    const btnContainer = document.createElement('div');
    btnContainer.id = 'visitor-action-buttons';
    btnContainer.style.display = 'flex';
    btnContainer.style.flexDirection = 'column';
    btnContainer.style.gap = '10px';
    btnContainer.style.marginTop = '15px';
    btnContainer.innerHTML = `
        <button id="btn-visit-geo" class="btn btn-green" style="font-size:1.1em;">${t.visitGeoBtn}</button>
        <button id="btn-log-another" class="btn btn-blue" style="background:#555;">${t.logAnotherBtn}</button>
    `;

    // 4. SIJOITETAAN KAIKKI PAIKOILLEEN
    // Ensin "Seuraava miitti" listan perään
    if (listEl && listEl.parentNode) {
        listEl.parentNode.appendChild(futureBox);
        listEl.parentNode.appendChild(btnContainer);
    }
    
    // Tapahtumakuuntelijat nappeihin
    document.getElementById('btn-visit-geo').onclick = function() {
        modal.style.display = 'none';
        resetModalButtons(); // Palauttaa "Sulje" napin adminia varten
        if (typeof proceedToGeo === 'function') proceedToGeo();
    };

    document.getElementById('btn-log-another').onclick = function() {
        modal.style.display = 'none';
        resetModalButtons(); // Palauttaa "Sulje" napin adminia varten
        ['vv-nickname', 'vv-from', 'vv-message'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = "";
        });
        setTimeout(() => { 
            const el = document.getElementById('vv-nickname');
            if(el) el.focus();
        }, 300);
    };

    // 5. LISTAN TÄYTTÖ
    if (history === null) {
        listEl.innerHTML = `<div style="text-align:center; padding:20px;">${t.savedMsg}</div>`;
    } else if (stats.isFirstTime) {
        document.getElementById('up-first').innerHTML = "Today!";
        document.getElementById('up-last').innerHTML = "Today!";
        listEl.innerHTML = `<div style="text-align:center; padding:20px;"><div style="font-size:3em;">🎉</div><p><strong>${t.welcomeTitle}</strong></p></div>`;
    } else {
        const first = history[0];
        const last = history[history.length - 1]; 
        document.getElementById('up-first').innerHTML = `${first.date}<br><span style="font-size:0.8em; font-weight:normal;">${first.name}</span>`;
        document.getElementById('up-last').innerHTML = `${last.date}<br><span style="font-size:0.8em; font-weight:normal;">${last.name}</span>`;

        if (stats.streakText) {
            const infoBox = document.createElement('div');
            infoBox.style.background = "var(--highlight-bg)";
            infoBox.style.padding = "10px";
            infoBox.style.marginBottom = "10px";
            infoBox.style.borderRadius = "5px";
            infoBox.style.textAlign = "center";
            infoBox.style.border = "1px dashed var(--secondary-color)";
            infoBox.innerHTML = stats.streakText;
            listEl.appendChild(infoBox);
        }

        const displayHistory = [...history].reverse();
        displayHistory.forEach(evt => {
            const row = document.createElement('div');
            row.style.borderBottom = "1px dotted #555";
            row.style.padding = "5px 0";
            row.style.fontSize = "0.9em";
            if (evt.date === last.date && evt.name === last.name) {
                row.style.backgroundColor = "rgba(46, 125, 50, 0.2)";
                row.style.borderLeft = "4px solid #4caf50";
                row.style.paddingLeft = "5px";
                row.innerHTML = `<strong>${evt.date}</strong> ${evt.name} <span style="font-size:0.8em; color:#4caf50;">(NYT)</span>`;
            } else {
                row.innerHTML = `<strong>${evt.date}</strong> ${evt.name}`;
            }
            listEl.appendChild(row);
        });
        setTimeout(() => { listEl.scrollTop = 0; }, 100);
    }

    modal.style.display = 'block';

    if (window.triggerConfetti) {
        if (stats.isMilestone) window.triggerConfetti(200, 2);
        else window.triggerConfetti(50, 0.5);
    }
}

// Palauttaa alkuperäisen tilan sulkemisen jälkeen
function resetModalButtons() {
    // Poistetaan visitor-elementit
    const box = document.getElementById('visitor-next-event-box');
    if(box) box.remove();
    
    const btns = document.getElementById('visitor-action-buttons');
    if(btns) btns.remove();
    
    // Palautetaan oletusnappi näkyviin
    const modal = document.getElementById('user-profile-modal');
    const defaultClose = modal.querySelector('button.btn-red');
    if(defaultClose) defaultClose.style.display = 'block';
}
