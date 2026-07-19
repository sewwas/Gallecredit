require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

pool.query("SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';")
  .then((res) => {
    console.table(res.rows);
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
