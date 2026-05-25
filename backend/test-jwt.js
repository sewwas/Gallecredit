const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testToken() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'gallecredit@gmail.com',
    password: 'CreditGalle2025'
  });
  if (error) return console.error(error);
  
  const token = data.session.access_token;
  const decoded = jwt.decode(token);
  console.log(decoded);
}
testToken();
