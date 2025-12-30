// ==========================================
// STATS.JS - Tilastojen laskenta ja hienot graafit
// Versio: 7.3.2 - Map Year Colors & Legend
// ==========================================

let allStatsData = {
    events: [],
    attendees: {}
};

let chartInstances = {};
let mapInstance = null;

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

    const totalAttendees = data.reduce((sum, e) => sum + e.attendeeCount, 0);
    const summaryEl = document.getElementById('stats-summary-text');
    if(summaryEl) {
        summaryEl.innerHTML = `
            Tapahtumia: <strong>${data.length}</strong> kpl<br>
            Osallistumisia yhteensä: <strong>${totalAttendees}</strong> kpl<br>
            Keskiarvo: <strong>${data.length ? (totalAttendees / data.length).toFixed(1) : 0}</strong> kävijää/miitti
        `;
    }

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
                item.innerHTML = `<strong>${evt.name}</strong><br><small>📅 ${evt.date} • 👤 ${evt.attendeeCount}</small>`;
                item.onclick = () => { if (window.openGuestbook) window.openGuestbook(evt.key); };
                resultsEl.appendChild(item);
            });
        }
    }

    renderUserRegistry(data); 
    renderAlphabetStats(data);
    renderTopUsersList(data); 
    renderLoyaltyPyramid(data); 
    renderWordCloud(data);
    renderTimeSlots(data);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const filteredForLists = data.filter(e => {
        const isCancelled = e.name.includes("/ PERUTTU /");
        const isFuture = e.date > todayStr; 
        return !isCancelled && !isFuture; 
    });

    const sortedByCount = [...filteredForLists].sort((a, b) => b.attendeeCount - a.attendeeCount);
    
    const renderList = (list, elementId) => {
        const el = document.getElementById(elementId);
        if(!el) return;
        if (list.length === 0) { el.innerHTML = "Ei tietoja."; return; }
        el.innerHTML = list.map((e, i) => 
            `<div class="stats-row"><span>${i+1}. ${e.name}</span> <strong>${e.attendeeCount}</strong></div>`
        ).join('');
    };

    renderList(sortedByCount.slice(0, 10), 'stats-top-10');
    renderList([...sortedByCount].reverse().slice(0, 10), 'stats-bottom-10');

    renderLocationsTable(data);
    renderAttributesList(data);

    if(document.getElementById('tab-graphs').classList.contains('active')) {
        renderCharts(data);
    }
    if(document.getElementById('tab-map') && document.getElementById('tab-map').classList.contains('active')) {
        renderMap(data);
    }
}

// ==========================================
// UUSI: KARTTANÄKYMÄ (YEAR COLORS)
// ==========================================

