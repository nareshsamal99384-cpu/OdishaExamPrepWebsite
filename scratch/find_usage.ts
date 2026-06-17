import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/MockTestSystem.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log('Searching for MathTextRenderer or diagram in MockTestSystem.tsx:');
lines.forEach((line, idx) => {
  if (line.includes('MathTextRenderer') || line.includes('diagram') || line.includes('DiagramRenderer')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
