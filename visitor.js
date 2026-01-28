// ==========================================
// MK MIITTIKIRJA - VISITOR.JS
// Versio: 1.3.0 - Robust UI Reset
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
        noNextEvent: "Ei tiedossa olevia tulevia miittejä.",
        expiryUntil: "⏳ Tämä kirjausikkuna voimassa {0} klo {1} asti.",
        streakInfo: "Putki: {0} miittiä (alkaa {1})",
        badgeFirst: "Ensikertalainen!",
        badgeStreak: "Putki käynnissä: {0}",
        badgeMilestone: "Juhlakerta!",
        badges: ["Hyvä meininki!", "Tervetuloa takaisin!", "Kiitos kun piipahdit!", "Legendaarinen kävijä!"],
        expiredTitle: "⛔ Kirjaus on sulkeutunut",
        expiredBody: "Tämä QR‑koodi on voimassa vain 3 päivää tapahtuman jälkeen.",
        expiredAlert: "Kirjaus on sulkeutunut. QR‑koodi ei ole enää voimassa."
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
        noNextEvent: "No upcoming events known.",
        expiryUntil: "⏳ This sign-in window is open until {0} at {1}.",
        streakInfo: "Streak: {0} events (starts at {1})",
        badgeFirst: "First timer!",
        badgeStreak: "Streak active: {0}",
        badgeMilestone: "Milestone visit!",
        badges: ["Great to see you!", "Welcome back!", "Thanks for stopping by!", "Community star!"],
        expiredTitle: "⛔ Sign-in closed",
        expiredBody: "This QR code is valid only 3 days after the event.",
        expiredAlert: "Sign-in is closed. This QR code is no longer valid."
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
        noNextEvent: "Inga kommande event kända.",
        expiryUntil: "⏳ Den här inloggningen gäller till {0} kl {1}.",
        streakInfo: "Putke: {0} miittiä (startar {1})",
        badgeFirst: "Första gången!",
        badgeStreak: "Putke på gång: {0}",
        badgeMilestone: "Jubileumsbesök!",
        badges: ["Kul att se dig!", "Välkommen tillbaka!", "Tack för besöket!", "Gemenskapsstjärna!"],
        expiredTitle: "⛔ Inskrivningen är stängd",
        expiredBody: "Den här QR‑koden gäller bara 3 dagar efter eventet.",
        expiredAlert: "Inskrivningen är stängd. Den här QR‑koden är inte längre giltig."
    },
    et: {
        title: "Mikkokalevi digitaalne külalisteraamat",
        subtitle: "Kirjuta oma külastus külalisteraamatusse",
        nickPlaceholder: "Sinu kasutajanimi (Geocaching.com)",
        fromPlaceholder: "Kust sa tuled? (Linn/asula)",
        msgPlaceholder: "Tervitused Mikkokalevile",
        btnSign: "SALVESTA KÜLASTUS ✅",
        reminder: "⚠️ Ära unusta oma külastust ka Geocaching.com‑is logida!",
        alertNick: "Palun sisesta oma kasutajanimi!",
        alertDup: "Hei {0}, sa oled juba sellel üritusel kirje teinud!\n\nPole vaja uuesti.",
        welcomeTitle: "Aitäh külastuse eest!",
        savedMsg: "Kirje salvestatud!",
        closeBtn: "Sulge",
        visitGeoBtn: "Mine ürituse lehele ➡",
        logAnotherBtn: "Lisa teine külastaja 👤",
        nextEventTitle: "🔮 Järgmine üritus:",
        noNextEvent: "Tulevasi üritusi ei ole teada.",
        expiryUntil: "⏳ See registreerimisaken kehtib kuni {0} kell {1}.",
        streakInfo: "Seeria: {0} miitti (algab {1})",
        badgeFirst: "Esimest korda!",
        badgeStreak: "Seeria käib: {0}",
        badgeMilestone: "Tähtpäeva külastus!",
        badges: ["Hea meel sind näha!", "Tere tulemast tagasi!", "Aitäh külastamast!", "Kogukonna staar!"],
        expiredTitle: "⛔ Sisselogimine suletud",
        expiredBody: "See QR‑kood kehtib vaid 3 päeva pärast üritust.",
        expiredAlert: "Sisselogimine on suletud. See QR‑kood ei kehti enam."
    }
};

