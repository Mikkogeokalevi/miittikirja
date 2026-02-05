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
        if (count <= 40) return "Vakiokasvo";
        if (count <= 60) return "Konkari";
        return "Mikkokalevi VIP"; // Yli 50
    },

    // 2. Määrittele tervehdyslistat
    getRandomGreeting: function(name, isFirstTime) {
        // Jos eka kerta, arvotaan näistä ensikertalaisviesteistä
        if (isFirstTime) {
            const firstTimeGreetings = [
                "🎉 Tervetuloa ${name}! 🎉",
                "🌟 Ensikertalainen ${name}! 🌟", 
                "🎊 Mahtavaa nähdä ${name}! 🎊",
                "🏆 Uusi sankari saapui: ${name}! 🏆",
                "🎈 Tervetuloa miittiin ${name}! 🎈",
                "✨ Loistavaa ${name}, löysit perillein! ✨",
                "🎯 Bullseye! ${name} on paikalla! 🎯",
                "🚀 Ensilennon suorittanut: ${name}! 🚀",
                "💫 Tähti syttyi: ${name}! 💫",
                "🎪 Sirkus on kunnossa, ${name} saapui! 🎪",
                "🌈 Sateenkaari ilmestyi - ${name} on täällä! 🌈",
                "🎲 Onnennumero ${name} ensimmäistä kertaa! 🎲",
                "🏅 Kultamitali ${name}: ensimmäinen miitti! 🏅",
                "🎸 Rockstar ${name} teki debyytin! 🎸",
                "� Trooppinen tervetuloa ${name}! �"
            ];
            
            const randomFirstTime = firstTimeGreetings[Math.floor(Math.random() * firstTimeGreetings.length)];
            return randomFirstTime.replace('${name}', name);
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
            "System error... vitsi vitsi, moi",
            "Tervetuloa takaisin",
            "Miten menee",
            "Kuka sinä olet",
            "Mitä sinä teet täällä",
            "Oletko valmis",
            "Tule tänne",
            "Tervetuloa joukkoon",
            "Olet osa joukkoa",
            "Täällä on hyvä olla",
            "Tervetuloa kotiin",
            "Olet kotona",
            "Täällä on turvallista",
            "Olet turvassa",
            "Tervetuloa perheeseen",
            "Olet perheen jäsen",
            "Täällä on hauskaa",
            "Olet hauska",
            "Tervetuloa seuraan",
            "Olet seuran jäsen",
            "Täällä on hyvä olla",
            "Olet osa seuraa",
            "Tervetuloa joukkoon",
            "Olet joukon jäsen",
            "Täällä on hyvä olla",
            "Olet osa joukkoa",
            "Tervetuloa takaisin",
            "Miten menee",
            "Kuka sinä olet",
            "Mitä sinä teet täällä",
            "Oletko valmis",
            "Tule tänne",
            "Tervetuloa joukkoon",
            "Olet osa joukkoa",
            "Täällä on hyvä olla",
            "Tervetuloa kotiin",
            "Olet kotona",
            "Täällä on turvallista",
            "Olet turvassa",
            "Tervetuloa perheeseen",
            "Olet perheen jäsen",
            "Täällä on hauskaa",
            "Olet hauska",
            "Tervetuloa seuraan",
            "Olet seuran jäsen",
            "Täällä on hyvä olla",
            "Olet osa seuraa",
            "Tervetuloa joukkoon",
            "Olet joukon jäsen",
            "Täällä on hyvä olla",
            "Olet osa joukkoa"
        ];

        // Arvotaan teksti
        const randomText = greetings[Math.floor(Math.random() * greetings.length)];
        
        // Palautetaan muodossa: "Teksti Nimi!"
        // Huom: Koodi lisää automaattisesti huutomerkin nimen perään,
        // joten tekstin ei tarvitse loppua välimerkkiin, ellei haluta esim kysymysmerkkiä.
        return `${randomText} ${name}!`;
    },

    // 4. Päivän mukaan vaihtuvat viestit
    getDailyGreeting: function(name) {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = sunnuntai, 6 = lauantai
        const hour = today.getHours();
        
        const dailyGreetings = {
            0: [ // Sunnuntai
                "Pyhäpäivän sankari ${name}!",
                "Sunnuntaifiilistelijä ${name} saapui!",
                "Viikonlopun viimeinen ${name}!"
            ],
            1: [ // Maanantai
                "Maanantai-voittaja ${name}!",
                "Viikko alkaa kun ${name} on paikalla!",
                "Survivor ${name} selvisi maanantaista!"
            ],
            2: [ // Tiistai
                "Tiistain tiikeri ${name}!",
                "Keskiviikkoa kohti ${name} johdattaa!",
                "Tästä se lähtee ${name}!"
            ],
            3: [ // Keskiviikko
                "Keskiviikko-kunkku ${name}!",
                "Puolivälissä jo ${name}!",
                "Pikku-perjantai- ${name}!"
            ],
            4: [ // Torstai
                "Torstain tohtori ${name}!",
                "Perjantai-odottaja ${name}!",
                "Tänään on torstai, ${name}!"
            ],
            5: [ // Perjantai
                "Perjantai-prinsessa ${name}!",
                "Viikonloppu alkaa, ${name} on valmis!",
                "Finally Friday - ${name}!"
            ],
            6: [ // Lauantai
                "Lauantai-legend ${name}!",
                "Viikonloppu-kuningas ${name}!",
                "Paras päivä ja ${name} paikalla!"
            ]
        };

        const dayGreetings = dailyGreetings[dayOfWeek] || dailyGreetings[0];
        const randomDayGreeting = dayGreetings[Math.floor(Math.random() * dayGreetings.length)];
        
        return randomDayGreeting.replace('${name}', name);
    },

    // 5. Ajan mukaan vaihtuvat viestit
    getTimeBasedGreeting: function(name) {
        const hour = new Date().getHours();
        
        if (hour >= 5 && hour < 9) {
            const morningGreetings = [
                "Aamunkoiton sankari ${name}!",
                "Tervetuloa aamukahville ${name}!",
                "Early bird ${name} saapui!"
            ];
            return morningGreetings[Math.floor(Math.random() * morningGreetings.length)].replace('${name}', name);
        } else if (hour >= 9 && hour < 12) {
            const midMorningGreetings = [
                "Aamupäivän aurinko ${name}!",
                "Hyvää huomenta ${name}!",
                "Coffee break - ${name} on paikalla!"
            ];
            return midMorningGreetings[Math.floor(Math.random() * midMorningGreetings.length)].replace('${name}', name);
        } else if (hour >= 12 && hour < 15) {
            const lunchGreetings = [
                "Lounastauolla ${name}!",
                "Keskipäivän kuningas ${name}!",
                "Lounaspuuroa ja ${name} saapui!"
            ];
            return lunchGreetings[Math.floor(Math.random() * lunchGreetings.length)].replace('${name}', name);
        } else if (hour >= 15 && hour < 18) {
            const afternoonGreetings = [
                "Iltapäivän iloinen ${name}!",
                "Kahvitauko - ${name} saapui!",
                "Afternoon delight - ${name}!"
            ];
            return afternoonGreetings[Math.floor(Math.random() * afternoonGreetings.length)].replace('${name}', name);
        } else if (hour >= 18 && hour < 22) {
            const eveningGreetings = [
                "Iltaherkku ${name}!",
                "Illalliskutsut ${name} sai!",
                "Evening star - ${name} saapui!"
            ];
            return eveningGreetings[Math.floor(Math.random() * eveningGreetings.length)].replace('${name}', name);
        } else {
            const nightGreetings = [
                "Yömyöhän saapui ${name}!",
                "Night owl ${name} on paikalla!",
                "Myöhäisen illan sankari ${name}!"
            ];
            return nightGreetings[Math.floor(Math.random() * nightGreetings.length)].replace('${name}', name);
        }
    },

    // 3. Putki-ilmoitukset
    getStreakMessage: function(streakCount) {
        return `🔥 <strong>LIEKEISSÄ!</strong> ${streakCount}. miitti putkeen!`;
    },

    getMissedMessage: function(daysDiff, missedCount) {
        return `Olikin jo ikävä! Edellinen käyntisi oli <strong>${daysDiff} päivää</strong> sitten.<br><small>(Väliin jäi ${missedCount} miittiä)</small>`;
    }
};
