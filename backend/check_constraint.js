require('dotenv').config();
const { pool } = require('./db');
(async () => {
  try {
    const res = await pool.query(`
      SELECT pg_get_constraintdef(c.oid) AS constraint_def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE c.conname = 'audit_logs_action_check'
    `);
    console.log('Constraint:', res.rows[0].constraint_def);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
})();
