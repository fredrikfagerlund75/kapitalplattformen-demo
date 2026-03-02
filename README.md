# Kapitalplattformen v2.0 🚀

**AI-driven unified platform för kapitalanskaffning** med tre integrerade moduler:
1. 🎯 **Kapitalrådgivaren** (Coming soon)
2. 📄 **Prospekt/IM Generator** 
3. 📢 **Marknadsföring** (Fas 1 MVP)

---

## 🎯 Vad är nytt i v2.0?

### Unified Dashboard
- **Gemensam startsida** efter inloggning med tillgång till alla tre moduler
- **Projekthantering** - se alla dina emissionsprojekt på ett ställe
- **Tvärmodulärt arbetsflöde** - skapa IM/Prospekt → lansera marknadsföringskampanj
- **Enkel navigation** mellan moduler

### Marknadsföringsmodul (Fas 1 MVP) - NYHET!
Tre kärnfunktioner för att marknadsföra emissioner digitalt:

**1. Emissionssida (Landing Page Generator)**
- SEO-optimerad landningssida för emissionen
- Dynamiskt innehåll från IM/Prospekt
- Auto-genererad från projektdata
- Tracking pixels för konverteringsmätning

**2. Email-kampanj (3-stegs drip)**
- **Pre-launch** (3 dagar före): Skapar anticipation
- **Opening** (dag 1): Meddelar att emissionen öppnat
- **Last Call** (2 dagar kvar): Skapar urgency
- AI-genererade ämnesrader anpassade per bolag

**3. Google Search Ads**
- Keyword-targetering baserat på bolag och bransch
- Budget management (rekommenderat 20-30 TSEK)
- Konverteringsspårning (CPL-mätning)
- AI-genererade keywords och ad copy

**Mätbarhet:**
- Total reach tracking
- Email open/click rates
- Google Ads impressions, clicks, conversions
- Cost Per Lead (CPL) analys

---

## 📦 Arkitektur

```
kapitalplattformen/
├── backend/
│   ├── server.js              # Express API
│   └── package.json
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js             # Main router
        ├── auth/
        │   ├── Login.js       # Login component
        │   └── Login.css
        └── components/
            ├── Dashboard.js           # Main dashboard (startsida)
            ├── ProspektGenerator.js   # IM/Prospekt wizard
            ├── MarketingModule.js     # Marketing automation
            ├── CapitalAdvisor.js      # Placeholder (coming soon)
            └── [modulename].css       # CSS per modul
```

---

## 🚀 Installation och körning

### Steg 1: Klona/packa upp

```bash
tar -xzf kapitalplattformen-v2.tar.gz
cd kapitalplattformen
```

### Steg 2: Backend setup

```bash
cd backend
npm install
```

Skapa `.env`-fil:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
PORT=3001
```

Starta backend:
```bash
npm start
```

Backend körs nu på `http://localhost:3001`

### Steg 3: Frontend setup

```bash
cd frontend
npm install
npm start
```

Frontend öppnas automatiskt på `http://localhost:3000`

---

## 💻 Användning

### 1. Logga in
- **Demo:** Ange valfri e-post och lösenord
- Du hamnar på dashboard/startsidan

### 2. Dashboard/Startsida
Dashboarden visar:
- **Tre modulkort** (Kapitalrådgivaren, Prospekt/IM Generator, Marknadsföring)
- **Senaste projekt** med status (utkast/slutförd)
- **Snabbåtgärder** (nytt projekt, statistik, dokumentation)
- **Info-banner** om demo-läge

### 3. Prospekt/IM Generator
- Integrerar den befintliga 7-stegs wizarden
- Skapar IM eller Prospekt baserat på kvalificering
- AI-genererade sektioner
- PDF-export

### 4. Marknadsföringsmodul ⭐ NYA!

#### Tab: Översikt
- **Kampanjstatistik** (total reach, email opens, CPL, conversions)
- **Tre kampanjkomponenter:**
  
  **🌐 Emissionssida**
  - Status: Ej skapad / Aktiv
  - Klicka "Generera emissionssida" → AI skapar SEO-optimerad landningssida
  - Visar URL och SEO-score (85-100)
  - Förhandsgranska och redigera
  
  **📧 Email-kampanj**
  - Status: Ej startad / Schemalagd / Aktiv
  - Klicka "Konfigurera email-kampanj" → AI skapar 3-stegs drip
  - Visar sekvens: Pre-launch → Opening → Last Call
  - Stats: Skickade, öppningar, klick
  - *Krav:* Emissionssida måste vara skapad först
  
  **🎯 Google Search Ads**
  - Status: Ej startad / Aktiv
  - Ställ in budget (standard 25 000 SEK)
  - Klicka "Skapa Google Ads-kampanj" → AI genererar keywords och ad copy
  - Stats: Impressions, klick, konverteringar, CPL
  - *Krav:* Emissionssida måste vara skapad först

- **Demo-knapp:** "Simulera kampanjdata" för att se exempel-stats

