import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  const srcDir = path.resolve(__dirname, 'build');
  const destDir = path.resolve(__dirname, 'dist');
  if (fs.existsSync(srcDir)) {
    copyDir(srcDir, destDir);
    console.log('Successfully copied build/ to dist/');
  } else {
    console.warn('Source build/ directory does not exist.');
  }
} catch (err) {
  console.error('Failed to copy build/ to dist/:', err);
}
