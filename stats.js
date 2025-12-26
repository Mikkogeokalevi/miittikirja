// ==========================================
// STATS.JS - Tilastojen laskenta ja hienot graafit
// Versio: 7.2.0 (Smart Merge & WordCloud)
// ==========================================

let allStatsData = {
    events: [],
    attendees: {}
};

// Säilytetään kaavio-oliot tässä, jotta ne voidaan tuhota päivitettäessä
let chartInstances = {};

async function initStats() {
    if (!currentUser) return;
    loadingOverlay.style.display = 'flex';
    
    try {
        const eventsSnap = await db.ref('miitit/' + currentUser.uid + '/events').once('value');
        const events = [];
        eventsSnap.forEach(child => {
            events.push({ key: child.key, ...child.val() });
        });

        const logsSnap = await db.ref('miitit/' + currentUser.uid + '/logs').once('value');
        const logsData = logsSnap.val() || {};

        events.forEach(evt => {
            const evtLogs = logsData[evt.key] || {};
            // Smart Merge -logiikan ansiosta avaimet ovat uniikkeja per käyttäjä
            evt.attendeeCount = Object.keys(evtLogs).length;
            
            // Kerätään nimet ja viestit tilastoja varten
            evt.attendees = Object.values(evtLogs).map(l => ({
                nickname: l.nickname,
                message: l.message || "",
                gpxMessage: l.gpxMessage || ""
            }));
            evt.attendeeNames = evt.attendees.map(a => a.nickname);
        });

        allStatsData.events = events;
        populateYearFilter(events);
        updateStatsView(events);

    } catch (e) {
        console.error("Tilastojen lataus epäonnistui:", e);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

function populateYearFilter(events) {
    const yearSelect = document.getElementById('filter-year');
    if(!yearSelect) return;
    const years = [...new Set(events.map(e => e.date ? e.date.split('-')[0] : ""))].filter(y => y !== "").sort((a, b) => b - a);
    yearSelect.innerHTML = '<option value="">Kaikki vuodet</option>';
    years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.innerText = y;
        yearSelect.appendChild(opt);
    });
}

document.getElementById('btn-apply-filters').onclick = () => {
    const nameFilter = document.getElementById('search-miitti-name').value.toLowerCase();
    const userFilter = document.getElementById('search-user-name').value.toLowerCase();
    const yearFilter = document.getElementById('filter-year').value;
    const monthFilter = document.getElementById('filter-month').value;

    const filtered = allStatsData.events.filter(evt => {
        const matchName = evt.name ? evt.name.toLowerCase().includes(nameFilter) : false;
        const matchUser = userFilter === "" || (evt.attendeeNames && evt.attendeeNames.some(n => n.toLowerCase().includes(userFilter)));
        const matchYear = yearFilter === "" || (evt.date && evt.date.startsWith(yearFilter));
        const matchMonth = monthFilter === "" || (evt.date && evt.date.split('-')[1] === monthFilter);
        return matchName && matchUser && matchYear && matchMonth;
    });
    
    updateStatsView(filtered);
};

