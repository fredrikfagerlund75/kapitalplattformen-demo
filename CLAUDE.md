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
  Teckning.js             — Teckningsmodul
  Marknadsföring.js       — Marknadsföringsmodul
  Aktiebok.js             — Aktiebok
  Analytics.js            — Analytics
  Inställningar.js        — Företagsinställningar
utils/api.js              — Auth-token hantering, apiGet/apiPost/apiPut helpers
```

## Vanliga fallgropar

- Sökvägen innehåller mellanslag (`Claude Agent`) — använd alltid citattecken runt sökvägar i shell
- `CI=true` (Renders default) gör att ESLint-varningar failar bygget — använd alltid `CI=false`
- In-memory auth: tokens försvinner vid server-restart på Render (free tier sleeps)
