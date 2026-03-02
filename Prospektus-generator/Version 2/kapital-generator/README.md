# Kapitalplaneraren v2.0

AI-driven plattform för att skapa **informationsmemorandum** och **prospekt** för nordiska kapitalanskaffningar.

## 🆕 Vad är nytt i v2.0?

### Intelligent dokumenttypsväljare
- **Steg 0: Kvalificering** - Systemet ställer tre frågor om marknadsplats, emissionsstorlek och målgrupp
- Rekommenderar automatiskt IM eller Prospekt baserat på Prospektförordningen (EU) 2017/1129
- Förklarar tydligt skillnaderna mellan dokumenttyperna
- Visar beräknad emissionsstorlek i EUR för att visa relation till €8M-tröskeln

### Komplett IM-flöde (7 steg)
1. **Företagsinformation** - Grundläggande bolagsdata
2. **Emissionsdetaljer** - Kapitalbehov och användning
3. **Verksamhetsbeskrivning** - Affärsmodell, produkter, strategi
4. **Marknadsanalys** - Marknadsbeskrivning och konkurrensituation
5. **Finansiell översikt** - Nyckeltal från senaste året
6. **Team och styrelse** - Nyckelpersoner med AI-genererade bios
7. **Granska och generera** - Översikt innan AI-generering

### AI-genererade sektioner
- **Executive Summary** med investment thesis
- **Verksamhet och Strategi** (600 ord)
- **Marknadsöversikt** (500 ord)
- **Riskfaktorer** (5-7 väsentliga risker i kategorier)
- **Team-biografier** (professionella prospektspråk från CV-data)

### PDF-export
- Professionell layout med disclaimer
- Strukturerad efter IM-standardformat
- Redo att distribuera till investerare

---

## 🏗️ Arkitektur

```
kapital-generator/
├── backend/
│   ├── server.js           # Express API med Anthropic Claude Sonnet 4
│   └── package.json
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js          # React-app med 8-stegs wizard
        ├── App.css         # Omfattande styling
        ├── index.js
        └── index.css
```

---

## 🚀 Installation och körning

### Förutsättningar
- Node.js 18+ 
- npm eller yarn
- Anthropic API-nyckel

### Steg 1: Installera backend

```bash
cd backend
npm install
```

Skapa en `.env`-fil:
```
ANTHROPIC_API_KEY=din_api_nyckel_här
PORT=3001
```

Starta backend:
```bash
npm start
```

Backend körs nu på `http://localhost:3001`

### Steg 2: Installera frontend

```bash
cd frontend
npm install
```

Starta frontend:
```bash
npm start
```

Frontend öppnas automatiskt på `http://localhost:3000`

---

## 📋 Användning

### Steg 0: Kvalificering
1. Välj marknadsplats (Nasdaq Stockholm, First North, Spotlight, Nordic SME, eller Onoterat)
2. Ange emissionsstorlek i SEK
3. Markera om detta är den enda emissionen under 12 månader
4. Välj målgrupp (allmänheten, kvalificerade investerare, eller syndikat)

**Systemet rekommenderar:**
- **IM** om emissionen är <€8M eller riktar sig till kvalificerade investerare
- **Prospekt** om emissionen är ≥€8M till allmänheten

### Steg 1-6: Datainmatning
Fyll i företagsinformation, emission, verksamhet, marknad, finansiella nyckeltal och team.

### Steg 7: Generering
AI skapar alla sektioner (tar ~30-60 sekunder).

### Steg 8: Granska och ladda ner
- Granska allt genererat innehåll
- Ladda ner som PDF
- Bifoga finansiella rapporter manuellt
- Låt juridisk rådgivare granska

---

## 🎯 Marknadssegment för IM

### Primärt fokus: Spotlight/Nordic SME-mikroemissioner
- **Volym:** ~400 bolag på Spotlight, liknande på Nordic SME
- **Behov:** Emissioner <€8M utan råd för fullständigt prospekt (300-800 TSEK)
- **Kostnad:** AI-plattformen kan erbjuda IM till bråkdelen av kostnaden

### Sekundärt: Private placements till kvalificerade investerare
- **Volym:** 300-400 VC-investeringar/år + affärsängelsyndikat
- **Behov:** Strukturerat dokument för due diligence och LP-rapportering
- **Värde:** Professionalisering av founders' dokumentation

### Tertiärt: Fastighetssyndikering och crowdfunding
- **Exempel:** Tessin, Kameo, Pepins, FundedByMe
- **Behov:** Plattformskrav på investeringsmemorandum
- **Potential:** Branschspecifika mallar på sikt

### Strategiskt: Pre-IPO-rundor
- **Volym:** 15-25/år i Sverige
- **Värde:** Inbyggd uppgraderingslogik till prospektflödet vid listning

---

## 🔑 Nyckelskillnader: IM vs. Prospekt

