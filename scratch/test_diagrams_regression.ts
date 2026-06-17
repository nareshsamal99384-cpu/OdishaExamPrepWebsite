import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const REGISTERED_TYPES = new Set([
  'circle', 'coordinate', 'plot', 'triangle', 'rectangle', 'graph', 'coordinate_plane',
  'geometry', 'matrix', 'grid', 'distance', 'cone', 'probability', 'sequence',
  'equation', 'quadratic', 'sphereDivision', 'boatStream', 'ratio', 'statistics',
  'profitLoss', 'cylinder', 'numberTheory', 'polygon', 'vector',
  'square', 'rightTriangle', 'parallelogram', 'cube', 'trapezium', 'semicircle', 'cuboid', 'equilateralTriangle'
]);

const checkMathExpression = (expr: string): { ok: boolean; reason?: string } => {
  if (/[^0-9a-zA-Z\s+\-*/^%().]/.test(expr)) {
    return { ok: false, reason: 'Disallowed characters in formula expression' };
  }
  const words = expr.match(/[a-zA-Z]+/g) || [];
  const allowed = new Set(['x', 'X', 'sin', 'cos', 'tan', 'sqrt', 'pow', 'pi', 'PI', 'abs', 'log', 'exp']);
  for (const word of words) {
    if (!allowed.has(word)) {
      return { ok: false, reason: `Disallowed word/function name: "${word}"` };
    }
  }
  return { ok: true };
};

async function executeAudit() {
  console.log('🔍 Starting production diagram regression audit...');
  
  const { data: questions, error } = await supabase.from('questions').select('id, questionText, diagram');
  if (error) {
    console.error('❌ Failed to fetch questions from Supabase:', error);
    process.exit(1);
  }

  let totalScanned = 0;
  let diagramsFound = 0;
  let failures = 0;
  const failureLog: string[] = [];

  for (const q of questions) {
    totalScanned++;
    if (!q.diagram) continue;
    diagramsFound++;

    const diag = q.diagram as any;
    const qid = q.id;
    const textSnippet = q.questionText ? q.questionText.substring(0, 60) + '...' : '(Empty)';

    // 1. Verify Diagram Type
    const type = diag.type;
    if (!type || typeof type !== 'string') {
      failures++;
      failureLog.push(`[QID: ${qid}] Diagram is missing a valid "type" parameter. Text: "${textSnippet}"`);
      continue;
    }

    if (!REGISTERED_TYPES.has(type)) {
      failures++;
      failureLog.push(`[QID: ${qid}] Unsupported diagram type: "${type}". Text: "${textSnippet}"`);
      continue;
    }

    // 2. Validate Primitive Geometry Parameters
    if (['circle', 'cone', 'cylinder', 'semicircle'].includes(type)) {
      const radius = diag.radius || diag.r;
      if (radius === undefined || isNaN(Number(radius)) || Number(radius) <= 0) {
        failures++;
        failureLog.push(`[QID: ${qid}] Diagram of type "${type}" has invalid or missing radius: ${radius}`);
      }
    }

    if (['rect', 'rectangle', 'square'].includes(type)) {
      const width = diag.width || diag.side;
      const height = diag.height || diag.side;
      if (width === undefined || isNaN(Number(width)) || Number(width) <= 0) {
        failures++;
        failureLog.push(`[QID: ${qid}] Diagram of type "${type}" has invalid or missing width/side: ${width}`);
      }
    }

    // 3. Validate Equations in Plots & Graphs
    if (type === 'plot' && diag.equation) {
      const expr = diag.equation.replace(/^y\s*=\s*/, '');
      const check = checkMathExpression(expr);
      if (!check.ok) {
        failures++;
        failureLog.push(`[QID: ${qid}] Plot diagram contains unsafe/invalid equation: "${diag.equation}". Reason: ${check.reason}`);
      }
    }

    if (type === 'graph' && Array.isArray(diag.functions)) {
      for (const fn of diag.functions) {
        if (!fn.expr) {
          failures++;
          failureLog.push(`[QID: ${qid}] Graph function missing "expr" field.`);
          continue;
        }
        const check = checkMathExpression(fn.expr);
        if (!check.ok) {
          failures++;
          failureLog.push(`[QID: ${qid}] Graph contains unsafe/invalid function expression: "${fn.expr}". Reason: ${check.reason}`);
        }
      }
    }

    // 4. Validate Vector Elements
    if (type === 'vector') {
      const shapes = diag.shapes || diag.elements || [];
      if (!Array.isArray(shapes)) {
        failures++;
        failureLog.push(`[QID: ${qid}] Vector diagram shapes/elements list is not an array.`);
        continue;
      }

      for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        if (!shape || typeof shape !== 'object') {
          failures++;
          failureLog.push(`[QID: ${qid}] Vector shape index ${i} is not a valid object.`);
          continue;
        }
        
        const shapeType = shape.type;
        if (!shapeType) {
          failures++;
          failureLog.push(`[QID: ${qid}] Vector shape index ${i} is missing "type".`);
          continue;
        }

        // Validate nested vectors
        if (shapeType === 'circle' || shapeType === 'ellipse') {
          const r = shape.r || shape.rx || shape.ry;
          if (r === undefined || isNaN(Number(r)) || Number(r) <= 0) {
            failures++;
            failureLog.push(`[QID: ${qid}] Vector shape index ${i} (circle) has invalid radius: ${r}`);
          }
        }
        
        if (shapeType === 'line') {
          const start = shape.start || [shape.x1, shape.y1];
          const end = shape.end || [shape.x2, shape.y2];
          if (!start || !end || isNaN(Number(start[0])) || isNaN(Number(start[1])) || isNaN(Number(end[0])) || isNaN(Number(end[1]))) {
            failures++;
            failureLog.push(`[QID: ${qid}] Vector shape index ${i} (line) has invalid or missing start/end coordinates: start=${JSON.stringify(start)}, end=${JSON.stringify(end)}`);
          }
        }

        if (shapeType === 'text') {
          const pos = shape.pos || [shape.x, shape.y];
          if (!pos || isNaN(Number(pos[0])) || isNaN(Number(pos[1]))) {
            failures++;
            failureLog.push(`[QID: ${qid}] Vector shape index ${i} (text) has invalid position coordinates: ${JSON.stringify(pos)}`);
          }
        }
      }
    }
  }

  console.log('--- Audit Summary ---');
  console.log(`📊 Total Database Questions Scanned: ${totalScanned}`);
  console.log(`🖼️  Questions with Diagrams Found: ${diagramsFound}`);
  console.log(`❌ Failed Validations: ${failures}`);

  if (failures > 0) {
    console.error('\n🚨 REGRESSION DETECTED! The following diagram configurations are invalid:\n');
    failureLog.forEach(log => console.error(` - ${log}`));
    process.exitCode = 1;
  } else {
    console.log('\n✅ SUCCESS: All database diagram configurations are 100% syntactically and structurally valid!');
  }
}

executeAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