let currentLang = 'fi';
window.isVisitorExpired = false;

// Kutsutaan index.html:stä kun lippua painetaan
window.setVisitorLanguage = function(lang) {
    if (!visitorTranslations[lang]) return;
    currentLang = lang;
    
    const t = visitorTranslations[lang];
    
    const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
    const setAttr = (id, attr, txt) => { const el = document.getElementById(id); if(el) el.setAttribute(attr, txt); };

    setTxt('vv-ui-title', t.title);
    setTxt('vv-ui-subtitle', t.subtitle);
    setTxt('vv-ui-reminder', t.reminder);
    setTxt('btn-visitor-sign', t.btnSign);

    setAttr('vv-nickname', 'placeholder', t.nickPlaceholder);
    setAttr('vv-from', 'placeholder', t.fromPlaceholder);
    setAttr('vv-message', 'placeholder', t.msgPlaceholder);

    ['btn-lang-fi', 'btn-lang-en', 'btn-lang-sv', 'btn-lang-et'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.opacity = (id === `btn-lang-${lang}`) ? "1" : "0.5";
    });

    if (typeof window.updateVisitorExpiryNotice === 'function') {
        window.updateVisitorExpiryNotice();
    }

    if (window.isVisitorExpired) {
        const expiredEl = document.getElementById('vv-expired');
        if (expiredEl) expiredEl.innerText = `${t.expiredTitle}\n${t.expiredBody}`;
    }
};