window.renderMap = function(data) {
    if (typeof L === 'undefined' || !document.getElementById('stats-map')) return;

    if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
    }

    mapInstance = L.map('stats-map').setView([64.0, 26.0], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(mapInstance);

    const bounds = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const legendData = new Set(); // Kerätään tähän käytetyt värit selitettä varten

    // VÄRIPALETTI VUOSILLE
    const yearColors = {
        '2026': '#E91E63', // Pinkki
        '2025': '#D32F2F', // Tumma punainen
        '2024': '#FF5722', // Oranssi
        '2023': '#FFC107', // Keltainen/Kulta
        '2022': '#4CAF50', // Vihreä
        '2021': '#009688', // Turkoosi
        '2020': '#3F51B5', // Indigo
        'default': '#795548' // Ruskea (vanhemmat)
    };

    const getPointStyle = (evt) => {
        // 1. PERUTTU
        if (evt.name && evt.name.includes("/ PERUTTU /")) {
            legendData.add(JSON.stringify({color: '#9E9E9E', label: 'Peruttu'}));
            return { color: '#666', fillColor: '#9E9E9E', fillOpacity: 0.8, radius: 8 };
        }
        
        // 2. TULEVAT
        if (evt.date > todayStr) {
            legendData.add(JSON.stringify({color: '#2196F3', label: 'Tulevat'}));
            return { color: '#0d47a1', fillColor: '#2196F3', fillOpacity: 0.9, radius: 10 }; // Iso sininen
        }

        // 3. MENNEET (VUOSITTAIN)
        const year = evt.date.split('-')[0];
        let color = yearColors[year] || yearColors['default'];
        
        legendData.add(JSON.stringify({color: color, label: yearColors[year] ? year : '< 2020'}));
        
        return { color: '#333', fillColor: color, fillOpacity: 0.8, radius: 8, weight: 1 };
    };

    const parseCoord = (coordStr) => {
        if (!coordStr) return null;
        const regex = /([NS])\s*(\d+)°\s*([\d\.]+)\s*([EW])\s*(\d+)°\s*([\d\.]+)/;
        const match = coordStr.match(regex);
        if (match) {
            let lat = parseInt(match[2]) + parseFloat(match[3]) / 60;
            if (match[1] === 'S') lat = -lat;
            let lon = parseInt(match[5]) + parseFloat(match[6]) / 60;
            if (match[4] === 'W') lon = -lon;
            return [lat, lon];
        }
        return null;
    };

    data.forEach(evt => {
        if (evt.coords) {
            const latLng = parseCoord(evt.coords);
            if (latLng) {
                const style = getPointStyle(evt);
                const marker = L.circleMarker(latLng, style).addTo(mapInstance);
                marker.bindPopup(`<b>${evt.name}</b><br>${evt.date}<br>👤 ${evt.attendeeCount}`);
                bounds.push(latLng);
            }
        }
    });

    if (bounds.length > 0) {
        mapInstance.fitBounds(bounds);
    }
    
    // Piirretään selite kartan alle
    renderMapLegend(legendData);

    setTimeout(() => { mapInstance.invalidateSize(); }, 200);
};

function renderMapLegend(legendSet) {
    // Etsitään tai luodaan selite-elementti
    let legendContainer = document.getElementById('map-legend-container');
    if (!legendContainer) {
        const mapDiv = document.getElementById('stats-map');
        if (mapDiv) {
            legendContainer = document.createElement('div');
            legendContainer.id = 'map-legend-container';
            legendContainer.style.display = 'flex';
            legendContainer.style.flexWrap = 'wrap';
            legendContainer.style.gap = '10px';
            legendContainer.style.padding = '10px';
            legendContainer.style.justifyContent = 'center';
            legendContainer.style.fontSize = '0.9em';
            mapDiv.parentNode.appendChild(legendContainer);
        }
    }
    
    if (!legendContainer) return;
    legendContainer.innerHTML = ""; // Tyhjennetään vanhat

    // Muunnetaan takaisin objekteiksi ja lajitellaan (Tulevat -> Perutut -> Vuodet 2026->2020)
    const items = Array.from(legendSet).map(s => JSON.parse(s));
    
    // Yksinkertainen lajittelu: Vuosiluvut numerona, tekstit erikseen
    items.sort((a, b) => {
        const yearA = parseInt(a.label);
        const yearB = parseInt(b.label);
        if (!isNaN(yearA) && !isNaN(yearB)) return yearB - yearA; // Uusin vuosi ensin
        if (a.label === 'Tulevat') return -1;
        if (b.label === 'Tulevat') return 1;
        return 0;
    });

    items.forEach(item => {
        const div = document.createElement('div');
        div.innerHTML = `<span style="display:inline-block; width:12px; height:12px; background:${item.color}; border-radius:50%; margin-right:5px; border:1px solid #333;"></span>${item.label}`;
        legendContainer.appendChild(div);
    });
}

// ==========================================
// AIKATAULUT (15 min tarkkuus)
// ==========================================

