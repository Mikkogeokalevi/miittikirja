# MK Miittikirja - AI Rules & Context

## Project Overview
MK Miittikirja on sähköinen miittivieraskirja geokätköilijöille. Sovellus tallentaa miittitapahtumia, vieraskirjamerkintöjä ja tilastoja Firebase-tietokantaan.

## Key Technical Details

### Firebase Structure
```
miitit/
├── {userId}/
│   ├── calendar/
│   │   ├── finds/       (ei enää käytössä miiteissä)
│   │   ├── events/      (miittitiedot päivämäärän mukaan)
│   │   ├── totalFinds   (ei enää käytössä)
│   │   ├── years/       (miittivuodet)
│   │   └── lastImportDate (viimeisin CSV-tuonti)
│   ├── events/          (miittitapahtumat)
│   └── logs/           (vieraskirjamerkinnät)
```

### Calendar Data Structure
```javascript
{
  events: {
    "01-15": [
      {
        date: "2024-01-15",
        gcCode: "GC123ABC",
        name: "Miitin nimi - kuvaus",
        type: "miitti"
      }
    ]
  },
  years: [2023, 2024, 2025],
  lastImportDate: "2024-01-15T10:30:00.000Z"
}
```

## CSV Import Rules

### Supported Formats
**Format 1 (10 fields):** `DD.MM.YYYY,"Attended",GC,"Nimi","Event Cache",Koko,D,T,U,V`
**Format 2 (11 fields):** `DD.MM.YYYY,"Attended",GC,"Nimi","Kuvaus","Event Cache",Koko,D,T,U,V`

### Event Filtering Rules
- ✅ **INCLUDE:** "Attended" + "Event Cache" (varsinaiset miitit)
- ❌ **EXCLUDE:** "Cache In Trash Out" (CITO)
- ❌ **EXCLUDE:** "Community Celebration Event" (juhlamiitit)
- ❌ **EXCLUDE:** "Found it" (perinteiset geokätköt)

### CSV Parsing Logic
1. Parse quoted CSV fields correctly (names/descriptions can contain commas)
2. Detect format by field count (10 vs 11 fields)
3. Extract cacheType from field 4 (10-field format) or field 5 (11-field format)
4. Filter by event type rules above
5. Store only valid miitti events

## Calendar Display Rules

### Layout
- **Months:** Vertical (left column)
- **Days:** Horizontal (top row, 1-31)
- **Cells:** Show miitti count per day
- **Empty days:** Show "X"

### Color Intensity
- 0: No events (light gray, "X")
- 1: 1 event (light green)
- 2-3: 2-3 events (medium green)
- 4-6: 4-6 events (dark green)
- 7-10: 7-10 events (very dark green)
- 11+: 11+ events (darkest green with glow)

### Features
- **Tooltip:** Hover shows exact miitti details (GC code, name)
- **Click:** Opens modal with full day details
- **Import date:** Shows last CSV import timestamp
- **Responsive:** Works on mobile (scrollable grid)

## Important Constraints

### Firebase Rules
- Users can only access their own data: `miitit/{userId}/`
- Calendar data stored under: `miitit/{userId}/calendar`
- No interference with other projects in same database

### Mobile Compatibility — TÄRKEIN SÄÄNTÖ
**Vierasnäkymän (QR-kirjaus) TÄYTYY toimia eri ikäisillä puhelimilla — vanhat iPhonet ja Androidit mukaan lukien.** Miiteillä kävijöillä on kaikenikäisiä laitteita. Paino päivityksissä aina yhteensopivuuteen.

#### JavaScript — sallittu taso: ES2019 (iOS 13 / Chrome 80 edeltävä)
- ❌ **EI KOSKAAN:** `?.` (optional chaining), `??` (nullish coalescing) — kaataa KOKO tiedoston parsinnassa vanhoilla laitteilla → kirjaus ei toimi ollenkaan
- ❌ **EI:** `replaceAll`, `flatMap`, `structuredClone`, `matchAll`, `Object.hasOwn`, `.at()`, `findLast`, `toSorted`, `toReversed`
- ✅ **Korvaukset:** `a?.b` → `(a || {}).b` tai `(a && a.b)`; `x ?? y` → `x != null ? x : y`
- ✅ **Sallittua:** `const`/`let`, `=>`, `async/await`, template literal, spread, `Set`/`Map`, `Object.entries`, `padStart`, `includes`, `find`/`findIndex`, `for...of`
- Muista: parse-virhe yhdessä tiedostossa voi rikkoa koko sivun — kaikki tiedostot ladataan samalle sivulle

