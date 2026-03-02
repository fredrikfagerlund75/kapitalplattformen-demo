require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('API Key configured:', !!process.env.ANTHROPIC_API_KEY);

// ═══════════════════════════════════════════════════════════════════════════
//  AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════

// In-memory token store (resets on server restart — fine for demo)
const validTokens = new Set();

// Login endpoint — validates against env vars
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const demoEmail = process.env.DEMO_EMAIL || 'demo@kapital.se';
  const demoPassword = process.env.DEMO_PASSWORD || 'Demo2026!';

  if (email === demoEmail && password === demoPassword) {
    const token = crypto.randomUUID();
    validTokens.add(token);
    console.log(`Login successful for ${email}. Active tokens: ${validTokens.size}`);
    return res.json({
      token,
      user: {
        email,
        company: 'Demo Företag AB',
        role: 'admin'
      }
    });
  }

  return res.status(401).json({ error: 'Felaktigt e-post eller lösenord' });
});

// Auth middleware — protects all /api/* routes except /api/auth/*
const requireAuth = (req, res, next) => {
  // Skip auth for login route
  if (req.path.startsWith('/api/auth/')) return next();
  // Skip auth for non-API routes (static files)
  if (!req.path.startsWith('/api/')) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Ingen giltig session. Logga in igen.' });
  }

  const token = authHeader.split(' ')[1];
  if (!validTokens.has(token)) {
    return res.status(401).json({ error: 'Session har gått ut. Logga in igen.' });
  }

  next();
};

app.use(requireAuth);