function renderTimeSlots(data) {
    const el = document.getElementById('stats-time-slots');
    if (!el) return;

    const slotCounts = {};
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            const key = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
            slotCounts[key] = 0;
        }
    }

    let maxCount = 0;
    data.forEach(evt => {
        if (evt.time) {
            const start = evt.time.split('-')[0].trim();
            const normalized = start.replace('.', ':');
            if (slotCounts.hasOwnProperty(normalized)) {
                slotCounts[normalized]++;
                if (slotCounts[normalized] > maxCount) maxCount = slotCounts[normalized];
            }
        }
    });

    let html = "";
    Object.keys(slotCounts).sort().forEach(time => {
        const count = slotCounts[time];
        const isActive = count > 0;
        const className = isActive ? "time-slot-box active" : "time-slot-box empty";
        const content = isActive ? `${time}<br><strong>${count}</strong>` : time;
        html += `<div class="${className}">${content}</div>`;
    });

    el.innerHTML = html;
}

window.openUserProfile = function(nickname) {
    if (!nickname) return;
    const userEvents = allStatsData.events.filter(evt => 
        evt.attendeeNames && evt.attendeeNames.some(n => n.toLowerCase() === nickname.toLowerCase())
    );
    userEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (userEvents.length === 0) return alert("Ei tietoja tälle käyttäjälle.");

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
    document.getElementById('user-profile-modal').style.display = 'block';
};

