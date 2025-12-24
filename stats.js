// ==========================================
// STATS.JS - Tilastojen laskenta ja haku
// ==========================================

let allStatsData = {
    events: [],
    attendees: {}
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
    const years = [...new Set(events.map(e => e.date.split('-')[0]))].sort((a, b) => b - a);
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
        const matchName = evt.name.toLowerCase().includes(nameFilter);
        const matchUser = userFilter === "" || evt.attendeeNames.some(n => n.toLowerCase().includes(userFilter));
        const matchYear = yearFilter === "" || evt.date.startsWith(yearFilter);
        const matchMonth = monthFilter === "" || evt.date.split('-')[1] === monthFilter;
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

    renderAlphabetStats(data);
    renderWeekdayStats(data);

    // 4. TOP 10 & BOTTOM 10
    const sortedByCount = [...data].sort((a, b) => b.attendeeCount - a.attendeeCount);
    const renderList = (list, elementId) => {
        const el = document.getElementById(elementId);
        if(!el) return;
        el.innerHTML = list.length ? "" : "Ei tietoja.";
        list.forEach((e, i) => {
            const row = document.createElement('div');
            row.className = "stats-row";
            row.innerHTML = `<span>${i+1}. ${e.name}</span> <strong>${e.attendeeCount}</strong>`;
            el.appendChild(row);
        });
    };
    renderList(sortedByCount.slice(0, 10), 'stats-top-10');
    renderList([...sortedByCount].reverse().slice(0, 10), 'stats-bottom-10');

    // 5. Paikkakunnat
    const locMap = {};
    data.forEach(e => { if (e.location) locMap[e.location] = (locMap[e.location] || 0) + 1; });
    const sortedLocs = Object.entries(locMap).sort((a, b) => b[1] - a[1]);
    const locEl = document.getElementById('stats-locations');
    if(locEl) {
        locEl.innerHTML = sortedLocs.map(([loc, count]) => `
            <div class="stats-row"><span>${loc}</span> <strong>${count}</strong></div>
        `).join('');
    }

    // 6. ATTRIBUUTIT - KORJATTU LASKENTA (SISÄLTÄÄ KIELTEISET)
    const attrMap = {}; // "Nimi" -> { pos: 0, neg: 0 }
    
    data.forEach(e => {
        if (e.attributes && Array.isArray(e.attributes)) {
            e.attributes.forEach(attr => {
                const name = attr.name || attr;
                const isNeg = (attr.inc === 0);
                
                if (!attrMap[name]) attrMap[name] = { pos: 0, neg: 0 };
                
                if (isNeg) attrMap[name].neg++;
                else attrMap[name].pos++;
            });
        }
    });

    const attrEl = document.getElementById('stats-attributes');
    if(attrEl) {
        attrEl.innerHTML = "";
        // Lajitellaan nimen mukaan
        const sortedEntries = Object.entries(attrMap).sort((a, b) => a[0].localeCompare(b[0]));
        
        sortedEntries.forEach(([name, counts]) => {
            if (counts.pos > 0) {
                const row = document.createElement('div');
                row.className = "stats-row";
                row.innerHTML = `<span>${name}</span> <strong>${counts.pos}</strong>`;
                attrEl.appendChild(row);
            }
            if (counts.neg > 0) {
                const row = document.createElement('div');
                row.className = "stats-row";
                // Kielteisille attribuuteille punainen yliviivaus
                row.innerHTML = `<span style="color:#721c24; text-decoration:line-through; opacity:0.7;">${name}</span> <strong>${counts.neg}</strong>`;
                attrEl.appendChild(row);
            }
        });
    }
}

function renderAlphabetStats(data) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ0123456789".split("");
    const counts = {};
    data.forEach(e => {
        if(e.name) {
            const firstChar = e.name.trim().charAt(0).toUpperCase();
            counts[firstChar] = (counts[firstChar] || 0) + 1;
        }
    });
    const grid = document.getElementById('stats-alphabet');
    if(!grid) return;
    grid.innerHTML = "";
    chars.forEach(c => {
        const box = document.createElement('div');
        const count = counts[c] || 0;
        box.className = "char-box" + (count === 0 ? " empty" : "");
        box.innerHTML = `${c}<br><small>${count}</small>`;
        grid.appendChild(box);
    });
}

function renderWeekdayStats(data) {
    const days = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    data.forEach(e => { if(e.date) { const d = new Date(e.date).getDay(); dayCounts[d]++; } });
    const el = document.getElementById('stats-weekdays');
    if(!el) return;
    el.innerHTML = dayCounts.map((count, i) => `
        <div class="stats-row"><span>${days[i]}</span> <strong>${count}</strong></div>
    `).join('');
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
            } else { userAutoList.style.display = 'none'; }
        }
    };
}
window.selectUser = (name) => {
    if(userSearchInput) userSearchInput.value = name;
    if(userAutoList) userAutoList.style.display = 'none';
    document.getElementById('btn-apply-filters').click();
};
