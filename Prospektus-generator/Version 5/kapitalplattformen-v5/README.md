# Kapitalplattformen v5.0 🚀

**Emissionsprojekt-driven arkitektur för end-to-end emissionshantering**

---

## 🎯 Version 5 - Revolutionerande förändringar

### **Kärnkoncept: Emissionsprojekt**
All funktionalitet bygger nu runt **Emissionsprojekt** som flödar genom plattformen:

```
KAPITALRÅDGIVAREN → PROSPEKT/IM → TECKNING → MARKNADSFÖRING → ANALYTICS
        ↓                ↓            ↓              ↓              ↓
    Skapar           Läser från   Läser från     Läser från    Mäter mot
  Emissionsprojekt   projektet    projektet      projektet     projektet
```

### **Nya moduler i v5:**
1. **Teckning** (helt ny) - Emissionssida, tilldelning, Bolagsverket
2. **Analytics** (helt ny) - Real-time dashboard per projekt
3. **Kapitalrådgivaren** (ombyggd) - Startar hela flödet
4. **Marknadsföring** (omorganiserad) - Emissionssida flyttad till Teckning
5. **Prospekt/IM** (förenklad) - Läser data från projekt
6. **Aktiebok** (från v2.1) - Kontakthantering

---

## 📊 Emissionsprojekt-datastruktur

```javascript
{
  id: "EP-2025-001",
  name: "Företrädesemission Q2 2025",
  status: "active", // draft, active, completed
  currentModule: "teckning",
  
  emissionsvillkor: {
    typ: "Företrädesemission",
    teckningskurs: 2.50,
    antalNyaAktier: 6000000,
    emissionsvolym: 15000000,
    teckningsrätter: "1:5"
  },
  
  tidsplan: [
    { datum: "2025-03-15", milestone: "Styrelsebeslut", completed: true },
    { datum: "2025-03-25", milestone: "Prospekt klart", completed: false },
    // ...
  ],
  
  prospekt: {
    type: "IM",
    fileUrl: "/files/IM_EP-2025-001.pdf"
  },
  
  teckning: {
    emissionssidaUrl: "https://...",
    tilldelningsforslag: {...}
  },
  
  marknadsföring: {
    emailCampaignId: "brevo_12345",
    googleAdsCampaignId: "gads_67890"
  },
  
  analytics: {
    teckning: { total: 14250000, percent: 95, antalTecknare: 847 },
    emissionssida: { visits: 4521, uniqueVisitors: 2876 },
    email: { sent: 450, opens: 312, clicks: 127 },
    ads: { impressions: 65000, clicks: 1240, conversions: 89 }
  }
}
```

---

## 🚀 Installation

### Backend
```bash
cd backend
npm install
```

Skapa `.env`:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
PORT=3001
```

Starta:
```bash
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start
```

Frontend öppnas på `http://localhost:3000`

---

## 💻 Användning - Komplett workflow

### 1. Kapitalrådgivaren (Start här!)

**Skapa emissionsanalys:**
1. Fyll i bolagsdata (bransch, kapital, burn rate, kapitalbehov)
2. Klicka "Generera emissionsanalys med AI"
3. Claude Sonnet 4 skapar analys med rekommendationer

**Ange emissionsvillkor:**
- Typ: Företrädesemission/Nyemission/Riktad
- Teckningskurs: X SEK
- Antal aktier: Y st
- Volym beräknas automatiskt

**Skapa emissionsprojekt:**
- Projektet skapas och får ID (t.ex. EP-2025-002)
- Tidsplan genereras automatiskt
- Går automatiskt vidare till Prospekt/IM

**Extra funktioner:**
- Generera MAR-pressmeddelande
- Generera styrelseprotokoll
- Påminn om insynslogg

---

### 2. Prospekt/IM Generator

**Förenklad process:**
- Emissionsvillkor redan ifyllda från projektet
- Fokus på: Bolagsbeskrivning, Riskfaktorer, Team, Finansiell översikt
- AI-generering av alla sektioner
- PDF-export

Går automatiskt vidare till Teckning →

---

### 3. Teckning (NY MODUL!)

**4 tabs:**

**Tab 1: Emissionssida**
- Skapa och lansera publik emissionssida
- Generera MAR-PM (prospekt offentliggjort)
- Länk till emissionssida: `https://kapital.demo/emission-{projekt-id}`

**Tab 2: Videoteckning**
- 🚧 Work in progress - Placeholder
- Funktionalitet: Live OD för att verifiera tecknare

**Tab 3: Tilldelning**
- Ladda upp tilldelningsförslag från emissionsinstitutet
- Generera styrelseprotokoll för tilldelningsbeslut

**Tab 4: Bolagsverket**
- Generera registreringsunderlag
- Generera MAR-PM (emissionsutfall)
- Markera som registrerad

---

### 4. Marknadsföring

**3 tabs:**

**Tab 1: Digital Outreach**
- Automatiserad email-sekvensering
- AI-mall för innehållsgenerering
- Använder Aktiebok för målgrupper

**Tab 2: Analog Outreach**
- 🚧 Fysiska brev via Postnord/Kivra (placeholder)

**Tab 3: Annonsering**
- Google Ads-kampanj (mot emissionssida)
- Övrig annonsering (placeholder)

---

### 5. Analytics (NY MODUL!)

**Real-time dashboard per emissionsprojekt:**

**Teckningsstatus:**
- Totalt tecknat vs. målvolym
- Procentuell täckningsgrad
- Antal tecknare
- Manual uppdatering (lösning för förvaltarproblem)

