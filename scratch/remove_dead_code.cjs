const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/components/MathTextRenderer.tsx');
console.log('Reading file:', filePath);

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.replace(/\r\n/g, '\n').split('\n');

console.log('Total lines:', lines.length);

// Verify boundary lines (1-indexed: 653 to 1287)
const startLineText = lines[652]; // 0-indexed 652 is line 653
const endLineText = lines[1286];   // 0-indexed 1286 is line 1287

console.log('Line 653 (start):', startLineText);
console.log('Line 1287 (end):', endLineText);

if (startLineText.includes('const SvgDiagramCanvas') && endLineText.trim() === '};') {
  console.log('Validation passed. Splicing lines...');
  lines.splice(652, 635); // remove 635 lines from index 652
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('Successfully removed SvgDiagramCanvas. New total lines:', lines.length);
} else {
  console.error('Validation failed! Boundaries do not match. Aborting.');
  process.exit(1);
}
