const fs = require('fs');
const path = require('path');

const directory = 'g:\\void\\Innerve_Hack\\New';
const EXCLUDE_DIRS = ['node_modules', '.git', '.next', 'artifacts', 'cache'];

const replacements = [
    { match: /MediChain/g, replace: 'MediChain' },
    { match: /medichain/g, replace: 'medichain' },
    { match: /Product/g, replace: 'Product' },
    { match: /product/g, replace: 'product' },
    { match: /Vendor/g, replace: 'Vendor' },
    { match: /vendor/g, replace: 'vendor' },
    { match: /VRD-/g, replace: 'VRD-' }
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);

        // Skip excluded directories
        if (EXCLUDE_DIRS.includes(file)) {
            continue;
        }

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (stat.isFile()) {
            // Only process text files (skip images, etc.)
            const ext = path.extname(fullPath).toLowerCase();
            if (!['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.sql', '.html', '.css', '.sol'].includes(ext)) {
                if (ext !== '') continue; // Skip files without extensions unless they are text
            }

            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            for (const { match, replace } of replacements) {
                if (content.match(match)) {
                    content = content.replace(match, replace);
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

console.log('Starting find and replace...');
processDirectory(directory);
console.log('Finished finding and replacing.');
