import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '../src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

let hasError = false;

walkDir(srcDir, (filePath) => {
  if (filePath.match(/\.(ts|tsx|js|jsx)$/)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (let j = 0; j < line.length; j++) {
            if (line.charCodeAt(j) > 127) {
                console.error("Non-ASCII character '" + line[j] + "' (code " + line.charCodeAt(j) + ") found in " + filePath + " at line " + (i + 1) + ", column " + (j + 1));
                hasError = true;
            }
        }
    }
  }
});

if (hasError) {
  console.error('Non-ASCII characters detected in source files.');
  process.exit(1);
} else {
  console.log('No non-ASCII characters found.');
}
