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
            
            // Replace backslash + vercel URL or just vercel URL inside template literals
            content = content.replace(/\\?https:\/\/gallecredit-a9a2\.vercel\.app/g, '${import.meta.env.VITE_API_URL || \'http://localhost:5000\'}');
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Restored URL in:', fullPath);
            }
        }
    });
}
walk(srcDir);
console.log('Done!');
