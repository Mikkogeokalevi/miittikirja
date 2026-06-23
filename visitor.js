// ==========================================
// MK MIITTIKIRJA - VISITOR.JS
// Versio: 1.4.4 - Clearer Finnish wording
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
        savingMsg: "Tallennetaan...",
        savedMsg: "Kirjaus tallennettu!",
        closeBtn: "Sulje",
        visitGeoBtn: "Jatka miittisivulle ➡",
        logAnotherBtn: "Kirjaa toinen kävijä 👤",
        preSignMessageTitle: "📝 Järjestäjän viesti ennen kirjausta",
        nextEventTitle: "🔮 Seuraava miitti:",
        noNextEvent: "Ei tiedossa olevia tulevia miittejä.",
        specialMessageTitle: "🎁 Järjestäjän erikoisviesti",
        expiryUntil: "⏳ Tämä kirjausikkuna voimassa {0} klo {1} asti.",
        streakInfo: "Putki: {0} miittiä (alkaa {1})",
        badgeFirst: "Ensikertalainen!",
        badgeStreak: "Putki käynnissä: {0}",
        badgeMilestone: "Juhlakerta!",
        badges: ["Hyvä meininki!", "Tervetuloa takaisin!", "Kiitos kun piipahdit!", "Legendaarinen kävijä!"],
        expiredTitle: "⛔ Kirjaus on sulkeutunut",
        expiredBody: "Tämä QR‑koodi on voimassa vain 3 päivää tapahtuman jälkeen.",
        expiredAlert: "Kirjaus on sulkeutunut. QR‑koodi ei ole enää voimassa.",
        quickSignBtn: "⚡ Kirjaa muistetuilla tiedoilla ({0})",
        duplicateInfoTime: "Kirjaus löytyi jo ({0}). Voit halutessasi päivittää vain viestin.",
        duplicateInfoNoTime: "Kirjaus löytyi jo. Voit halutessasi päivittää vain viestin.",
        duplicateUpdateBtn: "Päivitä viesti aiempaan kirjaukseen",
        duplicateUpdateNeedMsg: "Kirjoita ensin viesti, jonka haluat päivittää.",
        duplicateUpdated: "Aiemman kirjauksen viesti päivitetty.",
        queueSaved: "Yhteys katkesi — kirjaus tallennettiin jonoon ({0}). Lähetetään automaattisesti kun yhteys palaa.",
        queueSavedUpdate: "Yhteys katkesi — viestin päivitys tallennettiin jonoon ({0}).",
        queueFlushed: "Jonosta lähetetty kirjauksia: {0}",
        miniVisits: "Käynnit",
        miniWordsLocal: "Sanoja Miittikirjassa",
        miniWordsNet: "Sanoja Geocaching.comissa",
        miniWordsTotal: "Sanoja yhteensä",
        miniWordsAvg: "Keskiarvo / kirjaus",
        miniWordsMax: "Pisin {0}",
        miniWordsSummaryTitle: "Viestiyhteenveto",
        miniWordsSummaryHelp: "Näet tässä omien kirjauksiesi sanamäärät lähteittäin.",
        miniStreakNow: "Tämä on sinun {0}. Mikkokalevin miitti putkeen",
        miniStreak: "Putki",
        miniMilestone: "Seuraava",
        miniMilestoneMissing: "Puuttuu {0}",
        fuzzyDidYouMean: "Tarkoititko: {0}?",
        rememberedPrefillStatus: "Muistetut tiedot (myös viesti) lisätty kenttiin. Tarkista ja paina TALLENNA KÄYNTI."
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
        savingMsg: "Saving...",
        savedMsg: "Entry saved!",
        closeBtn: "Close",
        visitGeoBtn: "Go to Event Page ➡",
        logAnotherBtn: "Log another person 👤",
        preSignMessageTitle: "📝 Organizer message before sign-in",
        nextEventTitle: "🔮 Next Event:",
        noNextEvent: "No upcoming events known.",
        specialMessageTitle: "🎁 Organizer's special message",
        expiryUntil: "⏳ This sign-in window is open until {0} at {1}.",
        streakInfo: "Streak: {0} events (starts at {1})",
        badgeFirst: "First timer!",
        badgeStreak: "Streak active: {0}",
        badgeMilestone: "Milestone visit!",
        badges: ["Great to see you!", "Welcome back!", "Thanks for stopping by!", "Community star!"],
        expiredTitle: "⛔ Sign-in closed",
        expiredBody: "This QR code is valid only 3 days after the event.",
        expiredAlert: "Sign-in is closed. This QR code is no longer valid.",
        quickSignBtn: "⚡ Sign with remembered profile ({0})",
        duplicateInfoTime: "Existing sign-in found ({0}). You can update only the message.",
        duplicateInfoNoTime: "Existing sign-in found. You can update only the message.",
        duplicateUpdateBtn: "Update message in existing sign-in",
        duplicateUpdateNeedMsg: "Please write a message to update.",
        duplicateUpdated: "Existing sign-in message updated.",
        queueSaved: "Connection lost — entry queued ({0}). Will auto-send when back online.",
        queueSavedUpdate: "Connection lost — message update queued ({0}).",
        queueFlushed: "Queued entries sent: {0}",
        miniVisits: "Visits",
        miniWordsLocal: "Guestbook Words",
        miniWordsNet: "Geocaching.com Words",
        miniWordsTotal: "Words Total",
        miniWordsAvg: "Avg / log",
        miniWordsMax: "Longest {0}",
        miniWordsSummaryTitle: "Message Summary",
        miniWordsSummaryHelp: "This shows your word counts across your own sign-ins by source.",
        miniStreakNow: "Current streak: {0} events in a row",
        miniStreak: "Streak",
        miniMilestone: "Next",
        miniMilestoneMissing: "Remaining {0}",
        fuzzyDidYouMean: "Did you mean: {0}?",
        rememberedPrefillStatus: "Remembered profile (including message) loaded into fields. Review and press SIGN LOGBOOK."
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
        savingMsg: "Sparar...",
        savedMsg: "Loggen sparad!",
        closeBtn: "Stäng",
        visitGeoBtn: "Gå till eventsidan ➡",
        logAnotherBtn: "Logga en annan person 👤",
        preSignMessageTitle: "📝 Arrangörens meddelande före inloggning",
        nextEventTitle: "🔮 Nästa event:",
        noNextEvent: "Inga kommande event kända.",
        specialMessageTitle: "🎁 Arrangörens specialmeddelande",
        expiryUntil: "⏳ Den här inloggningen gäller till {0} kl {1}.",
        streakInfo: "Putke: {0} miittiä (startar {1})",
        badgeFirst: "Första gången!",
        badgeStreak: "Putke på gång: {0}",
        badgeMilestone: "Jubileumsbesök!",
        badges: ["Kul att se dig!", "Välkommen tillbaka!", "Tack för besöket!", "Gemenskapsstjärna!"],
        expiredTitle: "⛔ Inskrivningen är stängd",
        expiredBody: "Den här QR‑koden gäller bara 3 dagar efter eventet.",
        expiredAlert: "Inskrivningen är stängd. Den här QR‑koden är inte längre giltig.",
        quickSignBtn: "⚡ Signera med sparad profil ({0})",
        duplicateInfoTime: "Registrering finns redan ({0}). Du kan uppdatera endast meddelandet.",
        duplicateInfoNoTime: "Registrering finns redan. Du kan uppdatera endast meddelandet.",
        duplicateUpdateBtn: "Uppdatera meddelande i befintlig registrering",
        duplicateUpdateNeedMsg: "Skriv först ett meddelande att uppdatera.",
        duplicateUpdated: "Meddelandet uppdaterat i befintlig registrering.",
        queueSaved: "Uppkopplingen bröts — loggen köades ({0}). Skickas automatiskt när nätet är tillbaka.",
        queueSavedUpdate: "Uppkopplingen bröts — meddelandeuppdatering köades ({0}).",
        queueFlushed: "Skickat från kö: {0}",
        miniVisits: "Besök",
        miniWordsLocal: "Gästbok ord",
        miniWordsNet: "Geocaching.com ord",
        miniWordsTotal: "Ord totalt",
        miniWordsAvg: "Snitt / logg",
        miniWordsMax: "Längsta {0}",
        miniWordsSummaryTitle: "Meddelandesammanfattning",
        miniWordsSummaryHelp: "Här ser du ordmängden i dina egna registreringar per källa.",
        miniStreakNow: "Nuvarande putke: {0} event i rad",
        miniStreak: "Putke",
        miniMilestone: "Nästa",
        miniMilestoneMissing: "Kvar {0}",
        fuzzyDidYouMean: "Menade du: {0}?",
        rememberedPrefillStatus: "Sparad profil (även meddelande) ifylld i fälten. Kontrollera och tryck SIGNERA LOGGBOKEN."
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
        savingMsg: "Salvestan...",
        savedMsg: "Kirje salvestatud!",
        closeBtn: "Sulge",
        visitGeoBtn: "Mine ürituse lehele ➡",
        logAnotherBtn: "Lisa teine külastaja 👤",
        preSignMessageTitle: "📝 Korraldaja sõnum enne registreerimist",
        nextEventTitle: "🔮 Järgmine üritus:",
        noNextEvent: "Tulevasi üritusi ei ole teada.",
        specialMessageTitle: "🎁 Korraldaja erisõnum",
        expiryUntil: "⏳ See registreerimisaken kehtib kuni {0} kell {1}.",
        streakInfo: "Seeria: {0} miitti (algab {1})",
        badgeFirst: "Esimest korda!",
        badgeStreak: "Seeria käib: {0}",
        badgeMilestone: "Tähtpäeva külastus!",
        badges: ["Hea meel sind näha!", "Tere tulemast tagasi!", "Aitäh külastamast!", "Kogukonna staar!"],
        expiredTitle: "⛔ Sisselogimine suletud",
        expiredBody: "See QR‑kood kehtib vaid 3 päeva pärast üritust.",
        expiredAlert: "Sisselogimine on suletud. See QR‑kood ei kehti enam.",
        quickSignBtn: "⚡ Logi salvestatud profiiliga ({0})",
        duplicateInfoTime: "Leidsin olemasoleva kirje ({0}). Soovi korral saad uuendada ainult sõnumit.",
        duplicateInfoNoTime: "Leidsin olemasoleva kirje. Soovi korral saad uuendada ainult sõnumit.",
        duplicateUpdateBtn: "Uuenda sõnum olemasolevas kirjes",
        duplicateUpdateNeedMsg: "Kirjuta kõigepealt sõnum, mida uuendada.",
        duplicateUpdated: "Olemasoleva kirje sõnum uuendatud.",
        queueSaved: "Võrguühendus katkes — kirje pandi järjekorda ({0}). Saadetakse automaatselt hiljem.",
        queueSavedUpdate: "Võrguühendus katkes — sõnumi uuendus pandi järjekorda ({0}).",
        queueFlushed: "Järjekorrast saadetud kirjeid: {0}",
        miniVisits: "Külastused",
        miniWordsLocal: "Külalisteraamatu sõnad",
        miniWordsNet: "Geocaching.com sõnad",
        miniWordsTotal: "Sõnu kokku",
        miniWordsAvg: "Keskm. / logi",
        miniWordsMax: "Pikim {0}",
        miniWordsSummaryTitle: "Sõnumi kokkuvõte",
        miniWordsSummaryHelp: "Siit näed oma kirjete sõnade arvu allikate kaupa.",
        miniStreakNow: "Praegune seeria: {0} järjestikust miitti",
        miniStreak: "Seeria",
        miniMilestone: "Järgmine",
        miniMilestoneMissing: "Puudu {0}",
        fuzzyDidYouMean: "Kas mõtlesid: {0}?",
        rememberedPrefillStatus: "Salvestatud profiil (koos sõnumiga) täideti väljadele. Kontrolli ja vajuta SALVESTA KÜLASTUS."
    }
};

