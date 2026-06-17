function repairLatexBackslashes(str: string): string {
  // Match double backslashes or a single backslash followed by letters
  return str.replace(/\\\\|\\([a-zA-Z]+)/g, (match, p1) => {
    if (match === '\\\\') {
      return '\\\\';
    }
    
    // If it's a standard JSON escape: \b, \f, \n, \r, \t, \u
    if (p1.length === 1 && 'bfnrtu'.includes(p1)) {
      return match;
    }
    
    return '\\\\' + p1;
  });
}

const testCases = [
  'In the circle below, solve for $\\theta$.',
  'In the circle below, solve for $\\theta$ and $\\alpha$ and $\\beta$.',
  'Equation is $y = \\frac{1}{2}x^2$.',
  '{\n  "type": "circle",\n  "label": "$\\theta$"\n}',
  '{\n  "type": "circle",\n  "label": "$\\beta$"\n}',
  'Unicode test: \\u201cSmart Quote\\u201d and degree \\u00b0.',
  'Newline test: \\n and Tab test: \\t.',
  'Already escaped: \\\\theta.'
];

console.log('Running repair tests:');
testCases.forEach((tc, idx) => {
  console.log(`\nTest #${idx + 1}`);
  console.log(`Original: ${JSON.stringify(tc)}`);
  const repaired = repairLatexBackslashes(tc);
  console.log(`Repaired: ${JSON.stringify(repaired)}`);
  try {
    // If it contains a JSON diagram, let's see if it parses
    if (repaired.includes('{')) {
      const parsed = JSON.parse(repaired);
      console.log('Parsed successfully:', parsed);
    }
  } catch (e: any) {
    console.log('Parse error:', e.message);
  }
});
