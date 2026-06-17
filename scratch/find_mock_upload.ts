import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/lib/examService.ts');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log('Searching for addQuestionsToMockTest in examService.ts:');
let start = -1;
lines.forEach((line, idx) => {
  if (line.includes('addQuestionsToMockTest')) {
    start = idx;
  }
});

if (start !== -1) {
  for (let i = start; i < start + 40 && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
