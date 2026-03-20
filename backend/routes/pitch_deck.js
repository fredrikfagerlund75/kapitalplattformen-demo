const express  = require('express');
const router   = express.Router();
const db       = require('../db');
const Anthropic = require('@anthropic-ai/sdk');
const { getBrandProfile, validateBrandProfile, buildBrandContext } = require('../utils/brandProfile');
const { buildTeaserSystemPrompt } = require('../utils/prompts');
const { generatePPTX } = require('../utils/pitchDeckExport');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GET /api/emissions/:id/pitch-deck
router.get('/:id/pitch-deck', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pitch_deck FROM documents
       WHERE emission_id = $1 AND doc_type = 'IM'
       ORDER BY created_at DESC LIMIT 1`,
      [req.params.id]
    );
    res.json(result.rows[0]?.pitch_deck || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/emissions/:id/pitch-deck/generate
router.post('/:id/pitch-deck/generate', async (req, res) => {
  try {
    const emissionRes = await db.query(
      'SELECT * FROM emissions WHERE id = $1', [req.params.id]
    );
    const emission = emissionRes.rows[0];
    if (!emission) return res.status(404).json({ error: 'Emission hittades inte' });

    const brand = await getBrandProfile(emission.company_id);
    const { valid, missing } = validateBrandProfile(brand);
    if (!valid) {
      return res.status(422).json({
        error: 'brand_profile_incomplete',
        message: 'Varumärkesprofilen är ofullständig.',
        missing
      });
    }

    const sectionsRes = await db.query(
      `SELECT ds.section_key, ds.section_title, ds.content
       FROM document_sections ds
       JOIN documents d ON ds.document_id = d.id
       WHERE d.emission_id = $1 AND d.doc_type = 'IM'
       ORDER BY ds.order_index`,
      [req.params.id]
    );

    const companyRes = await db.query(
      'SELECT name, marketplace FROM companies WHERE id = $1',
      [emission.company_id]
    );
    const company = companyRes.rows[0];

    const systemPrompt = buildTeaserSystemPrompt(brand, emission, company);

    const aiResponse = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4000,
      system:     systemPrompt,
      messages:   [{
        role:    'user',
        content: `Generera pitch deck baserat på detta IM:\n\n${
          sectionsRes.rows.map(s => `## ${s.section_title}\n${s.content}`).join('\n\n')
        }`
      }]
    });

    let parsed;
    try {
      parsed = JSON.parse(aiResponse.content[0].text);
    } catch {
      const match = aiResponse.content[0].text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Claude returnerade ogiltig JSON');
    }

    const pitchDeck = {
      generated_from_version: 'im_v1',
      generated_with_brand:   true,
      status:                 'draft',
      last_exported_at:       null,
      conversation_history:   [{
        role:    'assistant',
        content: `Jag har genererat ett utkast på ${parsed.slides.length} slides baserat på ert IM och varumärkesprofil. Vill du justera något?`,
        ts:      new Date().toISOString()
      }],
      slides: parsed.slides
    };

    await db.query(
      `UPDATE documents SET pitch_deck = $1
       WHERE emission_id = $2 AND doc_type = 'IM'`,
      [JSON.stringify(pitchDeck), req.params.id]
    );

    res.json(pitchDeck);
  } catch (err) {
    console.error('generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/emissions/:id/pitch-deck/chat
router.put('/:id/pitch-deck/chat', async (req, res) => {
  try {
    const { prompt, scope, slide_id } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt krävs' });

    const docRes = await db.query(
      `SELECT d.id, d.pitch_deck, e.company_id
       FROM documents d
       JOIN emissions e ON d.emission_id = e.id
       WHERE d.emission_id = $1 AND d.doc_type = 'IM'
       ORDER BY d.created_at DESC LIMIT 1`,
      [req.params.id]
    );
    const doc   = docRes.rows[0];
    const deck  = doc.pitch_deck;
    const brand = await getBrandProfile(doc.company_id);

    const history = (deck.conversation_history || [])
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    const scopeInstruction =
      scope === 'slide'
        ? `Uppdatera ENBART slide med id "${slide_id}". Returnera JSON: { "slide": { ...uppdaterad slide } }`
        : `Uppdatera hela decket där relevant. Returnera JSON: { "slides": [ ...alla slides ] }`;

    const aiResponse = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2000,
      system:     `Du är en assistent som hjälper till att redigera ett pitch deck.
${buildBrandContext(brand)}
Returnera ENBART giltig JSON. ${scopeInstruction}`,
      messages: [
        ...history,
        {
          role:    'user',
          content: `Nuvarande slides:\n${JSON.stringify(deck.slides, null, 2)}\n\nInstruction: ${prompt}`
        }
      ]
    });

    let parsed;
    try {
      parsed = JSON.parse(aiResponse.content[0].text);
    } catch {
      const match = aiResponse.content[0].text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Claude returnerade ogiltig JSON');
    }

    const ts = new Date().toISOString();

    let updatedSlides;
    if (parsed.slide) {
      updatedSlides = deck.slides.map(s =>
        s.id === parsed.slide.id
          ? { ...parsed.slide, last_edited_by: 'ai', last_edited_at: ts }
          : s
      );
    } else {
      updatedSlides = parsed.slides.map(s => ({
        ...s, last_edited_by: 'ai', last_edited_at: ts
      }));
    }

    const updatedHistory = [
      ...(deck.conversation_history || []),
      { role: 'user',      content: prompt, scope, slide_id: slide_id || null, ts },
      { role: 'assistant', content: aiResponse.content[0].text.substring(0, 200) + '…', ts }
    ];

    await db.query(
      `UPDATE documents
       SET pitch_deck = pitch_deck
         || jsonb_build_object('slides', $1::jsonb)
         || jsonb_build_object('conversation_history', $2::jsonb)
       WHERE id = $3`,
      [JSON.stringify(updatedSlides), JSON.stringify(updatedHistory), doc.id]
    );

    res.json({ slides: updatedSlides, conversation_history: updatedHistory });
  } catch (err) {
    console.error('chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/emissions/:id/pitch-deck/slide  (manual edit, no AI)
router.put('/:id/pitch-deck/slide', async (req, res) => {
  try {
    const { slide_id, content } = req.body;
    const ts = new Date().toISOString();

    await db.query(
      `UPDATE documents
       SET pitch_deck = jsonb_set(
         pitch_deck,
         '{slides}',
         (SELECT jsonb_agg(
           CASE WHEN s->>'id' = $1
             THEN s
               || jsonb_build_object('content',        $2::jsonb)
               || jsonb_build_object('last_edited_by', 'user')
               || jsonb_build_object('last_edited_at', $3)
             ELSE s
           END
         ) FROM jsonb_array_elements(pitch_deck->'slides') s)
       )
       WHERE emission_id = $4 AND doc_type = 'IM'`,
      [slide_id, JSON.stringify(content), ts, req.params.id]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/emissions/:id/pitch-deck/export
router.post('/:id/pitch-deck/export', async (req, res) => {
  try {
    const docRes = await db.query(
      `SELECT d.pitch_deck, e.company_id
       FROM documents d
       JOIN emissions e ON d.emission_id = e.id
       WHERE d.emission_id = $1 AND d.doc_type = 'IM'
       ORDER BY d.created_at DESC LIMIT 1`,
      [req.params.id]
    );
    const deck  = docRes.rows[0].pitch_deck;
    const brand = await getBrandProfile(docRes.rows[0].company_id);

    const pptxBuffer = await generatePPTX(deck.slides, brand);

    await db.query(
      `UPDATE documents
       SET pitch_deck = pitch_deck || $1::jsonb
       WHERE emission_id = $2 AND doc_type = 'IM'`,
      [JSON.stringify({ last_exported_at: new Date().toISOString(), status: 'exported' }), req.params.id]
    );

    const filename = `${(brand.company_name || 'Teaser').replace(/\s+/g, '_')}_Teaser.pptx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pptxBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/emissions/:id/pitch-deck
router.delete('/:id/pitch-deck', async (req, res) => {
  try {
    await db.query(
      `UPDATE documents SET pitch_deck = NULL
       WHERE emission_id = $1 AND doc_type = 'IM'`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