#### CSS — progressiivinen parannus
- Uudet ominaisuudet (esim. `color-mix`, `:has()`, `dvh`) vain fallbackin kanssa: kirjoita vanha sääntö ensin, uusi perään — vanhat selaimet ohittavat tuntemattoman
- `-webkit-overflow-scrolling: touch` kaikkiin vieritettäviin (modal, scroll-box, log-list, autocomplete)
- `gap` flexboxissa vaatii iOS 14.5+ — kriittisissä asetteluissa käytä marginia

#### HTML / inputit
- `font-size: 16px` inputeissa (iOS ei zoomaa)
- Nimimerkkikentät: `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"` — puhelin ei saa "korjata" geocaching-nimimerkkiä
- `enterkeyhint` ohjaa näppäimistön Enter-nappia (next/send)
- `viewport-fit=cover` lovellisille puhelimille
- ÄLÄ aseta `maximum-scale` tai `user-scalable=no` (saavutettavuus)
- Kosketuskohteet väh. ~44px

#### Kalenteri
- Calendar must work on phones (primary use case)
- Responsive grid with fixed widths
- Touch-friendly tooltips and modals
- Horizontal scrolling for wide calendar

#### Versiot
- Jokaisen muutoksen yhteydessä päivitä `APP_VERSION` (app.js), `VERSION` (config.js) ja `SW_VERSION` (sw.js) — service worker päivittyy ja muutokset näkyvät mobiilissa nopeammin

### Data Integrity
- Always validate calendarData structure before use
- Handle missing/null properties gracefully
- Ensure numeric values (avoid NaN errors)
- Use async/await for Firebase operations

## Code Patterns

### Error Handling
```javascript
if (!calendarData) {
    calendarData = { finds: {}, totalFinds: 0, years: [], events: {}, lastImportDate: null };
}
if (!calendarData.events) {
    calendarData.events = {};
}
```

### Firebase Operations
```javascript
// Always check user authentication
if (!currentUser || !currentUser.uid) {
    console.log("No authenticated user");
    return;
}

// Use async/await
await db.ref('miitit/' + currentUser.uid + '/calendar').set(calendarData);
```

### CSV Processing
```javascript
// Handle quoted fields properly
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
```

## Common Issues & Solutions

### NaN Errors
- Always convert to number: `Number(value) || 0`
- Validate before Firebase save

### CSV Parsing Issues
- Names/descriptions can contain commas
- Use proper quoted field parsing
- Handle both 10 and 11 field formats

### Mobile Layout
- Fixed grid widths: `60px + 31×25px = 875px`
- Responsive breakpoints: 768px, 480px
- Horizontal scrolling for overflow

### Data Persistence
- Calendar data loads/saves to Firebase
- Includes import timestamp
- Survives page refreshes

## Development Notes

### File Structure
- `calendar.js` - Calendar functionality
- `style.css` - Calendar styles (responsive)
- `index.html` - Calendar tab and modal
- `app.js` - Main app logic and Firebase init

### Theme Support
- Calendar adapts to app themes (dark/light/green/blue)
- Uses CSS variables for colors
- Proper contrast for readability

### Performance
- Lazy load calendar data when tab opened
- Efficient grid rendering
- Minimal Firebase operations

## Testing Checklist
- [ ] CSV import with both formats
- [ ] Mobile responsive layout
- [ ] Firebase data persistence
- [ ] Event filtering (no CITO/Community)
- [ ] Tooltip and modal functionality
- [ ] Color intensity accuracy
- [ ] Import date display
- [ ] Cross-device sync