**Emissionssida:**
- Besök
- Unika besökare

**Email-kampanjer:**
- Skickade / Öppningar / Klick
- Öppningsgrad

**Annonsering:**
- Impressions / Klick / Konverteringar
- CTR

---

### 6. Aktiebok

Från v2.1 - komplett modul för:
- Aktieägarhantering
- Opt-in tracking
- Synk till Brevo

---

## 🎯 Demo-scenario (5 minuter)

1. **Logga in** (valfri email/lösenord)
2. Dashboard visar ett färdigt projekt (EP-2025-001, completed)
3. Klicka **"Starta ny emission"** → Kapitalrådgivaren
4. Fyll i:
   - Bransch: SaaS
   - Kapital: 5M SEK
   - Burn rate: 500K SEK/mån
   - Kapitalbehov: 15M SEK
5. Klicka **"Generera emissionsanalys"**
6. Fyll i emissionsvillkor:
   - Teckningskurs: 2.50 SEK
   - Antal aktier: 6 000 000
7. Klicka **"Skapa emissionsprojekt"**
8. Navigera genom: Prospekt → Teckning → Marknadsföring → Analytics
9. Se färdigt projekt i Dashboard med progress timeline

---

## 🔧 Backend API

### Emissionsprojekt CRUD
```
GET    /api/emissionsprojekt          # Lista alla
GET    /api/emissionsprojekt/:id      # Hämta ett
POST   /api/emissionsprojekt          # Skapa nytt
PUT    /api/emissionsprojekt/:id      # Uppdatera
```

### Kapitalrådgivaren
```
POST   /api/kapitalrådgivaren/emissionsanalys       # AI-analys
POST   /api/kapitalrådgivaren/mar-pm               # MAR-PM
POST   /api/kapitalrådgivaren/styrelseprotokoll    # Protokoll
```

### Analytics
```
POST   /api/analytics/update-teckning              # Uppdatera teckning-status
```

---

## 🎨 För Claude Code att slutföra

### Högt prioriterade:
1. ✅ Bygga ut Prospekt/IM wizard-UI (förenklad från v2.1)
2. ✅ Upload-funktionalitet för tilldelningsförslag
3. ✅ CSS för Analytics-komponenten (stats cards, big metrics)
4. ✅ Brevo-integration för email-kampanjer
5. ✅ Google Ads setup-flow

### Medel prioritet:
6. ⏸️ Postnord/Kivra API-integration
7. ⏸️ Videoteckning-funktionalitet
8. ⏸️ Real-time teckning via emissionsinstitut-API

### Låg prioritet:
9. ⏸️ Export-funktioner (PDF-rapporter från Analytics)
10. ⏸️ Notifikationer (email när milestones nås)

---

## 📊 Teknisk stack

**Backend:**
- Node.js + Express
- Anthropic Claude Sonnet 4
- In-memory database (demo) → PostgreSQL (produktion)

**Frontend:**
- React 18
- Ingen externa UI-libs (custom CSS)
- Fetch API för backend-calls

---

## 🔑 Nyckelskillnader vs v2.1

| Funktion | v2.1 | v5.0 |
|----------|------|------|
| **Arkitektur** | Modulbaserad | Emissionsprojekt-driven |
| **Dataflöde** | Separat per modul | Centralt projekt-objekt |
| **Marknadsföring** | Inkl. emissionssida | Emissionssida i Teckning |
| **Analytics** | Del av Marknadsföring | Egen modul med dashboard |
| **Teckning** | Inte existerande | Ny modul med 4 tabs |
| **Kapitalrådgivaren** | Placeholder | Fullt fungerande start-modul |
| **Workflow** | Manuell navigation | Automatiskt flöde genom moduler |

---

## 🚨 Kritiska lösningar i v5

### Problem 1: Real-time teckning-data från förvaltare
**Lösning:** Manuell upload-funktion i Analytics
- Emissionsinstitutet uppdaterar dagligen
- Enkel form: Total tecknat + Antal tecknare
- Beräknar automatiskt täckningsgrad

### Problem 2: MAR-compliance för pressmeddelanden
**Lösning:** AI-genererade drafts med disclaimer
- Tvingande varning: "MÅSTE granskas av juridisk rådgivare"
- Ingen auto-publicering
- Template-baserad generation

### Problem 3: Komplexa emissionsvillkor
**Lösning:** Automatisk beräkning
- Antal aktier × Teckningskurs = Volym
- Uppdateras real-time vid ändring

---

## 💡 För Render-deploy

### Backend:
- Environment: Node
- Build command: `cd backend && npm install`
- Start command: `cd backend && npm start`
- Port: 3001
- Env vars: ANTHROPIC_API_KEY

### Frontend:
- Environment: Static Site
- Build command: `cd frontend && npm install && npm run build`
- Publish directory: `frontend/build`

---

## 📝 Nästa steg efter deploy

1. Testa komplett workflow från Kapitalrådgivaren → Analytics
2. Bygg ut placeholder-komponenter
3. Integrera Brevo för produktion
4. Ersätt in-memory database med PostgreSQL
5. Lägg till autentisering (JWT)
6. GDPR-compliance för kontaktdata

---

**Version:** 5.0.0  
**Datum:** 2025-03-05  
**Status:** Demo-klar för Claude Code  
**Arkitektur:** Emissionsprojekt-driven

Built with Claude Sonnet 4 🤖
