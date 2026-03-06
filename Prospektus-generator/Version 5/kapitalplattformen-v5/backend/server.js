require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const path = require('path');
const crypto = require('crypto');
const Brevo = require('@getbrevo/brevo');

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Brevo API clients (old-style SDK)
let brevoContacts = null;
let brevoEmailCampaigns = null;
let brevoConfigured = false;

if (process.env.BREVO_API_KEY) {
  brevoContacts = new Brevo.ContactsApi();
  brevoContacts.setApiKey(Brevo.ContactsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
  brevoEmailCampaigns = new Brevo.EmailCampaignsApi();
  brevoEmailCampaigns.setApiKey(Brevo.EmailCampaignsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
  brevoConfigured = true;
  console.log('Brevo API configured: true');
} else {
  console.log('Brevo API configured: false (BREVO_API_KEY not set)');
}

console.log('API Key configured:', !!process.env.ANTHROPIC_API_KEY);

// ========================================================================
//  AUTHENTICATION
// ========================================================================

const validTokens = new Set();

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
      user: { email, company: 'Demo F\u00f6retag AB', role: 'admin' }
    });
  }

  return res.status(401).json({ error: 'Felaktigt e-post eller l\u00f6senord' });
});

const requireAuth = (req, res, next) => {
  if (req.path.startsWith('/api/auth/')) return next();
  if (!req.path.startsWith('/api/')) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Ingen giltig session. Logga in igen.' });
  }

  const token = authHeader.split(' ')[1];
  if (!validTokens.has(token)) {
    return res.status(401).json({ error: 'Session har g\u00e5tt ut. Logga in igen.' });
  }

  next();
};

app.use(requireAuth);

// ========================================================================
//  IN-MEMORY DATABASE
// ========================================================================

let emissionsprojekt = [
  {
    id: "EP-2025-001",
    name: "F\u00f6retr\u00e4desemission Q2 2025",
    status: "completed",
    currentModule: "analytics",
    createdAt: "2025-02-15T10:00:00Z",
    companyName: "Demo F\u00f6retag AB",
    emissionsvillkor: {
      typ: "F\u00f6retr\u00e4desemission",
      teckningskurs: 2.50,
      antalNyaAktier: 6000000,
      emissionsvolym: 15000000,
      teckningsr\u00e4tter: "1:5"
    },
    tidsplan: [
      { datum: "2025-02-20", milestone: "Styrelsebeslut", completed: true },
      { datum: "2025-03-01", milestone: "Prospekt klart", completed: true },
      { datum: "2025-03-10", milestone: "Emission \u00f6ppnar", completed: true },
      { datum: "2025-03-24", milestone: "Emission st\u00e4nger", completed: true },
      { datum: "2025-03-28", milestone: "Tilldelning", completed: true }
    ],
    prospekt: {
      type: "IM",
      fileUrl: "/files/IM_EP-2025-001.pdf",
      generatedAt: "2025-02-28T14:00:00Z",
      generatedContent: {}
    },
    teckning: {
      emissionssidaUrl: "https://kapital.demo/emission-ep-2025-001",
      teckningsperiod: { start: "2025-03-10", slut: "2025-03-24" },
      tilldelningsforslag: { fileUrl: "/files/tilldelning_EP-2025-001.pdf" },
      registreradBolagsverket: true
    },
    marknadsf\u00f6ring: {
      emailCampaignId: "brevo_12345",
      googleAdsCampaignId: "gads_67890",
      fysiskaBrev: { sent: 120, planned: 120 }
    },
    analytics: {
      teckning: { total: 14250000, percent: 95.0, antalTecknare: 847 },
      emissionssida: { visits: 4521, uniqueVisitors: 2876 },
      email: { sent: 450, opens: 312, clicks: 127 },
      ads: { impressions: 65000, clicks: 1240, conversions: 89 }
    }
  }
];

// ========================================================================
//  EMISSIONSPROJEKT CRUD
// ========================================================================

app.get('/api/emissionsprojekt', (req, res) => {
  res.json(emissionsprojekt);
});

app.get('/api/emissionsprojekt/:id', (req, res) => {
  const projekt = emissionsprojekt.find(p => p.id === req.params.id);
  if (!projekt) return res.status(404).json({ error: 'Project not found' });
  res.json(projekt);
});

app.post('/api/emissionsprojekt', (req, res) => {
  const newProjekt = {
    id: `EP-${new Date().getFullYear()}-${String(emissionsprojekt.length + 1).padStart(3, '0')}`,
    name: req.body.name,
    status: 'draft',
    currentModule: 'kapitalr\u00e5dgivaren',
    createdAt: new Date().toISOString(),
    companyName: req.body.companyName || 'Demo F\u00f6retag AB',
    emissionsvillkor: req.body.emissionsvillkor,
    tidsplan: req.body.tidsplan || [],
    prospekt: { generatedContent: {} },
    teckning: {},
    marknadsf\u00f6ring: {},
    analytics: {
      teckning: { total: 0, percent: 0, antalTecknare: 0 },
      emissionssida: { visits: 0, uniqueVisitors: 0 },
      email: { sent: 0, opens: 0, clicks: 0 },
      ads: { impressions: 0, clicks: 0, conversions: 0 }
    }
  };
  emissionsprojekt.push(newProjekt);
  res.status(201).json(newProjekt);
});

app.put('/api/emissionsprojekt/:id', (req, res) => {
  const index = emissionsprojekt.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Project not found' });
  emissionsprojekt[index] = { ...emissionsprojekt[index], ...req.body };
  res.json(emissionsprojekt[index]);
});