let currentLang = 'fi';
window.isVisitorExpired = false;
let currentVisitorColorTheme = 'ocean';
const VISITOR_PROFILE_KEY = 'mk_visitor_profile';
const VISITOR_QUEUE_KEY = 'mk_visitor_queue';
let currentDuplicateContext = null;
let currentDuplicateMeta = null;
const visitorNicknameCacheByHost = {};
const ORGANIZER_NICKNAME_ALIASES = new Set(['mikkokalevi']);

function normalizeNickname(value) {
    return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isOrganizerNickname(normNick) {
    return ORGANIZER_NICKNAME_ALIASES.has(normNick || '');
}

function splitVisitorMessageSources(message) {
    const raw = (message || '').trim();
    if (!raw) return { local: '', net: '' };

    const parts = raw.split('|').map(p => p.trim()).filter(Boolean);
    const netParts = parts.filter(p => p.startsWith('🌐:')).map(p => p.replace(/^🌐:\s*/, '').trim()).filter(Boolean);
    const localParts = parts.filter(p => !p.startsWith('🌐:')).filter(Boolean);

    return {
        local: localParts.join(' | ').trim(),
        net: netParts.join(' | ').trim()
    };
}

function levenshteinDistance(a, b) {
    const left = a || '';
    const right = b || '';
    const matrix = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));

    for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= right.length; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= left.length; i += 1) {
        for (let j = 1; j <= right.length; j += 1) {
            const cost = left[i - 1] === right[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[left.length][right.length];
}

async function getVisitorNicknameIndex(targetHost) {
    if (visitorNicknameCacheByHost[targetHost]) {
        return visitorNicknameCacheByHost[targetHost];
    }

    const snap = await firebase.database().ref(`miitit/${targetHost}/logs`).once('value');
    const seen = new Set();
    const index = [];

    snap.forEach(eventLogs => {
        eventLogs.forEach(log => {
            const nick = (log.val()?.nickname || '').trim();
            if (!nick) return;
            const norm = normalizeNickname(nick);
            if (!norm || seen.has(norm)) return;
            seen.add(norm);
            index.push({ raw: nick, norm });
        });
    });

    visitorNicknameCacheByHost[targetHost] = index;
    return index;
}

function hideVisitorAutocomplete() {
    const list = document.getElementById('vv-autocomplete');
    if (!list) return;
    list.innerHTML = '';
    list.style.display = 'none';
}

function renderVisitorAutocomplete(items) {
    const list = document.getElementById('vv-autocomplete');
    const input = document.getElementById('vv-nickname');
    if (!list || !input) return;

    if (!items || !items.length) {
        hideVisitorAutocomplete();
        return;
    }

    list.innerHTML = '';
    items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'autocomplete-item';
        el.innerText = item.label;
        el.addEventListener('click', () => {
            input.value = item.value;
            hideVisitorAutocomplete();
        });
        list.appendChild(el);
    });

    list.style.display = 'block';
}

