const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

walkSync(srcDir, function(filePath) {
    if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Replace single quoted strings: 'http://localhost:5000/api/...'
        const singleQuoteRegex = /'http:\/\/localhost:5000([^']*)'/g;
        if (singleQuoteRegex.test(content)) {
            content = content.replace(singleQuoteRegex, "`\\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}$1`");
            modified = true;
        }

        // Replace template literals: `http://localhost:5000/api/...`
        const templateLiteralRegex = /`http:\/\/localhost:5000([^`]*)`/g;
        if (templateLiteralRegex.test(content)) {
            content = content.replace(templateLiteralRegex, "`\\${import.meta.env.VITE_API_URL || 'http://localhost:5000'}$1`");
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated: ${filePath}`);
        }
    }
});
console.log('Done.');