// ========================================================================
//  DOCUMENT TYPE QUALIFICATION
// ========================================================================

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
        reasoning = 'Er emission \u00e4r riktad till allm\u00e4nheten och \u00f6verstiger \u20ac8M-tr\u00f6skeln. Ett FI-godk\u00e4nt prospekt kr\u00e4vs.';
      } else if (audience === 'public' && !isOver8M) {
        docType = 'IM';
        reasoning = 'Er emission \u00e4r under \u20ac8M-tr\u00f6skeln. Ett informationsmemorandum r\u00e4cker.';
      } else {
        docType = 'IM';
        reasoning = 'Er emission \u00e4r riktad till kvalificerade investerare.';
      }
    } else if (market === 'spotlight' || market === 'nordic_sme') {
      if (audience === 'public' && isOver8M) {
        docType = 'PROSPEKT';
        reasoning = '\u00c4ven p\u00e5 tillv\u00e4xtmarknader kr\u00e4vs prospekt f\u00f6r allm\u00e4nna erbjudanden \u00f6ver \u20ac8M.';
      } else {
        docType = 'IM';
        reasoning = 'F\u00f6r bolag p\u00e5 Spotlight/Nordic SME r\u00e4cker vanligtvis ett IM.';
      }
    } else if (market === 'unlisted') {
      docType = 'IM';
      reasoning = 'Onoterade bolag har ingen prospektskyldighet.';
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

// ========================================================================
//  COMPANY LOOKUP
// ========================================================================

const DEMO_COMPANIES = {
  '5568585373': { name: 'Spotify AB', industry: 'Information och kommunikation', location: 'Stockholm, Sverige' },
  '5569813599': { name: 'Klarna Bank AB', industry: 'Finansiell verksamhet', location: 'Stockholm, Sverige' },
  '5565475489': { name: 'IKEA AB', industry: 'Handel', location: '\u00c4lmhult, Sverige' },
  '5567757226': { name: 'Volvo Cars AB', industry: 'Tillverkning av motorfordon', location: 'G\u00f6teborg, Sverige' },
  '5560125791': { name: 'H&M Hennes & Mauritz AB', industry: 'Handel; detaljhandel', location: 'Stockholm, Sverige' },
  '5562921017': { name: 'Ericsson AB', industry: 'Tillverkning av kommunikationsutrustning', location: 'Stockholm, Sverige' },
  '5561052216': { name: 'SEB AB', industry: 'Finansiella tj\u00e4nster', location: 'Stockholm, Sverige' },
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
        company: { name: demo.name, orgNr: formattedOrgNr, industry: demo.industry, location: demo.location, website: '' }
      });
    }

    try {
      const response = await fetch(`https://cvrapi.dk/api?search=${cleanOrgNr}&country=se`, {
        headers: { 'User-Agent': 'Kapitalplattformen/5.0' },
        timeout: 5000
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.name) {
          return res.json({
            found: true,
            source: 'cvrapi',
            company: { name: data.name, orgNr: formattedOrgNr, industry: data.industrydesc || '', location: data.city ? `${data.city}, Sverige` : '', website: '' }
          });
        }
      }
    } catch (apiError) {
      console.log('CVR API unavailable, using fallback');
    }

    res.status(404).json({
      error: `Kunde inte hitta bolagsuppgifter f\u00f6r ${formattedOrgNr}.`,
      found: false
    });
  } catch (error) {
    console.error('Company lookup error:', error);
    res.status(500).json({ error: 'Tj\u00e4nsten \u00e4r tillf\u00e4lligt otillg\u00e4nglig.', found: false });
  }
});

// ========================================================================
//  COMPANY RESEARCH (AI)
// ========================================================================

