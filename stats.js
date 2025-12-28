// ==========================================
// STATS.JS - Tilastojen laskenta ja hienot graafit
// Versio: 7.1.6 - Fix: Bottom 10 excludes future
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
            evt.attendeeCount = Object.keys(evtLogs).length;
            // Tallennetaan koko logiobjekti, ei vain nimiä, jotta saadaan viestit sanalouhosta varten
            evt.logs = Object.values(evtLogs); 
            evt.attendeeNames = evt.logs.map(l => l.nickname);
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
                item.innerHTML = `<strong>${evt.name}</strong><br><small>📅 ${evt.date} • 👤 ${evt.attendeeCount}</small>`;
                item.onclick = () => { if (window.openGuestbook) window.openGuestbook(evt.key); };
                resultsEl.appendChild(item);
            });
        }
    }

    // 3. Tekstilistat
    renderUserRegistry(data); 
    renderAlphabetStats(data);
    renderTopUsersList(data); 
    renderLoyaltyPyramid(data); 
    renderWordCloud(data);      
    
    // --- KORJAUS: Suodatetaan pois tulevat miitit Top/Bottom listoilta ---
    const todayStr = new Date().toISOString().split('T')[0];
    
    const filteredForLists = data.filter(e => {
        const isCancelled = e.name.includes("/ PERUTTU /");
        const isFuture = e.date > todayStr; 
        return !isCancelled && !isFuture; // Näytä vain menneet/nykyiset, jotka ei peruttu
    });

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
// UUSI: KÄYTTÄJÄKORTTI (PROFIILI)
// ==========================================

window.openUserProfile = function(nickname) {
    if (!nickname) return;
    
    // Etsitään kaikki tapahtumat joissa käyttäjä on ollut
    // Käytetään allStatsData.events, jotta saadaan koko historia riippumatta filttereistä
    const userEvents = allStatsData.events.filter(evt => 
        evt.attendeeNames && evt.attendeeNames.some(n => n.toLowerCase() === nickname.toLowerCase())
    );

    // Lajitellaan aikajärjestykseen (vanhin ensin)
    userEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (userEvents.length === 0) return alert("Ei tietoja tälle käyttäjälle.");

    // Päivitetään modaalin tiedot
    document.getElementById('up-nickname').innerText = nickname;
    document.getElementById('up-total').innerText = userEvents.length;
    
    const first = userEvents[0];
    const last = userEvents[userEvents.length - 1];
    
    document.getElementById('up-first').innerHTML = `${first.date}<br><span style="font-size:0.8em; font-weight:normal;">${first.name}</span>`;
    document.getElementById('up-last').innerHTML = `${last.date}<br><span style="font-size:0.8em; font-weight:normal;">${last.name}</span>`;

    const listEl = document.getElementById('up-history-list');
    listEl.innerHTML = "";
    
    userEvents.forEach(evt => {
        const row = document.createElement('div');
        row.style.borderBottom = "1px dotted #555";
        row.style.padding = "5px 0";
        row.style.fontSize = "0.9em";
        row.innerHTML = `<strong>${evt.date}</strong> ${evt.name}`;
        listEl.appendChild(row);
    });

    // Näytetään modaali
    document.getElementById('user-profile-modal').style.display = 'block';
};

// ==========================================
// GRAAFIEN PIIRTÄMINEN (CHART.JS V4)
// ==========================================

