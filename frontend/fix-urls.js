const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            
            // Fix API URL
            content = content.replace(/\$\{"https:\/\/gallecredit-a9a2\.vercel\.app"\}/g, `https://gallecredit-a9a2.vercel.app`);
            // Fix Supabase URL (just in case)
            content = content.replace(/\$\{"https:\/\/kfswpfbbqyaeydglavcd\.supabase\.co"\}/g, `https://kfswpfbbqyaeydglavcd.supabase.co`);
            
            // Also fix if there are any remaining double-quoted ones outside template literals that might be weird?
            // Actually, if it's outside a template literal like axios.get("https://..."), it's fine.
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed:', fullPath);
            }
        }
    });
}
walk(srcDir);
console.log('Done!');
