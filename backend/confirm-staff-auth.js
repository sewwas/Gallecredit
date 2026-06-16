const { Client } = require('pg');
require('dotenv').config();

async function confirmUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  try {
    const email = 'gallecredit.stafftest@gmail.com';
    console.log(`Checking user in auth.users for email: ${email}`);
    const checkRes = await client.query('SELECT id, email, email_confirmed_at, confirmed_at FROM auth.users WHERE email = $1', [email]);
    if (checkRes.rows.length === 0) {
      console.log(`User ${email} not found in auth.users table.`);
      return;
    }

    const user = checkRes.rows[0];
    console.log('User found:', user);

    console.log('Updating email_confirmed_at...');
    const updateRes = await client.query(
      `UPDATE auth.users 
       SET email_confirmed_at = NOW(), 
           updated_at = NOW(),
           last_sign_in_at = NOW()
       WHERE email = $1`,
      [email]
    );
    
    console.log(`Successfully updated auth.users. Rows affected: ${updateRes.rowCount}`);

    const verifyRes = await client.query('SELECT id, email, email_confirmed_at, confirmed_at FROM auth.users WHERE email = $1', [email]);
    console.log('Updated user status:', verifyRes.rows[0]);
  } catch (err) {
    console.error('Error confirming user:', err);
  } finally {
    await client.end();
  }
}

confirmUser();
