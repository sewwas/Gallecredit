require('dotenv').config();
const { pool } = require('./db');
(async () => {
  try {
    // 1. Drop existing check constraint
    await pool.query('ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check');
    console.log('Dropped old constraint');
    
    // 2. Widen the action column just in case
    await pool.query('ALTER TABLE audit_logs ALTER COLUMN action TYPE VARCHAR(20)');
    console.log('Widened action column');
    
    // 3. Add new check constraint allowing VIEW and VIEW_REPORT
    await pool.query(`ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (action IN ('POST', 'PUT', 'DELETE', 'VIEW', 'VIEW_REPORT'))`);
    console.log('Added new constraint');
    
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
})();