function renderCharts(data) {
    if (!window.Chart || !data || data.length === 0) return;

    const clearChart = (id) => {
        if (chartInstances[id]) { chartInstances[id].destroy(); }
    };

    // HUOM: Chart.js käyttää tässä perusvärejä, jotka toimivat useimmissa teemoissa.
    const colors = {
        primary: '#8B4513', 
        secondary: '#D2691E',
        accent: '#4caf50', 
        text: '#4E342E'
    };

    // --- 1. VIIKONPÄIVÄT ---
    clearChart('weekdays');
    const dayLabels = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"];
    const dayData = [0,0,0,0,0,0,0];
    data.forEach(e => { if(e.date) dayData[new Date(e.date).getDay()]++; });
    
    chartInstances['weekdays'] = new Chart(document.getElementById('chart-weekdays-canvas'), {
        type: 'bar',
        data: {
            labels: dayLabels,
            datasets: [{ label: 'Miitit', data: dayData, backgroundColor: colors.primary }]
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
            datasets: [{ data: Object.values(typeCounts), backgroundColor: [colors.primary, colors.accent, colors.secondary] }]
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
                borderColor: colors.primary, backgroundColor: 'rgba(139, 69, 19, 0.2)', fill: true, tension: 0.4
            }]
        }
    });

    // --- 4. KUMULATIIVINEN KASVU (Koko historia) ---
    clearChart('cumulative');
    
    // Käytetään AINA koko dataa (allStatsData.events), jotta graafi näyttää "uran" kehityksen
    const allEventsSorted = [...allStatsData.events].sort((a,b) => new Date(a.date) - new Date(b.date));
    
    const uniqueUsersSet = new Set();
    const cumulativePoints = [];
    
    allEventsSorted.forEach(evt => {
        let newUsers = 0;
        if(evt.attendeeNames) {
            evt.attendeeNames.forEach(name => {
                const lower = name.toLowerCase();
                if(!uniqueUsersSet.has(lower)) {
                    uniqueUsersSet.add(lower);
                    newUsers++;
                }
            });
        }
        // Lisätään datapiste
        cumulativePoints.push({
            x: evt.date,
            y: uniqueUsersSet.size
        });
    });

    chartInstances['cumulative'] = new Chart(document.getElementById('chart-cumulative-canvas'), {
        type: 'line',
        data: {
            labels: cumulativePoints.map(p => p.x),
            datasets: [{ 
                label: 'Uniikit kävijät yhteensä', 
                data: cumulativePoints.map(p => p.y),
                borderColor: '#2e7d32', // Forest green
                backgroundColor: 'rgba(46, 125, 50, 0.1)', 
                fill: true, 
                pointRadius: 2,
                tension: 0.1
            }]
        }
    });

    // --- 5. KELLONAJAT ---
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
            datasets: [{ label: 'Miitit', data: hoursData, backgroundColor: colors.secondary }]
        }
    });

    // --- 6. KUUKAUDET ---
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
            datasets: [{ label: 'Kävijämäärä yhteensä', data: monthsData, backgroundColor: '#A0522D' }]
        }
    });

    // --- 7. PAIKKAKUNNAT (Top 10) ---
    clearChart('locations');
    const locMap = {};
    data.forEach(e => { if (e.location) locMap[e.location] = (locMap[e.location] || 0) + 1; });
    const sortedLocs = Object.entries(locMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    
    chartInstances['locations'] = new Chart(document.getElementById('chart-locations-canvas'), {
        type: 'bar',
        data: {
            labels: sortedLocs.map(x => x[0]),
            datasets: [{ label: 'Miitit', data: sortedLocs.map(x => x[1]), backgroundColor: colors.primary }]
        },
        options: { indexAxis: 'y' }
    });

    // --- 8. TOP 10 KÄVIJÄT ---
    clearChart('topAttendees');
    const userMap = {};
    data.forEach(e => e.attendeeNames.forEach(n => userMap[n] = (userMap[n] || 0) + 1));
    const topUsers = Object.entries(userMap).sort((a,b) => b[1] - a[1]).slice(0, 10);

    chartInstances['topAttendees'] = new Chart(document.getElementById('chart-top-attendees-canvas'), {
        type: 'bar',
        data: {
            labels: topUsers.map(x => x[0]),
            datasets: [{ label: 'Käynnit', data: topUsers.map(x => x[1]), backgroundColor: colors.secondary }]
        },
        options: { indexAxis: 'y' }
    });

    // --- 9. TOP 10 MIITIT ---
    clearChart('topEvents');
    const topEvents = [...data].sort((a,b) => b.attendeeCount - a.attendeeCount).slice(0, 10);
    chartInstances['topEvents'] = new Chart(document.getElementById('chart-top-events-canvas'), {
        type: 'bar',
        data: {
            labels: topEvents.map(x => x.name.substring(0, 15) + "..."),
            datasets: [{ label: 'Osallistujat', data: topEvents.map(x => x.attendeeCount), backgroundColor: colors.accent }]
        }
    });

    // --- 10. ATTRIBUUTIT ---
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
            datasets: [{ label: 'Esiintyvyys', data: topAttrs.map(x => x[1]), backgroundColor: '#A0522D' }]
        },
        options: { indexAxis: 'y' }
    });
}

// ==========================================
// APUFUNKTIOT LISTOILLE JA ANALYYSILLE
// ==========================================

// UUSI: Kävijäluettelo (Klikattava)
function renderUserRegistry(data) {
    const el = document.getElementById('stats-user-registry');
    if(!el) return;

    // Lasketaan käynnit
    const map = {};
    data.forEach(e => { if(e.attendeeNames) e.attendeeNames.forEach(n => map[n] = (map[n] || 0) + 1); });
    
    // Järjestetään aktiivisuuden mukaan
    const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]);
    
    // Rajoitetaan lista 50:een, jottei selaimen muisti lopu, jos dataa on paljon
    // Mutta jos on haku päällä (alle 50 tulosta), näytetään kaikki hakutulokset
    const limit = 50;
    const listToShow = sorted.slice(0, limit);

    if (listToShow.length === 0) {
        el.innerHTML = "Ei kävijöitä.";
        return;
    }

    el.innerHTML = listToShow.map(([name, count], i) => `
        <div class="stats-row">
            <span>${i+1}. <span class="clickable-name" onclick="openUserProfile('${name}')">${name}</span></span> 
            <strong>${count}</strong>
        </div>`).join('');
}

