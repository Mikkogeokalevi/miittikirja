// ==========================================
// STATS.JS - Tilastojen laskenta ja hienot graafit
// Versio: 7.6.6 - Top-listat + autocomplete näyttölogiikka
// ==========================================

let allStatsData = {
    events: [],
    attendees: {}
};

let chartInstances = {};
let mapInstance = null;
let statsLogUserNames = [];
let currentStatsLogSearchSnapshot = { rows: [], sourceMode: 'both' };

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

        // Lasketaan järjestysnumerot (seqNumber) tyypeittäin
        const typeCounts = { miitti: 0, cito: 0, cce: 0 };
        const byDate = [...events].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
        byDate.forEach(evt => {
            const type = (evt.type || 'miitti').toLowerCase();
            if (typeCounts[type] === undefined) typeCounts[type] = 0;
            typeCounts[type] += 1;
            evt.seqNumber = typeCounts[type];
        });

        allStatsData.events = events;
        populateYearFilter(events);
        updateStatsView(events);
        initUserLogSearchBindings();

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

    const organizerAttended = totalEvents - countCancelled;
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
    renderFirstTimersTopEvents(data);
    renderOneTimers(data);
    renderLongestStreaks(data);
    
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
            `<div class="stats-row clickable" onclick="openGuestbook('${e.key}')"><span>${i+1}. ${e.name}</span> <strong>${e.attendeeCount}</strong></div>`
        ).join('');
    };

    renderList(sortedByCount.slice(0, 10), 'stats-top-10');
    renderList([...sortedByCount].reverse().slice(0, 10), 'stats-bottom-10');

    renderLocationsTable(data);
    renderAttributesList(data);
    populateStatsLogUserDatalist(data);
    runUserLogSearch(data);

    if(document.getElementById('tab-graphs').classList.contains('active')) {
        renderCharts(data);
    }
    if(document.getElementById('tab-map') && document.getElementById('tab-map').classList.contains('active')) {
        renderMap(data);
    }
}

// ==========================================
// RENDERÖINTI
// ==========================================

function renderUserRegistry(data) {
    const el = document.getElementById('stats-user-registry');
    if(!el) return;
    const map = {};
    data.forEach(e => { if(e.attendeeNames) e.attendeeNames.forEach(n => map[n] = (map[n] || 0) + 1); });
    const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]);
    
    // --- HOST ---
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
    
    // --- LISÄTTY TITTELI RIVILLE ---
    html += listToShow.map(([name, count], i) => {
        let title = "";
        if (window.MK_Messages && typeof window.MK_Messages.getRankTitle === 'function') {
            title = window.MK_Messages.getRankTitle(count);
        }
        return `<div class="stats-row">
            <span>${i+1}. <span class="clickable-name" onclick="openUserProfile('${name}')">${name}</span> 
            <span style="font-size:0.8em; color:#888; font-style:italic;">(${title})</span></span> 
            <strong>${count}</strong>
        </div>`;
    }).join('');
    
    el.innerHTML = html;
}