function findBestFuzzyNick(inputNorm, index) {
    if (!inputNorm || inputNorm.length < 3 || !Array.isArray(index) || !index.length) return null;

    let best = null;
    for (const item of index) {
        if (!item?.norm || item.norm === inputNorm) continue;

        const distance = levenshteinDistance(inputNorm, item.norm);
        const maxLen = Math.max(inputNorm.length, item.norm.length);
        const similarity = maxLen > 0 ? (1 - (distance / maxLen)) : 0;
        const threshold = maxLen <= 6 ? 1 : 2;

        if (distance > threshold || similarity < 0.65) continue;
        if (!best || distance < best.distance || (distance === best.distance && similarity > best.similarity)) {
            best = { raw: item.raw, distance, similarity };
        }
    }

    return best;
}

window.updateVisitorNicknameAssist = async function() {
    const input = document.getElementById('vv-nickname');
    if (!input) return;

    const val = input.value || '';
    const normalizedInput = normalizeNickname(val);
    if (normalizedInput.length < 2) {
        hideVisitorAutocomplete();
        return;
    }

    const targetHost = window.currentVisitorTargetUid || 'T8wI16Gf67W4G4yX3Cq7U0U1H6I2';
    let index = [];
    try {
        index = await getVisitorNicknameIndex(targetHost);
    } catch (err) {
        hideVisitorAutocomplete();
        return;
    }

    const exactExists = index.some(item => item.norm === normalizedInput);
    if (exactExists) {
        hideVisitorAutocomplete();
        return;
    }

    const prefixMatches = index
        .filter(item => item.norm.startsWith(normalizedInput))
        .slice(0, 5)
        .map(item => ({ label: item.raw, value: item.raw }));

    if (prefixMatches.length > 0) {
        renderVisitorAutocomplete(prefixMatches);
        return;
    }

    const fuzzyMatch = findBestFuzzyNick(normalizedInput, index);
    if (!fuzzyMatch) {
        hideVisitorAutocomplete();
        return;
    }

    const t = visitorTranslations[currentLang] || visitorTranslations.fi;
    const label = (t.fuzzyDidYouMean || 'Did you mean: {0}?').replace('{0}', fuzzyMatch.raw);
    renderVisitorAutocomplete([{ label, value: fuzzyMatch.raw }]);
};