// VANHA: Top 10 Kävijät (PALAUTETTU ALKUPERÄISEKSI, EI KLIKATTAVA)
function renderTopUsersList(data) {
    const map = {};
    data.forEach(e => { if(e.attendeeNames) e.attendeeNames.forEach(n => map[n] = (map[n] || 0) + 1); });
    const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 10);
    const el = document.getElementById('stats-top-users');
    if(el) el.innerHTML = sorted.map(([name, count], i) => `
        <div class="stats-row">
            <span>${i+1}. ${name}</span> 
            <strong>${count} miittiä</strong>
        </div>`).join('');
}

function renderLoyaltyPyramid(data) {
    const el = document.getElementById('stats-loyalty');
    if (!el) return;

    // Lasketaan kävijöiden käyntikerrat
    const userCounts = {};
    data.forEach(e => e.attendeeNames.forEach(n => userCounts[n] = (userCounts[n] || 0) + 1));

    let tiers = {
        'Vakikasvot (10+)': 0,
        'Aktiivit (5-9)': 0,
        'Satunnaiset (2-4)': 0,
        'Kertakävijät (1)': 0
    };

    Object.values(userCounts).forEach(count => {
        if (count >= 10) tiers['Vakikasvot (10+)']++;
        else if (count >= 5) tiers['Aktiivit (5-9)']++;
        else if (count >= 2) tiers['Satunnaiset (2-4)']++;
        else tiers['Kertakävijät (1)']++;
    });

    const totalUsers = Object.keys(userCounts).length || 1;
    let html = `<div style="display:flex; flex-direction:column; align-items:center; gap:5px;">`;

    // Piirretään palkit käänteisessä järjestyksessä (Harvinaisimmat ylös)
    const order = ['Vakikasvot (10+)', 'Aktiivit (5-9)', 'Satunnaiset (2-4)', 'Kertakävijät (1)'];
    const colors = ['#8B4513', '#A0522D', '#CD853F', '#DEB887']; // Tumma -> Vaalea

    order.forEach((label, idx) => {
        const count = tiers[label];
        const pct = Math.round((count / totalUsers) * 100);
        // Leveys: minimi 20%, maksimi 100%
        const width = 20 + (count / totalUsers) * 80; 
        
        html += `
            <div style="width:100%; max-width:400px; display:flex; flex-direction:column; align-items:center;">
                <div style="width:${width}%; background:${colors[idx]}; color:white; text-align:center; padding:5px; border-radius:4px; font-size:0.9em; box-shadow: 2px 2px 5px rgba(0,0,0,0.1);">
                    ${label}<br><strong>${count} hlö (${pct}%)</strong>
                </div>
            </div>`;
    });
    html += `</div>`;
    el.innerHTML = html;
}

function renderWordCloud(data) {
    const el = document.getElementById('stats-wordcloud');
    if (!el) return;

    // Kerätään kaikki viestit
    let allText = "";
    data.forEach(e => {
        if (e.logs) e.logs.forEach(l => {
            if (l.message) allText += " " + l.message;
        });
    });

    // Siivotaan ja lasketaan sanat
    const words = allText.toLowerCase()
        .replace(/[.,!?;:()"]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 2); // Vähintään 3 kirjainta

    const stopWords = ["oli", "että", "kun", "niin", "mutta", "siis", "vain", "nyt", "tämä", "sitten", "olla", "ollut", "ovat", "myös", "kanssa", "kuin", "joka", "mitä", "sekä", "täällä", "koko", "jälkeen", "vielä", "paljon", "kiitos", "miitti", "miitistä", "kätkö", "kätköllä", "kk", "tftc", "kiitokset", "log", "hyvä", "tosi", "kiva", "mukava", "järjestäjälle", "järjestäjille"];
    
    const counts = {};
    words.forEach(w => {
        if (!stopWords.includes(w)) counts[w] = (counts[w] || 0) + 1;
    });

    // Otetaan top 30 sanaa
    const topWords = Object.entries(counts)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 30);

    if (topWords.length === 0) {
        el.innerHTML = "Ei riittävästi dataa sanalouhokseen.";
        return;
    }

    const maxCount = topWords[0][1];
    const minCount = topWords[topWords.length - 1][1];

    // Generoidaan "pilvi" HTML
    let cloudHtml = `<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px; padding:10px;">`;
    topWords.forEach(([word, count]) => {
        // Skaalataan fonttikoko välille 0.8em - 2.5em
        const size = 0.8 + ((count - minCount) / (maxCount - minCount || 1)) * 1.7;
        const opacity = 0.6 + ((count - minCount) / (maxCount - minCount || 1)) * 0.4;
        cloudHtml += `<span style="font-size:${size.toFixed(1)}em; color:rgba(139,69,19,${opacity}); font-weight:bold;">${word}</span>`;
    });
    cloudHtml += `</div>`;
    el.innerHTML = cloudHtml;
}

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
