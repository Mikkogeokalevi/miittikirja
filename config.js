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

    // Ilmoitustaulun "TIESITKÖ?"-faktalaput — täyttävät tyhjät paikat ja
    // vaihtuvat taulun kierron mukana. Lisää / poista / muokkaa vapaasti.
    WALL_FACTS: [
        "Ensimmäinen geokätkö piilotettiin 3.5.2000 Oregonissa, USA:ssa.",
        "Geokätköilyn perustajana pidetään Dave Ulmeria — ensimmäinen piilo oli ämpäri.",
        "Sana 'geocaching' syntyi sanoista geo (maa) + cache (kätkö).",
        "Suomen ensimmäinen geokätkö piilotettiin kesällä 2000.",
        "Geokätköjä on kaikilla maanosilla — myös Antarktiksessa.",
        "Korkein kätkö sijaitsee kansainvälisellä avaruusasemalla ISS.",
        "Trackable-esineet ovat kulkeneet jo miljardeja kilometrejä.",
        "Vaikein kätkötaso 5/5 voi vaatia vaikka sukellusvarusteet.",
        "'TFTC' = Thanks For The Cache — kiitos kätköstä.",
        "'DNF' = Did Not Find — löytämättä jäänyt yritys.",
        "'FTF' = First To Find — ensimmäisenä löytänyt.",
        "EarthCache-kätkössä ei ole lokikirjaa — vaan geologinen nähtävyys.",
        "Mysteerikätkön ratkaisu piilee usein kätkökuvauksessa.",
        "Multi-kätkö kuljettaa välipisteiden kautta loppupisteeseen.",
        "Letterbox Hybrid yhdistää kätköilyn ja vanhan letterboxingin.",
        "CITO = Cache In Trash Out — kätköilijät siivoavat luontoa.",
        "Giga Event -tapahtumiin kokoontuu tuhansia kätköilijöitä.",
        "Souvenir-palkintoja saa mm. teemapäivinä kätköilemisestä.",
        "Webcam-kätköjä ei voi enää perustaa — vanhat ovat harvinaisuuksia.",
        "Adventure Lab -seikkailut ratkotaan älypuhelimella paikan päällä.",
        "Viron ja Suomen välillä liikkuu satoja kätköilijöitä lautalla.",
        "Kätkö voi olla magneettinen, naamioitu tai kokonaan virtuaalinen.",
        "Hyvä kätköpaikka kertoo paikasta jotain erityistä.",
    ],

    // Sovelluksen versio (näytetään kirjautumissivulla)
    VERSION: "7.65.1"
};
