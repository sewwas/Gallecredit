import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://kfswpfbbqyaeydglavcd.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmc3dwZmJicXlhZXlkZ2xhdmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTM3MTYsImV4cCI6MjA5NDkyOTcxNn0.BENKN7GZXeAAxk-ljih6YV8HQkwQBqqmCv9dd6CWCFw"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
