// ==========================================
// MK MIITTIKIRJA - CONFIG.JS
// Asetukset keskitetysti yhdessä paikassa
// ==========================================

const MK_Config = {
    // TÄMÄ ON SE TÄRKEIN: Sinun käyttäjä-ID
    // Kaikki muut tiedostot (app.js, visitor.js) lukevat tämän täältä.
    // Jos vaihdat tiliä, päivitä vain tämä rivi!
    HOST_UID: "T8wI16Gf67W4G4yX3Cq7U0U1H6I2",

    // Oma geocaching-nimimerkki (raporttien järjestäjäerittelyissä)
    OWNER_NICK: "mikkokalevi",

    // Miittiseinän loppunäytön "heippa"-viestit — pyörivät ~15 s välein.
    // Lisää / poista / muokkaa vapaasti tässä listassa.
    WALL_BYE_MESSAGES: [
        "Kotiin → geocaching.com → Attended → onnellinen järjestäjä!",
        "Muistakaa logata Attended — järjestäjä kiittää!",
        "DNF:tä ei tänään — kaikki saavat löydön!",
        "Lokikirja sulkeutuu — seikkailut eivät!",
        "Geokätköilijä ei sanoa hyvästi — hän sanoo TFTC!",
        "Kiitos että tulitte — teistä tuli osa lokikirjan historiaa!",
        "Hyvää matkaa kotiin!",
        "Nähdään seuraavassa miitissä!",
        "Teitte miitistä muistamisen arvoisen!",
        "Heippa! Viedään hyvä olo mukaan poluille!",
        "Kuka vei loput pullat? — kiitti ja hei!",
        "GPS opastaa kotiin — ja kohti seuraavaa!",
        "Kiitos illasta — näistä hetkistä miitit tehdään!",
        "Tulipa hyvä mieli — kiitos että olitte!",
        "Kävijät tekee miitin — kiitos että teitte!",
        "Ihana nähdä teitä kaikkia taas!",
        "Kiitos — tänne on aina ilo kutsua!",
        "Jokainen kävijä teki tästä paremman!",
        "Hyvä seura pitää pahan ilmankin loitolla!",
    ],

    // Sovelluksen versio (näytetään kirjautumissivulla)
    VERSION: "7.61.0"
};
