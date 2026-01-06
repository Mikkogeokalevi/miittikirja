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
            "Hei taas!", 
            "Huomenta!", 
            "Ilta pelastettu!", 
            "Mahtavaa että pääsit!",
            "Sankarimme saapui!", 
            "Oho, löysit perille!", 
            "Mikä meininki?",
            "Katos kuka täällä!", 
            "Nonii, vihdoin!", 
            "Tervetuloa kotiin.",
            "Parempi myöhään kuin ei milloinkaan!", 
            "Se on hän!", 
            "Legendaarista.",
            "Kahvit tippumaan, vieraita tuli!",
            "Mitäs meidän suosikki?"
        ];

        const randomText = greetings[Math.floor(Math.random() * greetings.length)];
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
