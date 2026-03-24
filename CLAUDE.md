# Kapitalplattformen — Instruktioner för Claude

## Projektstruktur

```
frontend/   — React 18 (CRA), källkod i frontend/src/
backend/    — Express.js API + statisk serving av frontend/build/
```

## Deploy-process (ALLTID följa denna ordning)

1. Gör källkodsändringar i `frontend/src/`
2. Bygg lokalt: `cd frontend && CI=false npm run build`
3. Commita build + källkod: `git add -f frontend/build [ändrade src-filer]`
4. `git commit -m "beskrivning"`
5. `git push origin main`
6. Render deployer automatiskt inom 1–3 minuter

**CI=false är obligatoriskt** — ESLint-varningar ska inte stoppa bygget.

## Kritisk info om Render

- **Repo:** `github.com/fredrikfagerlund75/kapitalplattformen-demo` (INTE kapitalplattformen-v5)
- **buildCommand:** `cd backend && npm install` — frontend byggs LOKALT och committas till git
- **startCommand:** `cd backend && node server.js`
- Frontend/build är med i git avsiktligt — Render bygger inte React själv

## Viktig regel: commita direkt

Om en förändring fungerar i dev — commita och pusha OMEDELBART.
Lämna aldrig viktig kod uncommittad. Har hänt att ej committad kod gått förlorad.

## Preview innan deploy

Starta lokal dev-server för granskning innan push:
```
cd frontend && npm start
```
Öppna http://localhost:3000. Granska, godkänn, bygg och pusha.

## Teknikstack

- **Frontend:** React 18, CRA, CSS-variabler (design tokens i App.css)
- **Backend:** Express.js, in-memory auth (validTokens rensas vid server-restart)
- **AI:** Anthropic Claude API (claude-sonnet-4-6)
- **Deploy:** Render.com free tier, auto-deploy på push till main
- **CDN:** Cloudflare framför Render — hard refresh (Cmd+Shift+R) vid cacheproblem

## Filstruktur frontend/src

```
App.js / App.css          — Layout, routing, global styles + design tokens
auth/Login.js             — Inloggning
components/
  Dashboard.js/css        — Startsida med 3 dashboard-tiles
  Sidebar.js/css          — Vänster navigation
  Kapitalrådgivaren.js/css — 4-stegs wizard för emissionsanalys
  Kassaflode.js/css       — Kassaflödesmodul
  Emissionsnyheter.js/css — Nyhetsflöde
  ProspektGenerator.js    — Generera prospekt/IM via AI
  PitchDeckEditor/
    PitchDeckEditor.js    — Pitch deck editor: preview (4 slide-typer) + AI-chatt
    PitchDeckEditor.css   — Styling. Slide renderas internt 420px, skalas med ResizeObserver+transform
  Teckning.js             — Teckningsmodul
  Marknadsföring.js       — Marknadsföringsmodul
  Aktiebok.js             — Aktiebok
  Analytics.js            — Analytics
  Inställningar.js        — Företagsinställningar (inkl. varumärkesprofil med logo/hero-bilder)
utils/api.js              — Auth-token hantering, apiGet/apiPost/apiPut helpers
```

## Filstruktur backend/

```
server.js                 — Express-app, statisk serving, auth-middleware
db.js                     — PostgreSQL-anslutning (pg)
news-aggregator.js        — Nyhetsaggregering
routes/
  companies.js            — CRUD för bolag + varumärkesprofil
  pitch_deck.js           — Pitch deck: generate, chat (PUT), export (.pptx), delete
utils/
  brandProfile.js         — getBrandProfile(), validateBrandProfile(), buildBrandContext()
                            DEFAULTS innehåller hero_images:[], logo_url:'', logo_dark_url:''
  pitchDeckExport.js      — pptxgenjs-export, LAYOUT_16x9 (10"×5.625"), addLogo() med try/catch
  prompts.js              — AI-prompt-builders för pitch deck
```

## Pitch deck — viktiga detaljer

- **Slide-typer:** `cover`, `bullets`, `twocol`, `metrics`
- **Preview-skalning:** Sliden renderas alltid internt på 420px (matchar pptxgenjs-layout).
  ResizeObserver mäter canvas-bredden → `transform: scale(s)` appliceras (max 1.5×).
  Använd INTE `zoom` — det ändrar layout-footprint och ger klippning.
- **Hero-bilder:** Hämtas från `brand_profile.hero_images[]` i DB. Demobolag måste ha bilder
  inlagda via Inställningar → "Fyll i exempeldata" → Spara.
- **Export:** pptxgenjs med `LAYOUT_16x9`. Fungerar — ändra inte layout-konstanten.

## Vanliga fallgropar

- Sökvägen innehåller mellanslag (`Claude Agent`) — använd alltid citattecken runt sökvägar i shell
- `CI=true` (Renders default) gör att ESLint-varningar failar bygget — använd alltid `CI=false`
- In-memory auth: tokens försvinner vid server-restart på Render (free tier sleeps)
- Cloudflare cachar `index.html` aggressivt — `Cache-Control: no-store` är satt i server.js.
  Användare behöver Cmd+Shift+R vid cacheproblem efter deploy.
- `aspect-ratio` på `.pd-slide` + `height: 100%` från `.pd-slide-content` krockar.
  Lösning: `height: 'auto'` som inline style på twocol/bullets/metrics i SlidePreview.