function escapeHtml(str) {
    return (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function splitMessageSources(message) {
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

function countWords(text) {
    const clean = (text || '').trim();
    if (!clean) return 0;
    return clean.split(/\s+/).filter(Boolean).length;
}

function getDisplayMessageBySource(row, sourceMode) {
    if (sourceMode === 'local') return row.localMessage || '';
    if (sourceMode === 'net') return row.netMessage || '';
    if (sourceMode === 'from') return row.from || '';
    const both = [row.localMessage, row.netMessage].filter(Boolean).join(' | ');
    return both;
}

function csvEscape(value) {
    const text = (value ?? '').toString().replace(/"/g, '""');
    return `"${text}"`;
}

function flattenEventLogs(data) {
    const rows = [];
    data.forEach(evt => {
        const evtLogs = Array.isArray(evt.logs) ? evt.logs : [];
        evtLogs.forEach(log => {
            const nickname = (log.nickname || '').trim();
            if (!nickname) return;

            const sources = splitMessageSources(log.message || '');
            rows.push({
                eventKey: evt.key,
                eventName: evt.name || 'Nimetön miitti',
                eventDate: evt.date || '',
                nickname,
                nicknameLower: nickname.toLowerCase(),
                from: (log.from || '').trim(),
                localMessage: sources.local,
                netMessage: sources.net,
                timestamp: log.timestamp || 0
            });
        });
    });
    return rows;
}

function populateStatsLogUserDatalist(data) {
    statsLogUserNames = [...new Set(flattenEventLogs(data).map(r => r.nickname))]
        .sort((a, b) => a.localeCompare(b, 'fi'))
        .slice(0, 1000);

    renderStatsLogUserAutocomplete(document.getElementById('stats-log-user')?.value || '');
}

function hideStatsLogUserAutocomplete() {
    const list = document.getElementById('stats-log-user-autocomplete');
    if (list) list.style.display = 'none';
}

function renderStatsLogUserAutocomplete(query) {
    const list = document.getElementById('stats-log-user-autocomplete');
    if (!list) return;

    const q = (query || '').trim().toLowerCase();
    if (q.length === 0) {
        list.innerHTML = '';
        list.style.display = 'none';
        return;
    }

    const matches = statsLogUserNames.filter(name => name.toLowerCase().includes(q)).slice(0, 12);

    if (matches.length === 0) {
        list.innerHTML = '';
        list.style.display = 'none';
        return;
    }

    list.innerHTML = '';
    matches.forEach(name => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = name;
        item.onmousedown = (e) => {
            e.preventDefault();
            window.selectStatsLogUser(name);
        };
        list.appendChild(item);
    });
    list.style.display = 'block';
}

function initUserLogSearchBindings() {
    const btn = document.getElementById('btn-apply-user-logs');
    if (btn && !btn.dataset.bound) {
        btn.onclick = () => runUserLogSearch(window.currentFilteredData || allStatsData.events || []);
        btn.dataset.bound = '1';
    }

    const exportBtn = document.getElementById('btn-export-user-logs');
    if (exportBtn && !exportBtn.dataset.bound) {
        exportBtn.onclick = exportCurrentUserLogSearch;
        exportBtn.dataset.bound = '1';
    }

    const exportTxtBtn = document.getElementById('btn-export-user-logs-txt');
    if (exportTxtBtn && !exportTxtBtn.dataset.bound) {
        exportTxtBtn.onclick = exportCurrentUserLogSearchTxt;
        exportTxtBtn.dataset.bound = '1';
    }

    const input = document.getElementById('stats-log-user');
    if (input && !input.dataset.bound) {
        input.addEventListener('input', () => {
            renderStatsLogUserAutocomplete(input.value || '');
        });
        input.addEventListener('focus', () => {
            renderStatsLogUserAutocomplete(input.value || '');
        });
        input.addEventListener('blur', () => {
            setTimeout(() => hideStatsLogUserAutocomplete(), 120);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                hideStatsLogUserAutocomplete();
                runUserLogSearch(window.currentFilteredData || allStatsData.events || []);
            }
        });
        input.dataset.bound = '1';
    }
}

window.selectStatsLogUser = function(name) {
    const input = document.getElementById('stats-log-user');
    if (input) input.value = name;
    hideStatsLogUserAutocomplete();
    runUserLogSearch(window.currentFilteredData || allStatsData.events || []);
};

function exportCurrentUserLogSearch() {
    const rows = currentStatsLogSearchSnapshot.rows || [];
    const sourceMode = currentStatsLogSearchSnapshot.sourceMode || 'both';

    if (rows.length === 0) {
        alert('Ei ladattavia logeja. Tee ensin haku.');
        return;
    }

    const header = [
        'Pvm',
        'Miitti',
        'Nimimerkki',
        'Paikkakunta',
        'Miittiviesti',
        'Geocaching.com viesti',
        'Näytetty viesti'
    ];

    const lines = [header.map(csvEscape).join(';')];
    rows.forEach(r => {
        lines.push([
            r.eventDate || '',
            r.eventName || '',
            r.nickname || '',
            r.from || '',
            r.localMessage || '',
            r.netMessage || '',
            getDisplayMessageBySource(r, sourceMode)
        ].map(csvEscape).join(';'));
    });

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    const userRaw = (document.getElementById('stats-log-user')?.value || 'kaikki').trim().toLowerCase();
    const safeUser = userRaw.replace(/[^a-z0-9åäö_-]+/gi, '_') || 'kaikki';
    const fileName = `miittikirja_logit_${safeUser}_${stamp}.csv`;

    const blob = new Blob(["\uFEFF" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportCurrentUserLogSearchTxt() {
    const rows = currentStatsLogSearchSnapshot.rows || [];
    const sourceMode = currentStatsLogSearchSnapshot.sourceMode || 'both';

    if (rows.length === 0) {
        alert('Ei ladattavia logeja. Tee ensin haku.');
        return;
    }

    const fromDate = (document.getElementById('stats-log-from')?.value || '').trim();
    const toDate = (document.getElementById('stats-log-to')?.value || '').trim();
    const userRaw = (document.getElementById('stats-log-user')?.value || 'kaikki').trim();
    const sourceLabel = sourceMode === 'both'
        ? 'Molemmat'
        : sourceMode === 'local'
            ? 'Miittikirja'
            : sourceMode === 'net'
                ? 'Geocaching.com'
                : 'Paikkakunta';

    const totalLocalWords = rows.reduce((sum, r) => sum + countWords(r.localMessage), 0);
    const totalNetWords = rows.reduce((sum, r) => sum + countWords(r.netMessage), 0);
    const totalFromWords = rows.reduce((sum, r) => sum + countWords(r.from), 0);
    const totalShownWords = sourceMode === 'local'
        ? totalLocalWords
        : sourceMode === 'net'
            ? totalNetWords
            : sourceMode === 'from'
                ? totalFromWords
                : totalLocalWords + totalNetWords;

    const writerWordCounts = {};
    rows.forEach(r => {
        const words = sourceMode === 'local'
            ? countWords(r.localMessage)
            : sourceMode === 'net'
                ? countWords(r.netMessage)
                : sourceMode === 'from'
                    ? countWords(r.from)
                    : countWords(r.localMessage) + countWords(r.netMessage);
        writerWordCounts[r.nickname] = (writerWordCounts[r.nickname] || 0) + words;
    });
    const topWriters = Object.entries(writerWordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const lines = [];
    lines.push('MK Miittikirja - Logiraportti');
    lines.push('=============================');
    lines.push(`Nimimerkkihaku: ${userRaw || 'kaikki'}`);
    lines.push(`Aikavali: ${fromDate || 'alku'} - ${toDate || 'loppu'}`);
    lines.push(`Viestilahde: ${sourceLabel}`);
    lines.push(`Riveja: ${rows.length}`);
    lines.push('');
    lines.push('Sanalaskuri');
    lines.push('----------');
    lines.push(`Sanoja yhteensa (näytetty lähde): ${totalShownWords}`);
    lines.push(`Miittiviestit sanat: ${totalLocalWords}`);
    lines.push(`Geocaching.com sanat: ${totalNetWords}`);
    lines.push(`Paikkakunta-kentän sanat: ${totalFromWords}`);
    lines.push(`Top-kirjoittajat: ${topWriters.length ? topWriters.map(([name, words], i) => `${i + 1}. ${name} (${words})`).join(' | ') : 'Ei dataa'}`);
    lines.push('');

    rows.forEach((r, idx) => {
        lines.push(`${idx + 1}) ${r.eventDate || '-'} | ${r.eventName || '-'} | ${r.nickname || '-'}`);
        if (r.from) lines.push(`   Paikkakunta: ${r.from}`);

        if (sourceMode === 'both' || sourceMode === 'local') {
            lines.push(`   Miittiviesti: ${r.localMessage || '-'}`);
        }
        if (sourceMode === 'both' || sourceMode === 'net') {
            lines.push(`   Geocaching.com: ${r.netMessage || '-'}`);
        }
        if (sourceMode === 'from') {
            lines.push(`   Paikkakunta: ${r.from || '-'}`);
        }

        lines.push('');
    });

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    const safeUser = userRaw.toLowerCase().replace(/[^a-z0-9åäö_-]+/gi, '_') || 'kaikki';
    const fileName = `miittikirja_logiraportti_${safeUser}_${stamp}.txt`;

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function runUserLogSearch(data) {
    const summaryEl = document.getElementById('stats-user-log-summary');
    const wordStatsEl = document.getElementById('stats-user-word-stats');
    const topListsEl = document.getElementById('stats-user-top-lists');
    const listEl = document.getElementById('stats-user-log-results');
    if (!summaryEl || !wordStatsEl || !listEl) return;

    const userFilter = (document.getElementById('stats-log-user')?.value || '').trim().toLowerCase();
    const fromDate = (document.getElementById('stats-log-from')?.value || '').trim();
    const toDate = (document.getElementById('stats-log-to')?.value || '').trim();
    const limitValue = (document.getElementById('stats-log-limit')?.value || '10').trim();
    const sourceMode = (document.getElementById('stats-log-source')?.value || 'both').trim();

    let rows = flattenEventLogs(data);

    if (fromDate) rows = rows.filter(r => r.eventDate && r.eventDate >= fromDate);
    if (toDate) rows = rows.filter(r => r.eventDate && r.eventDate <= toDate);
    if (userFilter) rows = rows.filter(r => r.nicknameLower.includes(userFilter));

    rows.sort((a, b) => {
        if (a.eventDate !== b.eventDate) return (b.eventDate || '').localeCompare(a.eventDate || '');
        return (b.timestamp || 0) - (a.timestamp || 0);
    });

    const limit = limitValue === 'all' ? Number.MAX_SAFE_INTEGER : (parseInt(limitValue, 10) || 10);
    const limitedRows = rows.slice(0, limit);
    currentStatsLogSearchSnapshot = { rows: limitedRows, sourceMode };

    const writerWordCounts = {};
    const writerLogCounts = {};
    rows.forEach(r => {
        const words =
            sourceMode === 'local' ? countWords(r.localMessage)
            : sourceMode === 'net' ? countWords(r.netMessage)
            : sourceMode === 'from' ? countWords(r.from)
            : countWords(r.localMessage) + countWords(r.netMessage);

        if (!writerWordCounts[r.nickname]) writerWordCounts[r.nickname] = 0;
        writerWordCounts[r.nickname] += words;
        if (!writerLogCounts[r.nickname]) writerLogCounts[r.nickname] = 0;
        writerLogCounts[r.nickname] += 1;
    });

    const topWriters = Object.entries(writerWordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    const topLoggers = Object.entries(writerLogCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const totalLocalWords = limitedRows.reduce((sum, r) => sum + countWords(r.localMessage), 0);
    const totalNetWords = limitedRows.reduce((sum, r) => sum + countWords(r.netMessage), 0);
    const totalFromWords = limitedRows.reduce((sum, r) => sum + countWords(r.from), 0);
    const totalShownWords =
        sourceMode === 'local' ? totalLocalWords
        : sourceMode === 'net' ? totalNetWords
        : sourceMode === 'from' ? totalFromWords
        : totalLocalWords + totalNetWords;

    summaryEl.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap:10px;">
            <span><strong>Osumia:</strong> ${rows.length}</span>
            <span><strong>Näytetään:</strong> ${Math.min(limitedRows.length, limit === Number.MAX_SAFE_INTEGER ? limitedRows.length : limit)}</span>
            <span><strong>Lähde:</strong> ${sourceMode === 'both' ? 'Molemmat' : sourceMode === 'local' ? 'Miittikirja' : sourceMode === 'net' ? 'Geocaching.com' : 'Paikkakunta'}</span>
            <span><strong>Aikaväli:</strong> ${fromDate || 'alku'} - ${toDate || 'loppu'}</span>
        </div>
    `;

    wordStatsEl.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
            <span><strong>Sanoja näytetyissä:</strong> ${totalShownWords}</span>
            <span style="color:#888;">(Miitti: ${totalLocalWords}, .com: ${totalNetWords}, Paikkakunta: ${totalFromWords})</span>
        </div>
    `;

    if (topListsEl) {
        topListsEl.innerHTML = `
            <div class="card" style="margin:0; padding:10px; border-style:dashed;">
                <h4 style="margin:0 0 8px 0;">🏆 Top-listat</h4>
                <div style="display:grid; gap:8px; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));">
                    <div>
                        <div style="font-weight:600; margin-bottom:4px;">Eniten sanoja</div>
                        <div style="font-size:0.92em; color:#ddd;">
                            ${topWriters.length ? topWriters.map(([name, words], i) => `${i + 1}. ${escapeHtml(name)} (${words} sanaa)`).join('<br>') : 'Ei dataa'}
                        </div>
                    </div>
                    <div>
                        <div style="font-weight:600; margin-bottom:4px;">Eniten logeja</div>
                        <div style="font-size:0.92em; color:#ddd;">
                            ${topLoggers.length ? topLoggers.map(([name, count], i) => `${i + 1}. ${escapeHtml(name)} (${count} logia)`).join('<br>') : 'Ei dataa'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    if (limitedRows.length === 0) {
        if (topListsEl) topListsEl.style.display = 'none';
        listEl.innerHTML = 'Ei osumia annetuilla ehdoilla.';
        return;
    }

    if (topListsEl) topListsEl.style.display = 'block';

    listEl.innerHTML = limitedRows.map(r => {
        const localText = r.localMessage ? `<div style="margin-top:4px;"><span style="color:#8bc34a;">📝 Miitti:</span> ${escapeHtml(r.localMessage)}</div>` : '';
        const netText = r.netMessage ? `<div style="margin-top:4px;"><span style="color:#64b5f6;">🌐 .com:</span> ${escapeHtml(r.netMessage)}</div>` : '';
        const fromText = r.from ? `<div style="margin-top:4px;"><span style="color:#ffcc80;">📍 Paikkakunta:</span> ${escapeHtml(r.from)}</div>` : '';

        const selectedContent = sourceMode === 'local'
            ? (localText || `<div style="color:#777; margin-top:4px;">(Ei miittiviestiä)</div>`)
            : sourceMode === 'net'
                ? (netText || `<div style="color:#777; margin-top:4px;">(Ei .com-viestiä)</div>`)
                : sourceMode === 'from'
                    ? (fromText || `<div style="color:#777; margin-top:4px;">(Ei paikkakuntaa)</div>`)
                : `${localText}${netText}` || `<div style="color:#777; margin-top:4px;">(Ei viestiä)</div>`;

        return `
            <div class="result-item" style="cursor:default;">
                <div style="display:flex; justify-content:space-between; gap:8px;">
                    <strong>${escapeHtml(r.nickname)}</strong>
                    <small style="color:#aaa;">${escapeHtml(r.eventDate)}</small>
                </div>
                <div style="font-size:0.85em; color:#999; margin-top:2px;">${escapeHtml(r.eventName)}</div>
                ${fromText}
                ${selectedContent}
            </div>
        `;
    }).join('');
}

function renderFirstTimersTopEvents(data) {
    const el = document.getElementById('stats-first-timers-top');
    if (!el) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const validEvents = data
        .filter(e => e.date && e.date <= todayStr)
        .filter(e => !(e.name && e.name.includes("/ PERUTTU /")))
        .filter(e => (e.type || 'miitti').toLowerCase() === 'miitti');

    if (validEvents.length === 0) {
        el.innerHTML = "Ei tietoja.";
        return;
    }

    const sortedByDate = [...validEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
    const seen = new Set();
    sortedByDate.forEach(evt => {
        let count = 0;
        const names = (evt.attendeeNames || []).map(n => n.trim().toLowerCase()).filter(Boolean);
        const uniqueNames = new Set(names);
        uniqueNames.forEach(name => {
            if (!seen.has(name)) {
                seen.add(name);
                count++;
            }
        });
        evt.firstTimersCount = count;
    });

    const top = [...sortedByDate].sort((a, b) => b.firstTimersCount - a.firstTimersCount).slice(0, 10);
    if (top.length === 0) {
        el.innerHTML = "Ei tietoja.";
        return;
    }

    el.innerHTML = top.map((evt, i) => {
        return `<div class="stats-row clickable" onclick="openGuestbook('${evt.key}')">
            <span>${i+1}. ${evt.name}</span>
            <strong>${evt.firstTimersCount}</strong>
        </div>`;
    }).join('');
}

function renderOneTimers(data) {
    const el = document.getElementById('stats-one-timers');
    if (!el) return;

    const map = {};
    data.forEach(e => {
        if (e.attendeeNames) {
            e.attendeeNames.forEach(n => {
                const key = n.trim();
                if (!key) return;
                map[key] = (map[key] || 0) + 1;
            });
        }
    });

    const oneTimers = Object.entries(map).filter(([, count]) => count === 1).map(([name]) => name);
    if (oneTimers.length === 0) {
        el.innerHTML = "Ei tietoja.";
        return;
    }

    const sorted = oneTimers.sort((a, b) => a.localeCompare(b));
    const rows = sorted.map(name => {
        return `<div class="stats-row"><span>${name}</span> <strong>1</strong></div>`;
    });
    rows.unshift(`<div class="stats-row" style="background:var(--highlight-bg); border-left:3px solid var(--secondary-color); padding-left:5px;">
        <span>Yhteensä</span> <strong>${sorted.length}</strong>
    </div>`);
    el.innerHTML = rows.join('');
}

function renderLongestStreaks(data) {
    const el = document.getElementById('stats-longest-streaks');
    if (!el) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const isMiittiEvent = (evt) => {
        const type = (evt.type || '').toLowerCase();
        if (type) return type === 'miitti';
        const name = (evt.name || '').toLowerCase();
        if (name.includes('cito')) return false;
        if (name.includes('yhteisö') || name.includes('juhla') || name.includes('cce') || name.includes('celebration')) return false;
        return true;
    };
    const validEvents = data
        .filter(e => e.date && e.date <= todayStr)
        .filter(e => !(e.name && e.name.includes("/ PERUTTU /")))
        .filter(e => isMiittiEvent(e));

    if (validEvents.length === 0) {
        el.innerHTML = "Ei tietoja.";
        return;
    }

    const normalizeName = (name) => (name || "").replace(/[\s\u00A0]+/g, " ").trim().toLowerCase();
    const events = [...validEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
    const eventNameSets = events.map(evt => {
        const names = (evt.attendeeNames || [])
            .map(n => n.trim())
            .filter(Boolean);
        return new Set(names.map(normalizeName));
    });
    const allNames = new Set();
    const displayNames = new Map();
    events.forEach(evt => {
        (evt.attendeeNames || []).forEach(n => {
            const trimmed = (n || "").trim();
            if (!trimmed) return;
            const key = normalizeName(trimmed);
            allNames.add(key);
            if (!displayNames.has(key)) displayNames.set(key, trimmed);
        });
    });

    const streaks = [];
    allNames.forEach(nameKey => {
        if (!nameKey) return;
        let current = 0;
        let max = 0;
        let currentStart = null;
        let bestStart = null;
        let bestEnd = null;
        events.forEach((evt, idx) => {
            const attended = eventNameSets[idx].has(nameKey);
            if (attended) {
                if (current === 0) currentStart = evt;
                current += 1;
                if (current > max) {
                    max = current;
                    bestStart = currentStart;
                    bestEnd = evt;
                }
            } else {
                current = 0;
                currentStart = null;
            }
        });
        if (max > 1) {
            const startNum = bestStart && bestStart.seqNumber ? `#${bestStart.seqNumber}` : "?#";
            const endNum = bestEnd && bestEnd.seqNumber ? `#${bestEnd.seqNumber}` : "?#";
            const range = `${startNum}-${endNum}`;
            const displayName = displayNames.get(nameKey) || nameKey;
            streaks.push({ name: displayName, max, range });
        }
    });

    if (streaks.length === 0) {
        el.innerHTML = "Ei tietoja.";
        return;
    }

    const top = streaks.sort((a, b) => b.max - a.max).slice(0, 10);
    el.innerHTML = top.map((item, i) => {
        return `<div class="stats-row"><span>${i+1}. ${item.name} <span style="font-size:0.8em; color:#888;">(${item.range})</span></span> <strong>${item.max}</strong></div>`;
    }).join('');
}

function renderTopUsersList(data) {
    const map = {};
    data.forEach(e => { if(e.attendeeNames) e.attendeeNames.forEach(n => map[n] = (map[n] || 0) + 1); });
    const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 10);
    const el = document.getElementById('stats-top-users');
    if(!el) return;

    let html = "";
    if (window.currentOrganizerStats && window.currentOrganizerStats.count > 0) {
        html += `<div class="stats-row" style="background:rgba(255, 140, 0, 0.1); border-left:3px solid #FF8C00; padding-left:5px;">
            <span>👑 Mikkokalevi</span> <strong>${window.currentOrganizerStats.count} miittiä</strong>
        </div>`;
    }

    html += sorted.map(([name, count], i) => `<div class="stats-row"><span>${i+1}. ${name}</span> <strong>${count} miittiä</strong></div>`).join('');
    el.innerHTML = html;
}

// ... KAIKKI MUUT FUNKTIOT ENNALLAAN ...

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

function renderMapLegend(legendSet) {
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
    legendContainer.innerHTML = "";
    const items = Array.from(legendSet).map(s => JSON.parse(s));
    items.sort((a, b) => {
        const yearA = parseInt(a.label);
        const yearB = parseInt(b.label);
        if (!isNaN(yearA) && !isNaN(yearB)) return yearB - yearA; 
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

    // --- PÄIVITETTY OTSAKKEEN TITTELI ---
    let title = "";
    if (window.MK_Messages && typeof window.MK_Messages.getRankTitle === 'function') {
        title = window.MK_Messages.getRankTitle(userEvents.length);
    }
    
    document.getElementById('up-nickname').innerHTML = `${nickname}<br><small style="font-size:0.6em; color:#666; font-weight:normal;">${title}</small>`;
    
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

// ==========================================
// GRAAFIEN PIIRTO (FULL CODE)
// ==========================================

function renderCharts(data) {
    if (!window.Chart || !data || data.length === 0) return;
    const clearChart = (id) => { if (chartInstances[id]) { chartInstances[id].destroy(); } };
    const colors = { primary: '#8B4513', secondary: '#D2691E', accent: '#4caf50', text: '#4E342E' };

    // 1. WEEKDAYS
    clearChart('weekdays');
    const dayLabels = ["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"];
    const dayData = [0,0,0,0,0,0,0];
    data.forEach(e => { if(e.date) { const jsDay = new Date(e.date).getDay(); const fiDay = (jsDay + 6) % 7; dayData[fiDay]++; } });
    chartInstances['weekdays'] = new Chart(document.getElementById('chart-weekdays-canvas'), {
        type: 'bar', data: { labels: dayLabels, datasets: [{ label: 'Miitit', data: dayData, backgroundColor: colors.primary }] }
    });

    // 2. TYPES
    clearChart('types');
    const typeCounts = { miitti: 0, cito: 0, cce: 0 };
    data.forEach(e => { if(typeCounts[e.type] !== undefined) typeCounts[e.type]++; });
    chartInstances['types'] = new Chart(document.getElementById('chart-types-canvas'), {
        type: 'doughnut', data: { labels: ["Miitti", "CITO", "CCE"], datasets: [{ data: Object.values(typeCounts), backgroundColor: [colors.primary, colors.accent, colors.secondary] }] }
    });

    // 3. TIMELINE
    clearChart('timeline');
    const timelineData = [...data].sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-15);
    chartInstances['timeline'] = new Chart(document.getElementById('chart-timeline-canvas'), {
        type: 'line', data: { labels: timelineData.map(e => e.date.split('-').slice(1).reverse().join('.')), datasets: [{ label: 'Kävijät', data: timelineData.map(e => e.attendeeCount), borderColor: colors.primary, backgroundColor: 'rgba(139, 69, 19, 0.2)', fill: true, tension: 0.4 }] }
    });

    // 4. CUMULATIVE
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

    // 5. HOURS
    clearChart('hours');
    const hoursData = Array(24).fill(0);
    data.forEach(e => { if(e.time) { const hour = parseInt(e.time.split(':')[0]); if(!isNaN(hour)) hoursData[hour]++; } });
    chartInstances['hours'] = new Chart(document.getElementById('chart-hours-canvas'), {
        type: 'bar', data: { labels: Array.from({length: 24}, (_, i) => i + ":00"), datasets: [{ label: 'Miitit', data: hoursData, backgroundColor: colors.secondary }] }
    });

    // 6. MONTHS
    clearChart('months');
    const monthsData = Array(12).fill(0);
    const monthNames = ["Tam", "Hel", "Maa", "Huh", "Tou", "Kes", "Hei", "Elo", "Syy", "Lok", "Mar", "Jou"];
    data.forEach(e => { if(e.date) { const m = new Date(e.date).getMonth(); monthsData[m] += e.attendeeCount; } });
    chartInstances['months'] = new Chart(document.getElementById('chart-months-canvas'), {
        type: 'bar', data: { labels: monthNames, datasets: [{ label: 'Kävijämäärä yhteensä', data: monthsData, backgroundColor: '#A0522D' }] }
    });

    // 7. LOCATIONS
    clearChart('locations');
    const locMap = {};
    data.forEach(e => { if (e.location) locMap[e.location] = (locMap[e.location] || 0) + 1; });
    const sortedLocs = Object.entries(locMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    chartInstances['locations'] = new Chart(document.getElementById('chart-locations-canvas'), {
        type: 'bar', data: { labels: sortedLocs.map(x => x[0]), datasets: [{ label: 'Miitit', data: sortedLocs.map(x => x[1]), backgroundColor: colors.primary }] }, options: { indexAxis: 'y' }
    });

    // 8. TOP ATTENDEES
    clearChart('topAttendees');
    const userMap = {};
    data.forEach(e => e.attendeeNames.forEach(n => userMap[n] = (userMap[n] || 0) + 1));
    const topUsers = Object.entries(userMap).sort((a,b) => b[1] - a[1]).slice(0, 10);
    chartInstances['topAttendees'] = new Chart(document.getElementById('chart-top-attendees-canvas'), {
        type: 'bar', data: { labels: topUsers.map(x => x[0]), datasets: [{ label: 'Käynnit', data: topUsers.map(x => x[1]), backgroundColor: colors.secondary }] }, options: { indexAxis: 'y' }
    });

    // 9. TOP EVENTS
    clearChart('topEvents');
    const topEvents = [...data].sort((a,b) => b.attendeeCount - a.attendeeCount).slice(0, 10);
    chartInstances['topEvents'] = new Chart(document.getElementById('chart-top-events-canvas'), {
        type: 'bar', data: { labels: topEvents.map(x => x.name.substring(0, 15) + "..."), datasets: [{ label: 'Osallistujat', data: topEvents.map(x => x.attendeeCount), backgroundColor: colors.accent }] }
    });

    // 10. ATTRIBUTES
    clearChart('attrs');
    const attrMap = {};
    data.forEach(e => { if(e.attributes) e.attributes.forEach(a => { if(a.inc === 1) { const name = a.name || a; attrMap[name] = (attrMap[name] || 0) + 1; } }); });
    const topAttrs = Object.entries(attrMap).sort((a,b) => b[1] - a[1]).slice(0, 10);
    chartInstances['attrs'] = new Chart(document.getElementById('chart-attributes-canvas'), {
        type: 'bar', data: { labels: topAttrs.map(x => x[0]), datasets: [{ label: 'Esiintyvyys', data: topAttrs.map(x => x[1]), backgroundColor: '#A0522D' }] }, options: { indexAxis: 'y' }
    });
}
