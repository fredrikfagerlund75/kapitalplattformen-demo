const express = require('express');
const router = express.Router();
const db = require('../db');
const { getBrandProfile, validateBrandProfile, DEFAULTS } = require('../utils/brandProfile');

// GET /api/companies/:id/brand-profile
router.get('/:id/brand-profile', async (req, res) => {
  try {
    const profile = await getBrandProfile(req.params.id);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/companies/:id/brand-profile  (replace entire profile)
router.put('/:id/brand-profile', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE companies SET brand_profile = $1 WHERE id = $2 RETURNING brand_profile`,
      [JSON.stringify(req.body), req.params.id]
    );
    res.json(result.rows[0].brand_profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/companies/:id/brand-profile  (merge individual fields)
router.patch('/:id/brand-profile', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE companies
       SET brand_profile = brand_profile || $1::jsonb
       WHERE id = $2
       RETURNING brand_profile`,
      [JSON.stringify(req.body), req.params.id]
    );
    res.json(result.rows[0].brand_profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/companies/:id/brand-profile/status
router.get('/:id/brand-profile/status', async (req, res) => {
  try {
    const profile = await getBrandProfile(req.params.id);
    const { valid, missing } = validateBrandProfile(profile);
    res.json({ valid, missing, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
