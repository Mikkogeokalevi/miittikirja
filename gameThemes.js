// ===== PELITEEMAT & VISAPAKETIT =====
// Kaikki pelien visuaaliset teemat yhdessä paikassa — uusi teema = yksi lohko.
// Teema ei muuta pelimekaniikkaa, vain emojit/tekstit/värit.
// Kentät:
//   name   — teeman nimi valikon napissa
//   icon   — teeman emoji (otsikot, napit, tuloslappu)
//   racers — kilpuri-emojit, jaetaan pelaajille vakaasti avaimen mukaan
//   goal   — maalimerkki radan päässä
//   verb   — vieraspuhelimen ison napin teksti
//   unit   — pisteyksikön nimi ("142 / 200 askelta")
//   title  — seinän ja puhelimen peliotsikko
//   accent — korosteväri (otsikot, HUD)
var MK_GAME_THEMES = {
    perus: {
        name: 'Perus', icon: '🏁',
        racers: ['🐌','🐢','🦔','🐇','🐎','🦆','🐸','🦀','🐝','🐙','🚗','🏎️','🐓','🦎','🐜','🦞'],
        goal: '🏁', verb: 'NAPAUTA!', unit: 'napautusta',
        title: 'RÄMPYTYSKISA', accent: '#d4a017'
    },
    army: {
        name: 'Armeija', icon: '🎖️',
        racers: ['🪖','💂','🫡','🎖️','🚜','🪖','💂','🫡','🚁','🛻','⛺','🧭'],
        goal: '🚩', verb: 'MARSSI!', unit: 'askelta',
        title: 'MARS-MARSIKISA', accent: '#4a5d23'
    },
    xmas: {
        name: 'Joulu', icon: '🎄',
        racers: ['🎅','🤶','🧝','🦌','⛄','🐧','🎁','🦌','🧸','🛷','🌟','🍪'],
        goal: '🎄', verb: 'KIIHDYTÄ!', unit: 'poroaskelta',
        title: 'JOULUKISA', accent: '#b02232'
    },
    newyear: {
        name: 'Uusivuosi', icon: '🎆',
        racers: ['🎆','🥂','🍾','🎇','✨','🎊','🕛','🎉','🪩','🥳'],
        goal: '🎇', verb: 'PAM!', unit: 'pamahdusta',
        title: 'ILOTULITUSKISA', accent: '#7b2ff7'
    },
    valentine: {
        name: 'Ystävänpäivä', icon: '💘',
        racers: ['💘','💝','❤️','🌹','😘','💌','🐻','💞','🦢','💗'],
        goal: '💍', verb: 'PUSU!', unit: 'pusua',
        title: 'RAKKAUSKISA', accent: '#e0245e'
    },
    easter: {
        name: 'Pääsiäinen', icon: '🐣',
        racers: ['🐣','🐰','🥚','🐤','🌷','🥕','🐇','🌼','🧺','🐥'],
        goal: '🥚', verb: 'TIPU-TIPU!', unit: 'munaa',
        title: 'MUNAJUOKSU', accent: '#7cb342'
    },
    halloween: {
        name: 'Halloween', icon: '🎃',
        racers: ['👻','🎃','🧛','🦇','🧟','🕷️','🕸️','💀','🐈‍⬛','🧙'],
        goal: '🎃', verb: 'KARJAISE!', unit: 'karjaisua',
        title: 'KUMMITUSKISA', accent: '#e65c00'
    },
    juhannus: {
        name: 'Juhannus', icon: '🔥',
        racers: ['☀️','🚣','⛵','🦆','🌭','🍉','🌻','🦟','🏕️','🌅'],
        goal: '🔥', verb: 'UI!', unit: 'loisketta',
        title: 'KOKKOKISA', accent: '#ef6c00'
    }
};

// Kausitunnistus: palauttaa kalenteriin sopivan teeman avaimen tai null.
// Järjestäjä voi aina ohittaa ehdotuksen — tämä vain esivalitsee.
function mkGameSeasonTheme() {
    var d = new Date();
    var m = d.getMonth(); // 0=taamikuu
    var day = d.getDate();
    // Uudenvuoden aikaan vuodenvaihteen teema voittaa joulun
    if (m === 11 && day >= 28) return 'newyear';
    if (m === 0 && day <= 3) return 'newyear';
    if (m === 11 || (m === 0 && day <= 6)) return 'xmas';
    if (m === 1 && day >= 10 && day <= 16) return 'valentine';
    if (m === 9 && day >= 25) return 'halloween';
    if (m === 10 && day <= 2) return 'halloween';
    if (m === 5 && day >= 19 && day <= 27) return 'juhannus';
    // Pääsiäinen lasketaan liikkuvana (Gaussin algoritmi)
    if (mkGameIsEaster(d)) return 'easter';
    return null;
}

