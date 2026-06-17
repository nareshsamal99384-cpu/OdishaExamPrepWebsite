import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SUPPORTED_DIAGRAM_TYPES = [
  'circle', 'coordinate', 'plot', 'triangle', 'rectangle', 'graph', 'coordinate_plane',
  'geometry', 'matrix', 'grid', 'distance', 'cone', 'probability', 'sequence',
  'equation', 'quadratic', 'sphereDivision', 'boatStream', 'ratio', 'statistics',
  'profitLoss', 'cylinder', 'numberTheory', 'polygon', 'vector',
  'square', 'rightTriangle', 'parallelogram', 'cube', 'trapezium', 'semicircle', 'cuboid', 'equilateralTriangle'
];

async function run() {
  console.log('Starting diagram validation audit...');
  const { data: questions, error } = await supabase.from('questions').select('*');
  if (error) {
    console.error('Error fetching questions:', error);
    return;
  }

  const totalQuestions = questions.length;
  let diagramCount = 0;
  let validCount = 0;
  let warningsCount = 0;
  let errorsCount = 0;

  const rows: string[] = [];
  const typeCounts: Record<string, number> = {};

  questions.forEach(q => {
    if (!q.diagram) return;
    diagramCount++;

    const diag = q.diagram;
    const type = diag.type || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    let status = '✅ Valid';
    let notes = 'N/A';

    // 1. Check supported types
    if (!SUPPORTED_DIAGRAM_TYPES.includes(type)) {
      status = '❌ Unsupported Type';
      notes = `Type "${type}" is not registered in SvgDiagramCanvas rendering engine.`;
      errorsCount++;
    } else {
      // 2. Perform basic schema validations for new/complex types
      const warnings: string[] = [];

      if (type === 'circle') {
        if (diag.radius === undefined) warnings.push('Missing "radius"');
      } else if (type === 'cone') {
        if (diag.height === undefined) warnings.push('Missing "height"');
        if (diag.radius === undefined) warnings.push('Missing "radius"');
      } else if (type === 'probability') {
        if (diag.red === undefined && diag.blue === undefined && diag.green === undefined && diag.yellow === undefined) {
          warnings.push('No balls color keys provided');
        }
      } else if (type === 'sequence') {
        if (diag.firstTerm === undefined) warnings.push('Missing "firstTerm"');
        if (diag.difference === undefined) warnings.push('Missing "difference"');
      } else if (type === 'statistics') {
        if (diag.mean === undefined) warnings.push('Missing "mean"');
      } else if (type === 'profitLoss') {
        if (diag.costPrice === undefined) warnings.push('Missing "costPrice"');
        if (diag.profitPercent === undefined) warnings.push('Missing "profitPercent"');
      } else if (type === 'cylinder') {
        if (diag.height === undefined) warnings.push('Missing "height"');
        if (diag.radius === undefined) warnings.push('Missing "radius"');
      } else if (type === 'boatStream') {
        if (diag.distance === undefined) warnings.push('Missing "distance"');
      } else if (type === 'ratio') {
        if (!diag.ratio) warnings.push('Missing "ratio" string');
      } else if (type === 'square') {
        if (diag.side === undefined && diag.diagonal === undefined) warnings.push('Missing "side" or "diagonal"');
      } else if (type === 'rightTriangle') {
        if (diag.leg === undefined) warnings.push('Missing "leg"');
      } else if (type === 'parallelogram') {
        if (diag.base === undefined) warnings.push('Missing "base"');
      } else if (type === 'cube') {
        if (diag.side === undefined) warnings.push('Missing "side"');
      } else if (type === 'trapezium') {
        if (diag.parallelSides === undefined) warnings.push('Missing "parallelSides"');
      } else if (type === 'semicircle') {
        if (diag.radius === undefined) warnings.push('Missing "radius"');
      } else if (type === 'cuboid') {
        if (diag.length === undefined) warnings.push('Missing "length"');
      } else if (type === 'equilateralTriangle') {
        if (diag.side === undefined) warnings.push('Missing "side"');
      }

      if (warnings.length > 0) {
        status = '⚠️ Schema Warnings';
        notes = warnings.join(', ');
        warningsCount++;
      } else {
        validCount++;
      }
    }

    const textSnippet = q.questionText ? q.questionText.substring(0, 50).replace(/\n/g, ' ') + '...' : 'Untitled';
    rows.push(`| \`${q.id.substring(0, 8)}...\` | ${textSnippet} | \`${type}\` | ${status} | ${notes} |`);
  });

  const reportPath = path.resolve(
    'C:/Users/Naresh Samal/.gemini/antigravity-ide/brain/2f3ef1c3-ae43-4943-a2ff-939913121558/diagram_audit_report.md'
  );

  const markdownContent = `# Live Diagram Validation Audit Report

This report presents diagnostic auditing statistics for all diagram-based questions fetched from the live database.

## Executive Summary

* **Total Database Questions scanned**: ${totalQuestions}
* **Questions with Diagram Configurations**: ${diagramCount}
* **Fully Valid / Supported Diagrams**: ${validCount}
* **Diagrams with Schema Warnings (Missing Params)**: ${warningsCount}
* **Critical Failures (Unsupported Types)**: ${errorsCount}

---

## Supported Diagram Type Distribution

${Object.entries(typeCounts)
  .map(([type, count]) => `- **\`${type}\`**: ${count} question(s)`)
  .join('\n')}

---

## Detailed Diagrams Registry

| Question ID | Question Text Snippet | Diagram Type | Validation Status | Schema Notes / Warnings |
|---|---|---|---|---|
${rows.join('\n')}

---

> [!NOTE]
> This diagnostic report was generated automatically by the \`audit_diagrams.ts\` script.
`;

  fs.writeFileSync(reportPath, markdownContent, 'utf8');
  console.log(`Audit report generated successfully at: ${reportPath}`);
}

run();
