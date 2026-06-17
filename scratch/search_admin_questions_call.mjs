import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/AdminPanel.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('getAllQuestions')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
