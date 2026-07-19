require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function getSchema(table) {
  const { data, error } = await supabase.from(table).select('*').limit(1)
  if (error) {
    console.error(`Error fetching ${table}:`, error)
    return
  }
  if (data && data.length > 0) {
    console.log(`Schema for ${table} (based on first row keys):`, Object.keys(data[0]))
  } else {
    const { error: err2 } = await supabase.from(table).insert({}).select()
    if (err2 && err2.details) {
       console.log(`Error details for ${table} might reveal schema:`, err2)
    } else {
       console.log(`${table} is empty. Error message:`, err2?.message || 'No error message')
    }
  }
}

async function run() {
  await getSchema('expenses')
  await getSchema('income')
  await getSchema('day_closes')
  await getSchema('cash_book')
  await getSchema('journal_entries')
  await getSchema('journal_lines')
}

run()
