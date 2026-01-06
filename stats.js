// ==========================================
// STATS.JS - Tilastojen laskenta ja hienot graafit
// Versio: 7.5.4 - Host in Top Lists (FULL)
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

    // 1. Lasketaan perusluvut ja tyypit
    const totalEvents = data.length;
    const totalGuestVisits = data.reduce((sum, e) => sum + e.attendeeCount, 0);
    
    let countCancelled = 0;
    let typeCounts = { miitti: 0, cito: 0, cce: 0 };

    data.forEach(e => {
        if (e.name && e.name.includes("/ PERUTTU /")) {
            countCancelled++;
        }
        const t = (e.type || 'miitti').toLowerCase();
        if (typeCounts[t] !== undefined) {
            typeCounts[t]++;
        } else {
            typeCounts['miitti']++;
        }
    });

    // Järjestäjän omat osallistumiset (Kaikki - Perutut)
    const organizerAttended = totalEvents - countCancelled;
    
    // TALLENNETAAN GLOBAALISTI JOTTA RENDER-FUNKTIOT NÄKEVÄT SEN
    window.currentOrganizerStats = { count: organizerAttended };

    // 2. Lasketaan uniikit nimimerkit
    const uniqueNames = new Set();
    data.forEach(evt => {
        if(evt.attendeeNames) {
            evt.attendeeNames.forEach(n => uniqueNames.add(n.trim().toLowerCase()));
        }
    });
    const uniqueCount = uniqueNames.size;

    // 3. Päivitetään yhteenveto
    const summaryEl = document.getElementById('stats-summary-text');
    if(summaryEl) {
        summaryEl.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr auto; gap:5px; text-align:left; font-size:0.95em;">
                <div>Tapahtumia yhteensä:</div><div style="text-align:right;"><strong>${totalEvents}</strong> kpl</div>
                
                <div style="color:#aaa; padding-left:15px; font-size:0.9em;">• Miitit</div><div style="text-align:right; color:#aaa; font-size:0.9em;">${typeCounts.miitti}</div>
                <div style="color:#aaa; padding-left:15px; font-size:0.9em;">• CITO-tapahtumat</div><div style="text-align:right; color:#aaa; font-size:0.9em;">${typeCounts.cito}</div>
                <div style="color:#aaa; padding-left:15px; font-size:0.9em;">• Juhlat (CCE)</div><div style="text-align:right; color:#aaa; font-size:0.9em;">${typeCounts.cce}</div>
                ${countCancelled > 0 ? `<div style="color:#e57373; padding-left:15px; font-size:0.9em;">• Perutut</div><div style="text-align:right; color:#e57373; font-size:0.9em;">${countCancelled}</div>` : ''}

                <div style="margin-top:8px;">Vieraskirjauksia:</div><div style="text-align:right; margin-top:8px;"><strong>${totalGuestVisits}</strong> kpl</div>
                <div>Uniikit vieraat:</div><div style="text-align:right; color:var(--primary-color);"><strong>${uniqueCount}</strong> hlö</div>
                
                <div style="border-top:1px solid #555; padding-top:8px; margin-top:8px;">Omat osallistumiset:</div>
                <div style="border-top:1px solid #555; padding-top:8px; margin-top:8px; text-align:right; color:var(--header-color);">
                    <strong>${organizerAttended}</strong> kpl <span style="font-size:0.7em; color:#888; font-weight:normal;">(Toteutuneet)</span>
                </div>
            </div>
            <div style="margin-top:10px; border-top:1px dashed #555; padding-top:10px; text-align:center;">
                Keskiarvo: <strong style="font-size:1.2em; color:var(--secondary-color);">${totalEvents ? (totalGuestVisits / totalEvents).toFixed(1) : 0}</strong> vierasta / miitti
            </div>
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
    
    renderYearHeatmap(data);

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
// RENDERÖINTI - LISÄTTY HOST LISTOIHIN
// ==========================================

function renderUserRegistry(data) {
    const el = document.getElementById('stats-user-registry');
    if(!el) return;
    const map = {};
    data.forEach(e => { if(e.attendeeNames) e.attendeeNames.forEach(n => map[n] = (map[n] || 0) + 1); });
    const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]);
    
    // --- LISÄÄ HOST LISTAN KÄRKEEN ---
    let html = "";
    if (window.currentOrganizerStats && window.currentOrganizerStats.count > 0) {
        html += `<div class="stats-row" style="background:rgba(255, 140, 0, 0.1); border-left:3px solid #FF8C00; padding-left:5px;">
            <span>👑 Mikkokalevi <span style="font-size:0.8em; color:#888;">(Järjestäjä)</span></span> 
            <strong>${window.currentOrganizerStats.count}</strong>
        </div>`;
    }

    const limit = 50;
    const listToShow = sorted.slice(0, limit);
    
    if (listToShow.length === 0 && !html) { el.innerHTML = "Ei kävijöitä."; return; }
    
    html += listToShow.map(([name, count], i) => 
        `<div class="stats-row"><span>${i+1}. <span class="clickable-name" onclick="openUserProfile('${name}')">${name}</span></span> <strong>${count}</strong></div>`
    ).join('');
    
    el.innerHTML = html;
}

