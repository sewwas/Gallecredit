const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);

// Get all registered holidays
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public_holidays ORDER BY holiday_date ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a holiday (Admin only)
router.post('/', authorizeRole('admin'), async (req, res) => {
  const { holiday_date, description, is_recurring } = req.body;

  if (!holiday_date || !description) {
    return res.status(400).json({ error: 'Date and description are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO public_holidays (holiday_date, description, is_recurring) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (holiday_date) DO UPDATE 
       SET description = EXCLUDED.description, is_recurring = EXCLUDED.is_recurring
       RETURNING *`,
      [holiday_date, description, is_recurring || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a holiday (Admin only)
router.delete('/:id', authorizeRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM public_holidays WHERE holiday_id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    res.json({ message: 'Holiday deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