function updateStatsView(data) {
    window.currentFilteredData = data;

    // 1. Yhteenveto
    const totalAttendees = data.reduce((sum, e) => sum + e.attendeeCount, 0);
    const summaryEl = document.getElementById('stats-summary-text');
    if(summaryEl) {
        summaryEl.innerHTML = `
            Tapahtumia: <strong>${data.length}</strong> kpl<br>
            Osallistumisia yhteensä: <strong>${totalAttendees}</strong> kpl<br>
            Keskiarvo: <strong>${data.length ? (totalAttendees / data.length).toFixed(1) : 0}</strong> kävijää/miitti
        `;
    }

    // 2. Hakutulokset
    const resultsEl = document.getElementById('stats-results-list');
    if(resultsEl) {
        resultsEl.innerHTML = "";
        if (data.length === 0) resultsEl.innerHTML = "Ei hakua vastaavia miittejä.";
        else {
            const sortedResults = [...data].sort((a,b) => new Date(b.date) - new Date(a.date));
            sortedResults.forEach(evt => {
                const item = document.createElement('div');
                item.className = "result-item";
                item.style.padding = "5px";
                item.style.borderBottom = "1px solid #ccc";
                item.style.cursor = "pointer";
                item.innerHTML = `<strong>${evt.name}</strong><br><small>📅 ${evt.date} • 👤 ${evt.attendeeCount}</small>`;
                item.onclick = () => { if (window.openGuestbook) window.openGuestbook(evt.key); };
                resultsEl.appendChild(item);
            });
        }
    }

    // 3. Tekstilistat
    renderAlphabetStats(data);
    renderTopUsersList(data);
    renderLoyaltyStats(data); // Uusi: Yhteisöuskollisuus
    renderWordCloud(data);    // Uusi: Sanalouhos
    
    const filteredForLists = data.filter(e => !e.name.includes("/ PERUTTU /"));
    const sortedByCount = [...filteredForLists].sort((a, b) => b.attendeeCount - a.attendeeCount);
    
    const renderList = (list, elementId) => {
        const el = document.getElementById(elementId);
        if(!el) return;
        el.innerHTML = list.map((e, i) => `<div class="stats-row"><span>${i+1}. ${e.name}</span> <strong>${e.attendeeCount}</strong></div>`).join('') || "Ei tietoja.";
    };
    renderList(sortedByCount.slice(0, 10), 'stats-top-10');
    renderList([...sortedByCount].reverse().slice(0, 10), 'stats-bottom-10');

    // Sijainnit ja attribuutit tekstinä
    renderLocationsTable(data);
    renderAttributesList(data);

    // Päivitetään graafit heti jos välilehti on auki
    if(document.getElementById('tab-graphs').classList.contains('active')) {
        renderCharts(data);
    }
}

// ==========================================
// GRAAFIEN PIIRTÄMINEN (CHART.JS V4)
// ==========================================