function renderTopUsersList(data) {
    const map = {};
    data.forEach(e => { if(e.attendeeNames) e.attendeeNames.forEach(n => map[n] = (map[n] || 0) + 1); });
    const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 10);
    const el = document.getElementById('stats-top-users');
    if(!el) return;

    let html = "";
    // --- LISÄÄ HOST TOP-LISTAN KÄRKEEN ---
    if (window.currentOrganizerStats && window.currentOrganizerStats.count > 0) {
        html += `<div class="stats-row" style="background:rgba(255, 140, 0, 0.1); border-left:3px solid #FF8C00; padding-left:5px;">
            <span>👑 Mikkokalevi</span> <strong>${window.currentOrganizerStats.count} miittiä</strong>
        </div>`;
    }

    html += sorted.map(([name, count], i) => `<div class="stats-row"><span>${i+1}. ${name}</span> <strong>${count} miittiä</strong></div>`).join('');
    el.innerHTML = html;
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

function renderYearHeatmap(data) {
    const el = document.getElementById('stats-year-heatmap');
    if (!el) return;

    const matrix = {};
    const years = new Set();
    
    data.forEach(evt => {
        if (!evt.date) return;
        const [y, m] = evt.date.split('-');
        years.add(y);
        if (!matrix[y]) matrix[y] = new Array(12).fill(0);
        matrix[y][parseInt(m) - 1]++;
    });

    const sortedYears = Array.from(years).sort((a,b) => b - a); 
    if (sortedYears.length === 0) { el.innerHTML = "Ei dataa."; return; }

    let html = `<table style="width:100%; border-collapse:separate; border-spacing:2px; font-size:0.9em;">`;
    
    const months = ["T", "H", "M", "H", "T", "K", "H", "E", "S", "L", "M", "J"];
    html += `<tr><th style="text-align:left;">Vuosi</th>${months.map(m => `<th style="width:7%; text-align:center; color:#888;">${m}</th>`).join('')}<th style="width:10%;">Yht</th></tr>`;

    sortedYears.forEach(year => {
        const rowData = matrix[year];
        const total = rowData.reduce((a,b) => a + b, 0);
        
        let rowHtml = `<tr><td style="font-weight:bold; color:var(--header-color);">${year}</td>`;
        
        rowData.forEach(count => {
            let bg = 'rgba(255,255,255,0.05)';
            let color = 'transparent';
            let border = '1px solid #333';

            if (count > 0) {
                color = '#000';
                border = 'none';
                if (count === 1) { bg = '#81c784'; } 
                else if (count <= 3) { bg = '#FFD54F'; } 
                else { bg = '#FF7043'; }
            }
            
            rowHtml += `<td style="text-align:center; background:${bg}; color:${color}; border-radius:4px; border:${border}; font-weight:bold;" title="${count} miittiä">${count > 0 ? count : ''}</td>`;
        });
        
        rowHtml += `<td style="text-align:center; font-weight:bold; color:var(--primary-color);">${total}</td></tr>`;
        html += rowHtml;
    });

    html += `</table>`;
    html += `<div style="text-align:right; font-size:0.8em; color:#666; margin-top:5px;">Värit: 🟩=1 🟨=2-3 🟧=4+</div>`;
    
    el.innerHTML = html;
}

// ==========================================
// KARTTANÄKYMÄ (Fuzzy Grouping)
// ==========================================