app.post('/api/generate-company-research', async (req, res) => {
  try {
    const { companyName, orgNr, website, researchType } = req.body;
    if (!companyName) return res.status(400).json({ error: 'companyName kr\u00e4vs' });

    const prompts = {
      bolagsinfo: `Du \u00e4r en expert p\u00e5 svenska bolag. S\u00f6k information om bolaget "${companyName}"${orgNr ? ` (org.nr ${orgNr})` : ''}${website ? ` (${website})` : ''}.
Returnera exakt detta JSON-format:
{"verksamhetsbeskrivning":"2-3 meningar om vad bolaget g\u00f6r","bransch":"Branschkategori","adress":"Gatuadress om k\u00e4nt, annars tom str\u00e4ng","ort":"Stad, Sverige"}
Svara BARA med JSON, inget annat.`,

      strategi_marknad: `Du \u00e4r en marknadsanalytiker. Analysera bolaget "${companyName}"${orgNr ? ` (org.nr ${orgNr})` : ''}${website ? ` (${website})` : ''}.
Returnera exakt detta JSON-format:
{"affarsmodell":"2-3 meningar om hur bolaget tj\u00e4nar pengar","marknadsbeskrivning":"2-3 meningar om marknaden bolaget verkar p\u00e5","konkurrenter":"2-3 konkurrenter separerade med komma"}
Svara BARA med JSON, inget annat.`,

      finansiellt: `Du \u00e4r en finansanalytiker. S\u00f6k senast tillg\u00e4ngliga finansiell information om "${companyName}"${orgNr ? ` (org.nr ${orgNr})` : ''}.
Returnera exakt detta JSON-format:
{"omsattning":"Oms\u00e4ttning i TSEK (bara siffra, eller tom str\u00e4ng om ok\u00e4nt)","resultat":"Resultat i TSEK (bara siffra, eller tom str\u00e4ng om ok\u00e4nt)","egetKapital":"Eget kapital i TSEK (bara siffra, eller tom str\u00e4ng om ok\u00e4nt)","ar":"R\u00e4kenskaps\u00e5r (t.ex. 2024)","kalla":"K\u00e4lla f\u00f6r informationen"}
OBS: Om du inte har tillf\u00f6rlitlig data, l\u00e4mna f\u00e4ltet tomt. B\u00e4ttre att l\u00e4mna tomt \u00e4n att gissa.
Svara BARA med JSON, inget annat.`,

      ledning: `Du \u00e4r en expert p\u00e5 svenska bolag. S\u00f6k information om ledningsgrupp och styrelse f\u00f6r "${companyName}"${orgNr ? ` (org.nr ${orgNr})` : ''}${website ? ` (${website})` : ''}.
Returnera exakt detta JSON-format:
{"team":[{"namn":"F\u00f6rnamn Efternamn","roll":"VD/CFO/Styrelseordf\u00f6rande etc","bakgrund":"1-2 meningar om personens bakgrund"}]}
Inkludera VD, ev. CFO/CTO, och styrelseordf\u00f6rande som minimum. Max 6 personer.
Svara BARA med JSON, inget annat.`
    };

    const prompt = prompts[researchType];
    if (!prompt) return res.status(400).json({ error: `Ogiltig researchType: ${researchType}` });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Kunde inte tolka AI-svaret');
    const result = JSON.parse(jsonMatch[0]);
    res.json({ success: true, researchType, data: result });
  } catch (error) {
    console.error('Company research error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================
//  KAPITALR\u00c5DGIVAREN
// ========================================================================

app.post('/api/kapitalradgivaren/emissionsanalys', async (req, res) => {
  try {
    const { companyData, kapitalbehov, tidhorisont } = req.body;

    const prompt = `Du \u00e4r expert p\u00e5 kapitalanskaffning f\u00f6r nordiska tillv\u00e4xtbolag.

BOLAGSDATA:
Namn: ${companyData.name}
Bransch: ${companyData.industry}
Nuvarande kapital: ${companyData.currentCapital} SEK
Burn rate: ${companyData.burnRate} SEK/m\u00e5nad
Runway: ${companyData.runway} m\u00e5nader

KAPITALBEHOV:
Behov: ${kapitalbehov} SEK
Tidshorisont: ${tidhorisont}
Syfte: ${companyData.purpose}

Skapa en emissionsanalys (max 500 ord) som inneh\u00e5ller:
1. SITUATIONSBESKRIVNING (2-3 meningar)
2. REKOMMENDERAD EMISSIONSSTRUKTUR
   - Typ av emission
   - Rekommenderad emissionsvolym
   - F\u00f6rslag p\u00e5 teckningskurs
   - Teckningsr\u00e4tter (om f\u00f6retr\u00e4desemission)
3. TIDSPLAN med datum
4. RISKER OCH \u00d6VERV\u00c4GANDEN (3-4 punkter)

Skriv professionellt och konkret.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ analys: message.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/kapitalradgivaren/mar-pm', async (req, res) => {
  try {
    const { type, projektData } = req.body;

    let prompt = '';
    if (type === 'beslut') {
      prompt = `Skapa ett MAR-compliant pressmeddelande (max 300 ord) f\u00f6r styrelsebeslut om emission.
BOLAG: ${projektData.companyName}
EMISSION: ${projektData.emissionsvillkor.typ}
VOLYM: ${projektData.emissionsvillkor.emissionsvolym} SEK
TECKNINGSKURS: ${projektData.emissionsvillkor.teckningskurs} SEK
TECKNINGSPERIOD: ${projektData.teckning?.teckningsperiod?.start} - ${projektData.teckning?.teckningsperiod?.slut}
Struktur: 1. Rubrik 2. Ingress 3. Villkor 4. Syfte 5. Kontakt
VIKTIGT: F\u00f6lj MAR. Inkludera disclaimer. UTKAST.`;
    } else if (type === 'prospekt') {
      prompt = `Skapa ett MAR-compliant pressmeddelande (max 300 ord) f\u00f6r offentligg\u00f6rande av prospekt/IM.
BOLAG: ${projektData.companyName}
EMISSION: ${projektData.emissionsvillkor.typ}
VOLYM: ${projektData.emissionsvillkor.emissionsvolym} SEK
Inkludera disclaimer. UTKAST f\u00f6r juridisk granskning.`;
    } else if (type === 'utfall') {
      prompt = `Skapa ett MAR-compliant pressmeddelande (max 300 ord) f\u00f6r emissionsutfall.
BOLAG: ${projektData.companyName}
EMISSION: ${projektData.emissionsvillkor.typ}
Inkludera teckningsresultat och disclaimer. UTKAST.`;
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ pressmeddelande: message.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/kapitalradgivaren/styrelseprotokoll', async (req, res) => {
  try {
    const { type, projektData } = req.body;

    const prompt = `Skapa ett formellt styrelseprotokoll f\u00f6r ${type === 'emissionsbeslut' ? 'emissionsbeslut' : 'tilldelningsbeslut'}.
BOLAG: ${projektData.companyName}
DATUM: ${new Date().toLocaleDateString('sv-SE')}

${type === 'emissionsbeslut' ?
`EMISSION:
- Typ: ${projektData.emissionsvillkor.typ}
- Volym: ${projektData.emissionsvillkor.emissionsvolym} SEK
- Teckningskurs: ${projektData.emissionsvillkor.teckningskurs} SEK
- Antal nya aktier: ${projektData.emissionsvillkor.antalNyaAktier}` :
`TILLDELNING:
- Totalt tecknat: [fr\u00e5n tilldelningsf\u00f6rslag]
- Antal tecknare: [fr\u00e5n tilldelningsf\u00f6rslag]`}

Komplett protokoll enligt ABL med paragrafer. Professionell ton.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ protokoll: message.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================
//  IM GENERATION ENDPOINTS
// ========================================================================

app.post('/api/generate-executive-summary', async (req, res) => {
  try {
    const { company, business, market, emission } = req.body;
    const prompt = `Du \u00e4r expert p\u00e5 investeringsmemorandum f\u00f6r nordiska tillv\u00e4xtbolag.

Skriv en Executive Summary (max 400 ord):
BOLAG: ${company.name}
BRANSCH: ${company.industry}
VERKSAMHET: ${business.description}
MARKNAD: ${market.description}
EMISSION: ${emission.sizeSEK} SEK f\u00f6r ${emission.purpose}

Inneh\u00e5ll: 1. Bolagsbeskrivning 2. Investment thesis 3. Nyckeldata 4. Strategisk kontext
Professionellt och \u00f6vertygande.`;

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
    const prompt = `Du \u00e4r expert p\u00e5 investeringsmemorandum.

Skriv "Verksamhet och Strategi" (max 600 ord):
BOLAG: ${company.name}
BRANSCH: ${company.industry}
VERKSAMHET: ${business.description}
PRODUKTER: ${business.products || 'Information saknas'}
AFF\u00c4RSMODELL: ${business.businessModel || 'Information saknas'}
STRATEGI: ${business.strategy || 'Information saknas'}

Struktur: 1. VAD VI G\u00d6R 2. HUR VI TJ\u00c4NAR PENGAR 3. VAR VI \u00c4R P\u00c5 V\u00c4G`;

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
    const prompt = `Du \u00e4r expert p\u00e5 marknadsanalyser f\u00f6r investeringsmemorandum.

Skriv "Marknads\u00f6versikt" (max 500 ord):
BRANSCH: ${company.industry}
MARKNAD: ${market.description}
TAM/SAM: ${market.size || 'Information saknas'}
GEOGRAFI: ${market.geography || 'Information saknas'}
KONKURRENTER: ${market.competitors || 'Information saknas'}

Struktur: 1. MARKNADEN 2. KONKURRENSSITUATION 3. M\u00d6JLIGHET`;

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
    const prompt = `Du \u00e4r expert p\u00e5 riskanalys f\u00f6r investeringsmemorandum.

Generera 5-7 riskfaktorer:
BOLAG: ${company.name}
BRANSCH: ${company.industry}
VERKSAMHET: ${business.description}
FINANSIELL STATUS: Oms\u00e4ttning ${financial.revenue || 'ej angiven'}, Resultat ${financial.result || 'ej angivet'}

Kategorier: Verksamhetsrisker (2-3), Marknadsrisker (1-2), Finansiella (1-2), Emissionsrisker (1).
Per risk: Rubrik + 2-3 meningar.`;

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
    const teamStr = team.map(p => `NAMN: ${p.name || p.namn}\nROLL: ${p.role || p.roll}\nBAKGRUND: ${p.background || p.bakgrund || 'Info saknas'}`).join('\n\n');
    const prompt = `Skriv korta biografier (2-3 meningar per person) f\u00f6r investeringsmemorandum:\n\n${teamStr}\n\nPer person: Roll + erfarenhet. Professionell ton.`;

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
    const prompt = `Skriv "Villkor f\u00f6r teckningserbjudandet" (max 400 ord):
BOLAG: ${company.name}
ORG.NR: ${company.orgNr || 'Ej angivet'}
BELOPP: ${emission.sizeSEK} SEK
PERIOD: ${emission.subscriptionPeriod || 'Meddelas separat'}
M\u00c5LGRUPP: ${emission.audience === 'public' ? 'Allm\u00e4nheten' : emission.audience === 'qualified' ? 'Kvalificerade investerare' : 'Befintliga aktie\u00e4gare'}
SYFTE: ${emission.purpose}

Struktur: 1. SAMMANDRAG 2. TECKNINGSPERIOD 3. TECKNING 4. TILLDELNING 5. BETALNING 6. OFFENTLIGG\u00d6RANDE`;

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

// ========================================================================
//  PDF GENERATION
// ========================================================================

app.post('/api/generate-pdf', async (req, res) => {
  try {
    const data = req.body;
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${(data.company.name || 'Bolag').replace(/\s+/g, '_')}_IM.pdf"`);
    doc.pipe(res);

    // Title page
    doc.fontSize(28).font('Helvetica-Bold').text('INFORMATIONSMEMORANDUM', { align: 'center' });
    doc.moveDown();
    doc.fontSize(24).text(data.company.name, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text(`${(data.emission.sizeSEK || 0).toLocaleString('sv-SE')} SEK`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).text(new Date().toLocaleDateString('sv-SE'), { align: 'center' });
    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica-Oblique')
      .text('Detta informationsmemorandum har inte granskats eller godk\u00e4nts av Finansinspektionen.', { align: 'center', width: 400 });
    doc.addPage();

    if (data.generated && data.generated.executiveSummary) {
      doc.fontSize(18).font('Helvetica-Bold').text('EXECUTIVE SUMMARY');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(data.generated.executiveSummary, { align: 'justify' });
      doc.moveDown(2);
    }

    doc.fontSize(14).font('Helvetica-Bold').text('EMISSIONSDETALJER');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Emissionsbelopp: ${(data.emission.sizeSEK || 0).toLocaleString('sv-SE')} SEK`);
    doc.text(`Anv\u00e4ndning: ${data.emission.purpose || 'Ej angivet'}`);
    doc.addPage();

    if (data.generated && data.generated.business) {
      doc.fontSize(18).font('Helvetica-Bold').text('VERKSAMHET OCH STRATEGI');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(data.generated.business, { align: 'justify' });
      doc.addPage();
    }

    if (data.generated && data.generated.market) {
      doc.fontSize(18).font('Helvetica-Bold').text('MARKNADS\u00d6VERSIKT');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(data.generated.market, { align: 'justify' });
      doc.addPage();
    }

    doc.fontSize(18).font('Helvetica-Bold').text('FINANSIELL INFORMATION');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    if (data.financial) {
      if (data.financial.revenue) doc.text(`Oms\u00e4ttning: ${data.financial.revenue} TSEK`);
      if (data.financial.result) doc.text(`Resultat: ${data.financial.result} TSEK`);
      if (data.financial.equity) doc.text(`Eget kapital: ${data.financial.equity} TSEK`);
    }
    doc.addPage();

    if (data.generated && data.generated.offeringTerms) {
      doc.fontSize(18).font('Helvetica-Bold').text('VILLKOR F\u00d6R TECKNINGSERBJUDANDET');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(data.generated.offeringTerms, { align: 'justify' });
      doc.addPage();
    }

    if (data.generated && data.generated.team) {
      doc.fontSize(18).font('Helvetica-Bold').text('LEDNING OCH STYRELSE');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(data.generated.team, { align: 'justify' });
      doc.addPage();
    }

    if (data.generated && data.generated.risks) {
      doc.fontSize(18).font('Helvetica-Bold').text('RISKFAKTORER');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(data.generated.risks, { align: 'justify' });
      doc.addPage();
    }

    doc.fontSize(18).font('Helvetica-Bold').text('JURIDISK INFORMATION');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Bolag: ${data.company.name}`);
    doc.text(`Organisationsnummer: ${data.company.orgNr || 'Ej angivet'}`);
    doc.moveDown();
    doc.fontSize(10).font('Helvetica-Oblique')
      .text('Detta informationsmemorandum utg\u00f6r inte ett erbjudande att f\u00f6rv\u00e4rva v\u00e4rdepapper.');
    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================
//  MARKETING AUTOMATION
// ========================================================================

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
    const ceo = (team || []).find(t => (t.role || t.roll || '').toLowerCase().includes('vd') || (t.role || t.roll || '').toLowerCase().includes('ceo'));
    const chairman = (team || []).find(t => (t.role || t.roll || '').toLowerCase().includes('ordf') || (t.role || t.roll || '').toLowerCase().includes('chairman'));

    const toHtml = (text) => {
      if (!text) return '<p>Information saknas.</p>';
      return text.split('\n').filter(l => l.trim()).map(l => {
        if (l.trim().startsWith('\u2022') || l.trim().startsWith('-') || l.trim().startsWith('*')) {
          return `<li>${l.replace(/^[\s\u2022\-\*]+/, '')}</li>`;
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
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,sans-serif;background:#f5f6f8;color:#2d3748;line-height:1.6}
    .ep-banner{background:linear-gradient(135deg,#1a2332 0%,#2d3e50 100%);color:#fff}
    .ep-banner-inner{max-width:1200px;margin:0 auto;padding:2rem;display:flex;justify-content:space-between;align-items:center}
    .ep-banner-left{display:flex;align-items:center;gap:1.5rem}
    .ep-logo-placeholder{width:64px;height:64px;background:rgba(255,255,255,.15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.8rem;font-weight:700;color:#7ee8a8}
    .ep-banner h1{font-size:1.6rem;font-weight:700;margin-bottom:.25rem}
    .ep-banner .ep-subtitle{color:#a0b4c5;font-size:.95rem}
    .ep-status-badge{background:#48bb78;color:#fff;padding:.5rem 1.2rem;border-radius:6px;font-weight:600;font-size:.9rem}
    .ep-nav{background:#1a2332;border-top:1px solid rgba(255,255,255,.1)}
    .ep-nav-inner{max-width:1200px;margin:0 auto;display:flex}
    .ep-tab{padding:1rem 1.5rem;color:#a0b4c5;cursor:pointer;font-size:.95rem;font-weight:500;border-bottom:3px solid transparent;transition:all .2s;text-decoration:none}
    .ep-tab:hover{color:#fff;background:rgba(255,255,255,.05)}
    .ep-tab.active{color:#fff;border-bottom-color:#48bb78}
    .ep-layout{max-width:1200px;margin:2rem auto;display:grid;grid-template-columns:1fr 340px;gap:2rem;padding:0 2rem}
    .ep-content{min-width:0}
    .ep-section{background:#fff;border-radius:10px;padding:2rem;margin-bottom:1.5rem;box-shadow:0 1px 4px rgba(0,0,0,.06)}
    .ep-section h2{font-size:1.4rem;color:#1a2332;margin-bottom:1rem;padding-bottom:.75rem;border-bottom:2px solid #e2e8f0}
    .ep-section p{color:#4a5568;margin-bottom:.75rem}
    .ep-section ul{color:#4a5568;margin:.5rem 0 1rem 1.5rem}
    .ep-section li{margin-bottom:.4rem}
    .ep-summary-table{width:100%;border-collapse:collapse;margin:1rem 0}
    .ep-summary-table td{padding:.65rem 1rem;border-bottom:1px solid #edf2f7}
    .ep-summary-table td:first-child{color:#718096;font-weight:500;width:45%}
    .ep-summary-table td:last-child{color:#1a2332;font-weight:600}
    .ep-sidebar{display:flex;flex-direction:column;gap:1.5rem}
    .ep-info-box{background:#fff;border-radius:10px;padding:1.5rem;box-shadow:0 1px 4px rgba(0,0,0,.06)}
    .ep-info-box h3{font-size:1.1rem;color:#1a2332;margin-bottom:1rem;padding-bottom:.5rem;border-bottom:2px solid #48bb78}
    .ep-info-row{display:flex;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid #edf2f7}
    .ep-info-row:last-child{border-bottom:none}
    .ep-info-label{color:#718096;font-size:.9rem}
    .ep-info-value{color:#1a2332;font-weight:600;font-size:.9rem;text-align:right;max-width:55%}
    .ep-cta-box{background:linear-gradient(135deg,#48bb78 0%,#38a169 100%);border-radius:10px;padding:1.5rem;color:#fff;text-align:center}
    .ep-cta-box h3{color:#fff;margin-bottom:.5rem;font-size:1.1rem;border:none;padding:0}
    .ep-cta-box p{color:rgba(255,255,255,.9);font-size:.9rem;margin-bottom:1rem}
    .ep-cta-btn{display:inline-block;background:#fff;color:#38a169;padding:.85rem 2rem;border-radius:8px;font-weight:700;font-size:1rem;cursor:pointer;border:none;width:100%}
    .ep-doc-box{background:#fff;border-radius:10px;padding:1.5rem;box-shadow:0 1px 4px rgba(0,0,0,.06)}
    .ep-doc-box h3{font-size:1.1rem;color:#1a2332;margin-bottom:1rem}
    .ep-doc-link{display:flex;align-items:center;gap:.75rem;padding:.75rem;background:#f7fafc;border-radius:8px;margin-bottom:.5rem;color:#2d3748;text-decoration:none;cursor:pointer}
    .ep-doc-link:hover{background:#edf2f7}
    .ep-team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:1rem;margin-top:1rem}
    .ep-team-card{background:#f7fafc;border-radius:8px;padding:1.2rem}
    .ep-team-card h4{color:#1a2332;margin-bottom:.25rem}
    .ep-team-card .ep-role{color:#667eea;font-size:.9rem;font-weight:600;margin-bottom:.5rem}
    .ep-team-card p{color:#718096;font-size:.9rem}
    .ep-disclaimer{max-width:1200px;margin:0 auto 2rem;padding:0 2rem}
    .ep-disclaimer-inner{background:#fff3cd;border-radius:10px;padding:1.5rem;border-left:4px solid #ffc107}
    .ep-disclaimer-inner h4{color:#856404;margin-bottom:.5rem}
    .ep-disclaimer-inner p{color:#6c5b10;font-size:.85rem;line-height:1.5}
    .ep-tab-content{display:none}
    .ep-tab-content.active{display:block}
    .ep-footer{background:#1a2332;color:#a0b4c5;text-align:center;padding:1.5rem;font-size:.85rem;margin-top:2rem}
    .ep-footer a{color:#48bb78;text-decoration:none}
    @media(max-width:900px){.ep-layout{grid-template-columns:1fr}.ep-banner-inner{flex-direction:column;text-align:center;gap:1rem}.ep-banner-left{flex-direction:column}}
  </style>
</head>
<body>
  <div class="ep-banner"><div class="ep-banner-inner"><div class="ep-banner-left"><div class="ep-logo-placeholder">${(companyName || 'B')[0]}</div><div><h1>${companyName || 'Bolag AB'}</h1><div class="ep-subtitle">${industry || 'Bransch'} &middot; ${location || 'Sverige'}</div></div></div><div class="ep-status-badge">&#9679; P\u00e5g\u00e5ende emission</div></div></div>
  <div class="ep-nav"><div class="ep-nav-inner"><a class="ep-tab active" onclick="switchTab('transaction')" id="tab-transaction">Om transaktionen</a><a class="ep-tab" onclick="switchTab('company')" id="tab-company">Om bolaget</a><a class="ep-tab" onclick="switchTab('risks')" id="tab-risks">Risker</a></div></div>
  <div class="ep-layout"><div class="ep-content">
    <div class="ep-tab-content active" id="content-transaction">
      <div class="ep-section"><h2>Bakgrund och motiv</h2>${toHtml(emissionPurpose || executiveSummary || 'Information publiceras inom kort.')}</div>
      <div class="ep-section"><h2>Sammanfattning</h2><table class="ep-summary-table"><tr><td>Emissionstyp</td><td>${emissionType || 'F\u00f6retr\u00e4desemission'}</td></tr><tr><td>Emissionsbelopp</td><td>${emissionSize || 'Ej fastst\u00e4llt'}</td></tr><tr><td>Teckningskurs</td><td>${subscriptionPrice || pricePerUnit || 'Ej fastst\u00e4llt'}</td></tr><tr><td>Antal nya aktier</td><td>${numberOfShares || 'Ej fastst\u00e4llt'}</td></tr><tr><td>Teckningsperiod</td><td>${subscriptionPeriod || 'Ej fastst\u00e4llt'}</td></tr></table></div>
      ${executiveSummary ? '<div class="ep-section"><h2>Executive Summary</h2>' + toHtml(executiveSummary) + '</div>' : ''}
      ${offeringTerms ? '<div class="ep-section"><h2>Villkor</h2>' + toHtml(offeringTerms) + '</div>' : ''}
    </div>
    <div class="ep-tab-content" id="content-company">
      ${businessSection ? '<div class="ep-section"><h2>Verksamhetsbeskrivning</h2>' + toHtml(businessSection) + '</div>' : ''}
      ${marketSection ? '<div class="ep-section"><h2>Marknad</h2>' + toHtml(marketSection) + '</div>' : ''}
      <div class="ep-section"><h2>Finansiell \u00f6versikt</h2><table class="ep-summary-table"><tr><td>Oms\u00e4ttning</td><td>${revenue ? revenue + ' SEK' : 'Ej angivet'}</td></tr><tr><td>Resultat</td><td>${financialResult ? financialResult + ' SEK' : 'Ej angivet'}</td></tr><tr><td>Eget kapital</td><td>${equity ? equity + ' SEK' : 'Ej angivet'}</td></tr></table></div>
      ${(team && team.length > 0) ? '<div class="ep-section"><h2>Styrelse och ledning</h2><div class="ep-team-grid">' + team.filter(t => t.name || t.namn).map(t => '<div class="ep-team-card"><h4>' + (t.name || t.namn) + '</h4><div class="ep-role">' + (t.role || t.roll || 'Ledningsgrupp') + '</div><p>' + (t.background || t.bakgrund || '') + '</p></div>').join('') + '</div></div>' : ''}
    </div>
    <div class="ep-tab-content" id="content-risks"><div class="ep-section"><h2>Riskfaktorer</h2>${toHtml(riskFactors || 'Riskfaktorer publiceras inom kort.')}</div></div>
  </div>
  <div class="ep-sidebar">
    <div class="ep-cta-box"><h3>Teckna aktier</h3><p>Anm\u00e4l ditt intresse</p><button class="ep-cta-btn" onclick="alert('Demo: Teckningsfunktion ej aktiv.')">Anm\u00e4l intresse &rarr;</button></div>
    <div class="ep-info-box"><h3>Information</h3><div class="ep-info-row"><span class="ep-info-label">Emittent</span><span class="ep-info-value">${companyName || 'Bolag AB'}</span></div><div class="ep-info-row"><span class="ep-info-label">Org.nr</span><span class="ep-info-value">${orgNr || 'Ej angivet'}</span></div>${ceo ? '<div class="ep-info-row"><span class="ep-info-label">VD</span><span class="ep-info-value">' + (ceo.name || ceo.namn) + '</span></div>' : ''}${chairman ? '<div class="ep-info-row"><span class="ep-info-label">Ordf\u00f6rande</span><span class="ep-info-value">' + (chairman.name || chairman.namn) + '</span></div>' : ''}<div class="ep-info-row"><span class="ep-info-label">Belopp</span><span class="ep-info-value">${emissionSize || 'Ej fastst\u00e4llt'}</span></div></div>
    <div class="ep-doc-box"><h3>Dokument</h3><a class="ep-doc-link" onclick="alert('Demo')"><span>&#128196;</span><span>IM (PDF)</span></a><a class="ep-doc-link" onclick="alert('Demo')"><span>&#128200;</span><span>Bolagsbeskrivning</span></a></div>
  </div></div>
  <div class="ep-disclaimer"><div class="ep-disclaimer-inner"><h4>&#9888;&#65039; Viktig information</h4><p>Detta material utg\u00f6r inte ett erbjudande i den mening som avses i lagen (1991:980) om handel med finansiella instrument.</p></div></div>
  <div class="ep-footer"><p>Genererad av <a href="#">Kapitalplattformen</a> &middot; ${companyName || 'Bolag AB'} &copy; ${year}</p></div>
  <script>function switchTab(tab){document.querySelectorAll('.ep-tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.ep-tab-content').forEach(c=>c.classList.remove('active'));document.getElementById('tab-'+tab).classList.add('active');document.getElementById('content-'+tab).classList.add('active');}</script>
</body>
</html>`;

    res.json({ url, seoScore: Math.floor(Math.random() * 10) + 90, status: 'published', landingPageHtml });
  } catch (error) {
    console.error('Landing page error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketing/setup-email-campaign', async (req, res) => {
  try {
    const { projectId, companyName } = req.body;
    const prompt = `Du \u00e4r expert p\u00e5 email-marketing f\u00f6r kapitalanskaffningar.
Skapa tre korta email-\u00e4mnesrader f\u00f6r en emission fr\u00e5n ${companyName}:
1. Pre-launch (3 dagar f\u00f6re)
2. Opening (dag 1)
3. Last call (2 dagar kvar)
Svara med endast tre \u00e4mnesrader, en per rad.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });
    const subjectLines = message.content[0].text.split('\n').filter(l => l.trim());
    res.json({
      campaignId: `camp_${Date.now()}`,
      status: 'scheduled',
      emails: [
        { type: 'pre-launch', subject: subjectLines[0] || `${companyName} - Emission \u00f6ppnar snart`, scheduledDate: new Date(Date.now() + 3*24*60*60*1000).toISOString() },
        { type: 'opening', subject: subjectLines[1] || `${companyName} - Emissionen \u00e4r \u00f6ppen!`, scheduledDate: new Date(Date.now() + 6*24*60*60*1000).toISOString() },
        { type: 'last-call', subject: subjectLines[2] || `${companyName} - Sista chansen`, scheduledDate: new Date(Date.now() + 12*24*60*60*1000).toISOString() }
      ]
    });
  } catch (error) {
    console.error('Email campaign error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketing/setup-google-ads', async (req, res) => {
  try {
    const { projectId, companyName, budget } = req.body;
    const prompt = `Du \u00e4r expert p\u00e5 Google Ads f\u00f6r finansiella tj\u00e4nster.
F\u00f6r ${companyName} som genomf\u00f6r en emission:
Generera 5 relevanta keywords. Svara med keywords, en per rad.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });
    const keywords = message.content[0].text.split('\n').filter(l => l.trim()).slice(0, 5);
    res.json({
      campaignId: `gads_${Date.now()}`,
      status: 'active',
      budget,
      keywords,
      estimatedReach: Math.floor((budget / 10) * 100),
      dashboardUrl: 'https://ads.google.com/demo'
    });
  } catch (error) {
    console.error('Google Ads error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/marketing/analytics/:projectId', async (req, res) => {
  try {
    res.json({
      landingPage: { visits: Math.floor(Math.random()*5000)+10000, uniqueVisitors: Math.floor(Math.random()*3000)+7000, bounceRate: (Math.random()*20+30).toFixed(1)+'%', avgTimeOnPage: Math.floor(Math.random()*120+60)+'s' },
      emailCampaign: { sent: Math.floor(Math.random()*1000)+2000, opens: Math.floor(Math.random()*500)+800, clicks: Math.floor(Math.random()*200)+200 },
      googleAds: { impressions: Math.floor(Math.random()*20000)+30000, clicks: Math.floor(Math.random()*800)+1000, conversions: Math.floor(Math.random()*50)+70, cpl: Math.floor(Math.random()*200)+200 }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================
//  ANALYTICS - Update teckning
// ========================================================================

app.post('/api/analytics/update-teckning', (req, res) => {
  try {
    const { projektId, teckningData } = req.body;
    const projekt = emissionsprojekt.find(p => p.id === projektId);
    if (!projekt) return res.status(404).json({ error: 'Project not found' });

    projekt.analytics.teckning = {
      total: teckningData.total,
      percent: (teckningData.total / projekt.emissionsvillkor.emissionsvolym) * 100,
      antalTecknare: teckningData.antalTecknare,
      updatedAt: new Date().toISOString()
    };
    res.json({ success: true, analytics: projekt.analytics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================
//  BREVO INTEGRATION
// ========================================================================

app.post('/api/aktiebok/sync-to-brevo', async (req, res) => {
  try {
    if (!brevoConfigured) return res.status(400).json({ error: 'Brevo API-nyckel ej konfigurerad' });

    const { contacts, listName = 'Aktie\u00e4gare' } = req.body;
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'Inga kontakter att synkronisera' });
    }

    let listId;
    try {
      const listsResp = await brevoContacts.getLists(50);
      const lists = listsResp.data || listsResp;
      const existing = (lists.lists || []).find(l => l.name === listName);
      if (existing) {
        listId = existing.id;
      } else {
        const newListResp = await brevoContacts.createList({ name: listName, folderId: 1 });
        const newList = newListResp.data || newListResp;
        listId = newList.id;
      }
    } catch (listError) {
      console.error('Brevo list error:', listError?.body || listError);
      return res.status(500).json({ error: 'Kunde inte skapa/hitta kontaktlista' });
    }

    const attributesToCreate = [
      { attributeCategory: 'normal', attributeName: 'INVESTOR_TYPE', type: 'text' },
      { attributeCategory: 'normal', attributeName: 'SHARES', type: 'float' },
      { attributeCategory: 'normal', attributeName: 'OWNERSHIP_PERCENT', type: 'float' }
    ];
    for (const attr of attributesToCreate) {
      try { await brevoContacts.createAttribute(attr.attributeCategory, attr.attributeName, { type: attr.type }); } catch (e) { /* exists */ }
    }

    let synced = 0;
    const errors = [];
    for (const contact of contacts) {
      try {
        const nameParts = (contact.name || '').split(' ');
        await brevoContacts.createContact({
          email: contact.email,
          attributes: {
            FIRSTNAME: nameParts[0] || '',
            LASTNAME: nameParts.slice(1).join(' ') || '',
            SMS: contact.phone || '',
            INVESTOR_TYPE: contact.investorType || '',
            SHARES: contact.shares || 0,
            OWNERSHIP_PERCENT: parseFloat(contact.ownershipPercent) || 0
          },
          listIds: [listId],
          updateEnabled: true
        });
        synced++;
      } catch (contactError) {
        errors.push({ email: contact.email, error: contactError?.body?.message || contactError?.message || 'Unknown' });
      }
    }

    console.log(`Brevo sync: ${synced}/${contacts.length} contacts synced`);
    res.json({ synced, listId, listName, total: contacts.length, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    console.error('Brevo sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketing/generate-email-draft', async (req, res) => {
  try {
    const { emailType, emissionType, emissionSize, companyName, campaignType, segment } = req.body;
    const type = emailType || campaignType || 'pre-launch';
    const audience = emissionSize || segment || '';
    const prompt = `Du \u00e4r expert p\u00e5 email-marknadsf\u00f6ring f\u00f6r kapitalanskaffningar.
Skapa ett professionellt email f\u00f6r ${companyName}.
Emissionstyp: ${emissionType || 'Emission'}
Kampanjtyp: ${type}
Emissionsbelopp: ${audience}

Svara i exakt detta JSON-format:
{"subject":"\u00c4mnesrad","previewText":"Preview (max 100 tecken)","htmlContent":"<html>...</html>"}

Professionellt, p\u00e5 svenska, med CTA-knapp och responsiv HTML.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Kunde inte tolka AI-svaret');
    const draft = JSON.parse(jsonMatch[0]);
    res.json({ subject: draft.subject, previewText: draft.previewText || '', htmlContent: draft.htmlContent });
  } catch (error) {
    console.error('Email draft error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/marketing/send-brevo-campaign', async (req, res) => {
  try {
    if (!brevoConfigured) return res.status(400).json({ error: 'Brevo API-nyckel ej konfigurerad' });
    const { subject, htmlContent, listId } = req.body;
    if (!subject || !htmlContent) return res.status(400).json({ error: '\u00c4mnesrad och HTML kr\u00e4vs' });

    const campaignData = {
      name: `${subject} - ${new Date().toLocaleDateString('sv-SE')}`,
      subject,
      sender: { name: process.env.BREVO_SENDER_NAME || 'Kapitalplattformen', email: process.env.BREVO_SENDER_EMAIL || 'admin@kapitalplattformen.com' },
      type: 'classic',
      htmlContent,
      recipients: listId ? { listIds: [listId] } : undefined
    };

    const campaignResp = await brevoEmailCampaigns.createEmailCampaign(campaignData);
    const campaign = campaignResp.data || campaignResp;

    try {
      await brevoEmailCampaigns.sendEmailCampaignNow(campaign.id);
    } catch (sendErr) {
      return res.json({ campaignId: campaign.id, status: 'created_not_sent', message: 'Skapad men ej skickad.', error: sendErr?.body?.message || sendErr?.message });
    }

    res.json({ campaignId: campaign.id, status: 'sent', recipients: listId ? 'alla i listan' : 0 });
  } catch (error) {
    console.error('Brevo campaign error:', error?.body || error);
    res.status(500).json({ error: error?.body?.message || error.message });
  }
});

app.get('/api/marketing/brevo-campaigns', async (req, res) => {
  try {
    if (!brevoConfigured) return res.json({ campaigns: [] });
    const resultResp = await brevoEmailCampaigns.getEmailCampaigns('classic', undefined, undefined, undefined, undefined, 10, undefined, 'desc');
    const result = resultResp.data || resultResp;
    const campaigns = (result.campaigns || []).map(c => ({
      name: c.name || c.subject,
      subject: c.subject,
      sentDate: c.sentDate ? new Date(c.sentDate).toLocaleDateString('sv-SE') : null,
      status: c.status,
      recipients: c.statistics?.globalStats?.sent || 0,
      opens: c.statistics?.globalStats?.uniqueOpens || 0,
      clicks: c.statistics?.globalStats?.uniqueClicks || 0
    }));
    res.json({ campaigns });
  } catch (error) {
    console.error('Brevo campaigns error:', error?.body || error);
    res.status(500).json({ error: error?.body?.message || error.message });
  }
});

// ========================================================================
//  PRODUCTION: SERVE REACT BUILD
// ========================================================================

if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', 'frontend', 'build');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(buildPath, 'index.html'));
    }
  });
  console.log('Production mode: serving React build from', buildPath);
}

// ========================================================================
//  SERVER START
// ========================================================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Kapitalplattformen v5.0 - Running on port ${PORT}`);
  console.log(`API Key: ${!!process.env.ANTHROPIC_API_KEY} | Brevo: ${brevoConfigured} | Demo login: ${!!process.env.DEMO_EMAIL}`);
  console.log('Endpoints: auth/login, emissionsprojekt, qualify-document, lookup-company, kapitalradgivaren/*, generate-*, marketing/*, aktiebok/sync-to-brevo, analytics/update-teckning');
});
