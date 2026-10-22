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
        "FTF-tunnelmaa kaikille kotimatkalle!",
        "Muistakaa logata Attended — järjestäjä kiittää!",
        "DNF:tä ei tänään — kaikki löysivät perille!",
        "Ämpäri taskuun ja kohti uusia seikkailuita!",
        "Lokikirja sulkeutuu — seikkailut eivät!",
        "Geokätköilijä ei sanoa hyvästi — hän sanoo TFTC!",
        "Kiitos että tulitte — teistä tuli osa historiaa!",
        "Hyvää matkaa kotiin!",
        "Nähdään seuraavassa miitissä!",
        "Teitte miitistä muistamisen arvoisen!",
        "Viedään hyvä olo mukaan poluille!",
        "Hanskat takaisin kaupunkiin ja swagit matkaan!",
        "Trackablet muistavat tämän illan — hei hei!",
        "Kuka vei loput pullat? — kiitti ja hei!",
        "GPS opastaa kotiin — ja kohti seuraavaa!"
    ],

    // Sovelluksen versio (näytetään kirjautumissivulla)
    VERSION: "7.56.0"
};
