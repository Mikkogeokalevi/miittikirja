// ==========================================
// MK MIITTIKIRJA - CALENDAR.JS
// Versio: 1.1.0 - Firebase-integraatio + geocache.fi CSV
// ==========================================

let calendarData = {
    finds: {}, // { "01-15": 3, "05-22": 1, ... }
    totalFinds: 0,
    years: [],
    events: {}, // Tallennetaan myös event-tiedot
    lastImportDate: null // Viimeisin tuontipäivä
};

const monthNames = ['Tammi', 'Helmi', 'Maalis', 'Huhti', 'Touko', 'Kesä', 'Heinä', 'Elo', 'Syys', 'Loka', 'Marras', 'Joulu'];
const monthNamesFull = ['Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu', 'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu'];

async function initCalendar() {
    console.log("Alustetaan kalenteri...");
    
    // Ladataan tallennetut kalenteridata Firebasesta ja odotetaan sen valmistumista
    await loadCalendarData();
    
    // Asetetaan tapahtumankäsittelijät
    setupCalendarEventListeners();
    
    // Renderöidään kalenteri vasta datan latauduttua
    renderCalendar();
    updateCalendarLegend();
}

function setupCalendarEventListeners() {
    const srvInput = document.getElementById('srv-file-input');
    const importBtn = document.getElementById('btn-import-srv');
    const clearBtn = document.getElementById('btn-clear-calendar');
    
    if (importBtn) {
        importBtn.onclick = importSrvFile;
    }
    
    if (clearBtn) {
        clearBtn.onclick = clearCalendarData;
    }
    
    if (srvInput) {
        srvInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                importSrvFile();
            }
        };
    }
}

async function loadCalendarData() {
    if (!currentUser || !currentUser.uid) {
        console.log("Ei kirjautunutta käyttäjää, käytetään oletusdataa");
        calendarData = { finds: {}, totalFinds: 0, years: [], events: {}, lastImportDate: null };
        return;
    }
    
    try {
        const calendarSnap = await db.ref('miitit/' + currentUser.uid + '/calendar').once('value');
        const data = calendarSnap.val();
        if (data) {
            // Varmistetaan, että ladattu data on kelvollista
            calendarData = {
                finds: (data.finds && typeof data.finds === 'object') ? data.finds : {},
                totalFinds: Number(data.totalFinds) || 0,
                years: Array.isArray(data.years) ? data.years : [],
                events: (data.events && typeof data.events === 'object') ? data.events : {},
                lastImportDate: data.lastImportDate || null
            };
            console.log("Kalenteridata ladattu Firebasesta:", calendarData);
        } else {
            console.log("Ei kalenteridataa Firebasessa, aloitetaan tyhjällä");
            calendarData = { finds: {}, totalFinds: 0, years: [], events: {}, lastImportDate: null };
        }
    } catch (e) {
        console.error("Kalenteridan lataus epäonnistui:", e);
        calendarData = { finds: {}, totalFinds: 0, years: [], events: {}, lastImportDate: null };
    }
}

async function saveCalendarData() {
    if (!currentUser || !currentUser.uid) {
        console.log("Ei kirjautunutta käyttäjää, ei tallenneta Firebaseen");
        return;
    }
    
    // Varmistetaan, että kaikki arvot ovat kelvollisia ennen tallennusta
    if (!calendarData) {
        calendarData = { finds: {}, totalFinds: 0, years: [], events: {}, lastImportDate: null };
    }
    
    // Varmistetaan, että totalFinds on numero
    calendarData.totalFinds = Number(calendarData.totalFinds) || 0;
    
    // Varmistetaan, että years on taulukko
    if (!Array.isArray(calendarData.years)) {
        calendarData.years = [];
    }
    
    // Varmistetaan, että finds ja events ovat objekteja
    if (!calendarData.finds || typeof calendarData.finds !== 'object') {
        calendarData.finds = {};
    }
    if (!calendarData.events || typeof calendarData.events !== 'object') {
        calendarData.events = {};
    }
    
    try {
        await db.ref('miitit/' + currentUser.uid + '/calendar').set(calendarData);
        console.log("Kalenteridata tallennettu Firebaseen");
    } catch (e) {
        console.error("Kalenteridan tallennus epäonnistui:", e);
        alert("Tallennus epäonnistui: " + e.message);
    }
}

function importSrvFile() {
    const fileInput = document.getElementById('srv-file-input');
    if (!fileInput || !fileInput.files.length) {
        alert('Valitse CSV-tiedosto ensin!');
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            parseSrvContent(content);
            saveCalendarData();
            renderCalendar();
            updateCalendarLegend();
            alert('CSV-tiedosto tuotu onnistuneesti! Miittejä: ' + Object.keys(calendarData.events).reduce((sum, key) => sum + calendarData.events[key].length, 0));
        } catch (error) {
            console.error('CSV-tiedoston käsittelyvirhe:', error);
            alert('CSV-tiedoston käsittely epäonnistui: ' + error.message);
        }
    };
    
    reader.onerror = function() {
        alert('Tiedoston lukeminen epäonnistui!');
    };
    
    reader.readAsText(file);
}

