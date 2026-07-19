require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const query = `
  CREATE POLICY "Allow public uploads to documents bucket" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'documents');
  CREATE POLICY "Allow public reads from documents bucket" ON storage.objects FOR SELECT TO public USING (bucket_id = 'documents');
  CREATE POLICY "Allow public updates to documents bucket" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'documents');
  CREATE POLICY "Allow public deletes from documents bucket" ON storage.objects FOR DELETE TO public USING (bucket_id = 'documents');
`;

pool.query(query)
  .then(() => {
    console.log("Policies created successfully");
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