function renderCharts(data) {
    if (!window.Chart || !data || data.length === 0) return;

    const clearChart = (id) => {
        if (chartInstances[id]) { chartInstances[id].destroy(); }
    };

    // Haetaan värit CSS-muuttujista (jos mahdollista), tai käytetään oletuksia
    const style = getComputedStyle(document.body);
    const colPrimary = style.getPropertyValue('--primary-color').trim() || '#8B4513';
    const colSecondary = style.getPropertyValue('--secondary-color').trim() || '#D2691E';
    const colAccent = style.getPropertyValue('--accent-color').trim() || '#4caf50';

    // --- 1. VIIKONPÄIVÄT ---
    clearChart('weekdays');
    const dayLabels = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"];
    const dayData = [0,0,0,0,0,0,0];
    data.forEach(e => { if(e.date) dayData[new Date(e.date).getDay()]++; });
    
    chartInstances['weekdays'] = new Chart(document.getElementById('chart-weekdays-canvas'), {
        type: 'bar',
        data: {
            labels: dayLabels,
            datasets: [{ label: 'Miitit', data: dayData, backgroundColor: colPrimary }]
        }
    });

    // --- 2. MIITTITYYPIT ---
    clearChart('types');
    const typeCounts = { miitti: 0, cito: 0, cce: 0 };
    data.forEach(e => { if(typeCounts[e.type] !== undefined) typeCounts[e.type]++; });

    chartInstances['types'] = new Chart(document.getElementById('chart-types-canvas'), {
        type: 'doughnut',
        data: {
            labels: ["Miitti", "CITO", "CCE"],
            datasets: [{ data: Object.values(typeCounts), backgroundColor: [colPrimary, colAccent, colSecondary] }]
        }
    });

    // --- 3. TRENDI (Viimeisimmät 15) ---
    clearChart('timeline');
    const timelineData = [...data].sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-15);
    chartInstances['timeline'] = new Chart(document.getElementById('chart-timeline-canvas'), {
        type: 'line',
        data: {
            labels: timelineData.map(e => e.date.split('-').slice(1).reverse().join('.')),
            datasets: [{ 
                label: 'Kävijät', 
                data: timelineData.map(e => e.attendeeCount),
                borderColor: colPrimary, backgroundColor: 'rgba(139, 69, 19, 0.2)', fill: true, tension: 0.4
            }]
        }
    });

    // --- 4. KELLONAJAT ---
    clearChart('hours');
    const hoursData = Array(24).fill(0);
    data.forEach(e => {
        if(e.time) {
            const hour = parseInt(e.time.split(':')[0]);
            if(!isNaN(hour)) hoursData[hour]++;
        }
    });
    chartInstances['hours'] = new Chart(document.getElementById('chart-hours-canvas'), {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => i + ":00"),
            datasets: [{ label: 'Miitit', data: hoursData, backgroundColor: colSecondary }]
        }
    });

    // --- 5. KUUKAUDET ---
    clearChart('months');
    const monthsData = Array(12).fill(0);
    const monthNames = ["Tam", "Hel", "Maa", "Huh", "Tou", "Kes", "Hei", "Elo", "Syy", "Lok", "Mar", "Jou"];
    data.forEach(e => {
        if(e.date) {
            const m = new Date(e.date).getMonth();
            monthsData[m] += e.attendeeCount;
        }
    });
    chartInstances['months'] = new Chart(document.getElementById('chart-months-canvas'), {
        type: 'bar',
        data: {
            labels: monthNames,
            datasets: [{ label: 'Kävijämäärä yhteensä', data: monthsData, backgroundColor: colAccent }]
        }
    });

    // --- 6. PAIKKAKUNNAT (Top 10) ---
    clearChart('locations');
    const locMap = {};
    data.forEach(e => { if (e.location) locMap[e.location] = (locMap[e.location] || 0) + 1; });
    const sortedLocs = Object.entries(locMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    
    chartInstances['locations'] = new Chart(document.getElementById('chart-locations-canvas'), {
        type: 'bar',
        data: {
            labels: sortedLocs.map(x => x[0]),
            datasets: [{ label: 'Miitit', data: sortedLocs.map(x => x[1]), backgroundColor: colPrimary }]
        },
        options: { indexAxis: 'y' }
    });

    // --- 7. TOP 10 KÄVIJÄT ---
    clearChart('topAttendees');
    const userMap = {};
    data.forEach(e => e.attendeeNames.forEach(n => userMap[n] = (userMap[n] || 0) + 1));
    const topUsers = Object.entries(userMap).sort((a,b) => b[1] - a[1]).slice(0, 10);

    chartInstances['topAttendees'] = new Chart(document.getElementById('chart-top-attendees-canvas'), {
        type: 'bar',
        data: {
            labels: topUsers.map(x => x[0]),
            datasets: [{ label: 'Käynnit', data: topUsers.map(x => x[1]), backgroundColor: colSecondary }]
        },
        options: { indexAxis: 'y' }
    });

    // --- 8. TOP 10 MIITIT ---
    clearChart('topEvents');
    const topEvents = [...data].sort((a,b) => b.attendeeCount - a.attendeeCount).slice(0, 10);
    chartInstances['topEvents'] = new Chart(document.getElementById('chart-top-events-canvas'), {
        type: 'bar',
        data: {
            labels: topEvents.map(x => x.name.substring(0, 15) + "..."),
            datasets: [{ label: 'Osallistujat', data: topEvents.map(x => x.attendeeCount), backgroundColor: colAccent }]
        }
    });

    // --- 9. ATTRIBUUTIT ---
    clearChart('attrs');
    const attrMap = {};
    data.forEach(e => {
        if(e.attributes) e.attributes.forEach(a => {
            if(a.inc === 1) { // Vain positiiviset
                const name = a.name || a;
                attrMap[name] = (attrMap[name] || 0) + 1;
            }
        });
    });
    const topAttrs = Object.entries(attrMap).sort((a,b) => b[1] - a[1]).slice(0, 10);
    chartInstances['attrs'] = new Chart(document.getElementById('chart-attributes-canvas'), {
        type: 'bar',
        data: {
            labels: topAttrs.map(x => x[0]),
            datasets: [{ label: 'Esiintyvyys', data: topAttrs.map(x => x[1]), backgroundColor: colPrimary }]
        },
        options: { indexAxis: 'y' }
    });
}

