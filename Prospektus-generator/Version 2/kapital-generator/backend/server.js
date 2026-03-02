require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const cors = require('cors');
const PDFDocument = require('pdfkit');

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('API Key configured:', !!process.env.ANTHROPIC_API_KEY);

// ═══════════════════════════════════════════════════════════════════════════
//  DOCUMENT TYPE QUALIFICATION
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/qualify-document', async (req, res) => {
  try {
    const { market, emissionSizeSEK, period12Months, audience } = req.body;
    
    // Convert SEK to EUR (approximate rate 11.5)
    const emissionSizeEUR = emissionSizeSEK / 11.5;
    const isOver8M = period12Months ? emissionSizeEUR >= 8000000 : false;
    
    let docType = 'IM';
    let reasoning = '';
    
    // Decision logic
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

// Demo companies for testing (can be extended or replaced with real API)
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
    
    // Clean the org number (remove dashes and spaces)
    const cleanOrgNr = orgNr.replace(/[-\s]/g, '');
    
    // Format org number for display
    const formattedOrgNr = cleanOrgNr.length === 10 
      ? `${cleanOrgNr.slice(0, 6)}-${cleanOrgNr.slice(6)}` 
      : orgNr;
    
    // Check demo companies first
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
    
    // Try Bolagsverket's open data via datacvr (backup)
    try {
      const response = await fetch(`https://cvrapi.dk/api?search=${cleanOrgNr}&country=se`, {
        headers: { 'User-Agent': 'CapBot/2.0' },
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
    
    // No data found - return helpful message
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
    const { company, business, team } = req.body;
    
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
    
    // Disclaimer
    doc.fontSize(10).font('Helvetica-Oblique')
      .text('Detta informationsmemorandum har inte granskats eller godkänts av Finansinspektionen. Informationen i dokumentet är baserad på uppgifter från bolaget och kan innehålla framåtriktade uttalanden som är föremål för osäkerhet.', 
        { align: 'center', width: 400, continued: false });
    
    doc.addPage();
    
    // Executive Summary
    doc.fontSize(18).font('Helvetica-Bold').text('EXECUTIVE SUMMARY');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(data.generated.executiveSummary, { align: 'justify' });
    doc.moveDown(2);
    
    // Emission details box
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
    if (data.financial.revenue) {
      doc.text(`Omsättning (${data.financial.year || 'senaste året'}): ${data.financial.revenue} TSEK`);
    }
    if (data.financial.result) {
      doc.text(`Resultat: ${data.financial.result} TSEK`);
    }
    if (data.financial.equity) {
      doc.text(`Eget kapital: ${data.financial.equity} TSEK`);
    }
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
//  SERVER START
// ═══════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log('API Key configured:', !!process.env.ANTHROPIC_API_KEY);
});
