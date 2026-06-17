import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/AdminPanel.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  // Look for references to the "questions" array/variable
  if (line.includes('questions.') || line.includes('questions,') || line.includes('setQuestions') || line.includes('questions[') || line.includes(' questions ') || line.includes('questions:')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