// ==========================================
// APUFUNKTIOT LISTOILLE
// ==========================================

function renderAlphabetStats(data) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ0123456789".split("");
    const counts = {};
    const specialChars = {};
    data.forEach(e => {
        if(e.name) {
            const firstChar = e.name.trim().charAt(0).toUpperCase();
            if (chars.includes(firstChar)) counts[firstChar] = (counts[firstChar] || 0) + 1;
            else specialChars[firstChar] = (specialChars[firstChar] || 0) + 1;
        }
    });
    const grid = document.getElementById('stats-alphabet');
    if(grid) grid.innerHTML = chars.map(c => `<div class="char-box ${!counts[c] ? 'empty' : ''}">${c}<br><small>${counts[c] || 0}</small></div>`).join('');
    const specialEl = document.getElementById('stats-special-chars');
    if(specialEl) {
        const entries = Object.entries(specialChars);
        specialEl.innerHTML = entries.length ? "<strong>Muut merkit:</strong><br>" + entries.map(([ch, n]) => `${ch} (${n})`).join(', ') : "";
    }
}

function renderTopUsersList(data) {
    const map = {};
    data.forEach(e => { if(e.attendeeNames) e.attendeeNames.forEach(n => map[n] = (map[n] || 0) + 1); });
    const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 10);
    const el = document.getElementById('stats-top-users');
    if(el) el.innerHTML = sorted.map(([name, count], i) => `
        <div class="stats-row" style="cursor:pointer" onclick="document.getElementById('search-user-name').value='${name}'; document.getElementById('btn-apply-filters').click(); switchStatsTab('tab-lists', document.querySelector('.tab-btn:first-child'));">
            <span>${i+1}. ${name}</span> <strong>${count} miittiä</strong>
        </div>`).join('');
}

function renderLocationsTable(data) {
    const map = {};
    data.forEach(e => { if (e.location) map[e.location] = (map[e.location] || 0) + 1; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const el = document.getElementById('stats-locations');
    if(el) el.innerHTML = sorted.map(([loc, n]) => `<div class="stats-row"><span>${loc}</span> <strong>${n}</strong></div>`).join('');
}

function renderAttributesList(data) {
    const map = {};
    data.forEach(e => {
        if (e.attributes && Array.isArray(e.attributes)) {
            e.attributes.forEach(attr => {
                const name = attr.name || attr;
                const isNeg = (attr.inc === 0);
                if (!map[name]) map[name] = { pos: 0, neg: 0 };
                if (isNeg) map[name].neg++; else map[name].pos++;
            });
        }
    });
    const el = document.getElementById('stats-attributes');
    if(!el) return;
    el.innerHTML = "";
    Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, counts]) => {
        if (counts.pos > 0) el.innerHTML += `<div class="stats-row"><span>${name}</span> <strong>${counts.pos}</strong></div>`;
        if (counts.neg > 0) el.innerHTML += `<div class="stats-row"><span style="color:#721c24; text-decoration:line-through; opacity:0.7;">${name}</span> <strong>${counts.neg}</strong></div>`;
    });
}

