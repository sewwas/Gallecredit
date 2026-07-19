const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(authorizeRole('admin', 'accountant'));

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Allowed sort columns to prevent SQL injection
    const allowedSortColumns = ['date', 'type', 'amount', 'source'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'date';

    let queryStr = 'FROM cash_book WHERE 1=1';
    const queryParams = [];
    
    if (search) {
      queryParams.push(`%${search}%`);
      queryStr += ` AND (source ILIKE $${queryParams.length} OR type ILIKE $${queryParams.length})`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) ${queryStr}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    queryParams.push(limit, offset);
    const dataQuery = `SELECT * ${queryStr} ORDER BY ${safeSortBy} ${sortOrder} LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
    
    const result = await pool.query(dataQuery, queryParams);
    
    res.json({
      data: result.rows,
      total,
      page,
      limit
    });
  } catch (err) {
    console.error('Error fetching cashbook:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
