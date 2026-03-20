const { buildBrandContext } = require('./brandProfile');

function buildTeaserSystemPrompt(brand, emission, company) {
  return `Du genererar ett pitch deck / teaser för en kapitalmarknadstransaktion på en nordisk tillväxtmarknad.
Returnera ENBART giltig JSON — inga kodblock, inga kommentarer, ingen preamble.

${buildBrandContext(brand)}

JSON-struktur:
{
  "slides": [
    {
      "id": "<snake_case_id>",
      "order": <nummer>,
      "title": "<slide-rubrik>",
      "type": "cover" | "bullets" | "twocol" | "metrics",
      "last_edited_by": "ai",
      "last_edited_at": "<ISO 8601 timestamp>",
      "content": { ... }  // se slide-typer nedan
    }
  ]
}

SLIDE-TYPER OCH CONTENT-SCHEMA:

cover:
  { "company_name": string, "tagline": string, "logo_url": string,
    "emission_amount": string, "marketplace": string, "emission_type": string }

bullets:
  { "bullets": string[],   // max 5 bullets, max 12 ord per bullet
    "highlight_box": string | null }

twocol:
  { "cards": [ { "title": string, "body": string } ] }  // exakt 4 kort

metrics:
  { "metrics": [ { "value": string, "label": string } ],  // 4–6 metrics
    "use_of_proceeds"?: [ { "label": string, "pct": number } ] }

EMISSIONSDATA (använd i cover + emission-sliden):
  Bolag: ${company?.name || brand.company_name}
  Marketplace: ${company?.marketplace || ''}
  Emissionstyp: ${emission?.emission_type || ''}
  Emissionsvolym: ${emission?.target_amount ? (emission.target_amount / 1000000).toFixed(1) + ' MSEK' : ''}
  Teckningskurs: ${emission?.subscription_price || ''} SEK

SLIDES ATT GENERERA (10 st, i denna ordning):
1. cover             — bolagsidentitet + emissionsöversikt
2. investment-highlights — 5 starkaste investeringsargumenten
3. problem           — problemet bolaget löser (twocol, 4 kort)
4. solution          — lösningen/produkten (bullets)
5. business-model    — affärsmodell och intäktsströmmar (twocol)
6. traction          — KPI:er och milstolpar (metrics)
7. market            — marknad och TAM (bullets)
8. competition       — konkurrensbild (twocol)
9. team              — nyckelteamet (bullets)
10. emission         — emissionsvillkor och use of proceeds (metrics)

TONREGEL: ${
    brand.tone === 'formell'    ? 'Saklig och faktabaserad. Inga superlativ.' :
    brand.tone === 'säljande'   ? 'Direkt och övertygande. Maximera investeringsargumenten.' :
    'Professionell men tillgänglig. Lyft styrkor utan att överdriva.'
  }`;
}

module.exports = { buildTeaserSystemPrompt };