// ═══════════════════════════════════════════════════════════════════════════
//  DOCUMENT TYPE QUALIFICATION
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/qualify-document', async (req, res) => {
  try {
    const { market, emissionSizeSEK, period12Months, audience } = req.body;
    const emissionSizeEUR = emissionSizeSEK / 11.5;
    const isOver8M = period12Months ? emissionSizeEUR >= 8000000 : false;
    
    let docType = 'IM';
    let reasoning = '';
    
    if (market === 'nasdaq_stockholm' || market === 'first_north') {
      if (audience === 'public' && isOver8M) {
        docType = 'PROSPEKT';
        reasoning = 'Er emission är riktad till allmänheten och överstiger €8M-tröskeln. Ett FI-godkänt prospekt krävs enligt Prospektförordningen (EU) 2017/1129.';
      } else if (audience === 'public' && !isOver8M) {
        docType = 'IM';
        reasoning = 'Er emission är under €8M-tröskeln. Ett informationsmemorandum räcker juridiskt, men ni kan välja prospekt för ökad trovärdighet.';
      } else {
        docType = 'IM';
        reasoning = 'Er emission är riktad till kvalificerade investerare. Ett informationsmemorandum är tillräckligt och mer kostnadseffektivt än ett prospekt.';
      }
    } else if (market === 'spotlight' || market === 'nordic_sme') {
      if (audience === 'public' && isOver8M) {
        docType = 'PROSPEKT';
        reasoning = 'Även på tillväxtmarknader krävs prospekt för allmänna erbjudanden över €8M enligt Prospektförordningen.';
      } else {
        docType = 'IM';
        reasoning = 'För bolag på Spotlight/Nordic SME räcker vanligtvis ett informationsmemorandum för emissioner under €8M eller riktade emissioner.';
      }
    } else if (market === 'unlisted') {
      docType = 'IM';
      reasoning = 'Onoterade bolag har ingen prospektskyldighet, men ett strukturerat informationsmemorandum ökar trovärdigheten gentemot investerare.';
    }
    
    res.json({
      recommendedType: docType,
      reasoning,
      emissionSizeEUR: Math.round(emissionSizeEUR),
      requiresProspectus: docType === 'PROSPEKT'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  COMPANY LOOKUP (Swedish Company Data)
// ═══════════════════════════════════════════════════════════════════════════

const DEMO_COMPANIES = {
  '5568585373': { name: 'Spotify AB', industry: 'Information och kommunikation', location: 'Stockholm, Sverige' },
  '5569813599': { name: 'Klarna Bank AB', industry: 'Finansiell verksamhet', location: 'Stockholm, Sverige' },
  '5565475489': { name: 'IKEA AB', industry: 'Handel', location: 'Älmhult, Sverige' },
  '5567757226': { name: 'Volvo Cars AB', industry: 'Tillverkning av motorfordon', location: 'Göteborg, Sverige' },
  '5560125791': { name: 'H&M Hennes & Mauritz AB', industry: 'Handel; detaljhandel', location: 'Stockholm, Sverige' },
  '5562921017': { name: 'Ericsson AB', industry: 'Tillverkning av kommunikationsutrustning', location: 'Stockholm, Sverige' },
  '5561052216': { name: 'SEB AB', industry: 'Finansiella tjänster', location: 'Stockholm, Sverige' },
  '5560167650': { name: 'Atlas Copco AB', industry: 'Tillverkning av maskiner', location: 'Nacka, Sverige' },
  '5565791380': { name: 'Qbrick AB', industry: 'Informationsteknik', location: 'Stockholm, Sverige' },
};

app.post('/api/lookup-company', async (req, res) => {
  try {
    const { orgNr } = req.body;
    const cleanOrgNr = orgNr.replace(/[-\s]/g, '');
    const formattedOrgNr = cleanOrgNr.length === 10
      ? `${cleanOrgNr.slice(0, 6)}-${cleanOrgNr.slice(6)}`
      : orgNr;
    
    if (DEMO_COMPANIES[cleanOrgNr]) {
      const demo = DEMO_COMPANIES[cleanOrgNr];
      return res.json({
        found: true,
        source: 'demo',
        company: {
          name: demo.name,
          orgNr: formattedOrgNr,
          industry: demo.industry,
          location: demo.location,
          website: ''
        }
      });
    }
    
    try {
      const response = await fetch(`https://cvrapi.dk/api?search=${cleanOrgNr}&country=se`, {
        headers: { 'User-Agent': 'Kapitalplattformen/3.0' },
        timeout: 5000
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.name) {
          return res.json({
            found: true,
            source: 'cvrapi',
            company: {
              name: data.name,
              orgNr: formattedOrgNr,
              industry: data.industrydesc || '',
              location: data.city ? `${data.city}, Sverige` : '',
              website: ''
            }
          });
        }
      }
    } catch (apiError) {
      console.log('CVR API unavailable, using fallback');
    }
    
    res.status(404).json({
      error: `Kunde inte hitta bolagsuppgifter för ${formattedOrgNr}. Vänligen fyll i uppgifterna manuellt.`,
      found: false,
      suggestion: 'Du kan söka på allabolag.se för att hitta bolagsinformation.'
    });
  } catch (error) {
    console.error('Company lookup error:', error);
    res.status(500).json({
      error: 'Tjänsten är tillfälligt otillgänglig. Vänligen fyll i uppgifterna manuellt.',
      found: false
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  IM GENERATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/generate-executive-summary', async (req, res) => {
  try {
    const { company, business, market, emission } = req.body;
    const prompt = `Du är en expert på att skriva investeringsmemorandum för nordiska tillväxtbolag. 

Skriv en Executive Summary / Investment Thesis (max 400 ord) baserat på följande information:

BOLAG: ${company.name}
BRANSCH: ${company.industry}
VERKSAMHET: ${business.description}
MARKNAD: ${market.description}
EMISSION: ${emission.sizeSEK} SEK för ${emission.purpose}

Executive Summary ska innehålla:
1. Kort bolagsbeskrivning (2-3 meningar)
2. Investment thesis - varför är detta en attraktiv investering? (3-4 meningar)
3. Nyckeldata om emissionen (belopp, användning)
4. Strategisk kontext - varför kapitalanskaffning nu?

Skriv professionellt och övertygande. Fokusera på värdeskapande och tillväxtpotential.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ summary: message.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-business-section', async (req, res) => {
  try {
    const { company, business } = req.body;
    const prompt = `Du är en expert på att skriva investeringsmemorandum.

Skriv ett avsnitt "Verksamhet och Strategi" (max 600 ord) baserat på:

BOLAG: ${company.name}
BRANSCH: ${company.industry}
VERKSAMHETSBESKRIVNING: ${business.description}
PRODUKTER/TJÄNSTER: ${business.products || 'Information saknas'}
AFFÄRSMODELL: ${business.businessModel || 'Information saknas'}
STRATEGI: ${business.strategy || 'Information saknas'}

Strukturera texten i tre delar:
1. VAD VI GÖR - kärnverksamhet, produkter/tjänster
2. HUR VI TJÄNAR PENGAR - affärsmodell, intäktsströmmar
3. VAR VI ÄR PÅ VÄG - strategi, tillväxtplaner

Skriv professionellt men engagerande. Fokusera på konkreta detaljer och differentieringsfaktorer.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ business: message.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-market-section', async (req, res) => {
  try {
    const { market, company } = req.body;
    const prompt = `Du är en expert på att skriva marknadsanalyser för investeringsmemorandum.

Skriv ett avsnitt "Marknadsöversikt" (max 500 ord) baserat på:

BRANSCH: ${company.industry}
MARKNADSBESKRIVNING: ${market.description}
TAM/SAM: ${market.size || 'Information saknas'}
GEOGRAFISKA MARKNADER: ${market.geography || 'Information saknas'}
KONKURRENTER: ${market.competitors || 'Information saknas'}

Strukturera texten i tre delar:
1. MARKNADEN - storlek, tillväxt, drivkrafter
2. KONKURRENSSITUATION - huvudaktörer, vår positionering
3. MÖJLIGHET - varför marknaden är attraktiv nu

Var konkret med siffror om möjligt. Fokusera på tillväxtpotential och konkurrensfördelar.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ market: message.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-risk-factors', async (req, res) => {
  try {
    const { company, business, financial } = req.body;
    const prompt = `Du är en expert på riskanalys för investeringsmemorandum.

Generera 5-7 väsentliga riskfaktorer för detta bolag:

BOLAG: ${company.name}
BRANSCH: ${company.industry}
VERKSAMHET: ${business.description}
FINANSIELL STATUS: Omsättning ${financial.revenue || 'ej angiven'}, Resultat ${financial.result || 'ej angivet'}
NOTERAT: ${company.market}

Kategorier att täcka:
1. Verksamhetsrisker (2-3 risker)
2. Marknads- och konkurrensrisker (1-2 risker)
3. Finansiella risker (1-2 risker)
4. Emissionsrelaterade risker (1 risk)

För varje risk:
- Kort rubrik (5-8 ord)
- Beskrivning (2-3 meningar)
- Fokusera på materiella risker som är specifika för detta bolag/bransch

Format som en punktlista med rubrik följt av beskrivning.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ risks: message.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-team-bios', async (req, res) => {
  try {
    const { team } = req.body;
    const prompt = `Du är en expert på att skriva professionella biografier för investeringsmemorandum.

Skriv korta biografier (2-3 meningar per person) för följande personer:

${team.map(p => `
NAMN: ${p.name}
ROLL: ${p.role}
BAKGRUND: ${p.background || 'Information saknas'}
`).join('\n')}

För varje person:
- Börja med roll och bolag
- Nämn relevant tidigare erfarenhet (företag, befattningar)
- Om relevant: utbildning eller unika kompetenser
- Professionell men koncis ton

Format som en lista med rubrik (NAMN - Roll) följt av biografitext.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ bios: message.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-offering-terms', async (req, res) => {
  try {
    const { company, emission } = req.body;
    const prompt = `Du är en expert på att skriva teckningserbjudanden för informationsmemorandum.

Skriv ett avsnitt "Villkor för teckningserbjudandet" (max 400 ord) baserat på:

BOLAG: ${company.name}
ORGANISATIONSNUMMER: ${company.orgNr || 'Ej angivet'}
EMISSIONSBELOPP: ${emission.sizeSEK} SEK
TECKNINGSPERIOD: ${emission.subscriptionPeriod || 'Meddelas separat'}
MÅLGRUPP: ${emission.audience === 'public' ? 'Allmänheten' : emission.audience === 'qualified' ? 'Kvalificerade investerare' : 'Befintliga aktieägare och utvalda investerare'}
ANVÄNDNING AV KAPITALET: ${emission.purpose}

Strukturera texten enligt följande rubriker:
1. ERBJUDANDET I SAMMANDRAG - kort sammanfattning av emissionen (2-3 meningar)
2. TECKNINGSPERIOD - när teckning kan ske
3. TECKNING - hur teckning genomförs (anmälan, minsta teckningspost om relevant)
4. TILLDELNING - principer för tilldelning vid överteckning
5. BETALNING - betalningsvillkor och instruktioner
6. OFFENTLIGGÖRANDE - när utfallet meddelas

Skriv professionellt och tydligt. Använd standardformuleringar för svenska emissioner. Om specifik information saknas, använd typiska formuleringar som "meddelas separat" eller "enligt separat anvisning".`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ offeringTerms: message.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  PDF GENERATION
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/generate-pdf', async (req, res) => {
  try {
    const data = req.body;
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${data.company.name.replace(/\s+/g, '_')}_IM.pdf"`);
    
    doc.pipe(res);
    
    // Title page
    doc.fontSize(28).font('Helvetica-Bold').text('INFORMATIONSMEMORANDUM', { align: 'center' });
    doc.moveDown();
    doc.fontSize(24).text(data.company.name, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text(`${data.emission.sizeSEK.toLocaleString('sv-SE')} SEK`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).text(new Date().toLocaleDateString('sv-SE'), { align: 'center' });
    doc.moveDown(3);
    
    doc.fontSize(10).font('Helvetica-Oblique')
      .text('Detta informationsmemorandum har inte granskats eller godkänts av Finansinspektionen. Informationen i dokumentet är baserad på uppgifter från bolaget och kan innehålla framåtriktade uttalanden som är föremål för osäkerhet.',
        { align: 'center', width: 400, continued: false });
    
    doc.addPage();
    
    // Executive Summary
    doc.fontSize(18).font('Helvetica-Bold').text('EXECUTIVE SUMMARY');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(data.generated.executiveSummary, { align: 'justify' });
    doc.moveDown(2);
    
    doc.fontSize(14).font('Helvetica-Bold').text('EMISSIONSDETALJER');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Emissionsbelopp: ${data.emission.sizeSEK.toLocaleString('sv-SE')} SEK`);
    doc.text(`Användning: ${data.emission.purpose}`);
    doc.text(`Målgrupp: ${data.emission.audience === 'qualified' ? 'Kvalificerade investerare' : 'Allmänheten'}`);
    doc.text(`Teckningsperiod: ${data.emission.subscriptionPeriod || 'Ej fastställd'}`);
    
    doc.addPage();
    
    // Business section
    doc.fontSize(18).font('Helvetica-Bold').text('VERKSAMHET OCH STRATEGI');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(data.generated.businessSection, { align: 'justify' });
    
    doc.addPage();
    
    // Market section
    doc.fontSize(18).font('Helvetica-Bold').text('MARKNADSÖVERSIKT');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(data.generated.marketSection, { align: 'justify' });
    
    doc.addPage();
    
    // Financial information
    doc.fontSize(18).font('Helvetica-Bold').text('FINANSIELL INFORMATION');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    if (data.financial.revenue) doc.text(`Omsättning (${data.financial.year || 'senaste året'}): ${data.financial.revenue} TSEK`);
    if (data.financial.result) doc.text(`Resultat: ${data.financial.result} TSEK`);
    if (data.financial.equity) doc.text(`Eget kapital: ${data.financial.equity} TSEK`);
    doc.moveDown();
    doc.fontSize(10).font('Helvetica-Oblique')
      .text('Fullständig finansiell information finns i bolagets senaste årsredovisning.');
    
    doc.addPage();
    
    // Offering terms
    if (data.generated.offeringTerms) {
      doc.fontSize(18).font('Helvetica-Bold').text('VILLKOR FÖR TECKNINGSERBJUDANDET');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(data.generated.offeringTerms, { align: 'justify' });
      doc.addPage();
    }
    
    // Team
    doc.fontSize(18).font('Helvetica-Bold').text('LEDNING OCH STYRELSE');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(data.generated.teamBios, { align: 'justify' });
    
    doc.addPage();
    
    // Risk factors
    doc.fontSize(18).font('Helvetica-Bold').text('RISKFAKTORER');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(data.generated.riskFactors, { align: 'justify' });
    
    doc.addPage();
    
    // Legal disclaimers
    doc.fontSize(18).font('Helvetica-Bold').text('JURIDISK INFORMATION');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Bolag: ${data.company.name}`);
    doc.text(`Organisationsnummer: ${data.company.orgNr || 'Ej angivet'}`);
    doc.text(`Säte: ${data.company.location || 'Ej angivet'}`);
    doc.moveDown();
    doc.fontSize(10).font('Helvetica-Oblique')
      .text('Detta informationsmemorandum utgör inte ett erbjudande att förvärva värdepapper och är inte ett prospekt enligt Prospektförordningen (EU) 2017/1129. Investeringsbeslut bör fattas efter noggrann analys av bolaget och de risker som är förenade med investeringen.');
    
    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  MARKETING AUTOMATION ENDPOINTS (Fas 1 MVP)
// ═══════════════════════════════════════════════════════════════════════════

// Generate Redeye-style emission page
app.post('/api/marketing/generate-landing-page', async (req, res) => {
  try {
    const {
      companyName, orgNr, location, industry, website,
      emissionType, emissionSize, subscriptionPeriod, emissionPurpose,
      executiveSummary, businessSection, marketSection, offeringTerms, riskFactors,
      team, revenue, result: financialResult, equity,
      subscriptionPrice, numberOfShares, pricePerUnit
    } = req.body;

    const year = new Date().getFullYear();
    const url = `https://kapital.demo/${(companyName || 'bolag').toLowerCase().replace(/\s+/g, '-')}-emission`;

    // Extract CEO and chairman from team array
    const ceo = (team || []).find(t => (t.role || '').toLowerCase().includes('vd') || (t.role || '').toLowerCase().includes('ceo'));
    const chairman = (team || []).find(t => (t.role || '').toLowerCase().includes('ordf') || (t.role || '').toLowerCase().includes('chairman') || (t.role || '').toLowerCase().includes('styrelseordf'));

    // Helper: convert markdown-ish text to HTML paragraphs
    const toHtml = (text) => {
      if (!text) return '<p>Information saknas.</p>';
      return text.split('\n').filter(l => l.trim()).map(l => {
        if (l.trim().startsWith('•') || l.trim().startsWith('-') || l.trim().startsWith('*')) {
          return `<li>${l.replace(/^[\s•\-\*]+/, '')}</li>`;
        }
        return `<p>${l}</p>`;
      }).join('\n').replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
    };

    const landingPageHtml = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${companyName || 'Bolag'} - ${emissionType || 'Emission'} ${year}</title>
  <meta name="description" content="${companyName || 'Bolag'} genomför en ${emissionType || 'emission'} om ${emissionSize || 'N/A'}. Läs mer och anmäl teckningsintresse.">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Oxygen, sans-serif; background: #f5f6f8; color: #2d3748; line-height: 1.6; }
    
    /* Top Banner */
    .ep-banner { background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%); color: #fff; padding: 0; }
    .ep-banner-inner { max-width: 1200px; margin: 0 auto; padding: 2rem 2rem; display: flex; justify-content: space-between; align-items: center; }
    .ep-banner-left { display: flex; align-items: center; gap: 1.5rem; }
    .ep-logo-placeholder { width: 64px; height: 64px; background: rgba(255,255,255,0.15); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 700; color: #7ee8a8; }
    .ep-banner h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 0.25rem; }
    .ep-banner .ep-subtitle { color: #a0b4c5; font-size: 0.95rem; }
    .ep-status-badge { background: #48bb78; color: #fff; padding: 0.5rem 1.2rem; border-radius: 6px; font-weight: 600; font-size: 0.9rem; white-space: nowrap; }
    
    /* Navigation Tabs */
    .ep-nav { background: #1a2332; border-top: 1px solid rgba(255,255,255,0.1); }
    .ep-nav-inner { max-width: 1200px; margin: 0 auto; display: flex; gap: 0; }
    .ep-tab { padding: 1rem 1.5rem; color: #a0b4c5; cursor: pointer; font-size: 0.95rem; font-weight: 500; border-bottom: 3px solid transparent; transition: all 0.2s; text-decoration: none; }
    .ep-tab:hover { color: #fff; background: rgba(255,255,255,0.05); }
    .ep-tab.active { color: #fff; border-bottom-color: #48bb78; }
    
    /* Main Layout */
    .ep-layout { max-width: 1200px; margin: 2rem auto; display: grid; grid-template-columns: 1fr 340px; gap: 2rem; padding: 0 2rem; }
    
    /* Content Area */
    .ep-content { min-width: 0; }
    .ep-section { background: #fff; border-radius: 10px; padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .ep-section h2 { font-size: 1.4rem; color: #1a2332; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 2px solid #e2e8f0; }
    .ep-section h3 { font-size: 1.15rem; color: #2d3748; margin: 1.5rem 0 0.75rem; }
    .ep-section p { color: #4a5568; margin-bottom: 0.75rem; }
    .ep-section ul { color: #4a5568; margin: 0.5rem 0 1rem 1.5rem; }
    .ep-section li { margin-bottom: 0.4rem; }
    
    /* Summary Table */
    .ep-summary-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    .ep-summary-table td { padding: 0.65rem 1rem; border-bottom: 1px solid #edf2f7; }
    .ep-summary-table td:first-child { color: #718096; font-weight: 500; width: 45%; }
    .ep-summary-table td:last-child { color: #1a2332; font-weight: 600; }
    .ep-summary-table tr:last-child td { border-bottom: none; }
    
    /* Sidebar */
    .ep-sidebar { display: flex; flex-direction: column; gap: 1.5rem; }
    .ep-info-box { background: #fff; border-radius: 10px; padding: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .ep-info-box h3 { font-size: 1.1rem; color: #1a2332; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #48bb78; }
    .ep-info-row { display: flex; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid #edf2f7; }
    .ep-info-row:last-child { border-bottom: none; }
    .ep-info-label { color: #718096; font-size: 0.9rem; }
    .ep-info-value { color: #1a2332; font-weight: 600; font-size: 0.9rem; text-align: right; max-width: 55%; }
    
    .ep-cta-box { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); border-radius: 10px; padding: 1.5rem; color: #fff; text-align: center; }
    .ep-cta-box h3 { color: #fff; margin-bottom: 0.5rem; font-size: 1.1rem; border: none; padding: 0; }
    .ep-cta-box p { color: rgba(255,255,255,0.9); font-size: 0.9rem; margin-bottom: 1rem; }
    .ep-cta-btn { display: inline-block; background: #fff; color: #38a169; padding: 0.85rem 2rem; border-radius: 8px; font-weight: 700; font-size: 1rem; cursor: pointer; border: none; width: 100%; text-align: center; transition: transform 0.15s; }
    .ep-cta-btn:hover { transform: translateY(-1px); }
    
    .ep-doc-box { background: #fff; border-radius: 10px; padding: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .ep-doc-box h3 { font-size: 1.1rem; color: #1a2332; margin-bottom: 1rem; }
    .ep-doc-link { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: #f7fafc; border-radius: 8px; margin-bottom: 0.5rem; color: #2d3748; text-decoration: none; cursor: pointer; transition: background 0.2s; }
    .ep-doc-link:hover { background: #edf2f7; }
    .ep-doc-icon { font-size: 1.3rem; }
    .ep-doc-text { font-size: 0.9rem; font-weight: 500; }
    
    /* Team Cards */
    .ep-team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .ep-team-card { background: #f7fafc; border-radius: 8px; padding: 1.2rem; }
    .ep-team-card h4 { color: #1a2332; margin-bottom: 0.25rem; }
    .ep-team-card .ep-role { color: #667eea; font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; }
    .ep-team-card p { color: #718096; font-size: 0.9rem; }
    
    /* Disclaimer */
    .ep-disclaimer { max-width: 1200px; margin: 0 auto 2rem; padding: 0 2rem; }
    .ep-disclaimer-inner { background: #fff3cd; border-radius: 10px; padding: 1.5rem; border-left: 4px solid #ffc107; }
    .ep-disclaimer-inner h4 { color: #856404; margin-bottom: 0.5rem; }
    .ep-disclaimer-inner p { color: #6c5b10; font-size: 0.85rem; line-height: 1.5; }
    
    /* Tab content visibility */
    .ep-tab-content { display: none; }
    .ep-tab-content.active { display: block; }
    
    /* Responsive */
    @media (max-width: 900px) {
      .ep-layout { grid-template-columns: 1fr; }
      .ep-banner-inner { flex-direction: column; text-align: center; gap: 1rem; }
      .ep-banner-left { flex-direction: column; }
      .ep-nav-inner { overflow-x: auto; }
    }

    /* Footer */
    .ep-footer { background: #1a2332; color: #a0b4c5; text-align: center; padding: 1.5rem; font-size: 0.85rem; margin-top: 2rem; }
    .ep-footer a { color: #48bb78; text-decoration: none; }
  </style>
</head>
<body>

  <!-- Top Banner -->
  <div class="ep-banner">
    <div class="ep-banner-inner">
      <div class="ep-banner-left">
        <div class="ep-logo-placeholder">${(companyName || 'B')[0]}</div>
        <div>
          <h1>${companyName || 'Bolag AB'}</h1>
          <div class="ep-subtitle">${industry || 'Bransch'} · ${location || 'Sverige'}</div>
        </div>
      </div>
      <div class="ep-status-badge">● Pågående emission</div>
    </div>
  </div>

  <!-- Navigation Tabs -->
  <div class="ep-nav">
    <div class="ep-nav-inner">
      <a class="ep-tab active" onclick="switchTab('transaction')" id="tab-transaction">Om transaktionen</a>
      <a class="ep-tab" onclick="switchTab('company')" id="tab-company">Om bolaget</a>
      <a class="ep-tab" onclick="switchTab('risks')" id="tab-risks">Risker</a>
    </div>
  </div>

  <!-- Main Layout -->
  <div class="ep-layout">

    <!-- Content Column -->
    <div class="ep-content">

      <!-- TAB: Om transaktionen -->
      <div class="ep-tab-content active" id="content-transaction">
        <div class="ep-section">
          <h2>Bakgrund och motiv</h2>
          ${toHtml(emissionPurpose || executiveSummary || 'Information om bakgrund och motiv publiceras inom kort.')}
        </div>

        <div class="ep-section">
          <h2>Sammanfattning av ${emissionType || 'Emission'}</h2>
          <table class="ep-summary-table">
            <tr><td>Emissionstyp</td><td>${emissionType || 'Företrädesemission'}</td></tr>
            <tr><td>Emissionsbelopp</td><td>${emissionSize || 'Ej fastställt'}</td></tr>
            <tr><td>Teckningskurs</td><td>${subscriptionPrice || pricePerUnit || 'Ej fastställt'}</td></tr>
            <tr><td>Antal nya aktier</td><td>${numberOfShares || 'Ej fastställt'}</td></tr>
            <tr><td>Teckningsperiod</td><td>${subscriptionPeriod || 'Ej fastställt'}</td></tr>
            <tr><td>Marknadsplats</td><td>${location || 'Sverige'}</td></tr>
          </table>
        </div>

        ${executiveSummary ? `
        <div class="ep-section">
          <h2>Sammanfattning (Executive Summary)</h2>
          ${toHtml(executiveSummary)}
        </div>` : ''}

        ${offeringTerms ? `
        <div class="ep-section">
          <h2>Erbjudandets villkor</h2>
          ${toHtml(offeringTerms)}
        </div>` : ''}
      </div>

      <!-- TAB: Om bolaget -->
      <div class="ep-tab-content" id="content-company">
        ${businessSection ? `
        <div class="ep-section">
          <h2>Verksamhetsbeskrivning</h2>
          ${toHtml(businessSection)}
        </div>` : ''}

        ${marketSection ? `
        <div class="ep-section">
          <h2>Marknad</h2>
          ${toHtml(marketSection)}
        </div>` : ''}

        <div class="ep-section">
          <h2>Finansiell översikt</h2>
          <table class="ep-summary-table">
            <tr><td>Omsättning</td><td>${revenue ? revenue + ' SEK' : 'Ej angivet'}</td></tr>
            <tr><td>Resultat</td><td>${financialResult ? financialResult + ' SEK' : 'Ej angivet'}</td></tr>
            <tr><td>Eget kapital</td><td>${equity ? equity + ' SEK' : 'Ej angivet'}</td></tr>
          </table>
        </div>

        ${(team && team.length > 0) ? `
        <div class="ep-section">
          <h2>Styrelse och ledning</h2>
          <div class="ep-team-grid">
            ${team.filter(t => t.name).map(t => `
            <div class="ep-team-card">
              <h4>${t.name}</h4>
              <div class="ep-role">${t.role || 'Ledningsgrupp'}</div>
              <p>${t.background || ''}</p>
            </div>`).join('')}
          </div>
        </div>` : ''}
      </div>

      <!-- TAB: Risker -->
      <div class="ep-tab-content" id="content-risks">
        <div class="ep-section">
          <h2>Riskfaktorer</h2>
          ${toHtml(riskFactors || 'Riskfaktorer publiceras inom kort. Investeringar i aktier är alltid förenade med risk. Historisk avkastning är ingen garanti för framtida avkastning.')}
        </div>
      </div>

    </div>

    <!-- Sidebar -->
    <div class="ep-sidebar">

      <div class="ep-cta-box">
        <h3>Teckna aktier</h3>
        <p>Anmäl ditt intresse för att delta i emissionen</p>
        <button class="ep-cta-btn" onclick="alert('Demo: Teckningsfunktion ej aktiv.')">Anmäl teckningsintresse →</button>
      </div>

      <div class="ep-info-box">
        <h3>Information</h3>
        <div class="ep-info-row"><span class="ep-info-label">Emittent</span><span class="ep-info-value">${companyName || 'Bolag AB'}</span></div>
        <div class="ep-info-row"><span class="ep-info-label">Org.nummer</span><span class="ep-info-value">${orgNr || 'Ej angivet'}</span></div>
        ${ceo ? `<div class="ep-info-row"><span class="ep-info-label">VD</span><span class="ep-info-value">${ceo.name}</span></div>` : ''}
        ${chairman ? `<div class="ep-info-row"><span class="ep-info-label">Styrelseordförande</span><span class="ep-info-value">${chairman.name}</span></div>` : ''}
        <div class="ep-info-row"><span class="ep-info-label">Teckningsperiod</span><span class="ep-info-value">${subscriptionPeriod || 'Ej fastställt'}</span></div>
        <div class="ep-info-row"><span class="ep-info-label">Emissionsbelopp</span><span class="ep-info-value">${emissionSize || 'Ej fastställt'}</span></div>
        <div class="ep-info-row"><span class="ep-info-label">Teckningskurs</span><span class="ep-info-value">${subscriptionPrice || pricePerUnit || 'Ej fastställt'}</span></div>
        ${website ? `<div class="ep-info-row"><span class="ep-info-label">Hemsida</span><span class="ep-info-value"><a href="${website}" style="color:#667eea">${website}</a></span></div>` : ''}
      </div>

      <div class="ep-doc-box">
        <h3>Dokument</h3>
        <a class="ep-doc-link" onclick="alert('Demo: PDF-nedladdning ej aktiv.')">
          <span class="ep-doc-icon">📄</span>
          <span class="ep-doc-text">Informationsmemorandum (PDF)</span>
        </a>
        <a class="ep-doc-link" onclick="alert('Demo: PDF-nedladdning ej aktiv.')">
          <span class="ep-doc-icon">📊</span>
          <span class="ep-doc-text">Bolagsbeskrivning</span>
        </a>
        <a class="ep-doc-link" onclick="alert('Demo: PDF-nedladdning ej aktiv.')">
          <span class="ep-doc-icon">⚖️</span>
          <span class="ep-doc-text">Anmälningssedel</span>
        </a>
      </div>

    </div>
  </div>

  <!-- Disclaimer -->
  <div class="ep-disclaimer">
    <div class="ep-disclaimer-inner">
      <h4>⚠️ Viktig information</h4>
      <p>
        Detta material utgör inte ett erbjudande i den mening som avses i lagen (1991:980) om handel med finansiella instrument 
        eller ett erbjudande om förvärv av värdepapper enligt Europaparlamentets och rådets förordning (EU) 2017/1129 
        ("Prospektförordningen"). Informationen på denna sida utgör marknadsföringsmaterial och har inte granskats av 
        Finansinspektionen. Investerare bör noga läsa det fullständiga informationsmemorandumet innan ett investeringsbeslut fattas. 
        En investering i aktier är alltid förenad med risk. Historisk avkastning är ingen garanti för framtida avkastning. 
        De medel som investeras kan både öka och minska i värde och det är inte säkert att en investerare får tillbaka hela 
        eller delar av det investerade kapitalet.
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div class="ep-footer">
    <p>Genererad av <a href="#">Kapitalplattformen</a> · ${companyName || 'Bolag AB'} © ${year}</p>
  </div>

  <script>
    function switchTab(tab) {
      document.querySelectorAll('.ep-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.ep-tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');
      document.getElementById('content-' + tab).classList.add('active');
    }
  </script>
</body>
</html>`;

    res.json({
      url,
      seoScore: Math.floor(Math.random() * 10) + 90,
      status: 'published',
      landingPageHtml
    });
  } catch (error) {
    console.error('Landing page generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Setup email campaign
app.post('/api/marketing/setup-email-campaign', async (req, res) => {
  try {
    const { projectId, companyName } = req.body;
    
    // In production, this would:
    // 1. Create email templates in Mailchimp/HubSpot
    // 2. Schedule drip sequence based on emission dates
    // 3. Setup tracking pixels
    // 4. Return campaign ID
    
    const prompt = `Du är expert på email-marketing för kapitalanskaffningar.

Skapa tre korta email-ämnesrader för en emission från ${companyName}:

1. Pre-launch email (3 dagar före): ska skapa anticipation
2. Opening email (dag 1): ska kommunicera att emissionen öppnat
3. Last call email (2 dagar kvar): ska skapa urgency

Svara med endast tre ämnesrader, en per rad.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const subjectLines = message.content[0].text.split('\n').filter(line => line.trim());
    
    res.json({
      campaignId: `camp_${Date.now()}`,
      status: 'scheduled',
      emails: [
        {
          type: 'pre-launch',
          subject: subjectLines[0] || `${companyName} - Emission öppnar snart`,
          scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          type: 'opening',
          subject: subjectLines[1] || `${companyName} - Emissionen är öppen!`,
          scheduledDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          type: 'last-call',
          subject: subjectLines[2] || `${companyName} - Sista chansen att teckna`,
          scheduledDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    });
  } catch (error) {
    console.error('Email campaign setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Setup Google Ads campaign
app.post('/api/marketing/setup-google-ads', async (req, res) => {
  try {
    const { projectId, companyName, budget } = req.body;
    
    // In production, this would:
    // 1. Create Google Ads campaign via API
    // 2. Setup keyword targeting
    // 3. Create ad copy variations
    // 4. Setup conversion tracking
    // 5. Return campaign ID and preview URL
    
    const prompt = `Du är expert på Google Ads för finansiella tjänster.

För ${companyName} som genomför en emission:

Generera 5 relevanta keywords för Google Search Ads (både exakta och breda).
Svara med endast keywords, en per rad.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const keywords = message.content[0].text.split('\n').filter(line => line.trim()).slice(0, 5);
    
    res.json({
      campaignId: `gads_${Date.now()}`,
      status: 'active',
      budget,
      keywords,
      estimatedReach: Math.floor((budget / 10) * 100), // Rough estimate: 10 SEK CPM
      dashboardUrl: 'https://ads.google.com/demo'
    });
  } catch (error) {
    console.error('Google Ads setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get campaign analytics (demo endpoint)
app.get('/api/marketing/analytics/:projectId', async (req, res) => {
  try {
    // Demo analytics data
    res.json({
      landingPage: {
        visits: Math.floor(Math.random() * 5000) + 10000,
        uniqueVisitors: Math.floor(Math.random() * 3000) + 7000,
        bounceRate: (Math.random() * 20 + 30).toFixed(1) + '%',
        avgTimeOnPage: Math.floor(Math.random() * 120 + 60) + 's'
      },
      emailCampaign: {
        sent: Math.floor(Math.random() * 1000) + 2000,
        opens: Math.floor(Math.random() * 500) + 800,
        clicks: Math.floor(Math.random() * 200) + 200
      },
      googleAds: {
        impressions: Math.floor(Math.random() * 20000) + 30000,
        clicks: Math.floor(Math.random() * 800) + 1000,
        conversions: Math.floor(Math.random() * 50) + 70,
        cpl: Math.floor(Math.random() * 200) + 200
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  PRODUCTION: SERVE REACT BUILD
// ═══════════════════════════════════════════════════════════════════════════

if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', 'frontend', 'build');
  app.use(express.static(buildPath));
  
  // Catch-all: serve React app for any non-API route
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(buildPath, 'index.html'));
    }
  });
  console.log('Production mode: serving React build from', buildPath);
}

// ═══════════════════════════════════════════════════════════════════════════
//  SERVER START
// ═══════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log('API Key configured:', !!process.env.ANTHROPIC_API_KEY);
  console.log('Demo login configured:', !!process.env.DEMO_EMAIL);
  console.log('\n📍 Available endpoints:');
  console.log('  POST /api/auth/login');
  console.log('  POST /api/qualify-document');
  console.log('  POST /api/lookup-company');
  console.log('  POST /api/generate-executive-summary');
  console.log('  POST /api/generate-business-section');
  console.log('  POST /api/generate-market-section');
  console.log('  POST /api/generate-risk-factors');
  console.log('  POST /api/generate-team-bios');
  console.log('  POST /api/generate-offering-terms');
  console.log('  POST /api/generate-pdf');
  console.log('  POST /api/marketing/generate-landing-page');
  console.log('  POST /api/marketing/setup-email-campaign');
  console.log('  POST /api/marketing/setup-google-ads');
  console.log('  GET  /api/marketing/analytics/:projectId');
});
