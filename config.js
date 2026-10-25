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

    // Lappujen otsikkotekstit — muokkaa vapaasti (fact = faktalaput,
    // joke = höpölaput, pin = isännän kiinteät laput)
    WALL_FACT_LABEL: "Faktaako",
    WALL_JOKE_LABEL: "HÖPÖ HÖPÖ",
    WALL_QUOTE_LABEL: "KÄTKÖILIJÄN VIISAUS",
    WALL_PIN_LABEL: "📌 ISÄNNÄLTÄ",

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

    // Ilmoitustaulun HÖPÖ HÖPÖ -laput — joka kolmas vapaae paikka.
    // Täyttä höpöhöpöä — lisää / poista / muokkaa vapaasti.
    WALL_NONSENSE: [
        "Kätkö ei ole täällä — kätkö on toisella puolella.",
        "GPS ilmoitti että olet perillä. GPS saattoi valehdella.",
        "Varoitus: tämä miitti voi sisältää geokätköilijöitä.",
        "Tämän lapun alle on kätketty DNF.",
        "Koordinaatit tarkistettu kahdesti — ja silti väärin.",
        "Täällä ei ole kätköä. Tai on. Tarkista vielä kerran.",
        "Tämä lappu on FTF — ensimmäisenä taululle.",
        "Jos löydät kätkön, älä kerro muggleille missä se oli.",
        "Sateenvarjo ei ole D/T-väline, mutta auttaa silti.",
        "Miitin paras välipiste on aina kahvipiste.",
        "Vihje 'helppo paikka' tarkoittaa että etsit 45 min.",
        "Kätköilijän supervoima: näkee lipaston 200 m päästä.",
        "Tämä lappu on jo puolen souvenirin arvoinen.",
        "Lokikirja on täynnä — uusi tilattu.",
        "Huoltaja muistuttaa: älä syö mossia.",
        "Päivän koordinaatit: N ukko° E pilvi'.",
        "Kahvi kuluu — hakekaa lisää välipisteeltä 1.",
        "Taulun ylläpitäjä ei vastaa kadonneista kynistä.",
    ],

    // Kätköilijän viisaudet — kuuluisia lauseita ja lööppejä. Lisää / muokkaa vapaasti.
    WALL_QUOTES: [
        "\"Mä vaan käyn nopeasti yhdellä kätköllä.\" — Kolme tuntia myöhemmin…",
        "\"Se on ihan tossa.\" — 800 metriä, suota ja kaatuneita puita.",
        "\"Helppo löytö.\" — 45 minuuttia myöhemmin: DNF.",
        "\"Ei oteta enää yhtään.\" — Avaa kartan.",
        "\"Viimeinen vielä.\" — Kuuluisa viimeinen sana.",
        "\"Parkkeerataan tähän hetkeksi.\" — Auto jää siihen yöksi.",
        "\"En mä näitä pisteitä laske.\" — Tarkistaa tilastot kolme kertaa päivässä.",
        "\"Mä en FTF:ää jahtaa.\" — Ajaa 120 kilometriä julkaisun jälkeen.",
        "\"Tää on varmasti mikrokätkö.\" — Kaivaa puoli metsää.",
        "\"Koordinaatit on oikein.\" — Kävelee ympyrää GPS kädessä.",
        "Tuukko FTF:lle? – En, tuun!",
        "Etsikää nanoa, etsikää nanoa!",
        "Geokätköily on.",
        "Onks purkkia näkyny?",
        "Ei paha, logiikka vaan hukassa.",
        "Kyllä lähtee FTF-jahti!",
        "Se nyt vaan on tyhmää jättää purkki hakematta.",
        "Olisit katsonut vihjeen tarkemmin.",
        "Kahta en vaihda: GPS:ää ja geokätköilyä.",
        "Niin hyvä kätkö, ettei suosikkipisteet riitä.",
        "Connecting geokätköilijät.",
        "Mutsis on DNF!",
        "Nyt maistuis FTF Tonight!",
        "Etsi yks, etsi kaks – kohta on sata kasassa!",
        "FTF-nälkä kuin kätköilijällä!",
        "Geokätköily on laiffii!",
        "Ei se DNF:llä parane, kokeile uudestaan!",
        "Aina kannattaa kirjata loki!",
        "Miksei sitä yhtä purkkia vielä hakisi?",
        "Koordinaateista purkille!",
        "Kaikki peliin, magneetti esiin ja purkki etsintään!",
        "Löytämisen riemua – geokätköilyn riemua!",
        "Ei kysyvä traililta eksy.",
        "Kerran multiin, aina multiin!",
        "Pienestä purkista se on kiinni!",
    ],

    // Sovelluksen versio (näytetään kirjautumissivulla)
    VERSION: "7.69.0"
};
