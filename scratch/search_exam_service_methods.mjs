import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/lib/examService.ts');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('async ') || line.includes('class ') || line.includes('export const')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