function parseSrvContent(content) {
    const lines = content.split('\n');
    const newEvents = {};
    const years = new Set();
    let totalEvents = 0;
    
    // Varmistetaan, että calendarData on alustettu oikein
    if (!calendarData) {
        calendarData = { finds: {}, totalFinds: 0, years: [], events: {}, lastImportDate: null };
    }
    if (!calendarData.finds) {
        calendarData.finds = {};
    }
    if (!calendarData.events) {
        calendarData.events = {};
    }
    
    // geocache.fi CSV-formaatti: DD.MM.YYYY,"Found it" tai "Attended",GC-koodi,"Nimi","Tyyppi",Koko,D,T,U,V
    // Huom: Nimi voi sisältää pilkkuja, joten tarvitaan parempi parsiminen
    lines.forEach(line => {
        if (!line.trim()) return;
        
        // Parempi CSV-parsiminen - käsitellään lainausmerkit oikein
        const parts = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim());
        
        if (parts.length < 5) {
            console.log("Liian vähän sarakkeita:", parts, "rivi:", line);
            return;
        }
        
        // Päivämäärä (DD.MM.YYYY)
        const dateStr = parts[0].trim().replace(/"/g, '');
        const dateMatch = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (!dateMatch) {
            console.log("Virheellinen päivämäärä:", dateStr, "rivi:", line);
            return;
        }
        
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]);
        const year = parseInt(dateMatch[3]);
        
        // Log type ("Found it" tai "Attended")
        const logType = parts[1].trim().replace(/"/g, '');
        
        // GC-koodi
        const gcCode = parts[2].trim().replace(/"/g, '');
        
        // Nimi (voi sisältää pilkkuja)
        const name = parts[3].trim().replace(/"/g, '');
        
        // Tyyppi (oikea sarakkeindeksi)
        const cacheType = parts[4].trim().replace(/"/g, '');
        
        // Debug: näytetään oikea cacheType
        if (logType === "Attended") {
            console.log("CSV-rivi:", line);
            console.log("Parsed parts:", parts);
            console.log("CacheType:", cacheType);
        }
        
        const monthKey = String(month).padStart(2, '0');
        const dayKey = String(day).padStart(2, '0');
        const dateKey = `${monthKey}-${dayKey}`;
        
        years.add(year);
        
        const isEvent = cacheType.includes("Event");
        const isCito = cacheType.includes("CITO") || cacheType.includes("Cache In Trash Out");
        const isCommunity = cacheType.includes("Community Celebration");
        
        // Käsitellään VAIN varsinaiset miitit (ei CITO, ei Community Celebration)
        if (logType === "Attended" && 
            isEvent && 
            !isCito && 
            !isCommunity) {
            console.log("✅ Lisätään miitti:", dateKey, gcCode, cacheType);
            if (!newEvents[dateKey]) {
                newEvents[dateKey] = [];
            }
            newEvents[dateKey].push({
                date: `${year}-${monthKey}-${dayKey}`,
                gcCode: gcCode,
                name: name,
                type: "miitti"
            });
            totalEvents++;
        } else if (logType === "Attended") {
            console.log("❌ Ohitetaan tapahtuma:", cacheType, "(Event:", isEvent, "CITO:", isCito, "Community:", isCommunity + ")");
        }
    });
    
    // Yhdistetään vain miittidataan
    Object.keys(newEvents).forEach(dateKey => {
        if (!calendarData.events[dateKey]) {
            calendarData.events[dateKey] = [];
        }
        calendarData.events[dateKey].push(...newEvents[dateKey]);
    });
    
    // Päivitetään vuosilista (vain miittien vuodet)
    calendarData.years = Array.from(years).sort();
    
    // Tallennetaan viimeisin tuontipäivä
    calendarData.lastImportDate = new Date().toISOString();
    
    console.log("CSV-data käsitelty (vain miitit):", { 
        newEvents, 
        totalEvents,
        years: Array.from(years),
        lastImportDate: calendarData.lastImportDate
    });
}

async function clearCalendarData() {
    if (confirm('Haluatko varmasti tyhjentää kalenterin? Tämä poistaa kaikki tuodut tiedot.')) {
        calendarData = { finds: {}, totalFinds: 0, years: [], events: {}, lastImportDate: null };
        await saveCalendarData();
        renderCalendar();
        updateCalendarLegend();
        
        // Tyhjennetään tiedostokenttä
        const fileInput = document.getElementById('srv-file-input');
        if (fileInput) {
            fileInput.value = '';
        }
    }
}

function renderCalendar() {
    const container = document.getElementById('calendar-container');
    if (!container) return;
    
    if (!calendarData) {
        calendarData = { finds: {}, totalFinds: 0, years: [], events: {}, lastImportDate: null };
    }
    if (!calendarData.finds) {
        calendarData.finds = {};
    }
    if (!calendarData.events) {
        calendarData.events = {};
    }
    
    let html = '';
    
    // Lisätään tuontipäivän merkintä
    if (calendarData.lastImportDate) {
        const importDate = new Date(calendarData.lastImportDate);
        const formattedDate = formatDateFi(importDate) + ' klo ' + 
                           String(importDate.getHours()).padStart(2, '0') + ':' + 
                           String(importDate.getMinutes()).padStart(2, '0');
        html += `<div class="calendar-import-info">📅 Viimeisin tuonti: ${formattedDate}</div>`;
    }
    
    html += '<div class="calendar-grid-wrapper">';
    
    // Otsikkorivi: Päivänumerot (1-31)
    html += '<div class="calendar-header-row">';
    html += '<div class="calendar-corner-cell"></div>'; // Tyhjä kulmasolu
    for (let day = 1; day <= 31; day++) {
        html += `<div class="calendar-header-cell">${day}</div>`;
    }
    html += '</div>';
    
    // Kuukausirivit
    for (let month = 0; month < 12; month++) {
        html += '<div class="calendar-month-row">';
        
        // Kuukauden nimi
        html += `<div class="calendar-month-cell">${monthNames[month]}</div>`;
        
        // Päiväsolut tälle kuukaudelle
        for (let day = 1; day <= 31; day++) {
            const monthKey = String(month + 1).padStart(2, '0');
            const dayKey = String(day).padStart(2, '0');
            const dateKey = `${monthKey}-${dayKey}`;
            
            // VAIN miittien määrä
            const eventCount = (calendarData.events[dateKey] || []).length;
            const intensity = getIntensity(eventCount);
            
            // Tooltip - näytetään tarkat miittien tiedot
            let tooltip = `${monthNamesFull[month]} ${day}: `;
            if (eventCount > 0) {
                tooltip += `${eventCount} miittiä\n`;
                // Lisätään miittien GC-koodit ja nimet
                calendarData.events[dateKey].forEach((event, index) => {
                    tooltip += `  • Miitti: ${event.gcCode} - ${event.name}`;
                    if (index < calendarData.events[dateKey].length - 1) {
                        tooltip += '\n';
                    }
                });
            } else {
                tooltip += 'Ei miittejä';
            }
            
            const displayValue = eventCount === 0 ? 'X' : eventCount;
            const clickHandler = eventCount > 0 ? `onclick="showDayDetails('${dateKey}', '${monthNamesFull[month]} ${day}')"` : '';
            
            html += `<div class="calendar-cell intensity-${intensity}" data-date="${dateKey}" data-count="${eventCount}" title="${tooltip}" ${clickHandler}>${displayValue}</div>`;
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// Funktio päivän tarkkojen tietojen näyttämiseen
function showDayDetails(dateKey, displayDate) {
    const events = calendarData.events[dateKey] || [];
    if (events.length === 0) return;
    
    let content = `<h3>${displayDate} - ${events.length} miittiä</h3><ul>`;
    events.forEach(event => {
        content += `<li><strong>Miitti</strong>: ${event.gcCode} - ${event.name}</li>`;
    });
    content += '</ul>';
    
    // Näytetään modaali-ikkuna
    const modal = document.createElement('div');
    modal.className = 'calendar-details-modal';
    modal.innerHTML = `
        <div class="calendar-details-content">
            ${content}
            <button onclick="this.closest('.calendar-details-modal').remove()" class="btn btn-blue">Sulje</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function getIntensity(count) {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 6) return 3;
    if (count <= 10) return 4;
    return 5;
}

function updateCalendarLegend() {
    const legend = document.getElementById('calendar-legend');
    if (!legend) return;
    
    // Varmistetaan, että calendarData on olemassa
    if (!calendarData) {
        calendarData = { finds: {}, totalFinds: 0, years: [], events: {}, lastImportDate: null };
    }
    if (!calendarData.finds) {
        calendarData.finds = {};
    }
    if (!calendarData.events) {
        calendarData.events = {};
    }
    
    const years = calendarData.years.length > 0 ? calendarData.years.join(', ') : 'Ei vuosia';
    const totalEvents = Object.values(calendarData.events).reduce((sum, events) => sum + events.length, 0);
    const uniqueEventDays = Object.keys(calendarData.events).filter(key => calendarData.events[key].length > 0).length;
    
    let html = `
        <div><strong>Miitit:</strong> ${totalEvents} miittiä ${uniqueEventDays} eri päivänä</div>
        <div><strong>Vuodet:</strong> ${years}</div>
        <div class="intensity-legend">
            <span>Aktiivisuus:</span>
            <span class="intensity-sample intensity-0">0</span>
            <span class="intensity-sample intensity-1">1</span>
            <span class="intensity-sample intensity-2">2-3</span>
            <span class="intensity-sample intensity-3">4-6</span>
            <span class="intensity-sample intensity-4">7-10</span>
            <span class="intensity-sample intensity-5">11+</span>
        </div>
    `;
    
    legend.innerHTML = html;
}
