// backend/routes/cashflow.js
// Ersätter tidigare version — inkluderar nu även /targets endpoints

const express = require('express');
const router = express.Router();
const db = require('../db');

// ─────────────────────────────────────────────────────────────
// MÅNADSDATA
// ─────────────────────────────────────────────────────────────

// GET /api/cashflow?company_id=X
router.get('/', async (req, res) => {
  const { company_id } = req.query;
  if (!company_id) return res.status(400).json({ error: 'company_id krävs' });
  try {
    const result = await db.query(
      `SELECT * FROM cashflow_months WHERE company_id = $1 ORDER BY period ASC`,
      [company_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('cashflow GET error:', err);
    res.status(500).json({ error: 'Databasfel' });
  }
});

// POST /api/cashflow
router.post('/', async (req, res) => {
  const {
    company_id, period,
    omsattning, ovrigt_in, ing_kassa,
    produktionskost, personalkost, externa_kost,
    capex, externt_kapital
  } = req.body;
  if (!company_id || !period) return res.status(400).json({ error: 'company_id och period krävs' });
  try {
    const result = await db.query(
      `INSERT INTO cashflow_months
         (company_id, period, omsattning, ovrigt_in, ing_kassa,
          produktionskost, personalkost, externa_kost, capex, externt_kapital)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (company_id, period) DO UPDATE SET
         omsattning=$3, ovrigt_in=$4, ing_kassa=$5,
         produktionskost=$6, personalkost=$7, externa_kost=$8,
         capex=$9, externt_kapital=$10
       RETURNING *`,
      [company_id, period,
       omsattning||0, ovrigt_in||0, ing_kassa||0,
       produktionskost||0, personalkost||0, externa_kost||0,
       capex||0, externt_kapital||0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('cashflow POST error:', err);
    res.status(500).json({ error: 'Databasfel' });
  }
});

// DELETE /api/cashflow/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM cashflow_months WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('cashflow DELETE error:', err);
    res.status(500).json({ error: 'Databasfel' });
  }
});

// POST /api/cashflow/demo — 6 månaders exempeldata
router.post('/demo', async (req, res) => {
  const { company_id } = req.body;
  if (!company_id) return res.status(400).json({ error: 'company_id krävs' });
  const demoData = [
    { period:'2025-10', omsattning:820, ovrigt_in:0, ing_kassa:2800, produktionskost:480, personalkost:390, externa_kost:210, capex:-30,  externt_kapital:0   },
    { period:'2025-11', omsattning:760, ovrigt_in:0, ing_kassa:2505, produktionskost:440, personalkost:395, externa_kost:195, capex:-20,  externt_kapital:0   },
    { period:'2025-12', omsattning:890, ovrigt_in:0, ing_kassa:2255, produktionskost:510, personalkost:400, externa_kost:220, capex:-50,  externt_kapital:500 },
    { period:'2026-01', omsattning:810, ovrigt_in:0, ing_kassa:2575, produktionskost:470, personalkost:405, externa_kost:230, capex:-20,  externt_kapital:0   },
    { period:'2026-02', omsattning:780, ovrigt_in:0, ing_kassa:2225, produktionskost:455, personalkost:410, externa_kost:245, capex:-30,  externt_kapital:0   },
    { period:'2026-03', omsattning:750, ovrigt_in:0, ing_kassa:1865, produktionskost:435, personalkost:415, externa_kost:260, capex:-25,  externt_kapital:0   },
  ];
  // Demo-mål sätts också vid demo-inmatning
  const demoTargets = {
    label: 'Budget 2025/2026',
    omsattning_tillvaxt: 20.0,
    bruttomarginal: 48.0,
    rorelsemarginal: -5.0,
    burn_rate_max: -200,
    runway_min: 6,
    capex_budget: 120,
    betalningstid_dagar: 30,
    avskrivningstakt: 20.0,
    aktiveringsgrad: 15.0
  };
  try {
    for (const d of demoData) {
      await db.query(
        `INSERT INTO cashflow_months
           (company_id, period, omsattning, ovrigt_in, ing_kassa,
            produktionskost, personalkost, externa_kost, capex, externt_kapital)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (company_id, period) DO UPDATE SET
           omsattning=$3, ovrigt_in=$4, ing_kassa=$5,
           produktionskost=$6, personalkost=$7, externa_kost=$8,
           capex=$9, externt_kapital=$10`,
        [company_id, d.period, d.omsattning, d.ovrigt_in, d.ing_kassa,
         d.produktionskost, d.personalkost, d.externa_kost, d.capex, d.externt_kapital]
      );
    }
    await db.query(
      `INSERT INTO cashflow_targets
         (company_id, label, omsattning_tillvaxt, bruttomarginal, rorelsemarginal,
          burn_rate_max, runway_min, capex_budget,
          betalningstid_dagar, avskrivningstakt, aktiveringsgrad)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (company_id) DO UPDATE SET
         label=$2, omsattning_tillvaxt=$3, bruttomarginal=$4, rorelsemarginal=$5,
         burn_rate_max=$6, runway_min=$7, capex_budget=$8,
         betalningstid_dagar=$9, avskrivningstakt=$10, aktiveringsgrad=$11,
         updated_at=NOW()`,
      [company_id, demoTargets.label,
       demoTargets.omsattning_tillvaxt, demoTargets.bruttomarginal, demoTargets.rorelsemarginal,
       demoTargets.burn_rate_max, demoTargets.runway_min, demoTargets.capex_budget,
       demoTargets.betalningstid_dagar, demoTargets.avskrivningstakt, demoTargets.aktiveringsgrad]
    );
    res.json({ success: true, inserted: demoData.length });
  } catch (err) {
    console.error('cashflow demo error:', err);
    res.status(500).json({ error: 'Databasfel' });
  }
});

// ─────────────────────────────────────────────────────────────
// MÅL & BUDGETPARAMETRAR
// ─────────────────────────────────────────────────────────────

// GET /api/cashflow/targets?company_id=X
router.get('/targets', async (req, res) => {
  const { company_id } = req.query;
  if (!company_id) return res.status(400).json({ error: 'company_id krävs' });
  try {
    const result = await db.query(
      `SELECT * FROM cashflow_targets WHERE company_id = $1`,
      [company_id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error('targets GET error:', err);
    res.status(500).json({ error: 'Databasfel' });
  }
});

// POST /api/cashflow/targets — upsert
router.post('/targets', async (req, res) => {
  const {
    company_id, label,
    omsattning_tillvaxt, bruttomarginal, rorelsemarginal,
    burn_rate_max, runway_min, capex_budget,
    betalningstid_dagar, avskrivningstakt, aktiveringsgrad
  } = req.body;
  if (!company_id) return res.status(400).json({ error: 'company_id krävs' });
  try {
    const result = await db.query(
      `INSERT INTO cashflow_targets
         (company_id, label, omsattning_tillvaxt, bruttomarginal, rorelsemarginal,
          burn_rate_max, runway_min, capex_budget,
          betalningstid_dagar, avskrivningstakt, aktiveringsgrad)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (company_id) DO UPDATE SET
         label=$2, omsattning_tillvaxt=$3, bruttomarginal=$4, rorelsemarginal=$5,
         burn_rate_max=$6, runway_min=$7, capex_budget=$8,
         betalningstid_dagar=$9, avskrivningstakt=$10, aktiveringsgrad=$11,
         updated_at=NOW()
       RETURNING *`,
      [company_id, label||'Budget',
       omsattning_tillvaxt||null, bruttomarginal||null, rorelsemarginal||null,
       burn_rate_max||null, runway_min||null, capex_budget||null,
       betalningstid_dagar||null, avskrivningstakt||null, aktiveringsgrad||null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('targets POST error:', err);
    res.status(500).json({ error: 'Databasfel' });
  }
});

module.exports = router;
