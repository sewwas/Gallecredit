const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
async function testEndpoints() {
  try {
    const supabaseUrl = 'https://kfswpfbbqyaeydglavcd.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmc3dwZmJicXlhZXlkZ2xhdmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTM3MTYsImV4cCI6MjA5NDkyOTcxNn0.BENKN7GZXeAAxk-ljih6YV8HQkwQBqqmCv9dd6CWCFw';
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'gallecredit@gmail.com',
      password: 'CreditGalle2025'
    });
    if (error) throw error;
    const token = data.session.access_token;
    
    const endpoints = [
      '/api/customers',
      '/api/loans',
      '/api/reports/daily-collection',
      '/api/reports/outstanding',
      '/api/reports/collection-trends',
      '/api/reports/loan-distribution',
      '/api/reports/profit-loss'
    ];
    
    for (const ep of endpoints) {
      try {
        const res = await axios.get(`https://gallecredit-a9a2.vercel.app${ep}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`[OK] ${ep}: type=${typeof res.data}, isArray=${Array.isArray(res.data)}`);
      } catch (err) {
        if (err.response) {
          console.error(`[ERROR] ${ep}: ${err.response.status}`);
          if (typeof err.response.data === 'string') {
            console.error(`  Received HTML string of length ${err.response.data.length}`);
          }
        } else {
          console.error(`[ERROR] ${ep}: ${err.message}`);
        }
      }
    }
  } catch (err) {
    console.error('Login failed', err.message);
  }
}
testEndpoints();