#### Tab: Emissionssida
- Förhandsgranskning av genererad landningssida i iframe

#### Tab: Email
- Översikt av de tre email-mallarna
- Förhandsgranska och redigera mallar

#### Tab: Analys
- Kanalprestanda-tabell (Email vs. Google Ads)
- Jämför reach, engagement, konverteringar, CPL

### 5. Kapitalrådgivaren
- Kommer snart (placeholder visas)
- Planerade funktioner:
  - AI-driven strategirådgivning
  - Värderingsanalys
  - Investerarmatchning
  - Tidsplanering

---

## 🎨 Design & UX

### Dashboard
- **Modulkort** med hover-effekt och gradient-accent
- **Status badges** (Coming soon / Aktiv)
- **Projektkort** visar typ (IM/Prospekt), status, och marknadsföringsdata
- **Snabbåtgärder** för vanliga uppgifter

### Marknadsföringsmodul
- **Component cards** som ändrar färg när aktiva (grön bakgrund)
- **Status badges** (Pending/Scheduled/Active)
- **Stats cards** med ikoner och stora siffror
- **Requirement notes** (röd text) när dependencies saknas
- **Progress bars** för kampanjframsteg

### Färgschema
- **Primär gradient:** #667eea → #764ba2 (lila)
- **Grön (aktiv):** #48bb78 / #d4fc79
- **Gul (warning):** #f9e79f / #fef5e7
- **Röd (error):** #e53e3e / #fee2e2
- **Grå (neutral):** #e2e8f0 / #f7fafc

---

## 🔌 API Endpoints

### Marketing Automation

**POST `/api/marketing/generate-landing-page`**
```json
{
  "projectId": 1,
  "companyName": "Demo Företag AB",
  "emissionType": "IM",
  "emissionSize": "15000000 SEK"
}
```
→ Returnerar URL, SEO-score, och HTML

**POST `/api/marketing/setup-email-campaign`**
```json
{
  "projectId": 1,
  "companyName": "Demo Företag AB"
}
```
→ Returnerar campaign ID, 3 emails med AI-genererade subject lines

**POST `/api/marketing/setup-google-ads`**
```json
{
  "projectId": 1,
  "companyName": "Demo Företag AB",
  "budget": 25000
}
```
→ Returnerar campaign ID, AI-genererade keywords, estimated reach

**GET `/api/marketing/analytics/:projectId`**
→ Returnerar demo-statistik för alla kanaler

---

## 💡 Fas 1 MVP - Vad ingår?

### Leverabler för kunden:
✅ SEO-optimerad emissionssida  
✅ 3-stegs automatiserad email-kampanj  
✅ Google Search Ads med keyword-targeting  
✅ Komplett analys-dashboard med CPL-mätning  

### Kostnad för kunden:
**+30 000 SEK** ovanpå IM-kostnaden (5-15 TSEK)

**Total kostnad IM + Marketing:** 35-45 TSEK

**Jämför med traditionellt:**
- IM från advokatbyrå: 50-150 TSEK
- Marknadsföring från finansiell rådgivare: 150-500 TSEK
- **Totalt traditionellt: 200-650 TSEK**

**Er konkurrensfördel: 80-95% kostnadsreduktion**

### Estimerade resultat:
- **Reach:** 50 000 - 100 000 personer
- **Email open rate:** 35-45%
- **Google Ads CTR:** 2-4%
- **CPL (Cost Per Lead):** 200-400 SEK
- **Conversions:** 70-150 teckningsavsikter

---

## 🛠️ Teknisk stack

**Backend:**
- Node.js + Express
- Anthropic Claude Sonnet 4 för AI-generering
- CORS-enabled för lokal utveckling

**Frontend:**
- React 18 med hooks
- CSS Modules (inga externa dependencies)
- Responsiv design

**AI-användning:**
- Landing page content generation
- Email subject line generation
- Google Ads keyword generation
- Risk factors, market analysis, team bios (från Prospekt/IM-modulen)

---

## 📊 Roadmap

### Fas 2: Content Intelligence (Q2 2025)
- **LinkedIn Ads** integration
- **Programmatisk display-annonsering**
- **Retargeting & lookalike audiences**
- **Webinar-plattform** för digitala roadshows
- **A/B-testing** för landing pages
- **CRM-integration** (HubSpot/Salesforce)

### Fas 3: Full Marketing Automation (Q3 2025)
- **Influencer-marketing** workflow
- **PR-kampanj** automation (pressmeddelanden via Cision)
- **Partnership med analysföretag** (Redeye/Introduce)
- **Native advertising** på finansiella sajter
- **Affiliate/referral-program** för befintliga aktieägare
- **Physical roadshow** logistics

### Fas 4: AI Marketing Intelligence (Q4 2025)
- **Predictive analytics** för kampanjoptimering
- **Dynamic budget allocation** över kanaler
- **Sentiment analysis** från social media
- **Competitor tracking** och benchmarking
- **Automated reporting** för investerarrelationer

