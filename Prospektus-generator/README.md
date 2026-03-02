# Prospektus Generator - AI-Driven Bolagsbeskrivning

En MVP-prototype som demonstrerar hur AI kan automatisera skapandet av bolagsbeskrivningar för emissioner.

## 🎯 Funktionalitet

### Implementerat (Option A - MVP):
- ✅ Interaktiv wizard med 4 steg
- ✅ AI-generering av verksamhetsbeskrivning  
- ✅ AI-generering av finansiell översikt
- ✅ AI-generering av riskfaktorer
- ✅ PDF-export med professionell formatering
- ✅ Responsiv design med brand colors
- ✅ Real-time content generation

### Demo Features:
- Progress bar som visar framsteg
- Split-screen preview av AI-genererat innehåll
- Time savings calculation
- Professional PDF output

## 🚀 Snabbstart

### Förutsättningar
- Node.js 18+ installerat
- Anthropic API key (https://console.anthropic.com/)

### Installation

1. **Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Redigera .env och lägg till din ANTHROPIC_API_KEY
```

2. **Frontend:**
```bash
cd frontend
npm install
```

### Kör Applikationen

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# Körs på http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Körs på http://localhost:3000
```

**Öppna:** http://localhost:3000

## 📝 Demo Flow (5 minuter)

1. Landing Page → "Skapa Bolagsbeskrivning"
2. Steg 1: Fyll i företagsinfo
3. Steg 2: Beskriv produkt → AI genererar professionell text
4. Steg 3: Finansiell data → AI genererar översikt + riskfaktorer
5. Steg 4: Ladda ner PDF

## 🎯 För Investor Demo

**Key Talking Points:**
- "Från 4 veckor till 15 minuter"
- "€30k besparing per emission"
- "AI-genererat men kräver fortfarande human review"

**Demo Tips:**
- Ha exempeldata redo
- Visa AI-generering live (WOW-faktor)
- Öppna PDF och visa professionell formatering

## 💡 Teknisk Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- AI: Anthropic Claude Sonnet 4
- PDF: PDFKit

## 🎉 Done!

Fungerande prototype redo för investor demos! 🚀
