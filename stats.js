// ==========================================
// STATS.JS - Tilastojen laskenta ja haku
// ==========================================

let allStatsData = {
    events: [],
    attendees: {}
};

// Säilytetään kaavio-oliot, jotta ne voidaan päivittää/tuhota
let charts = {
    weekdays: null,
    types: null,
    timeline: null
};

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
            evt.attendeeCount = Object.keys(evtLogs).length;
            evt.attendeeNames = Object.values(evtLogs).map(l => l.nickname);
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
                item.innerHTML = `<strong>${evt.name}</strong><br><small>📅 ${evt.date} • 👤 ${evt.attendeeCount}</small>`;
                item.onclick = () => { if (window.openGuestbook) window.openGuestbook(evt.key); };
                resultsEl.appendChild(item);
            });
        }
    }

    // 3. Listat
    renderAlphabetStats(data);
    renderTopUsers(data);
    
    const filteredForLists = data.filter(e => !e.name.includes("/ PERUTTU /"));
    const sortedByCount = [...filteredForLists].sort((a, b) => b.attendeeCount - a.attendeeCount);
    
    const renderList = (list, elementId) => {
        const el = document.getElementById(elementId);
        if(!el) return;
        el.innerHTML = list.map((e, i) => `<div class="stats-row"><span>${i+1}. ${e.name}</span> <strong>${e.attendeeCount}</strong></div>`).join('') || "Ei tietoja.";
    };
    renderList(sortedByCount.slice(0, 10), 'stats-top-10');
    renderList([...sortedByCount].reverse().slice(0, 10), 'stats-bottom-10');

    // 4. Sijainnit ja attribuutit
    renderLocations(data);
    renderAttributes(data);

    // 5. Piirretään graafit (Chart.js)
    window.currentFilteredData = data; // Tallennetaan globaalisti välilehden vaihtoa varten
    renderCharts(data);
}

// ==========================================
// GRAAFIEN PIIRTÄMINEN (CHART.JS)
// ==========================================

function renderCharts(data) {
    if (!window.Chart) return; // Varmistetaan että kirjasto on ladattu

    // --- VIIKONPÄIVÄT ---
    const dayLabels = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"];
    const dayData = [0, 0, 0, 0, 0, 0, 0];
    data.forEach(e => { if(e.date) dayData[new Date(e.date).getDay()]++; });

    const ctxDays = document.getElementById('chart-weekdays-canvas').getContext('2d');
    if (charts.weekdays) charts.weekdays.destroy();
    charts.weekdays = new Chart(ctxDays, {
        type: 'bar',
        data: {
            labels: dayLabels,
            datasets: [{
                label: 'Miittien määrä',
                data: dayData,
                backgroundColor: '#8B4513',
                borderRadius: 5
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // --- MIITTITYYPIT ---
    const typeLabels = { miitti: "Miitti", cito: "CITO", cce: "CCE" };
    const typeCounts = { miitti: 0, cito: 0, cce: 0 };
    data.forEach(e => { if(typeCounts[e.type] !== undefined) typeCounts[e.type]++; });

    const ctxTypes = document.getElementById('chart-types-canvas').getContext('2d');
    if (charts.types) charts.types.destroy();
    charts.types = new Chart(ctxTypes, {
        type: 'pie',
        data: {
            labels: Object.values(typeLabels),
            datasets: [{
                data: Object.values(typeCounts),
                backgroundColor: ['#8B4513', '#4caf50', '#D2691E']
            }]
        }
    });

    // --- AIKAJANA (Uusin 20 miittiä osallistujamäärät) ---
    const timelineData = [...data].sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-15);
    const ctxTime = document.getElementById('chart-timeline-canvas').getContext('2d');
    if (charts.timeline) charts.timeline.destroy();
    charts.timeline = new Chart(ctxTime, {
        type: 'line',
        data: {
            labels: timelineData.map(e => e.date.split('-').slice(1).reverse().join('.')),
            datasets: [{
                label: 'Osallistujat',
                data: timelineData.map(e => e.attendeeCount),
                borderColor: '#8B4513',
                backgroundColor: 'rgba(139, 69, 19, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true }
    });
}

// Globaali funktio välilehden vaihtoon index.html:stä
window.renderCharts = () => {
    if(window.currentFilteredData) renderCharts(window.currentFilteredData);
};

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

function renderTopUsers(data) {
    const map = {};
    data.forEach(e => { if(e.attendeeNames) e.attendeeNames.forEach(n => map[n] = (map[n] || 0) + 1); });
    const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 10);
    const el = document.getElementById('stats-top-users');
    if(el) el.innerHTML = sorted.map(([name, count], i) => `
        <div class="stats-row" style="cursor:pointer" onclick="document.getElementById('search-user-name').value='${name}'; document.getElementById('btn-apply-filters').click();">
            <span>${i+1}. ${name}</span> <strong>${count} miittiä</strong>
        </div>`).join('');
}

function renderLocations(data) {
    const map = {};
    data.forEach(e => { if (e.location) map[e.location] = (map[e.location] || 0) + 1; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const el = document.getElementById('stats-locations');
    if(el) el.innerHTML = sorted.map(([loc, n]) => `<div class="stats-row"><span>${loc}</span> <strong>${n}</strong></div>`).join('');
}

function renderAttributes(data) {
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

function renderWeekdayStats(data) {
    const days = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    data.forEach(e => { if(e.date) dayCounts[new Date(e.date).getDay()]++; });
    const el = document.getElementById('stats-weekdays');
    if(el) el.innerHTML = dayCounts.map((count, i) => `<div class="stats-row"><span>${days[i]}</span> <strong>${count}</strong></div>`).join('');
}

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
