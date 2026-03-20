const db = require('../db');

const REQUIRED_FIELDS = [
  'company_name', 'tagline', 'logo_url',
  'color_primary', 'color_secondary',
  'tone', 'language'
];

const DEFAULTS = {
  color_primary:         '#1E2761',
  color_secondary:       '#185FA5',
  color_accent:          '#1D9E75',
  color_text_on_primary: '#FFFFFF',
  font_heading:          'Georgia',
  font_body:             'Calibri',
  tone:                  'balanserad',
  language:              'sv',
  keywords:              [],
  avoid_words:           [],
  disclaimer_text:       null
};

async function getBrandProfile(companyId) {
  const result = await db.query(
    'SELECT brand_profile FROM companies WHERE id = $1',
    [companyId]
  );
  const profile = result.rows[0]?.brand_profile || {};
  return { ...DEFAULTS, ...profile };
}

function validateBrandProfile(profile) {
  const missing = REQUIRED_FIELDS.filter(
    f => !profile[f] || profile[f] === ''
  );
  return { valid: missing.length === 0, missing };
}

function buildBrandContext(profile) {
  const toneMap = {
    formell:    'Saklig och faktabaserad. Undvik superlativ och säljande överdrifter.',
    balanserad: 'Professionell men tillgänglig. Lyft styrkor utan att överdriva.',
    säljande:   'Direkt och övertygande. Maximera investeringsargumenten.'
  };

  return `
VARUMÄRKESPROFIL:
- Bolagsnamn: ${profile.company_name}
- Tagline: "${profile.tagline || ''}"
- Ton: ${toneMap[profile.tone] || toneMap.balanserad}
- Språk: ${profile.language === 'en' ? 'Engelska' : profile.language === 'bilingual' ? 'Engelska för cover/highlights, svenska för övriga slides' : 'Svenska'}
${profile.keywords?.length ? `- Prioriterade nyckelord: ${profile.keywords.join(', ')}` : ''}
${profile.avoid_words?.length ? `- Undvik dessa ord: ${profile.avoid_words.join(', ')}` : ''}
`.trim();
}

module.exports = { getBrandProfile, validateBrandProfile, buildBrandContext, DEFAULTS };