window.setVisitorColorTheme = function(theme) {
    if (theme !== 'ocean' && theme !== 'forest') return;

    currentVisitorColorTheme = theme;
    document.body.setAttribute('data-visitor-theme', theme);

    const oceanBtn = document.getElementById('btn-vtheme-ocean');
    const forestBtn = document.getElementById('btn-vtheme-forest');
    if (oceanBtn) oceanBtn.classList.toggle('active', theme === 'ocean');
    if (forestBtn) forestBtn.classList.toggle('active', theme === 'forest');

    try {
        localStorage.setItem('mk_visitor_color_theme', theme);
    } catch (e) {
        // Ei kriittinen, jatketaan ilman pysyvyyttä
    }
};

function initVisitorColorTheme() {
    let savedTheme = 'ocean';
    try {
        const fromStorage = localStorage.getItem('mk_visitor_color_theme');
        if (fromStorage === 'ocean' || fromStorage === 'forest') {
            savedTheme = fromStorage;
        }
    } catch (e) {
        // localStorage ei käytettävissä, käytetään oletusta
    }
    window.setVisitorColorTheme(savedTheme);
}

function readJsonFromStorage(key, fallbackValue) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallbackValue;
        const parsed = JSON.parse(raw);
        return parsed ?? fallbackValue;
    } catch (e) {
        return fallbackValue;
    }
}

function writeJsonToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        // Non-critical
    }
}

function getSavedVisitorProfile() {
    return readJsonFromStorage(VISITOR_PROFILE_KEY, { nickname: '', from: '', message: '' });
}

function saveVisitorProfile(nickname, from, message) {
    writeJsonToStorage(VISITOR_PROFILE_KEY, {
        nickname: (nickname || '').trim(),
        from: (from || '').trim(),
        message: (message || '').trim()
    });
}

function getVisitorQueue() {
    return readJsonFromStorage(VISITOR_QUEUE_KEY, []);
}

function setVisitorQueue(queue) {
    writeJsonToStorage(VISITOR_QUEUE_KEY, Array.isArray(queue) ? queue : []);
}

function enqueueVisitorQueueItem(item) {
    const queue = getVisitorQueue();
    queue.push(item);
    setVisitorQueue(queue);
    return queue.length;
}

function formatVisitorTimestamp(ts) {
    if (!Number.isFinite(Number(ts))) return '';
    const date = new Date(Number(ts));
    if (!Number.isFinite(date.getTime())) return '';
    const locale = currentLang === 'fi' ? 'fi-FI' : currentLang === 'sv' ? 'sv-SE' : currentLang === 'et' ? 'et-EE' : 'en-GB';
    return date.toLocaleString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function isLikelyNetworkError(err) {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    return !navigator.onLine || msg.includes('network') || msg.includes('offline') || msg.includes('connection');
}

function hideDuplicatePanel() {
    const panel = document.getElementById('vv-duplicate-panel');
    if (panel) panel.style.display = 'none';
    currentDuplicateContext = null;
    currentDuplicateMeta = null;
}

function renderDuplicatePanel() {
    const panel = document.getElementById('vv-duplicate-panel');
    const info = document.getElementById('vv-duplicate-info');
    const btn = document.getElementById('btn-update-duplicate-message');
    const t = visitorTranslations[currentLang] || visitorTranslations.fi;
    if (!panel || !info || !btn || !currentDuplicateContext) {
        if (panel) panel.style.display = 'none';
        return;
    }

    const timeText = currentDuplicateMeta?.timestamp ? formatVisitorTimestamp(currentDuplicateMeta.timestamp) : '';
    info.innerText = timeText
        ? (t.duplicateInfoTime || '').replace('{0}', timeText)
        : (t.duplicateInfoNoTime || '');
    btn.innerText = t.duplicateUpdateBtn || 'Update message';
    panel.style.display = 'block';
}

window.renderVisitorQuickActions = function() {
    const box = document.getElementById('vv-quick-actions');
    if (!box) return;
    const t = visitorTranslations[currentLang] || visitorTranslations.fi;
    const profile = getSavedVisitorProfile();
    if (!profile.nickname) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
    }

    const label = (t.quickSignBtn || '').replace('{0}', profile.nickname);
    box.innerHTML = `<button class="btn btn-blue btn-small" style="width:100%;" onclick="useRememberedVisitorProfile()">${label}</button>`;
    box.style.display = 'block';
};

