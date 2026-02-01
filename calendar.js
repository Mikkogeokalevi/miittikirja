// ==========================================
// MK MIITTIKIRJA - CALENDAR.JS
// Versio: 1.1.0 - Firebase-integraatio + geocache.fi CSV
// ==========================================

let calendarData = {
    finds: {}, // { "01-15": 3, "05-22": 1, ... }
    totalFinds: 0,
    years: [],
    events: {} // Tallennetaan myös event-tiedot
};

const monthNames = ['Tammi', 'Helmi', 'Maalis', 'Huhti', 'Touko', 'Kesä', 'Heinä', 'Elo', 'Syys', 'Loka', 'Marras', 'Joulu'];
const monthNamesFull = ['Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu', 'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu'];

function initCalendar() {
    console.log("Alustetaan kalenteri...");
    
    // Ladataan tallennetut kalenteridata Firebasesta
    loadCalendarData();
    
    // Asetetaan tapahtumankäsittelijät
    setupCalendarEventListeners();
    
    // Renderöidään kalenteri
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
        calendarData = { finds: {}, totalFinds: 0, years: [], events: {} };
        return;
    }
    
    try {
        const calendarSnap = await db.ref('miitit/' + currentUser.uid + '/calendar').once('value');
        const data = calendarSnap.val();
        if (data) {
            calendarData = data;
            console.log("Kalenteridata ladattu Firebasesta:", calendarData);
        } else {
            console.log("Ei kalenteridataa Firebasessa, aloitetaan tyhjällä");
            calendarData = { finds: {}, totalFinds: 0, years: [], events: {} };
        }
    } catch (e) {
        console.error("Kalenteridan lataus epäonnistui:", e);
        calendarData = { finds: {}, totalFinds: 0, years: [], events: {} };
    }
}

async function saveCalendarData() {
    if (!currentUser || !currentUser.uid) {
        console.log("Ei kirjautunutta käyttäjää, ei tallenneta Firebaseen");
        return;
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
            alert('CSV-tiedosto tuotu onnistuneesti! Löytöjä: ' + calendarData.totalFinds + ', Miittejä: ' + Object.keys(calendarData.events).length);
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
    const newFinds = {};
    const newEvents = {};
    const years = new Set();
    let totalFinds = 0;
    let totalEvents = 0;
    
    // geocache.fi CSV-formaatti: DD.MM.YYYY,"Found it" tai "Attended",GC-koodi,"Nimi",Tyyppi,Koko,D,T,U,V
    lines.forEach(line => {
        if (!line.trim()) return;
        
        const parts = line.split(',');
        if (parts.length < 5) return;
        
        // Päivämäärä (DD.MM.YYYY)
        const dateStr = parts[0].trim().replace(/"/g, '');
        const dateMatch = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (!dateMatch) return;
        
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]);
        const year = parseInt(dateMatch[3]);
        
        // Log type ("Found it" tai "Attended")
        const logType = parts[1].trim().replace(/"/g, '');
        
        // GC-koodi
        const gcCode = parts[2].trim().replace(/"/g, '');
        
        // Nimi
        const name = parts[3].trim().replace(/"/g, '');
        
        // Tyyppi
        const cacheType = parts[4].trim().replace(/"/g, '');
        
        const monthKey = String(month).padStart(2, '0');
        const dayKey = String(day).padStart(2, '0');
        const dateKey = `${monthKey}-${dayKey}`;
        
        years.add(year);
        
        if (logType === "Found it") {
            // Perinteinen geokätkö
            if (!newFinds[dateKey]) {
                newFinds[dateKey] = 0;
            }
            newFinds[dateKey]++;
            totalFinds++;
        } else if (logType === "Attended" && (cacheType.includes("Event") || cacheType.includes("CITO"))) {
            // Miitti tai CITO
            if (!newEvents[dateKey]) {
                newEvents[dateKey] = [];
            }
            newEvents[dateKey].push({
                date: `${year}-${monthKey}-${dayKey}`,
                gcCode: gcCode,
                name: name,
                type: cacheType.includes("CITO") ? "cito" : "miitti"
            });
            totalEvents++;
        }
    });
    
    // Yhdistetään vanhaan dataan
    Object.keys(newFinds).forEach(dateKey => {
        if (!calendarData.finds[dateKey]) {
            calendarData.finds[dateKey] = 0;
        }
        calendarData.finds[dateKey] += newFinds[dateKey];
    });
    
    Object.keys(newEvents).forEach(dateKey => {
        if (!calendarData.events[dateKey]) {
            calendarData.events[dateKey] = [];
        }
        calendarData.events[dateKey].push(...newEvents[dateKey]);
    });
    
    calendarData.totalFinds += totalFinds;
    calendarData.years = Array.from(years).sort();
    
    console.log("CSV-data käsitelty:", { 
        newFinds, 
        newEvents, 
        totalFinds, 
        totalEvents,
        years: Array.from(years) 
    });
}

async function clearCalendarData() {
    if (confirm('Haluatko varmasti tyhjentää kalenterin? Tämä poistaa kaikki tuodut tiedot.')) {
        calendarData = { finds: {}, totalFinds: 0, years: [], events: {} };
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
    
    let html = '<div class="calendar-grid">';
    
    // Lisätään kuukausien otsikot
    html += '<div class="calendar-header-cell"></div>'; // Tyhjä kulmasolu
    for (let month = 0; month < 12; month++) {
        html += `<div class="calendar-header-cell">${monthNames[month]}</div>`;
    }
    
    // Renderöidään päivät (1-31)
    for (let day = 1; day <= 31; day++) {
        html += '<div class="calendar-row">';
        
        // Päivän numero
        html += `<div class="calendar-day-cell">${day}</div>`;
        
        // Jokaisen kuukauden solut tälle päivälle
        for (let month = 0; month < 12; month++) {
            const monthKey = String(month + 1).padStart(2, '0');
            const dayKey = String(day).padStart(2, '0');
            const dateKey = `${monthKey}-${dayKey}`;
            
            const findCount = calendarData.finds[dateKey] || 0;
            const eventCount = (calendarData.events[dateKey] || []).length;
            const totalCount = findCount + eventCount;
            const intensity = getIntensity(totalCount);
            
            // Lisätään infot tooltipiin
            let tooltip = `${monthNamesFull[month]} ${day}: `;
            if (findCount > 0) tooltip += `${findCount} löytöä`;
            if (eventCount > 0) {
                if (findCount > 0) tooltip += ', ';
                tooltip += `${eventCount} miittiä`;
            }
            if (totalCount === 0) tooltip += 'Ei aktiviteettia';
            
            html += `<div class="calendar-cell intensity-${intensity}" data-date="${dateKey}" data-count="${totalCount}" title="${tooltip}"></div>`;
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
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
    
    const years = calendarData.years.length > 0 ? calendarData.years.join(', ') : 'Ei vuosia';
    const totalFinds = calendarData.totalFinds;
    const totalEvents = Object.values(calendarData.events).reduce((sum, events) => sum + events.length, 0);
    const uniqueDays = Object.keys(calendarData.finds).filter(key => calendarData.finds[key] > 0).length;
    const uniqueEventDays = Object.keys(calendarData.events).filter(key => calendarData.events[key].length > 0).length;
    
    let html = `
        <div><strong>Geokätköt:</strong> ${totalFinds} löytöä ${uniqueDays} eri päivänä</div>
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
