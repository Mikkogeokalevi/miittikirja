// ==========================================
// MK MIITTIKIRJA - MESSAGES.JS
// Sisältää: Tittelit, tervehdykset ja tekstit
// ==========================================

window.MK_Messages = {
    
    // 1. Määrittele tittelit ja käyntimäärät
    getRankTitle: function(count) {
        if (count <= 1) return "Miittitulokas";
        if (count <= 10) return "Satunnainen seikkailija";
        if (count <= 20) return "Aktiivikävijä";
        if (count <= 35) return "Vakiokasvo";
        if (count <= 50) return "Konkari";
        return "Mikkokalevi VIP"; // Yli 50
    },

    // 2. Määrittele tervehdyslistat
    getRandomGreeting: function(name, isFirstTime) {
        // Jos eka kerta, palautetaan aina tämä
        if (isFirstTime) {
            return `🎉 Tervetuloa ${name}! 🎉`;
        }

        // Muuten arvotaan näistä
        const greetings = [
            // Perussetit
            "Hei taas", 
            "Mahtavaa että pääsit",
            "Kiva nähdä",
            "Tervetuloa",

            // "Väärät" ajat & Hämmennys
            "Huomenta", 
            "Hyvää yötä",
            "Onko nyt joulu?",
            "Hyvää juhannusta",

            // Kehut & Hypetys
            "Ilta pelastettu, täällä on", 
            "Sankarimme saapui:", 
            "Legendaarista,",
            "Mitäs meidän suosikki",
            "Katos kuka täällä,",
            "Oletko se sinä,",
            "Nimmarisi nosti miitin arvoa,",
            "Stop the press! Se on",

            // Hullunkuriset & Vitsikkäät
            "Oho, löysit perille", 
            "Mikä meininki", 
            "Nonii, vihdoin", 
            "Tervetuloa kotiin",
            "Parempi myöhään kuin ei milloinkaan,", 
            "Kahvit tippumaan, vieraita tuli:",
            "Onko täällä kätköilijöitä?",
            "Söitkö jo kaikki keksit",
            "Varo, lattia on liukas",
            "Tämä viesti tuhoutuu 5 sekunnissa,",
            "Joko taas,",
            "Missä olit eilen",
            "Järjestysmies",
            "System error... vitsi vitsi, moi"
        ];

        // Arvotaan teksti
        const randomText = greetings[Math.floor(Math.random() * greetings.length)];
        
        // Palautetaan muodossa: "Teksti Nimi!"
        // Huom: Koodi lisää automaattisesti huutomerkin nimen perään,
        // joten tekstin ei tarvitse loppua välimerkkiin, ellei halua esim kysymysmerkkiä.
        return `${randomText} ${name}!`;
    },

    // 3. Putki-ilmoitukset
    getStreakMessage: function(streakCount) {
        return `🔥 <strong>LIEKEISSÄ!</strong> ${streakCount}. miitti putkeen!`;
    },

    getMissedMessage: function(daysDiff, missedCount) {
        return `Olikin jo ikävä! Edellinen käyntisi oli <strong>${daysDiff} päivää</strong> sitten.<br><small>(Väliin jäi ${missedCount} miittiä)</small>`;
    }
};