function renderCharts(data) {
    if (!window.Chart || !data || data.length === 0) return;
    const clearChart = (id) => { if (chartInstances[id]) { chartInstances[id].destroy(); } };
    const colors = { primary: '#8B4513', secondary: '#D2691E', accent: '#4caf50', text: '#4E342E' };

    clearChart('weekdays');
    const dayLabels = ["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"];
    const dayData = [0,0,0,0,0,0,0];
    data.forEach(e => { if(e.date) { const jsDay = new Date(e.date).getDay(); const fiDay = (jsDay + 6) % 7; dayData[fiDay]++; } });
    chartInstances['weekdays'] = new Chart(document.getElementById('chart-weekdays-canvas'), {
        type: 'bar', data: { labels: dayLabels, datasets: [{ label: 'Miitit', data: dayData, backgroundColor: colors.primary }] }
    });

    clearChart('types');
    const typeCounts = { miitti: 0, cito: 0, cce: 0 };
    data.forEach(e => { if(typeCounts[e.type] !== undefined) typeCounts[e.type]++; });
    chartInstances['types'] = new Chart(document.getElementById('chart-types-canvas'), {
        type: 'doughnut', data: { labels: ["Miitti", "CITO", "CCE"], datasets: [{ data: Object.values(typeCounts), backgroundColor: [colors.primary, colors.accent, colors.secondary] }] }
    });

    clearChart('timeline');
    const timelineData = [...data].sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-15);
    chartInstances['timeline'] = new Chart(document.getElementById('chart-timeline-canvas'), {
        type: 'line', data: { labels: timelineData.map(e => e.date.split('-').slice(1).reverse().join('.')), datasets: [{ label: 'Kävijät', data: timelineData.map(e => e.attendeeCount), borderColor: colors.primary, backgroundColor: 'rgba(139, 69, 19, 0.2)', fill: true, tension: 0.4 }] }
    });

    clearChart('cumulative');
    const allEventsSorted = [...allStatsData.events].sort((a,b) => new Date(a.date) - new Date(b.date));
    const uniqueUsersSet = new Set();
    const cumulativePoints = [];
    allEventsSorted.forEach(evt => {
        if(evt.attendeeNames) evt.attendeeNames.forEach(name => uniqueUsersSet.add(name.toLowerCase()));
        cumulativePoints.push({ x: evt.date, y: uniqueUsersSet.size });
    });
    chartInstances['cumulative'] = new Chart(document.getElementById('chart-cumulative-canvas'), {
        type: 'line', data: { labels: cumulativePoints.map(p => p.x), datasets: [{ label: 'Uniikit kävijät yhteensä', data: cumulativePoints.map(p => p.y), borderColor: '#2e7d32', backgroundColor: 'rgba(46, 125, 50, 0.1)', fill: true, pointRadius: 2, tension: 0.1 }] }
    });

    clearChart('hours');
    const hoursData = Array(24).fill(0);
    data.forEach(e => { if(e.time) { const hour = parseInt(e.time.split(':')[0]); if(!isNaN(hour)) hoursData[hour]++; } });
    chartInstances['hours'] = new Chart(document.getElementById('chart-hours-canvas'), {
        type: 'bar', data: { labels: Array.from({length: 24}, (_, i) => i + ":00"), datasets: [{ label: 'Miitit', data: hoursData, backgroundColor: colors.secondary }] }
    });

    clearChart('months');
    const monthsData = Array(12).fill(0);
    const monthNames = ["Tam", "Hel", "Maa", "Huh", "Tou", "Kes", "Hei", "Elo", "Syy", "Lok", "Mar", "Jou"];
    data.forEach(e => { if(e.date) { const m = new Date(e.date).getMonth(); monthsData[m] += e.attendeeCount; } });
    chartInstances['months'] = new Chart(document.getElementById('chart-months-canvas'), {
        type: 'bar', data: { labels: monthNames, datasets: [{ label: 'Kävijämäärä yhteensä', data: monthsData, backgroundColor: '#A0522D' }] }
    });

    clearChart('locations');
    const locMap = {};
    data.forEach(e => { if (e.location) locMap[e.location] = (locMap[e.location] || 0) + 1; });
    const sortedLocs = Object.entries(locMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    chartInstances['locations'] = new Chart(document.getElementById('chart-locations-canvas'), {
        type: 'bar', data: { labels: sortedLocs.map(x => x[0]), datasets: [{ label: 'Miitit', data: sortedLocs.map(x => x[1]), backgroundColor: colors.primary }] }, options: { indexAxis: 'y' }
    });

    clearChart('topAttendees');
    const userMap = {};
    data.forEach(e => e.attendeeNames.forEach(n => userMap[n] = (userMap[n] || 0) + 1));
    const topUsers = Object.entries(userMap).sort((a,b) => b[1] - a[1]).slice(0, 10);
    chartInstances['topAttendees'] = new Chart(document.getElementById('chart-top-attendees-canvas'), {
        type: 'bar', data: { labels: topUsers.map(x => x[0]), datasets: [{ label: 'Käynnit', data: topUsers.map(x => x[1]), backgroundColor: colors.secondary }] }, options: { indexAxis: 'y' }
    });

    clearChart('topEvents');
    const topEvents = [...data].sort((a,b) => b.attendeeCount - a.attendeeCount).slice(0, 10);
    chartInstances['topEvents'] = new Chart(document.getElementById('chart-top-events-canvas'), {
        type: 'bar', data: { labels: topEvents.map(x => x.name.substring(0, 15) + "..."), datasets: [{ label: 'Osallistujat', data: topEvents.map(x => x.attendeeCount), backgroundColor: colors.accent }] }
    });

    clearChart('attrs');
    const attrMap = {};
    data.forEach(e => { if(e.attributes) e.attributes.forEach(a => { if(a.inc === 1) { const name = a.name || a; attrMap[name] = (attrMap[name] || 0) + 1; } }); });
    const topAttrs = Object.entries(attrMap).sort((a,b) => b[1] - a[1]).slice(0, 10);
    chartInstances['attrs'] = new Chart(document.getElementById('chart-attributes-canvas'), {
        type: 'bar', data: { labels: topAttrs.map(x => x[0]), datasets: [{ label: 'Esiintyvyys', data: topAttrs.map(x => x[1]), backgroundColor: '#A0522D' }] }, options: { indexAxis: 'y' }
    });
}

function renderUserRegistry(data) {
    const el = document.getElementById('stats-user-registry');
    if(!el) return;
    const map = {};
    data.forEach(e => { if(e.attendeeNames) e.attendeeNames.forEach(n => map[n] = (map[n] || 0) + 1); });
    const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]);
    const limit = 50;
    const listToShow = sorted.slice(0, limit);
    if (listToShow.length === 0) { el.innerHTML = "Ei kävijöitä."; return; }
    el.innerHTML = listToShow.map(([name, count], i) => `<div class="stats-row"><span>${i+1}. <span class="clickable-name" onclick="openUserProfile('${name}')">${name}</span></span> <strong>${count}</strong></div>`).join('');
}

