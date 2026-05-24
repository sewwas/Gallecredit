const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { pool } = require('./index');

async function seed() {
  try {
    console.log('Reading schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    
    console.log('Executing schema...');
    await pool.query(schemaSql);
    console.log('Schema executed successfully.');

    console.log('Checking for default admin user...');
    const result = await pool.query("SELECT * FROM users WHERE username = 'gallecredit@gmail.com'");
    if (result.rows.length === 0) {
      console.log('Creating default admin user...');
      const passwordHash = await bcrypt.hash('CreditGalle2025', 10);
      await pool.query(
        "INSERT INTO users (name, role, username, password_hash) VALUES ($1, $2, $3, $4)",
        ['Galle Credit Admin', 'admin', 'gallecredit@gmail.com', passwordHash]
      );
      console.log('Default admin user created: gallecredit@gmail.com / CreditGalle2025');
    } else {
      console.log('Admin user already exists.');
    }

    console.log('Removing old admin bypass user...');
    await pool.query("DELETE FROM users WHERE username = 'admin'");

    console.log('Database seeding completed.');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    pool.end();
  }
}

seed();
