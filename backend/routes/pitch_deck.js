const express  = require('express');
const router   = express.Router();
const db       = require('../db');
const Anthropic = require('@anthropic-ai/sdk');
const { getBrandProfile, validateBrandProfile, buildBrandContext } = require('../utils/brandProfile');
const { buildTeaserSystemPrompt } = require('../utils/prompts');
const { generatePPTX } = require('../utils/pitchDeckExport');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// PUT /api/emissions/:id/im-sections  — spara IM-innehåll från wizarden till DB
router.put('/:id/im-sections', async (req, res) => {
  try {
    const { sections } = req.body;
    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ error: 'sections array krävs' });
    }

    const emRes = await db.query('SELECT company_id FROM emissions WHERE id = $1', [req.params.id]);
    if (!emRes.rows[0]) return res.status(404).json({ error: 'Emission hittades inte' });
    const { company_id } = emRes.rows[0];

    // Hitta eller skapa IM-dokument
    let docRes = await db.query(
      `SELECT id FROM documents WHERE emission_id = $1 AND doc_type = 'IM' ORDER BY created_at DESC LIMIT 1`,
      [req.params.id]
    );
    let docId;
    if (docRes.rows[0]) {
      docId = docRes.rows[0].id;
    } else {
      const ins = await db.query(
        `INSERT INTO documents (emission_id, company_id, doc_type, title)
         VALUES ($1, $2, 'IM', 'Informationsmemorandum') RETURNING id`,
        [req.params.id, company_id]
      );
      docId = ins.rows[0].id;
    }

    // Ersätt sektioner
    await db.query('DELETE FROM document_sections WHERE document_id = $1', [docId]);
    for (const s of sections) {
      await db.query(
        `INSERT INTO document_sections (document_id, section_key, section_title, content, order_index)
         VALUES ($1, $2, $3, $4, $5)`,
        [docId, s.section_key, s.section_title, s.content || '', s.order_index]
      );
    }

    res.json({ ok: true, document_id: docId, sections_saved: sections.length });
  } catch (err) {
    console.error('im-sections error:', err);
    res.status(500).json({ error: err?.message || err?.toString() });
  }
});

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
      max_tokens: 8000,
      system:     systemPrompt,
      messages:   [{
        role:    'user',
        content: `Generera pitch deck baserat på detta IM:\n\n${
          sectionsRes.rows.map(s => `## ${s.section_title}\n${s.content}`).join('\n\n')
        }`
      }]
    });

    let rawText = aiResponse.content[0].text.trim();
    console.log('AI raw response (first 300 chars):', rawText.substring(0, 300));

    // Strip markdown code fences if present
    rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Claude returnerade ogiltig JSON: ' + rawText.substring(0, 200));
    }

    if (!parsed?.slides?.length) {
      console.error('AI returned no slides. Full response:', rawText.substring(0, 1000));
      throw new Error('Claude returnerade inga slides (tomt svar)');
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
    const msg = err?.message || err?.toString() || 'Okänt fel';
    res.status(500).json({ error: msg });
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
        ? `Uppdatera ENBART slide med id "${slide_id}". Returnera JSON: { "slide": { ...uppdaterad slide med alla fält } }`
        : `Du får uppdatera befintliga slides OCH lägga till nya slides om användaren ber om det. Returnera alltid ALLA slides (befintliga + eventuellt nya) i: { "slides": [ ...komplett lista ] }`;

    const aiResponse = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: scope === 'slide' ? 2000 : 8000,
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

    let rawChat = aiResponse.content[0].text.trim();
    rawChat = rawChat.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(rawChat);
    } catch {
      const match = rawChat.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Claude returnerade ogiltig JSON i chat');
    }

    const ts = new Date().toISOString();

    let updatedSlides;
    let assistantMsg;

    if (parsed.slide) {
      updatedSlides = deck.slides.map(s =>
        s.id === parsed.slide.id
          ? { ...parsed.slide, last_edited_by: 'ai', last_edited_at: ts }
          : s
      );
      const updatedTitle = parsed.slide.title || parsed.slide.id;
      assistantMsg = `Klart! Jag har uppdaterat sliden "${updatedTitle}".`;
    } else if (parsed.slides) {
      updatedSlides = parsed.slides.map(s => ({
        ...s, last_edited_by: 'ai', last_edited_at: ts
      }));
      assistantMsg = `Klart! Jag har uppdaterat ${updatedSlides.length} slides.`;
    } else {
      throw new Error('Oväntat JSON-format från Claude (varken slide eller slides)');
    }

    const updatedHistory = [
      ...(deck.conversation_history || []),
      { role: 'user',      content: prompt, scope, slide_id: slide_id || null, ts },
      { role: 'assistant', content: assistantMsg, ts }
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
