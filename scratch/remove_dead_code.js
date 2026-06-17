const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/components/MathTextRenderer.tsx');
console.log('Reading file:', filePath);

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

// Verify boundary lines (1-indexed: 1011 to 3541)
const startLineText = lines[1010]; // 0-indexed 1010 is line 1011
const endLineText = lines[3540];   // 0-indexed 3540 is line 3541

console.log('Line 1011 (start):', startLineText);
console.log('Line 3541 (end):', endLineText);

if (startLineText.includes('const SvgDiagramCanvas') && endLineText.trim() === '};') {
  console.log('Validation passed. Splicing lines...');
  lines.splice(1010, 2531); // remove 2531 lines from index 1010
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('Successfully removed SvgDiagramCanvas. New total lines:', lines.length);
} else {
  console.error('Validation failed! Boundaries do not match. Aborting.');
  process.exit(1);
}
