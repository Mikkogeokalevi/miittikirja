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

    // 2. Miittien listaus (Hakutulokset)
    const resultsEl = document.getElementById('stats-results-list');
    if(resultsEl) {
        resultsEl.innerHTML = "";
        if (data.length === 0) {
            resultsEl.innerHTML = "Ei hakua vastaavia miittejä.";
        } else {
            const sortedResults = [...data].sort((a,b) => new Date(b.date) - new Date(a.date));
            sortedResults.forEach(evt => {
                const item = document.createElement('div');
                item.className = "result-item";
                item.innerHTML = `
                    <div style="font-weight:bold; color:#8B4513;">${evt.name}</div>
                    <div style="font-size:0.8em; display:flex; justify-content:space-between;">
                        <span>📅 ${evt.date}</span>
                        <span>👤 ${evt.attendeeCount} kävijää</span>
                    </div>
                `;
                item.onclick = () => {
                    if (window.openGuestbook) window.openGuestbook(evt.key);
                };
                resultsEl.appendChild(item);
            });
        }
    }

    // 3. Aakkoset ja erikoismerkit
    renderAlphabetStats(data);

    // 4. Viikonpäivät (Teksti + Kaavio)
    renderWeekdayStats(data);

    // 5. TOP/BOTTOM 10 (Ei peruttuja)
    const filteredForLists = data.filter(e => !e.name.includes("/ PERUTTU /"));
    const sortedByCount = [...filteredForLists].sort((a, b) => b.attendeeCount - a.attendeeCount);
    
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

    // 6. TOP 10 Kävijät
    renderTopUsers(data);

    // 7. Paikkakunnat
    const locMap = {};
    data.forEach(e => { if (e.location) locMap[e.location] = (locMap[e.location] || 0) + 1; });
    const sortedLocs = Object.entries(locMap).sort((a, b) => b[1] - a[1]);
    const locEl = document.getElementById('stats-locations');
    if(locEl) {
        locEl.innerHTML = sortedLocs.map(([loc, count]) => `
            <div class="stats-row"><span>${loc}</span> <strong>${count}</strong></div>
        `).join('');
    }

    // 8. Attribuutit
    const attrMap = {};
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
                row.innerHTML = `<span style="color:#721c24; text-decoration:line-through; opacity:0.7;">${name}</span> <strong>${counts.neg}</strong>`;
                attrEl.appendChild(row);
            }
        });
    }
}

function renderAlphabetStats(data) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ0123456789".split("");
    const counts = {};
    const specialChars = {};

    data.forEach(e => {
        if(e.name) {
            const firstChar = e.name.trim().charAt(0).toUpperCase();
            if (chars.includes(firstChar)) {
                counts[firstChar] = (counts[firstChar] || 0) + 1;
            } else {
                specialChars[firstChar] = (specialChars[firstChar] || 0) + 1;
            }
        }
    });

    // Tavalliset aakkoset ruudukkoon
    const grid = document.getElementById('stats-alphabet');
    if(grid) {
        grid.innerHTML = "";
        chars.forEach(c => {
            const box = document.createElement('div');
            const count = counts[c] || 0;
            box.className = "char-box" + (count === 0 ? " empty" : "");
            box.innerHTML = `${c}<br><small>${count}</small>`;
            grid.appendChild(box);
        });
    }

    // Erikoismerkit listaksi alle
    const specialEl = document.getElementById('stats-special-chars');
    if(specialEl) {
        const specialEntries = Object.entries(specialChars);
        if (specialEntries.length > 0) {
            specialEl.innerHTML = "<strong>Muut merkit:</strong><br>" + 
                specialEntries.map(([char, count]) => `${char} (${count} kpl)`).join(', ');
        } else {
            specialEl.innerHTML = "";
        }
    }
}

function renderWeekdayStats(data) {
    const days = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    
    data.forEach(e => { if(e.date) { const d = new Date(e.date).getDay(); dayCounts[d]++; } });

    // Teksti-tilasto
    const el = document.getElementById('stats-weekdays');
    if(el) {
        el.innerHTML = dayCounts.map((count, i) => `
            <div class="stats-row"><span>${days[i]}</span> <strong>${count}</strong></div>
        `).join('');
    }

    // Visuaalinen pylväskaavio
    const chartEl = document.getElementById('chart-weekdays');
    if(chartEl) {
        const max = Math.max(...dayCounts, 1);
        chartEl.innerHTML = dayCounts.map((count, i) => {
            const height = (count / max) * 100;
            return `
                <div style="display:flex; flex-direction:column; align-items:center; width:12%;">
                    <div class="bar" style="height:${height}%; width:100%;">
                        <span class="bar-value">${count}</span>
                    </div>
                    <span class="bar-label">${days[i]}</span>
                </div>
            `;
        }).join('');
    }
}

function renderTopUsers(data) {
    const userAttendanceMap = {};
    data.forEach(e => {
        if(e.attendeeNames) {
            e.attendeeNames.forEach(name => {
                userAttendanceMap[name] = (userAttendanceMap[name] || 0) + 1;
            });
        }
    });

    const sortedUsers = Object.entries(userAttendanceMap).sort((a, b) => b[1] - a[1]);
    const userStatsEl = document.getElementById('stats-top-users');
    if(userStatsEl) {
        userStatsEl.innerHTML = sortedUsers.slice(0, 10).map(([name, count], i) => `
            <div class="stats-row" style="cursor:pointer" onclick="document.getElementById('search-user-name').value='${name}'; document.getElementById('btn-apply-filters').click();">
                <span>${i+1}. ${name}</span> <strong>${count} miittiä</strong>
            </div>
        `).join('');
    }
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