| Dimension | Informationsmemorandum | Prospekt |
|-----------|------------------------|----------|
| **FI-godkännande** | ❌ Nej | ✅ Ja |
| **Processtid** | 3-5 dagar | 4-6 veckor |
| **Kostnad** | Låg (AI-driven) | Hög (300-800 TSEK för First North) |
| **Juridiskt ansvar** | Allmän avtalsrätt | Prospektförordningen art. 11 |
| **Struktur** | Frivilligt format | Strikt enligt art. 6-14 |
| **Sammanfattning** | Fritext Executive Summary | EU-format art. 7 med max 7 A4-sidor |
| **Riskfaktorer** | Förenklad sektion | Låg/Medel/Hög-kategorisering obligatorisk |
| **Finansiell data** | Nyckeltal + hänvisning | Fullständiga tabeller + revisorsattest |
| **Villkor & anvisningar** | ❌ Ej relevant | ✅ Teckningsrätter, BTA, Euroclear |
| **Certified Adviser** | ❌ Ej krav | ✅ Krav för First North |

---

## 🤖 AI-automatiseringsnivåer

### A-nivå: Helt AI-genererad (~45% av IM)
- Executive Summary / Investment Thesis
- Standardfriskrivningar och juridiska klausuler
- Strukturformateringar

### B-nivå: AI med indata (~45% av IM)
- Verksamhets- och strategitext
- Marknadsöversikt
- Riskfaktorer (branschanpassade)
- Team-biografier (CV → prospektspråk)

### C-nivå: Manuell hantering (~10% av IM)
- Finansiella bilagor (årsredovisning, delårsrapport)
- Garantiavtal (om tillämpligt)
- Juridisk slutgranskning

**Total tidsbesparingsuppskattning:** ~80% av draftningstiden för ett traditionellt IM.

---

## 🔮 Framtida utveckling (Roadmap)

### Fas 2: Content Intelligence
- Marknadsdata-integration (Bloomberg, Eurostat)
- FDI-klausul automatisk inkludering (för 2024+ dokument)
- EU-tillväxtprospekt-mall (art. 15) parallellt med förenklat format
- Proformadetektion för förvärvsemissioner

### Fas 3: Full Due Diligence Assistant
- Finansiell data-extraktion från PDF-årsredovisningar
- Emissionsinstitutsworkflow med granskningsflöde
- Bolagsverket API-integration för automatisk datahämtning
- Garantiavtalstracking för komplexa strukturer

### Fas 4: Prospektflöde
- Fullständig implementation av 13-delars prospektstruktur
- Villkor och anvisningar med TR/BTA-logik
- EU-formatterad sammanfattning (art. 7)
- FI-godkännandearbetsflöde

---

## 📊 Teknisk stack

- **Backend:** Node.js + Express
- **AI:** Anthropic Claude Sonnet 4 (claude-sonnet-4-20250514)
- **Frontend:** React 18 + Vite-alternativ (Create React App)
- **PDF-generering:** PDFKit
- **Styling:** Custom CSS med gradient design

---

## 💡 Go-to-Market-strategi

### Primär distributionskanal: Emissionsinstitut
- **Målgrupp:** Eminova, Vator Securities, Shark Finans (Spotlight/Nordic SME-fokus)
- **Värdeproposition:** Erbjud IM-plattformen som del av tjänsteutbudet
- **Modell:** White-label eller partnerskap

### Sekundär: Direktförsäljning till bolag
- **Målgrupp:** Onoterade tillväxtbolag, pre-IPO-bolag
- **Värdeproposition:** Professionalisera kapitalanskaffningen till bråkdelen av kostnaden

### Prissättning (förslag)
- **Per dokument:** 5 000 - 15 000 SEK (beroende på komplexitet)
- **Abonnemang:** 50 000 SEK/år för emissionsinstitut (obegränsat antal IM)
- **Jämför med:** Traditionellt IM från advokatbyrå 50-150 TSEK

---

## ⚖️ Regulatorisk ansvarsram

**KRITISKT:** AI-genererat innehåll i ett dokument som används för kapitalanskaffning är juridiskt bindande även om det inte är FI-godkänt.

### Rekommenderad disclaimer (ingår i PDF)
> "Detta informationsmemorandum har inte granskats eller godkänts av Finansinspektionen. Informationen i dokumentet är baserad på uppgifter från bolaget och kan innehålla framåtriktade uttalanden som är föremål för osäkerhet."

### Ansvarsfördelning
- **Plattformen:** Levererar utkast baserat på bolagets indata
- **Bolaget:** Ansvarar för korrekthet i all inmatad information
- **Emissionsinstitutet:** Granskar och kvalitetssäkrar (om engagerade)
- **Juridisk rådgivare:** Slutgranskning rekommenderas alltid

---

## 📞 Support och frågor

**Demo-version** - För produktions-deploy, kontakta utvecklingsteamet för:
- Anthropic API-nyckel setup
- Server hosting och skalning
- White-label anpassning
- Juridisk disclaimer-validering per jurisdiktion

---

## 📝 Licens

Proprietär licens. Kontakta för kommersiell användning.

---

**Built with Claude Sonnet 4** 🤖
*Kapitalplaneraren v2.0 - Demokratiserar tillgången till professionell kapitalanskaffningsdokumentation*