// UUSI: Yhteisöuskollisuus (Kuinka moni käynyt useammassa miitissä)
function renderLoyaltyStats(data) {
    const userMap = {};
    data.forEach(e => {
        if(e.attendeeNames) e.attendeeNames.forEach(n => userMap[n] = (userMap[n] || 0) + 1);
    });
    
    // Lasketaan frekvenssit: 1 miitti, 2-5 miittiä, >5 miittiä
    let once = 0, few = 0, many = 0;
    const totalUsers = Object.keys(userMap).length;
    
    Object.values(userMap).forEach(count => {
        if(count === 1) once++;
        else if(count <= 5) few++;
        else many++;
    });

    const el = document.getElementById('stats-loyalty');
    if(el && totalUsers > 0) {
        el.innerHTML = `
            <div class="stats-row"><span>Satunnaiset (1 kpl)</span> <strong>${once} (${Math.round(once/totalUsers*100)}%)</strong></div>
            <div class="stats-row"><span>Aktiivit (2-5 kpl)</span> <strong>${few} (${Math.round(few/totalUsers*100)}%)</strong></div>
            <div class="stats-row"><span>Konkarit (>5 kpl)</span> <strong>${many} (${Math.round(many/totalUsers*100)}%)</strong></div>
            <small style="display:block; margin-top:5px; color:#666;">Yhteensä eri nimimerkkejä: ${totalUsers}</small>
        `;
    }
}

// UUSI: Sanalouhos (Yhdistää miittikirjan viestit ja nettilogit)
function renderWordCloud(data) {
    const el = document.getElementById('stats-wordcloud');
    if(!el) return;
    
    // Kerää kaikki tekstit
    let allText = "";
    data.forEach(e => {
        if (e.attendees) {
            e.attendees.forEach(a => {
                if (a.message && a.message !== "(Massa)") allText += " " + a.message;
                if (a.gpxMessage) allText += " " + a.gpxMessage;
            });
        }
    });

    if (!allText.trim()) {
        el.innerHTML = "Ei viestejä analysoitavaksi.";
        return;
    }

    // Yksinkertainen sanalaskuri
    const words = allText.toLowerCase()
        .replace(/[.,!?;:()"]/g, "") // Poista välimerkit
        .split(/\s+/)
        .filter(w => w.length > 3); // Vain yli 3 kirjaimen sanat

    const stopWords = ["oli", "että", "niin", "myös", "mutta", "tämä", "vain", "tässä", "kiitos", "tftc", "miitistä", "kätkölle", "logattu", "lokiin", "nimimerkki", "kanssa", "kuin"];
    const counts = {};

    words.forEach(w => {
        if(!stopWords.includes(w)) counts[w] = (counts[w] || 0) + 1;
    });

    const sortedWords = Object.entries(counts)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 20); // Top 20 sanaa

    // Renderöinti
    const maxCount = sortedWords[0] ? sortedWords[0][1] : 1;
    
    el.innerHTML = `<div style="display:flex; flex-wrap:wrap; gap:5px; justify-content:center; padding:10px;">
        ${sortedWords.map(([word, count]) => {
            const size = 0.8 + (count / maxCount) * 1.5; // Fonttikoko 0.8em - 2.3em
            const opacity = 0.5 + (count / maxCount) * 0.5;
            return `<span style="font-size:${size}em; opacity:${opacity}; color:var(--primary-color);">${word}</span>`;
        }).join('')}
    </div>`;
}

// Autocomplete ja muut haut
const userSearchInput = document.getElementById('search-user-name');
const userAutoList = document.getElementById('user-autocomplete');
if(userSearchInput) {
    userSearchInput.oninput = () => {
        const val = userSearchInput.value.toLowerCase();
        if (val.length < 1) { if(userAutoList) userAutoList.style.display = 'none'; return; }
        const allNames = [...new Set(allStatsData.events.flatMap(e => e.attendeeNames || []))];
        const matches = allNames.filter(n => n && n.toLowerCase().startsWith(val)).sort().slice(0, 10);
        if (userAutoList) {
            if (matches.length > 0) {
                userAutoList.innerHTML = matches.map(m => `<div class="autocomplete-item" onclick="selectUser('${m}')">${m}</div>`).join('');
                userAutoList.style.display = 'block';
            } else userAutoList.style.display = 'none';
        }
    };
}
window.selectUser = (name) => {
    if(userSearchInput) userSearchInput.value = name;
    if(userAutoList) userAutoList.style.display = 'none';
    document.getElementById('btn-apply-filters').click();
};