---

## 🎯 Go-to-Market för Marknadsföringsmodulen

### Primär målgrupp:
**Spotlight/Nordic SME-bolag (mikroemissioner <€8M)**
- ~400 bolag på Spotlight
- Genomför emissioner 1-2 gånger per år
- Har inte råd med traditionellt marknadsföringspaket (150-500 TSEK)
- Behöver professionell marknadsföring för att nå retail-investerare

### Värdeproposition:
"**Marknadsför din emission för 30 000 SEK istället för 150-500 TSEK**"

- Professionell landing page (istället för 30-50 TSEK från webbyrå)
- Automatiserad email-marketing (istället för 20-40 TSEK från marknadsföringsbyrå)
- Google Ads-kampanj med CPL-tracking (istället för 50-100 TSEK annonsbudget utan mätbarhet)
- **Total besparing: 100-190 TSEK** (80-95%)

### Distributionsstrategi:
1. **Partnership med emissionsinstitut** (Eminova, Vator, Shark)
   - White-label eller co-branding
   - Bundle med deras emissionsrådgivning
   
2. **Direktförsäljning** via inbound (SEO, LinkedIn Ads)
   - Target: CFO, IR-ansvariga på Spotlight-bolag
   
3. **Freemium-modell**
   - Gratis IM-generator → upsell till marknadsföringspaket

---

## 🐛 Troubleshooting

**Backend startar inte:**
```bash
# Kontrollera API-nyckel
cat backend/.env

# Installera om dependencies
cd backend && rm -rf node_modules && npm install
```

**Frontend kan inte nå backend:**
- Kontrollera att backend körs på port 3001
- Verifiera CORS-inställningar i `backend/server.js`
- API_URL i `MarketingModule.js` ska vara `http://localhost:3001`

**Login fungerar inte:**
- Demo-versionen accepterar alla email/lösenord-kombinationer
- Kontrollera att du fyller i båda fälten

**Marknadsföringsmodulen visar "Kräver att emissionssida är skapad först":**
- Klicka först på "Generera emissionssida" i Emissionssida-komponenten
- Vänta tills den visar status "Aktiv" med en URL
- Då kan du aktivera email och Google Ads

---

## 📝 Demo-scenario: Komplett workflow

### Steg 1: Logga in
Email: `demo@företag.se`, Lösenord: `demo123`

### Steg 2: Skapa IM
1. Klicka "Öppna modul" på **Prospekt/IM Generator**
2. Fyll i företagsinformation (eller använd befintligt demo-projekt från dashboarden)
3. Generera IM → ladda ner PDF

### Steg 3: Lansera marknadsföringskampanj
1. Tillbaka till Dashboard
2. Klicka "Skapa kampanj" på ditt slutförda projekt
3. Du är nu i **Marknadsföringsmodulen**

**I Översikt-tabben:**
4. Klicka "Generera emissionssida" → vänta 2-3 sekunder → URL visas
5. Klicka "Konfigurera email-kampanj" → 3 emails schemaläggs
6. Justera budget till 25 000 SEK (om du vill)
7. Klicka "Skapa Google Ads-kampanj" → keywords genereras
8. Klicka "🎲 Simulera kampanjdata" → se stats fyllda i

**I Analys-tabben:**
9. Se kanalprestanda-tabell med Email vs. Google Ads

**Total tid: 3-5 minuter**

---

## 🔐 Säkerhet & Compliance

**OBS: Detta är en demo-version**

För produktions-deploy krävs:
- ✅ Riktig autentisering (JWT, OAuth2)
- ✅ Databas (PostgreSQL/MongoDB) för projektstatus
- ✅ Rate limiting på AI-endpoints
- ✅ GDPR-compliance för email-listor
- ✅ API-nyckel management för Google Ads
- ✅ SSL/TLS för alla connections
- ✅ Audit logs för marknadsföringsåtgärder

---

## 💰 Prissättningsmodell (Förslag)

### För bolag (direkt):
- **IM + Marketing Starter:** 35 000 SEK
  - IM-generering
  - Landing page
  - Email-kampanj (3 emails)
  - Google Ads (20 TSEK budget inkluderad)

- **IM + Marketing Growth:** 75 000 SEK
  - Allt i Starter
  - LinkedIn Ads (30 TSEK budget)
  - Webinar setup
  - Premium landing page design

### För emissionsinstitut (B2B):
- **Per-projekt-licens:** 15 000 SEK/projekt
- **Årsabonnemang:** 150 000 SEK/år (obegränsat)
- **White-label:** 300 000 SEK/år + rev share

---

## 📞 Support

**Demo-frågor:** Se denna README eller SNABBSTART.md

**Produktionsdeploy:** Kontakta utvecklingsteamet

**Feature requests:** Öppna GitHub issue eller kontakta produkt

---

**Built with Claude Sonnet 4** 🤖  
*Kapitalplattformen v2.0 - Demokratiserar modern kapitalanskaffning*
