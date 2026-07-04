require('dotenv').config();
const { pool } = require('./db');
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_notes (
        note_id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(customer_id) ON DELETE CASCADE,
        note TEXT NOT NULL,
        created_by_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('customer_notes table created successfully');
  } catch(e) {
    console.error('Error creating table:', e);
  } finally {
    pool.end();
  }
})();
