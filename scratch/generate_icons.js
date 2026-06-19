import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'public', 'favicon.svg');
const publicDir = path.join(rootDir, 'public');

console.log('SVG Path:', svgPath);
console.log('Public Dir:', publicDir);

if (!fs.existsSync(svgPath)) {
  console.error('favicon.svg not found in public directory!');
  process.exit(1);
}

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
  { name: 'favicon.ico', size: 48 } // Simple ICO fallback as 48x48 PNG
];

async function generate() {
  for (const s of sizes) {
    const outputPath = path.join(publicDir, s.name);
    try {
      await sharp(svgPath)
        .resize(s.size, s.size)
        .png()
        .toFile(outputPath);
      console.log(`Generated ${s.name} (${s.size}x${s.size})`);
    } catch (err) {
      console.error(`Failed to generate ${s.name}:`, err);
    }
  }
}

generate().then(() => {
  console.log('All icons generated successfully!');
}).catch(err => {
  console.error('Generation failed:', err);
});