// Pääfunktio: Kirjauksen käsittely
window.handleVisitorSign = async function() {
    const t = visitorTranslations[currentLang];
    if (window.isVisitorExpired) {
        return alert(t.expiredAlert);
    }
    
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

    // --- TILASTOJEN LASKENTA ---
    let userHistory = null;
    let stats = { isFirstTime: false, totalVisits: 0, title: "", greeting: "", streakText: "", isMilestone: false, nextEvent: null, streakCount: 0, streakStartLabel: "" };

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

        const isMiittiEvent = (evt) => {
            const type = (evt.type || '').toLowerCase();
            if (type) return type === 'miitti';
            const name = (evt.name || '').toLowerCase();
            if (name.includes('cito')) return false;
            if (name.includes('yhteisö') || name.includes('juhla') || name.includes('cce') || name.includes('celebration')) return false;
            return true;
        };
        const miittiEvents = allHostEvents
            .filter(e => !e.name.includes("/ PERUTTU /"))
            .filter(e => isMiittiEvent(e));
        let seq = 0;
        miittiEvents.forEach(e => { seq += 1; e.seqNumber = seq; });
        
        // Seuraava miitti (Paikallinen aika)
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
            
            // Putkilaskuri (vain miitit)
            const currentEvent = eventsMap[eventId];
            const currentIsMiitti = currentEvent && isMiittiEvent(currentEvent);
            if (currentIsMiitti && !stats.isFirstTime && miittiEvents.length > 0) {
                const currentEventIndex = miittiEvents.findIndex(e => e.key === eventId);
                if (currentEventIndex > 0) {
                    const previousEventKey = miittiEvents[currentEventIndex - 1].key;
                    const attendedPrevious = userHistory.some(e => e.key === previousEventKey);
                    if (attendedPrevious) {
                        let streak = 0;
                        let globalIdx = currentEventIndex;
                        let historyIdx = userHistory.length - 1;
                        while (globalIdx >= 0 && historyIdx >= 0) {
                            if (miittiEvents[globalIdx].key === userHistory[historyIdx].key) { streak++; globalIdx--; historyIdx--; } else { break; }
                        }
                        stats.streakText = window.MK_Messages.getStreakMessage(streak);
                        stats.streakCount = streak;
                        const startEvent = miittiEvents[globalIdx + 1];
                        if (startEvent) {
                            const num = startEvent.seqNumber ? `#${startEvent.seqNumber}` : "";
                            stats.streakStartLabel = `${num} ${startEvent.name}`.trim();
                        }
                    } else {
                        const lastVisitEvent = userHistory[userHistory.length - 2];
                        if (lastVisitEvent) {
                            const daysDiff = Math.floor((new Date() - new Date(lastVisitEvent.date)) / (1000 * 60 * 60 * 24));
                            const lastVisitGlobalIndex = miittiEvents.findIndex(e => e.key === lastVisitEvent.key);
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

window.setVisitorExpiredState = function(isExpired) {
    window.isVisitorExpired = isExpired;
    const form = document.querySelector('#visitor-view .card-form');
    const expiredEl = document.getElementById('vv-expired');
    const t = visitorTranslations[currentLang] || visitorTranslations.fi;
    if (expiredEl) {
        expiredEl.style.display = isExpired ? 'block' : 'none';
        expiredEl.innerText = isExpired ? `${t.expiredTitle}\n${t.expiredBody}` : '';
    }
    if (form) {
        form.style.opacity = isExpired ? '0.5' : '1';
        form.querySelectorAll('input, textarea, button').forEach(el => {
            if (el.id !== 'btn-lang-fi' && el.id !== 'btn-lang-en' && el.id !== 'btn-lang-sv' && el.id !== 'btn-lang-et') {
                el.disabled = isExpired;
            }
        });
    }
};

window.updateVisitorExpiryNotice = function() {
    const el = document.getElementById('vv-expiry-info');
    if (!el || !window.visitorExpiryUntil) return;
    const t = visitorTranslations[currentLang] || visitorTranslations.fi;
    const dateText = window.visitorExpiryUntil.date || "";
    const timeText = window.visitorExpiryUntil.time || "";
    if (!t.expiryUntil || !dateText || !timeText) return;
    el.innerText = t.expiryUntil.replace('{0}', dateText).replace('{1}', timeText);
};

function showVisitorModalWithLang(nick, history, stats) {
    const modal = document.getElementById('user-profile-modal');
    if(!modal) return;
    const t = visitorTranslations[currentLang];

    // 1. SIIVOTAAN PÖYTÄ: Poistetaan kaikki vanhat "Visitor UI" -elementit
    const oldFooter = document.getElementById('visitor-custom-footer');
    if (oldFooter) oldFooter.remove();

    // 2. PIILOTETAAN ALKUPERÄINEN SULJE-NAPPI (Jätetään se ehjäksi Adminia varten)
    // Etsitään modal-contentin sisällä oleva punainen nappi
    const modalContent = modal.querySelector('.modal-content');
    const defaultClose = modalContent.querySelector('.btn-red');
    if (defaultClose) defaultClose.style.display = 'none';

    // 3. PÄIVITETÄÄN PERUSTIEDOT (Otsikot jne)
    document.getElementById('up-nickname').innerHTML = `<div style="font-size:0.8em; color:#888; margin-bottom:5px;">${stats.title || ""}</div>${stats.greeting}`;
    document.getElementById('up-nickname').style.color = stats.isFirstTime ? "#d32f2f" : "var(--header-color)";
    document.getElementById('up-total').innerText = stats.totalVisits;

    let badgeEl = document.getElementById('up-badge');
    if (!badgeEl) {
        badgeEl = document.createElement('div');
        badgeEl.id = 'up-badge';
        badgeEl.className = 'visitor-badge';
        document.getElementById('up-nickname').insertAdjacentElement('afterend', badgeEl);
    }
    let badgeText = "";
    if (stats.isFirstTime && t.badgeFirst) {
        badgeText = t.badgeFirst;
    } else if (stats.streakCount > 1 && t.badgeStreak) {
        badgeText = t.badgeStreak.replace('{0}', stats.streakCount);
    } else if (stats.isMilestone && t.badgeMilestone) {
        badgeText = t.badgeMilestone;
    } else if (t.badges && t.badges.length > 0) {
        badgeText = t.badges[Math.floor(Math.random() * t.badges.length)];
    }
    badgeEl.innerText = badgeText;
    
    // 4. HISTORIALISTAN PÄIVITYS
    const listEl = document.getElementById('up-history-list');
    listEl.innerHTML = "";

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
            const streakInfo = (stats.streakCount > 1 && stats.streakStartLabel)
                ? `<div style="margin-top:6px; font-size:0.9em; color:#888;">${t.streakInfo.replace('{0}', stats.streakCount).replace('{1}', stats.streakStartLabel)}</div>`
                : "";
            infoBox.innerHTML = stats.streakText + streakInfo;
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

    // 5. RAKENNETAAN "VISITOR FOOTER" (Täysin uusi alue)
    const footer = document.createElement('div');
    footer.id = 'visitor-custom-footer';
    footer.style.marginTop = "20px";

    // A) Seuraava miitti -laatikko
    const nextBox = document.createElement('div');
    nextBox.style.marginBottom = "15px";
    nextBox.style.padding = "10px";
    nextBox.style.background = "var(--highlight-bg)";
    nextBox.style.border = "1px solid var(--border-color)";
    nextBox.style.borderRadius = "5px";
    nextBox.style.textAlign = "center";
    
    if (stats.nextEvent) {
         nextBox.innerHTML = `<strong style="color:var(--secondary-color);">${t.nextEventTitle}</strong><br><span style="font-size:1.1em; font-weight:bold;">${stats.nextEvent.date}</span><br>${stats.nextEvent.name}`;
    } else {
         nextBox.innerHTML = `<span style="color:#888; font-style:italic;">${t.noNextEvent}</span>`;
    }
    footer.appendChild(nextBox);

    // B) Napit
    const btnGeo = document.createElement('button');
    btnGeo.className = "btn btn-green";
    btnGeo.style.fontSize = "1.1em";
    btnGeo.style.marginBottom = "10px";
    btnGeo.innerText = t.visitGeoBtn;
    btnGeo.onclick = function() { closeAndResetVisitorModal(true); };
    
    const btnNew = document.createElement('button');
    btnNew.className = "btn btn-blue";
    btnNew.style.background = "#555";
    btnNew.innerText = t.logAnotherBtn;
    btnNew.onclick = function() { closeAndResetVisitorModal(false); };

    footer.appendChild(btnGeo);
    footer.appendChild(btnNew);

    // 6. LISÄTÄÄN FOOTER MODAALIIN (Aina viimeiseksi)
    modalContent.appendChild(footer);

    // 7. NÄYTETÄÄN MODAALI
    modal.style.display = 'block';

    if (window.triggerConfetti) {
        if (stats.isMilestone) window.triggerConfetti(200, 2);
        else window.triggerConfetti(50, 0.5);
    }
}

// Tämä funktio palauttaa kaiken ennalleen
function closeAndResetVisitorModal(goToGeo) {
    const modal = document.getElementById('user-profile-modal');
    if(!modal) return;

    // 1. Piilotetaan modaali
    modal.style.display = 'none';

    // 2. Poistetaan luomamme Visitor Footer kokonaan
    const footer = document.getElementById('visitor-custom-footer');
    if (footer) footer.remove();

    // 3. Palautetaan alkuperäinen Admin "Sulje"-nappi
    const modalContent = modal.querySelector('.modal-content');
    const defaultClose = modalContent.querySelector('.btn-red');
    if (defaultClose) defaultClose.style.display = 'block';

    // 4. Tyhjennetään inputit seuraavaa varten
    ['vv-nickname', 'vv-from', 'vv-message'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = "";
    });

    // 5. Ohjaus tai fokusointi
    if (goToGeo) {
        if (typeof proceedToGeo === 'function') proceedToGeo();
    } else {
        setTimeout(() => { 
            const el = document.getElementById('vv-nickname');
            if(el) el.focus();
        }, 300);
    }
}
