# SNABBSTART - Kapitalplattformen v2.0

## 🚀 Kom igång på 5 minuter

### 1. Installera

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Konfigurera

Skapa `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
PORT=3001
```

### 3. Starta

**Terminal 1 (Backend):**
```bash
cd backend
npm start
```
✅ Backend: http://localhost:3001

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```
✅ Frontend: http://localhost:3000 (öppnas automatiskt)

---

## 📝 Demo-scenario: Komplett marknadsföringskampanj

### Steg 1: Logga in
- Email: `demo@företag.se`
- Lösenord: `valfritt`
- Klicka **Logga in**

→ Du hamnar på **Dashboard/Startsidan**

---

### Steg 2: Öppna Marknadsföringsmodulen

Du har två alternativ:

**Alternativ A: Från befintligt projekt**
1. Se "Senaste projekt"
2. Klicka **Visa kampanj** på "Företrädesemission H1 2025" (det slutförda projektet)

**Alternativ B: Från modulkort**
1. Klicka på modulkortet **📢 Marknadsföring**
2. (Du kommer till översikten även utan projekt)

---

### Steg 3: Skapa emissionssida

1. Du är nu i **Marknadsföringsmodulen**, tab "Översikt"
2. Scrolla ner till **🌐 Emissionssida (Landing Page)**
3. Klicka **Generera emissionssida**
4. Vänta 2-3 sekunder
5. ✅ Status ändras till "Aktiv" och en URL visas

**Resultat:**
- URL: `https://kapital.demo/demo-foretag-ab-emission`
- SEO Score: 87/100 (varierar lite)

---

### Steg 4: Konfigurera email-kampanj

1. Scrolla ner till **📧 Email-kampanj (3-stegs drip)**
2. Klicka **Konfigurera email-kampanj**
3. Vänta 3-5 sekunder (AI genererar ämnesrader)
4. ✅ Status ändras till "Schemalagd"

**Resultat:**
- Email 1 (Pre-launch): Schemalagd 3 dagar före
- Email 2 (Opening): Schemalagd dag 1
- Email 3 (Last Call): Schemalagd 2 dagar kvar

---

### Steg 5: Skapa Google Ads-kampanj

1. Scrolla ner till **🎯 Google Search Ads**
2. Justera budget om du vill (standard: 25 000 SEK)
3. Klicka **Skapa Google Ads-kampanj**
4. Vänta 3-5 sekunder (AI genererar keywords)
5. ✅ Status ändras till "Aktiv"

**Resultat:**
- Budget: 25 000 SEK
- Keywords: AI-genererade (5 st)
- Estimerad reach: ~250 000 impressions

---

### Steg 6: Simulera kampanjdata (Demo)

För att se hur statistiken ser ut när kampanjen kört ett tag:

1. Klicka **🎲 Simulera kampanjdata (Demo)**
2. Statistiken i toppen uppdateras:
   - Total Reach: ~48 000 personer
   - Email Opens: ~36%
   - Cost Per Lead: ~281 SEK
   - Conversions: ~89 teckningsavsikter

---

### Steg 7: Utforska andra tabs

**Tab: Emissionssida**
- Se preview av landningssidan i iframe
- (I production skulle detta vara en live iframe)

**Tab: Email**
- Se översikt av de tre email-mallarna
- Klicka "Förhandsgranska mall" (demo)

**Tab: Analys**
- Se kanalprestanda-tabell
- Jämför Email vs. Google Ads (reach, engagement, conversions, CPL)

---

## 💡 Testscenarier

### Scenario 1: Micro-emission (Spotlight)
**Bolag:** GreenTech Solutions AB  
**Emission:** 15 MSEK  
**Marknadsföringsbudget:** 30 TSEK  

**Förväntade resultat:**
- Landing page visits: 15 000 - 25 000
- Email sent: 2 500 - 3 500
- Google Ads impressions: 40 000 - 60 000
- Total conversions: 70-120 teckningsavsikter
- CPL: 250-430 SEK

---

### Scenario 2: Mid-size emission (First North)
**Bolag:** Nordic PropTech AB  
**Emission:** 75 MSEK  
**Marknadsföringsbudget:** 150 TSEK  

**Förväntade resultat:**
- Landing page visits: 60 000 - 100 000
- Email sent: 8 000 - 12 000
- Google Ads impressions: 200 000 - 300 000
- LinkedIn Ads impressions: 100 000 - 150 000 (Fas 2)
- Total conversions: 300-500 teckningsavsikter
- CPL: 300-500 SEK

---

## 🎯 Vad marknadsföringsmodulen GÖR (Fas 1)

