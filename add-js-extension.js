import fs from 'fs';
import path from 'path';

const directory = './dist';

console.log('Adding .js extension to local imports...');

function addJsExtension(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    // Replace all local imports (Regex: from './filename') with .js extension (from './filename.js'
    const data2 = data.replace(/from '(\.\/[^']+)'/g, "from '$1.js'");

    // Replace all local imports (Regex: from '../filename') with .js extension (from '../filename.js'
    const result = data2.replace(/from '\.\.\/([^']+)'/g, "from '../$1.js'");

    fs.writeFileSync(filePath, result, 'utf8');
}

function fromDir(startPath, filter) {
    if (!fs.existsSync(startPath)) {
        console.log('Directory not found', startPath);
        return;
    }

    const files = fs.readdirSync(startPath);

    for (let i = 0; i < files.length; i++) {
        const filename = path.join(startPath, files[i]);
        const stat = fs.lstatSync(filename);

        if (stat.isDirectory()) {
            fromDir(filename, filter); // Recurse into subdirectories
        } else if (filter.test(filename)) addJsExtension(filename);
    }
}

fromDir(directory, /\.js$/); // Look for .js files
