# Kapitalplattformen

**AI-driven plattform för kapitalanskaffning** — stöd för hela emissionsprocessen från analys till teckning.

Deployd på Render.com. Repo: `github.com/fredrikfagerlund75/kapitalplattformen-demo`

---

## Moduler

| Modul | Beskrivning |
|-------|-------------|
| **Dashboard** | Startsida med aktiva emissionsprojekt, kassaflöde och nyheter |
| **Kapitalrådgivaren** | 4-stegs wizard för emissionsanalys med AI |
| **Prospekt/IM Generator** | Genererar Prospekt eller IM som Word/PDF |
| **Kassaflöde** | Kassaflödesprognos och scenario-analys |
| **Teckning** | Emissionssida, MAR-PM, tecknings- och tilldelningsdokument |
| **Marknadsföring** | Email-kampanjer (Brevo), Google Ads, landningssida |
| **Analytics** | Dashboard per projekt — teckning, emissionssida, email, ads |
| **Aktiebok** | Aktieägarregister med opt-in-tracking och Brevo-synk |
| **Emissionsnyheter** | RSS-aggregerat nyhetsflöde med sök och kategorier |
| **Inställningar** | Företagsinformation (sparas i sessionStorage) |

---

## Teknikstack

**Frontend:** React 18 (Create React App), custom CSS med design tokens

**Backend:** Express.js, Node.js

**AI:** Anthropic Claude (`claude-haiku-4-5-20251001`) — emissionsanalys, prospektgenerering, email-utkast, bolagsresearch, finansiell dokumenttolkning

**Integrationer:**
- Yahoo Finance 2 — live börskurser för dilutionsberäkningar
- Brevo — email-kampanjer och kontakthantering
- Allabolag.se — bolagsuppslag via org.nr

**Dokumentexport:** Word (.docx), PDF, PowerPoint (.pptx)

**Deploy:** Render.com free tier, auto-deploy vid push till `main`

---

## Projektstruktur

```
frontend/
  src/
    App.js / App.css            — Routing, layout, globala design tokens
    auth/Login.js               — Inloggning
    utils/api.js                — Auth-token + fetch-helpers
    components/
      Dashboard.js              — Startsida med projektoversikt
      Kapitalrådgivaren.js      — 4-stegs emissionsanalys-wizard
      ProspektGenerator.js      — Prospekt/IM med AI-generering och export
      Kassaflode.js             — Kassaflöde, prognos, scenarion
      Teckning.js               — Emissionssida, MAR-PM, tilldelning
      Marknadsföring.js         — Email, Google Ads, landningssida
      Analytics.js              — Mätvärden per emissionsprojekt
      Aktiebok.js               — Aktieägarregister
      Emissionsnyheter.js       — Nyhetsflöde
      ProjektVy.js              — Projektstatus, protokoll, insynslogg
      Inställningar.js          — Företagsinställningar
      Sidebar.js                — Vänster navigation
backend/
  server.js                     — Express API (alla endpoints)
```

---

## Kapitalrådgivaren — steg för steg

1. **Ladda upp finansiella dokument** — PDF extraheras via Claude
2. **Finansiell data** — kvartalsdata, eget kapital, kassa, skulder
3. **Analysdata** — bransch, burn rate, runway, kapitalbehov, börskurs (Yahoo Finance)
4. **AI-analys** — Claude genererar emissionsrekommendation, typ, storlek, timing
   - Generera MAR-pressmeddelande
   - Generera styrelseprotokoll

---

## Backend API — översikt

**Auth**
- `POST /api/auth/login` — Demo-login
- `GET /api/health` — Keep-alive ping

**Emissionsprojekt**
- `GET/POST /api/emissionsprojekt`
- `GET/PUT /api/emissionsprojekt/:id`

**Kapitalrådgivaren**
- `POST /api/kapitalradgivaren/extract-financial-data-text`
- `POST /api/kapitalradgivaren/emissionsanalys`
- `POST /api/kapitalradgivaren/mar-pm`
- `POST /api/kapitalradgivaren/styrelseprotokoll`

**Bolag & börskurser**
- `POST /api/lookup-company` — org.nr → bolagsdata
- `POST /api/generate-company-research` — AI-driven bolagsresearch
- `GET /api/stock-data/:ticker` — live Yahoo Finance-data

**Prospekt/IM**
- `POST /api/qualify-document` — PROSPEKT eller IM?
- `POST /api/generate-{executive-summary,business-section,market-section,risk-factors,team-bios,offering-terms}`
- `POST /api/generate-docx` — Word-export
- `POST /api/generate-pdf` — PDF-export

**Marknadsföring**
- `POST /api/marketing/generate-landing-page`
- `POST /api/marketing/setup-email-campaign`
- `POST /api/marketing/generate-email-draft`
- `POST /api/marketing/send-brevo-campaign`
- `GET /api/marketing/brevo-campaigns`

**Kassaflöde**
- `GET/POST /api/kassaflode/manad`
- `POST /api/kassaflode/generate-prognos`
- `POST /api/kassaflode/scenarios`
- `POST /api/kassaflode/export-ppt`

**Nyheter**
- `GET /api/nyheter` — paginerat, kategoriserat
- `GET /api/nyheter/search`

---

## Deploy-process

```bash
# 1. Gör ändringar i frontend/src/
# 2. Bygg lokalt (CI=false är obligatoriskt)
cd frontend && CI=false npm run build

# 3. Commita och pusha
git add -f frontend/build [ändrade filer]
git commit -m "beskrivning"
git push origin main
# → Render deployer automatiskt inom 1–3 minuter
```

**Viktigt:** `CI=false` krävs — annars bryter ESLint-varningar bygget på Render.

---

## Lokal utveckling

```bash
# Terminal 1 — backend
cd backend && npm install && npm start
# → http://localhost:3001

# Terminal 2 — frontend
cd frontend && npm start
# → http://localhost:3000
```

Skapa `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
BREVO_API_KEY=...        # valfritt, för email-integration
PORT=3001
```

**Inloggning (demo):** `demo@kapital.se` / `Demo2026!`

---

## Kända begränsningar

- **In-memory auth** — tokens och projektdata nollställs vid server-restart (Render free tier sover)
- **In-memory databas** — emissionsprojekt återställs till demo-data vid restart
- Keep-alive ping skickas var 4:e minut för att motverka Render-sleep
- Render deployer från `github.com/fredrikfagerlund75/kapitalplattformen-demo` (inte kapitalplattformen-v5)
