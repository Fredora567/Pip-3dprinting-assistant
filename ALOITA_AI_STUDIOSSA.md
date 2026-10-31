# Koko Pip-sovellus Google AI Studioon

Tämä on Pipin kokonainen selainversio: **Node.js-palvelin ja HTML/CSS/JavaScript-
käyttöliittymä**. Pythonia tai Streamlitiä ei tarvita. AI Studio käyttää oletuksena
Reactia, mutta tämä projekti säilyttää jo toimivan selainhahmon ja mikrofonin
ilman ylimääräisiä käyttöliittymäriippuvuuksia. `npm run dev` käynnistää koko
sovelluksen yhdellä portilla.

## 1. Tee uusi GitHub-repositorio

1. Pura `pip-ai-studio.zip` uuteen kansioon. Älä korvaa vanhaa Python-projektia.
2. Luo GitHubissa uusi tyhjä repositorio, esimerkiksi **pip-ai-studio**.
3. Valitse **Add file → Upload files** ja lisää uuden projektikansion sisältö.
   `package.json`, `server.mjs`, `metadata.json`, `public` ja `lib` pitää näkyä
   repositorion juuressa, ei ylimääräisen alikansion sisällä.
4. Lisää myös `.gitignore`, `.env.example`, ohjeet, testit ja LICENSE.
5. Älä lisää omaa `.env`-tiedostoa, API-avaimia, salasanoja tai vanhaa `.venv`-
   kansiota. Tämän ZIPin mukana ei ole oikeita avaimia.
6. Tallenna tiedostot Commit changes -painikkeella.

## 2. Tuo repositorio AI Studioon

1. Avaa [Google AI Studio Build](https://aistudio.google.com/apps).
2. Avaa uuden projektin syöttökentän **+**-valikko.
3. Valitse **Import from GitHub** ja tuo yllä luotu repositorio. Anna tarvittava
   GitHub-yhteyden lupa vain omalle haluamallesi repositoriolle.
4. Käytä tiedoston `AI_STUDIO_PROMPT.txt` sisältöä projektin tuontikehotteena.
5. Pyydä käynnistämään `npm run dev`. Esikatselun pitäisi avautua porttiin 3000.

Tuonti GitHubista ja Node.js-palvelinympäristö ovat Googlen dokumentoimia
ominaisuuksia. Tätä pakettia ei ole kirjattu sisään tai tuotu sinun AI Studio
-tilillesi tämän keskustelun aikana. Käyttöliittymän valinnat voivat vaihdella.

## 3. Lisää salaisuudet palvelimelle

Avaa AI Studion projektin **Settings → Secrets** ja lisää:

| Nimi | Arvo |
| --- | --- |
| `GEMINI_API_KEY` | Google AI Studion API-avain; tarkista ensin, onko Studio jo asettanut sen |
| `ELEVENLABS_API_KEY` | Toimiva ElevenLabs-avain puheentunnistus- ja puhesynteesioikeuksilla |
| `ELEVENLABS_VOICE_ID` | Oma käytettävissä oleva Voice ID, tai esimerkki `JBFqnCBsd6RMkjVDRZzb` |
| `GEMMA_MODEL` | `gemma-4-26b-a4b-it` |
| `ELEVENLABS_STT_MODEL` | `scribe_v2` |
| `ELEVENLABS_TTS_MODEL` | `eleven_flash_v2_5` |
| `APP_PASSWORD` | Oma pitkä salasana ennen kuin jaat sovelluksen muille |

Älä liitä avaimia rakennuschatin viestiin, lähdekoodiin, `metadata.json`-tiedostoon
tai GitHubiin. Älä käytä `VITE_`-alkuisia muuttujia avaimille. Käynnistä palvelin
uudelleen salaisuuksien muuttamisen jälkeen. Salaisuuksien arvot eivät tule
käyttöliittymään; se näyttää vain, onko avain asetettu.

## 4. Kokeile

1. Voit kirjoittaa kysymyksiä ilman pilviavaimia, kun Gemma on pois päältä.
2. Ota **Allow cloud speech processing** käyttöön puhetta varten.
3. Valitse **Use Gemma 4**, kun Googlen avain on käytössä.
4. Paina **Start conversation** ja hyväksy mikrofonilupa.
5. Sano **Pip**, odota merkkiääntä ja kysy englanniksi.
6. Toimintopyynnön jälkeen odota vahvistusmerkkiääntä ja sano **confirm** tai
   **cancel**. Pip-nimeä ei tarvitse toistaa vahvistusta varten.

AI Studion sisäinen esikatselu voi rajoittaa mikrofonia tai paikallista
herätenimen tunnistusta iframe-oikeuksien takia. `metadata.json` pyytää
mikrofoniluvan, mutta paikallinen puheentunnistus tarvitsee lisäksi selaimen ja
kehyksen tuen. Avaa esikatselu tarvittaessa omaan välilehteen. Jos herätenimi ei
ole tuettu, ota **Wait for Pip** pois päältä tai käytä tekstikenttää. Taustaääntä
ei lähetetä pilveen salaa herätenimen korvaamiseksi.

## 5. Jatka koodaamista Studiossa

Build-chatin koodausavustaja on **Gemini**. Pipin omiin vastauksiin käytetään
edelleen **Gemma 4:ää Gemini API:n kautta**. Nämä ovat eri tehtävät.

Voit pyytää esimerkiksi: “Improve the mobile layout. Keep all API keys on the
server and preserve the deterministic voice confirmation flow.” Tarkista muutos
Code-välilehdeltä ja aja testit komennolla `npm test` ennen seuraavaa kokeilua.

Pidä esikatselu aluksi yksityisenä. Jaetun sovelluksen käyttäjät voivat käyttää
sinun API-kiintiöitäsi. APP_PASSWORD on yksinkertainen yhteinen sovellussalasana,
ei täydellinen tuotantotason käyttäjähallinta. Älä liitä oikean tulostimen
ohjausta julkiseen esikatseluun.

## Rajaukset

- Simulaatio, puhe, animaatio, herätenimi ja äänivahvistukset sisältyvät.
- Oikean tulostimen Moonraker-yhteys on vain luku. AI Studion pilvipalvelin ei
  tavallisesti pääse kotiverkkosi yksityiseen IP-osoitteeseen. Kotiverkkoyhteys
  on tarkoitettu paketin paikalliseen Node-käyttöön. Älä avaa Moonraker-porttia
  internetiin tämän vuoksi.
- Home Assistantia ja kameraa ei lisätty, koska niiden lisääminen peruttiin.
- Puhe on vuoropohjaista, ei suoratoistavaa eikä keskeytettävää puhepuhelua.
- Mallien, tilien, mikrofonin ja herätenimen toiminta pitää testata omalla tilillä.

Lähde: [Google AI Studio Build -ohje](https://ai.google.dev/gemini-api/docs/aistudio-build-mode).