✅ **Genererar SEO-optimerad emissionssida**
- Dynamiskt innehåll från IM/Prospekt
- Meta tags för Google indexering
- CTA-knappar till teckningsformulär
- Tracking pixels

✅ **Skapar 3-stegs email-kampanj**
- AI-genererade ämnesrader per bolag
- Schemaläggning baserat på emissionsdatum
- Segmentering (om investerardatabas finns)
- Open/click tracking

✅ **Lanserar Google Search Ads**
- AI-genererade keywords (bolag, bransch, "nya emissioner")
- Ad copy anpassad per målgrupp
- Konverteringsspårning (teckningsavsikt = conversion)
- Budget management

✅ **Mäter allt**
- Reach (total antal personer nådda)
- Engagement (opens, clicks, time on page)
- Conversions (teckningsavsikter)
- CPL (kostnad per lead)
- Kanal-jämförelse (Email vs. Google Ads)

---

## 🎨 Design-detaljer

### Färgkodning för status:
- **Gul bakgrund (pending):** `#fef5e7` — Ej startad
- **Blå bakgrund (scheduled):** `#e0e7ff` — Schemalagd
- **Grön bakgrund (active):** `#d4fc79` — Aktiv

### Component cards:
- **Vit bakgrund:** Inaktiv komponent
- **Grön bakgrund:** Aktiv komponent
- **Röd text:** Requirements saknas

### Stats cards:
- Ikoner för visuell identitet
- Stora siffror (2rem font-size)
- Liten label under

---

## 🔍 Vad händer i backend?

När du klickar på knapparna:

**Generera emissionssida:**
```javascript
POST /api/marketing/generate-landing-page
→ AI genererar HTML-template
→ Returnerar URL och SEO-score
```

**Konfigurera email-kampanj:**
```javascript
POST /api/marketing/setup-email-campaign
→ Claude Sonnet 4 genererar 3 ämnesrader
→ Returnerar campaign ID och schedule
```

**Skapa Google Ads:**
```javascript
POST /api/marketing/setup-google-ads
→ Claude Sonnet 4 genererar keywords
→ Returnerar campaign ID och estimated reach
```

**Simulera data:**
```javascript
// Frontend uppdaterar state lokalt med demo-data
// I production skulle detta komma från faktisk tracking
```

---

## 💰 Priskalkyl för kunden

### Traditionell marknadsföring:
- Annonsering i finansiell press: **80 TSEK**
- Banners på Avanza/Nordnet: **50 TSEK**
- Email-kampanj via marknadsföringsbyrå: **30 TSEK**
- Tryck och distribution: **25 TSEK**
- **Totalt: 185 TSEK**

### Med Kapitalplattformen:
- Landing page generation: **Inkluderat**
- Email-kampanj automation: **Inkluderat**
- Google Ads setup + 25 TSEK budget: **Inkluderat**
- **Totalt: 30 TSEK** (+ 25 TSEK Google Ads-spend)

**Besparing: ~130 TSEK (70%)**

Och viktigast: **Full mätbarhet** av var varje SEK går och vad den genererar i conversions.

---

## 🐛 Vanliga problem

**"Kräver att emissionssida är skapad först":**
→ Du måste klicka "Generera emissionssida" innan email/ads kan aktiveras

**Email-kampanjen tar lång tid att konfigurera:**
→ AI genererar ämnesrader, kan ta 5-10 sekunder första gången

**Statistiken visar nollor:**
→ Klicka på "🎲 Simulera kampanjdata" för att fylla i demo-data

**Backend svarar inte:**
→ Kontrollera att `npm start` körs i backend-mappen
→ Verifiera att port 3001 är ledig

---

## 📱 Navigering

**Från Dashboard till Marknadsföring:**
- Klicka modulkort "Marknadsföring" ELLER
- Klicka "Visa kampanj" på projekt

**Tillbaka till Dashboard:**
- Klicka "← Tillbaka till Dashboard" i nav bar

**Mellan tabs i Marknadsföring:**
- Klicka tabs: Översikt | Emissionssida | Email | Analys

---

## ✅ Success checklist

Efter att ha gått igenom snabbstarten ska du ha:

- [x] Loggat in och sett Dashboard
- [x] Öppnat Marknadsföringsmodulen
- [x] Genererat en emissionssida (URL visas)
- [x] Konfigurerat email-kampanj (3 emails schemalagda)
- [x] Skapat Google Ads-kampanj (keywords genererade)
- [x] Simulerat kampanjdata (stats fylls i)
- [x] Utforskat alla 4 tabs
- [x] Sett analys-tabellen med kanaljämförelse

**Total tid: 5 minuter** ⏱️

---

**Lycka till! 🚀**