function renderTopUsersList(data) {
    const map = {};
    data.forEach(e => { if(e.attendeeNames) e.attendeeNames.forEach(n => map[n] = (map[n] || 0) + 1); });
    const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 10);
    const el = document.getElementById('stats-top-users');
    if(el) el.innerHTML = sorted.map(([name, count], i) => `<div class="stats-row"><span>${i+1}. ${name}</span> <strong>${count} miittiä</strong></div>`).join('');
}

function renderLoyaltyPyramid(data) {
    const el = document.getElementById('stats-loyalty');
    if (!el) return;
    const userCounts = {};
    data.forEach(e => e.attendeeNames.forEach(n => userCounts[n] = (userCounts[n] || 0) + 1));
    let tiers = { 'Vakikasvot (10+)': 0, 'Aktiivit (5-9)': 0, 'Satunnaiset (2-4)': 0, 'Kertakävijät (1)': 0 };
    Object.values(userCounts).forEach(count => {
        if (count >= 10) tiers['Vakikasvot (10+)']++;
        else if (count >= 5) tiers['Aktiivit (5-9)']++;
        else if (count >= 2) tiers['Satunnaiset (2-4)']++;
        else tiers['Kertakävijät (1)']++;
    });
    const totalUsers = Object.keys(userCounts).length || 1;
    let html = `<div style="display:flex; flex-direction:column; align-items:center; gap:5px;">`;
    const order = ['Vakikasvot (10+)', 'Aktiivit (5-9)', 'Satunnaiset (2-4)', 'Kertakävijät (1)'];
    const colors = ['#8B4513', '#A0522D', '#CD853F', '#DEB887'];
    order.forEach((label, idx) => {
        const count = tiers[label];
        const pct = Math.round((count / totalUsers) * 100);
        const width = 20 + (count / totalUsers) * 80; 
        html += `<div style="width:100%; max-width:400px; display:flex; flex-direction:column; align-items:center;"><div style="width:${width}%; background:${colors[idx]}; color:white; text-align:center; padding:5px; border-radius:4px; font-size:0.9em; box-shadow: 2px 2px 5px rgba(0,0,0,0.1);">${label}<br><strong>${count} hlö (${pct}%)</strong></div></div>`;
    });
    html += `</div>`;
    el.innerHTML = html;
}

function renderWordCloud(data) {
    const el = document.getElementById('stats-wordcloud');
    if (!el) return;
    let allText = "";
    data.forEach(e => { if (e.logs) e.logs.forEach(l => { if (l.message) allText += " " + l.message; }); });
    const words = allText.toLowerCase().replace(/[.,!?;:()"]/g, "").split(/\s+/).filter(w => w.length > 2);
    const stopWords = ["oli", "että", "kun", "niin", "mutta", "siis", "vain", "nyt", "tämä", "sitten", "olla", "ollut", "ovat", "myös", "kanssa", "kuin", "joka", "mitä", "sekä", "täällä", "koko", "jälkeen", "vielä", "paljon", "kiitos", "miitti", "miitistä", "kätkö", "kätköllä", "kk", "tftc", "kiitokset", "log", "hyvä", "tosi", "kiva", "mukava", "järjestäjälle", "järjestäjille"];
    const counts = {};
    words.forEach(w => { if (!stopWords.includes(w)) counts[w] = (counts[w] || 0) + 1; });
    const topWords = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 30);
    if (topWords.length === 0) { el.innerHTML = "Ei riittävästi dataa sanalouhokseen."; return; }
    const maxCount = topWords[0][1];
    const minCount = topWords[topWords.length - 1][1];
    let cloudHtml = `<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px; padding:10px;">`;
    topWords.forEach(([word, count]) => {
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
