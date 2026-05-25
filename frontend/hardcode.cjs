const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const SUPABASE_URL = "https://kfswpfbbqyaeydglavcd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmc3dwZmJicXlhZXlkZ2xhdmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTM3MTYsImV4cCI6MjA5NDkyOTcxNn0.BENKN7GZXeAAxk-ljih6YV8HQkwQBqqmCv9dd6CWCFw";
const API_URL = "https://gallecredit-a9a2.vercel.app";

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            
            // Replace API URL
            content = content.replace(/import\.meta\.env\.VITE_API_URL\s*\|\|\s*['"]http:\/\/localhost:5000['"]/g, `"${API_URL}"`);
            content = content.replace(/import\.meta\.env\.VITE_API_URL/g, `"${API_URL}"`);
            
            // Replace Supabase
            content = content.replace(/import\.meta\.env\.VITE_SUPABASE_URL/g, `"${SUPABASE_URL}"`);
            content = content.replace(/import\.meta\.env\.VITE_SUPABASE_ANON_KEY/g, `"${SUPABASE_KEY}"`);
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated:', fullPath);
            }
        }
    });
}
walk(srcDir);
console.log('Done!');