function initVisitorNicknameAssist() {
    const input = document.getElementById('vv-nickname');
    if (!input || input.dataset.fuzzyBound) return;

    input.addEventListener('input', () => {
        window.updateVisitorNicknameAssist();
    });

    input.addEventListener('focus', () => {
        if ((input.value || '').trim().length >= 2) {
            window.updateVisitorNicknameAssist();
        }
    });

    input.addEventListener('blur', () => {
        setTimeout(hideVisitorAutocomplete, 120);
    });

    input.dataset.fuzzyBound = '1';
}

window.useRememberedVisitorProfile = async function() {
    const t = visitorTranslations[currentLang] || visitorTranslations.fi;
    const profile = getSavedVisitorProfile();
    if (!profile.nickname) return;
    const nickEl = document.getElementById('vv-nickname');
    const fromEl = document.getElementById('vv-from');
    const msgEl = document.getElementById('vv-message');
    const statusEl = document.getElementById('vv-status');
    const errorEl = document.getElementById('vv-error');

    if (nickEl) nickEl.value = profile.nickname;
    if (fromEl) fromEl.value = profile.from || '';
    if (msgEl) msgEl.value = profile.message || '';
    if (msgEl && msgEl.classList) msgEl.classList.remove('input-error');
    if (errorEl) {
        errorEl.innerText = '';
        errorEl.style.display = 'none';
    }
    if (statusEl) {
        statusEl.innerText = t.rememberedPrefillStatus || 'Remembered profile loaded.';
        statusEl.style.display = 'block';
    }

    hideVisitorAutocomplete();
    if (nickEl && typeof nickEl.focus === 'function') nickEl.focus();
};