window.renderMap = function(data) {
    if (typeof L === 'undefined' || !document.getElementById('stats-map')) return;

    if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
    }

    mapInstance = L.map('stats-map', {
        tap: true 
    }).setView([64.0, 26.0], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(mapInstance);

    const bounds = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const legendData = new Set(); 

    const yearColors = {
        '2026': '#E91E63', '2025': '#D32F2F', '2024': '#FF5722', 
        '2023': '#FFC107', '2022': '#4CAF50', '2021': '#009688', 
        '2020': '#3F51B5', 'default': '#795548'
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

    // FUZZY GROUPING (~100m)
    const groupedEvents = {};
    
    data.forEach(evt => {
        if (!evt.coords) return;
        const latLng = parseCoord(evt.coords);
        if(!latLng) return;

        const latKey = latLng[0].toFixed(3);
        const lonKey = latLng[1].toFixed(3);
        const key = `${latKey}_${lonKey}`;

        if (!groupedEvents[key]) {
            groupedEvents[key] = {
                center: latLng,
                events: []
            };
        }
        groupedEvents[key].events.push(evt);
    });

    const getPointStyle = (events) => {
        const hasFuture = events.some(e => e.date > todayStr);
        const allCancelled = events.every(e => e.name.includes("/ PERUTTU /"));
        
        if (allCancelled) {
            legendData.add(JSON.stringify({color: '#9E9E9E', label: 'Peruttu'}));
            return { color: '#666', fillColor: '#9E9E9E', fillOpacity: 0.8, radius: 8 };
        }
        
        if (hasFuture) {
            legendData.add(JSON.stringify({color: '#2196F3', label: 'Tulevat'}));
            return { color: '#0d47a1', fillColor: '#2196F3', fillOpacity: 0.9, radius: 10 }; 
        }

        const years = events.map(e => e.date.split('-')[0]).sort().reverse();
        const year = years[0];
        let color = yearColors[year] || yearColors['default'];
        
        legendData.add(JSON.stringify({color: color, label: yearColors[year] ? year : '< 2020'}));
        
        const isCluster = events.length > 1;
        
        return { 
            color: isCluster ? '#FFF' : '#333', 
            weight: isCluster ? 3 : 1, 
            fillColor: color, 
            fillOpacity: 0.9, 
            radius: isCluster ? 12 : 8 
        };
    };

    Object.values(groupedEvents).forEach(group => {
        const latLng = group.center;
        const style = getPointStyle(group.events);
        const marker = L.circleMarker(latLng, style).addTo(mapInstance);
        
        let popupHtml = "";
        
        if (group.events.length === 1) {
            const evt = group.events[0];
            popupHtml = `
                <div style="text-align:center; min-width:150px;">
                    <b style="font-size:1.1em;">${evt.name}</b><br>
                    <span style="color:#666;">${evt.date}</span><br>
                    <span style="font-weight:bold;">👤 ${evt.attendeeCount}</span><br>
                    <button class="btn btn-small btn-green" style="margin-top:10px; width:100%;" onclick="goToEventFromMap('${evt.key}')">📖 Avaa miittikirja</button>
                </div>
            `;
        } else {
            popupHtml = `<div style="min-width:200px;">
                <div style="text-align:center; font-weight:bold; border-bottom:1px solid #ccc; margin-bottom:5px; padding-bottom:5px;">
                    📍 ${group.events.length} miittiä alueella
                </div>
                <div style="max-height:200px; overflow-y:auto;">`;
            
            group.events.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(evt => {
                popupHtml += `
                    <div style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px dotted #eee; display:flex; justify-content:space-between; align-items:center;">
                        <div style="text-align:left;">
                            <div style="font-weight:bold; font-size:0.9em;">${evt.date}</div>
                            <div style="font-size:0.85em;">${evt.name.substring(0, 20)}...</div>
                        </div>
                        <button class="btn btn-small btn-blue" style="margin:0; padding:4px 8px; font-size:0.8em;" onclick="goToEventFromMap('${evt.key}')">Avaa</button>
                    </div>
                `;
            });
            popupHtml += `</div></div>`;
        }
        
        marker.bindPopup(popupHtml);
        bounds.push(latLng);
    });

    if (bounds.length > 0) {
        mapInstance.fitBounds(bounds);
    }
    
    renderMapLegend(legendData);
    setTimeout(() => { mapInstance.invalidateSize(); }, 200);
};

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

        if (currentUser) {
            row.style.cursor = "pointer";
            row.title = "Siirry miittiin";
            row.style.transition = "background-color 0.2s";
            
            row.addEventListener('mouseenter', () => { row.style.backgroundColor = "rgba(139, 69, 19, 0.15)"; });
            row.addEventListener('mouseleave', () => { row.style.backgroundColor = "transparent"; });

            row.onclick = function() {
                const modal = document.getElementById('user-profile-modal');
                if(modal) modal.style.display = 'none';
                const stats = document.getElementById('stats-view');
                if(stats) stats.style.display = 'none';
                if(window.openGuestbook) window.openGuestbook(evt.key);
            };
        } else {
            row.style.cursor = "default";
        }

        listEl.appendChild(row);
    });
    
    document.getElementById('user-profile-modal').style.display = 'block';
};

window.goToEventFromMap = function(key) {
    if (typeof window.openGuestbook === 'function') {
        document.getElementById('stats-view').style.display = 'none';
        window.openGuestbook(key);
    } else {
        alert("Virhe: Miittikirjaa ei voitu avata.");
    }
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