function mkGameIsEaster(d) {
    var y = d.getFullYear();
    var a = y % 19, b = Math.floor(y / 100), c = y % 100;
    var e = (19 * a + Math.floor(b / 4) - Math.floor((8 * b + 13) / 25) + 15) % 30;
    var f = e - Math.floor((a + 11 * e) / 319);
    var em = Math.floor((f + 2 * Math.floor(b % 4) + 2 * b - c - Math.floor(c % 4) + 32) % 7);
    var g = Math.floor((f - em + Math.floor(c / 4) + y % 4 - Math.floor(c / 400) + Math.floor(c / 100) - c + 90) / 25);
    var h = (f - em + g + 19) % 32;
    var easter = new Date(y, g - 1, h); // pääsiäissunnuntai
    var diff = Math.round((d - easter) / 86400000); // päiviä suhteessa sunnuntaihin
    return diff >= -7 && diff <= 1; // laskiaissunnuntai..pääsiäismaanantai
}

// Turvallinen teeman haku — tuntematon/puuttuva avain → perus
function mkGameTheme(id) {
    return MK_GAME_THEMES[id] || MK_GAME_THEMES.perus;
}

// ===== VISAN VALMISPAKETIT =====
// Järjestäjä voi tuoda paketin miittiinsä yhdellä napilla ja muokata
// kysymyksiä vapaasti. Paketti = kysymyksiä: { q, a:[3], c:oikean indeksi }
var MK_QUIZ_PACKS = {
    army: {
        name: '🎖️ Armeija-paketti',
        questions: [
            { q: 'Mikä on Suomen puolustusvoimien korkein sotilasarvota?', a: ['Kenraali', 'Marsalkka', 'Amiraali'], c: 1 },
            { q: 'Kuinka monta päivää kestää lyhin varusmiespalvelus?', a: ['165 pv', '255 pv', '347 pv'], c: 0 },
            { q: 'Mikä näistä EI ole Suomen armeijan alokasjakso?', a: ['P-jakso', 'A-jakso', 'M-jakso'], c: 2 },
            { q: 'Mitä tarkoittaa lyhenne "PK" maastopuvussa?', a: ['Pohjois-Karjala', 'Pienoiskivääri', 'Puolustusvoimien kenttä'], c: 1 },
            { q: 'Millä aseella varusmiehet pääasiassa harjoittelevat?', a: ['RK 62', 'AK-47', 'M16'], c: 0 },
            { q: 'Mikä on sotilaiden ruokakulttuurin klassikko?', a: ['Makkara', 'Mauton paketti', 'Munakas'], c: 1 },
            { q: 'Kenelle sotilasarvoon kuuluu kolme leijonatunnusta?', a: ['Eversti', 'Kenraalimajuri', 'Ylikersantti'], c: 0 },
            { q: 'Mitä tarkoittaa "maastoutuminen"?', a: ['Kotiinlähtö', 'Pukeutuminen maastopukuun', 'Maanviljely'], c: 1 },
            { q: 'Kuinka monta prikaatia Suomen maavoimissa on?', a: ['5', '7', '10'], c: 1 },
            { q: 'Mikä on varusmiesten legendaarinen juoma?', a: ['Vesilahti', 'Jaffa', 'Viski'], c: 0 }
        ]
    },
    geocaching: {
        name: '🗺️ Kätköily-paketti',
        questions: [
            { q: 'Mitä tarkoittaa "muggla" kätköilykielessä?', a: ['Pieni purkki', 'Tavallinen ihminen', 'Kätkön omistaja'], c: 1 },
            { q: 'Mikä on "FTF"?', a: ['First To Find', 'Find The Flag', 'Funny Tiny Friend'], c: 0 },
            { q: 'Minkä kokoisen kätkön "nano" on?', a: ['Isompi kuin filmipurkki', 'Pienempi kuin filmipurkki', 'Sämpylän kokoinen'], c: 1 },
            { q: 'Mitä "TFTC" tarkoittaa lokiviestissä?', a: ['Thanks For The Cache', 'Try To Find Cache', 'The Fun Treasure Club'], c: 0 },
            { q: 'Mikä on "multi-kätkö"?', a: ['Useita kätköjä samassa paikassa', 'Kätkö, jossa on välipisteitä', 'Suosituin kätkötyyppi'], c: 1 },
            { q: 'Mitä "D/T"-luokitus kertoo?', a: ['Kätkön iän ja tyypin', 'Vaikeuden ja maaston', 'Etäisyyden ja ajan'], c: 1 },
            { q: 'Missä maassa geokätköily on suosituinta asukasta kohden?', a: ['USA', 'Saksa', 'Suomi'], c: 2 },
            { q: 'Mitä on "trackable"?', a: ['Kätkön jäljitysjärjestelmä', 'Matkaava esine koodilla', 'Puhelimen lisäosa'], c: 1 }
        ]
    }
};