window.flushVisitorQueue = async function(showStatus = false) {
    const queue = getVisitorQueue();
    if (!queue.length) return 0;

    const remaining = [];
    let sent = 0;

    for (const item of queue) {
        try {
            if (item.type === 'updateMessage') {
                await firebase.database().ref(`miitit/${item.targetHost}/logs/${item.eventId}/${item.logKey}`).update({
                    message: item.message || '',
                    messageUpdatedAt: firebase.database.ServerValue.TIMESTAMP
                });
                sent += 1;
                continue;
            }

            const logsRef = firebase.database().ref(`miitit/${item.targetHost}/logs/${item.eventId}`);
            const snap = await logsRef.once('value');
            let exists = false;
            const queueNickNorm = normalizeNickname(item.nickname);
            snap.forEach(child => {
                const val = child.val() || {};
                if (normalizeNickname(val.nickname) === queueNickNorm) {
                    exists = true;
                }
            });

            if (!exists) {
                await logsRef.push({
                    nickname: item.nickname || '',
                    from: item.from || '',
                    message: item.message || '',
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                sent += 1;
            }
        } catch (err) {
            remaining.push(item);
        }
    }

    setVisitorQueue(remaining);

    if (showStatus && sent > 0) {
        const t = visitorTranslations[currentLang] || visitorTranslations.fi;
        const statusEl = document.getElementById('vv-status');
        if (statusEl) {
            statusEl.innerText = (t.queueFlushed || 'Queue sent: {0}').replace('{0}', sent);
            statusEl.style.display = 'block';
        }
    }

    return sent;
};

window.renderVisitorPreSignMessage = function() {
    const box = document.getElementById('vv-pre-special-message');
    if (!box) return;

    const t = visitorTranslations[currentLang] || visitorTranslations.fi;
    const msg = (typeof window.currentVisitorPreSignMessage === 'string')
        ? window.currentVisitorPreSignMessage.trim()
        : '';

    if (!msg) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
    }

    box.style.display = 'block';
    box.innerHTML = `
        <div class="visitor-pre-sign-message-title">${t.preSignMessageTitle || '📝 Järjestäjän viesti ennen kirjausta'}</div>
        <div></div>
    `;
    const body = box.querySelector('div:last-child');
    if (body) body.textContent = msg;
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVisitorColorTheme);
} else {
    initVisitorColorTheme();
}

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
    if (typeof window.renderVisitorPreSignMessage === 'function') {
        window.renderVisitorPreSignMessage();
    }
    if (typeof window.renderVisitorQuickActions === 'function') {
        window.renderVisitorQuickActions();
    }
    renderDuplicatePanel();

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
    const errorEl = document.getElementById('vv-error');
    const statusEl = document.getElementById('vv-status');
    const signBtn = document.getElementById('btn-visitor-sign');
    const setError = (msg) => {
        if (errorEl) {
            errorEl.innerText = msg || '';
            errorEl.style.display = msg ? 'block' : 'none';
        }
    };
    const setStatus = (msg) => {
        if (statusEl) {
            statusEl.innerText = msg || '';
            statusEl.style.display = msg ? 'block' : 'none';
        }
    };
    const setLoading = (isLoading) => {
        if (signBtn) {
            signBtn.disabled = isLoading;
            signBtn.classList.toggle('is-loading', isLoading);
        }
        const loadOverlay = document.getElementById('loading-overlay');
        if (loadOverlay) loadOverlay.style.display = isLoading ? 'flex' : 'none';
    };
    const clearFieldErrors = () => {
        ['vv-nickname', 'vv-from', 'vv-message'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('input-error');
        });
    };
    const markFieldError = (id) => {
        const el = document.getElementById(id);
        if (el) el.classList.add('input-error');
    };
    const focusField = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.focus();
            if (typeof el.select === 'function') el.select();
        }
    };

    clearFieldErrors();
    setError('');
    setStatus('');
    hideDuplicatePanel();
    hideVisitorAutocomplete();

    const nickInput = document.getElementById('vv-nickname');
    const fromInput = document.getElementById('vv-from');
    const msgInput = document.getElementById('vv-message');

    const nick = nickInput ? nickInput.value.trim() : "";
    const fromValue = fromInput ? fromInput.value.trim() : "";
    const messageValue = msgInput ? msgInput.value.trim() : "";
    if(!nick) {
        markFieldError('vv-nickname');
        setError(t.alertNick);
        focusField('vv-nickname');
        return;
    }

    saveVisitorProfile(nick, fromValue, messageValue);
    if (typeof window.renderVisitorQuickActions === 'function') {
        window.renderVisitorQuickActions();
    }

    const targetHost = window.currentVisitorTargetUid || "T8wI16Gf67W4G4yX3Cq7U0U1H6I2"; 
    const eventId = window.currentEventId;

    if (!eventId) return alert("Virhe: Tapahtuman tunnistetta ei löytynyt.");

    // Estä tuplapainallukset
    if (signBtn && signBtn.disabled) return;
    setLoading(true);
    setStatus(t.savingMsg || 'Tallennetaan...');

    if (navigator.onLine) {
        await window.flushVisitorQueue(false);
    }

    try {
        const currentLogsSnap = await firebase.database().ref('miitit/' + targetHost + '/logs/' + eventId).once('value');
        let alreadyLogged = false;
        let duplicateLog = null;
        let duplicateLogKey = null;
        const nickNorm = normalizeNickname(nick);
        currentLogsSnap.forEach(child => {
            const val = child.val();
            if (val.nickname && normalizeNickname(val.nickname) === nickNorm) {
                alreadyLogged = true;
                duplicateLog = val;
                duplicateLogKey = child.key;
            }
        });

        if (alreadyLogged) {
            setLoading(false);
            setError(t.alertDup.replace('{0}', nick));
            setStatus('');
            markFieldError('vv-nickname');
            currentDuplicateContext = { targetHost, eventId, logKey: duplicateLogKey, nick };
            currentDuplicateMeta = duplicateLog;
            renderDuplicatePanel();
            focusField('vv-message');
            return;
        }

        await firebase.database().ref('miitit/' + targetHost + '/logs/' + eventId).push({
            nickname: nick, 
            from: fromValue,
            message: messageValue,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

    } catch (saveErr) {
        console.error("Virhe:", saveErr);
        if (isLikelyNetworkError(saveErr)) {
            const queuedCount = enqueueVisitorQueueItem({
                type: 'create',
                targetHost,
                eventId,
                nickname: nick,
                from: fromValue,
                message: messageValue,
                queuedAt: Date.now()
            });
            setLoading(false);
            setError('');
            setStatus((t.queueSaved || 'Queued ({0})').replace('{0}', queuedCount));
            return;
        }
        setLoading(false);
        setStatus('');
        setError("System Error: " + saveErr.message);
        return;
    }

    // --- TILASTOJEN LASKENTA ---
    let userHistory = null;
    const preloadedSpecialMessage = (typeof window.currentVisitorSpecialMessage === 'string')
        ? window.currentVisitorSpecialMessage.trim()
        : "";
    let stats = {
        isFirstTime: false,
        totalVisits: 0,
        title: "",
        greeting: "",
        streakText: "",
        isMilestone: false,
        nextEvent: null,
        streakCount: 0,
        streakStartLabel: "",
        rankPosition: 0,
        rankTotal: 0,
        rankPercentile: 0,
        topBuddies: [],
        messageWordLocalTotal: 0,
        messageWordNetTotal: 0,
        messageWordTotal: 0,
        messageWordAvg: 0,
        messageWordMax: 0,
        specialMessage: preloadedSpecialMessage
    };

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
        const nickNorm = normalizeNickname(nick);

        const eventAttendees = {};
        const visitCountByNick = {};

        logsSnap.forEach(evtLogs => {
            const eventKey = evtLogs.key;
            const evtData = eventsMap[eventKey];
            if (evtData) {
                let attended = false;

                const attendees = new Set();
                evtLogs.forEach(log => {
                    const val = log.val();
                    if (!val || !val.nickname) return;
                    const ln = normalizeNickname(val.nickname);
                    if (!ln) return;
                    attendees.add(ln);

                    if (ln === nickNorm) {
                        attended = true;
                        const msg = (val.message || '').trim();
                        if (msg) {
                            const split = splitVisitorMessageSources(msg);
                            const localWords = split.local ? split.local.split(/\s+/).filter(Boolean).length : 0;
                            const netWords = split.net ? split.net.split(/\s+/).filter(Boolean).length : 0;
                            const words = localWords + netWords;

                            stats.messageWordLocalTotal += localWords;
                            stats.messageWordNetTotal += netWords;
                            stats.messageWordTotal += words;
                            if (words > stats.messageWordMax) stats.messageWordMax = words;
                        }
                    }
                });

                if (attendees.size > 0) {
                    eventAttendees[eventKey] = attendees;
                    attendees.forEach(n => {
                        visitCountByNick[n] = (visitCountByNick[n] || 0) + 1;
                    });
                }
                if (attended) userHistory.push(evtData);
            }
        });

        if (isOrganizerNickname(nickNorm)) {
            const currentEvent = eventsMap[eventId];
            const currentEventDate = currentEvent?.date || '';
            miittiEvents.forEach(evt => {
                if (currentEventDate && evt.date > currentEventDate) return;
                if (!userHistory.some(h => h.key === evt.key)) {
                    userHistory.push(evt);

                    const set = eventAttendees[evt.key];
                    if (set && !set.has(nickNorm)) {
                        set.add(nickNorm);
                        visitCountByNick[nickNorm] = (visitCountByNick[nickNorm] || 0) + 1;
                    }
                }
            });
        }

        userHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        stats.totalVisits = userHistory.length;
        stats.isFirstTime = (stats.totalVisits <= 1);
        stats.isMilestone = (stats.totalVisits % 10 === 0) || stats.isFirstTime;
        stats.messageWordAvg = stats.totalVisits > 0
            ? Math.round((stats.messageWordTotal / stats.totalVisits) * 10) / 10
            : 0;

        const counts = Object.entries(visitCountByNick)
            .filter(([k]) => !!k)
            .sort((a, b) => b[1] - a[1]);
        stats.rankTotal = counts.length;
        if (stats.rankTotal > 0) {
            const position = counts.findIndex(([k]) => k === nickNorm);
            stats.rankPosition = position >= 0 ? position + 1 : stats.rankTotal;
            stats.rankPercentile = Math.round((1 - ((stats.rankPosition - 1) / stats.rankTotal)) * 100);
        }

        const buddyCounts = {};
        userHistory.forEach(evt => {
            const set = eventAttendees[evt.key];
            if (!set) return;
            set.forEach(other => {
                if (!other || other === nickNorm) return;
                if (isOrganizerNickname(other)) return;
                buddyCounts[other] = (buddyCounts[other] || 0) + 1;
            });
        });
        stats.topBuddies = Object.entries(buddyCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        const currentEvent = eventsMap[eventId];
        if (currentEvent && typeof currentEvent.specialMessage === 'string') {
            stats.specialMessage = currentEvent.specialMessage.trim();
        }

        if (window.MK_Messages) {
            stats.title = window.MK_Messages.getRankTitle(stats.totalVisits);
            
            // Valitaan viestityyppi satunnaisesti
            const greetingType = Math.random();
            let greeting;
            
            if (stats.isFirstTime) {
                // Ensikertalaisille - 15 vaihtoehtoa
                greeting = window.MK_Messages.getRandomGreeting(nick, stats.isFirstTime);
            } else if (greetingType < 0.3) {
                // 30%: Päivän mukaan vaihtuva viesti
                greeting = window.MK_Messages.getDailyGreeting(nick);
            } else if (greetingType < 0.6) {
                // 30%: Ajan mukaan vaihtuva viesti  
                greeting = window.MK_Messages.getTimeBasedGreeting(nick);
            } else {
                // 40%: Perinteinen satunnainen viesti
                greeting = window.MK_Messages.getRandomGreeting(nick, false);
            }
            
            stats.greeting = greeting;
            
            // Putkilaskuri (vain miitit)
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

    setLoading(false);
    setError('');
    setStatus(t.savedMsg || 'Tallennettu');
    showVisitorModalWithLang(nick, userHistory, stats);
};

window.updateDuplicateLogMessage = async function() {
    const t = visitorTranslations[currentLang] || visitorTranslations.fi;
    const msgInput = document.getElementById('vv-message');
    const errorEl = document.getElementById('vv-error');
    const statusEl = document.getElementById('vv-status');
    const btn = document.getElementById('btn-update-duplicate-message');

    const setError = (msg) => {
        if (!errorEl) return;
        errorEl.innerText = msg || '';
        errorEl.style.display = msg ? 'block' : 'none';
    };
    const setStatus = (msg) => {
        if (!statusEl) return;
        statusEl.innerText = msg || '';
        statusEl.style.display = msg ? 'block' : 'none';
    };

    if (!currentDuplicateContext || !currentDuplicateContext.logKey) return;

    const newMessage = msgInput ? msgInput.value.trim() : '';
    if (!newMessage) {
        setError(t.duplicateUpdateNeedMsg || 'Write message first.');
        if (msgInput) msgInput.classList.add('input-error');
        return;
    }

    if (msgInput) msgInput.classList.remove('input-error');
    setError('');

    if (btn) btn.disabled = true;
    try {
        await firebase.database().ref(`miitit/${currentDuplicateContext.targetHost}/logs/${currentDuplicateContext.eventId}/${currentDuplicateContext.logKey}`).update({
            message: newMessage,
            messageUpdatedAt: firebase.database.ServerValue.TIMESTAMP
        });
        hideDuplicatePanel();
        setStatus(t.duplicateUpdated || 'Updated.');
    } catch (err) {
        if (isLikelyNetworkError(err)) {
            const queuedCount = enqueueVisitorQueueItem({
                type: 'updateMessage',
                targetHost: currentDuplicateContext.targetHost,
                eventId: currentDuplicateContext.eventId,
                logKey: currentDuplicateContext.logKey,
                message: newMessage,
                queuedAt: Date.now()
            });
            setStatus((t.queueSavedUpdate || 'Update queued ({0})').replace('{0}', queuedCount));
            hideDuplicatePanel();
        } else {
            setError(`System Error: ${err.message}`);
        }
    } finally {
        if (btn) btn.disabled = false;
    }
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
    const oldSpecialMessage = document.getElementById('up-special-message-box');
    if (oldSpecialMessage) oldSpecialMessage.remove();

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

    const oldDashboard = document.getElementById('up-visitor-mini-dashboard');
    if (oldDashboard) oldDashboard.remove();

    const streakLine = (stats.streakCount > 1)
        ? (t.miniStreakNow || 'Current streak: {0} events in a row').replace('{0}', stats.streakCount)
        : '';

    const miniDashboard = document.createElement('div');
    miniDashboard.id = 'up-visitor-mini-dashboard';
    miniDashboard.className = 'visitor-mini-dashboard';
    miniDashboard.innerHTML = `
        <div class="visitor-summary-card">
            <div class="visitor-summary-title">${t.miniWordsSummaryTitle || 'Message Summary'}</div>
            <div class="visitor-summary-help">${t.miniWordsSummaryHelp || 'This shows your word counts across your own sign-ins by source.'}</div>

            <div class="visitor-summary-metrics">
                <div class="visitor-summary-metric">
                    <span class="visitor-summary-metric-label">${t.miniWordsLocal || 'Guestbook Words'}</span>
                    <span class="visitor-summary-metric-value">${stats.messageWordLocalTotal || 0}</span>
                </div>
                <div class="visitor-summary-metric">
                    <span class="visitor-summary-metric-label">${t.miniWordsNet || 'Geocaching.com Words'}</span>
                    <span class="visitor-summary-metric-value">${stats.messageWordNetTotal || 0}</span>
                </div>
            </div>

            <div class="visitor-summary-line">
                ${t.miniWordsTotal || 'Words Total'}: <strong>${stats.messageWordTotal || 0}</strong>
                · ${t.miniWordsAvg || 'Avg / log'}: <strong>${stats.messageWordAvg || 0}</strong>
            </div>
            ${streakLine ? `<div class="visitor-summary-line visitor-summary-streak">${streakLine}</div>` : ''}
        </div>
    `;
    badgeEl.insertAdjacentElement('afterend', miniDashboard);

    const oldSocialCard = document.getElementById('up-visitor-social-card');
    if (oldSocialCard) oldSocialCard.remove();
    const hasRank = (stats.rankTotal || 0) > 0 && (stats.rankPosition || 0) > 0;
    const hasBuddies = Array.isArray(stats.topBuddies) && stats.topBuddies.length > 0;
    if (hasRank || hasBuddies) {
        const social = document.createElement('div');
        social.id = 'up-visitor-social-card';
        social.className = 'visitor-special-message';
        const rankLine = hasRank
            ? `<div style="margin-top:6px;">🏅 Kävijärank: <strong>${stats.rankPosition}</strong> / ${stats.rankTotal} (top ${stats.rankPercentile}%)</div>`
            : '';
        const buddyHtml = hasBuddies
            ? `<div style="margin-top:10px;">
                    <div style="font-weight:bold; margin-bottom:6px;">🤝 Useimmin samoissa miiteissä</div>
                    ${stats.topBuddies.map(b => `<div class="stats-row"><span>${b.name}</span><strong>${b.count}</strong></div>`).join('')}
               </div>`
            : '';
        social.innerHTML = `
            <div class="visitor-special-message-title">📊 Sinun yhteisötilastot</div>
            ${rankLine}
            ${buddyHtml}
        `;
        badgeEl.insertAdjacentElement('afterend', social);
    }

    if (stats.specialMessage) {
        const specialBox = document.createElement('div');
        specialBox.id = 'up-special-message-box';
        specialBox.className = 'visitor-special-message';
        specialBox.innerHTML = `
            <div class="visitor-special-message-title">${t.specialMessageTitle || '🎁 Järjestäjän erikoisviesti'}</div>
            <div>${stats.specialMessage}</div>
        `;
        badgeEl.insertAdjacentElement('afterend', specialBox);
    }
    
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

    if (window.triggerSpecialEffect) {
            if (stats.isMilestone) {
                // Juhlakerrat - satunnainen erikoistehoste
                const effects = ['fireworks', 'matrix', 'hearts', 'stars', 'coins'];
                const randomEffect = effects[Math.floor(Math.random() * effects.length)];
                window.triggerSpecialEffect(randomEffect, 150, 2);
            } else {
                // Normaalit kirjaukset - pieni efektien sekoitus
                const effects = ['hearts', 'stars', 'snow', 'normal'];
                const randomEffect = effects[Math.floor(Math.random() * effects.length)];
                window.triggerSpecialEffect(randomEffect, 50, 1);
            }
    } else if (window.triggerConfetti) {
        // Fallback vanhaan systeemiin
        if (stats.isMilestone) window.triggerConfetti(200, 2);
        else window.triggerConfetti(50, 0.5);
    }
}

function initVisitorInputBindings() {
    ['vv-nickname', 'vv-from', 'vv-message'].forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.dataset.enterBound) return;
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.handleVisitorSign();
            }
        });
        el.dataset.enterBound = '1';
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initVisitorInputBindings();
        initVisitorNicknameAssist();
        if (typeof window.renderVisitorQuickActions === 'function') {
            window.renderVisitorQuickActions();
        }
        window.flushVisitorQueue(false);
    });
} else {
    initVisitorInputBindings();
    initVisitorNicknameAssist();
    if (typeof window.renderVisitorQuickActions === 'function') {
        window.renderVisitorQuickActions();
    }
    window.flushVisitorQueue(false);
}

window.addEventListener('online', () => {
    window.flushVisitorQueue(true);
});

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
    hideVisitorAutocomplete();
    hideDuplicatePanel();
    if (typeof window.renderVisitorQuickActions === 'function') {
        window.renderVisitorQuickActions();
    }

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
