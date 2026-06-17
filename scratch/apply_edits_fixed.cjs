const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/components/MathTextRenderer.tsx');
console.log('Reading file:', filePath);

let content = fs.readFileSync(filePath, 'utf8');
// Normalize CRLF to LF
content = content.replace(/\r\n/g, '\n');

// 1. Add import for UniversalMathDiagramEngine at the top
const importOriginal = `import { cn } from '../lib/utils';`;
const importReplacement = `import { cn } from '../lib/utils';\nimport UniversalMathDiagramEngine from './UniversalMathDiagramEngine';`;

if (content.includes(importOriginal)) {
  content = content.replace(importOriginal, importReplacement);
  console.log('Added UniversalMathDiagramEngine import!');
} else {
  console.error('Failed to find importOriginal!');
  process.exit(1);
}

// 2. Replace tryParseJsonDiagram and add new helpers
const tryStartMarker = 'const tryParseJsonDiagram = (text: string): any | null => {';
const tryStartIdx = content.indexOf(tryStartMarker);
const tryEndMarker = 'function splitTextByJsonDiagrams';
const tryEndIdx = content.indexOf(tryEndMarker);

if (tryStartIdx !== -1 && tryEndIdx !== -1 && tryEndIdx > tryStartIdx) {
  const originalBlock = content.substring(tryStartIdx, tryEndIdx);
  const replacementBlock = `export const repairJSStringLatex = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/\\x0c(rac|orall|rown|lat|otnote)(?![a-zA-Z])/g, '\\\\$1')
    .replace(/\\x08(eta|ar|ox|ullet|igcap|igcup|igsqcup|iguplus|igodot|mod|owtie)(?![a-zA-Z])/g, '\\\\$1')
    .replace(/\\x09(heta|imes|riangle|an|tilde|ext|tfrac|tau|o|op|hickspace|iny|today|binom|extbf|extit|exttt|extsf)(?![a-zA-Z])/g, '\\\\$1')
    .replace(/\\x0d(ight|ho|angle|ightarrow|ightharpoonup|ightharpoondown|brace|floor|ceil)(?![a-zA-Z])/g, '\\\\$1')
    .replace(/\\x0a(eq|earrow|abla|eg|ode|u|otin|olimits|ormalsize|obreak|cong|parallel|exists|geq|leq|sub|sube|supe|sup|mid|succ|prec|sim|simeq|um)(?![a-zA-Z])/g, '\\\\$1');
};

export const repairLatexBackslashes = (str: string): string => {
  // Pre-repair raw control characters introduced by JSON parser escaping bugs
  let preCleaned = str
    .replace(/\\x0c(rac|orall|rown|lat|otnote)(?![a-zA-Z])/g, '\\\\\\\\f$1') // Form Feed (\\f) -> \\\\f
    .replace(/\\x08(eta|ar|ox|ullet|igcap|igcup|igsqcup|iguplus|igodot|mod|owtie)(?![a-zA-Z])/g, '\\\\\\\\b$1') // Backspace (\\b) -> \\\\b
    .replace(/\\x09(heta|imes|riangle|an|tilde|ext|tfrac|tau|o|op|hickspace|iny|today|binom|extbf|extit|exttt|extsf)(?![a-zA-Z])/g, '\\\\\\\\t$1') // Tab (\\t) -> \\\\t
    .replace(/\\x0d(ight|ho|angle|ightarrow|ightharpoonup|ightharpoondown|brace|floor|ceil)(?![a-zA-Z])/g, '\\\\\\\\r$1') // Carriage Return (\\r) -> \\\\r
    .replace(/\\x0a(eq|earrow|abla|eg|ode|u|otin|olimits|ormalsize|obreak|cong|parallel|exists|geq|leq|sub|sube|supe|sup|mid|succ|prec|sim|simeq|um)(?![a-zA-Z])/g, '\\\\\\\\n$1'); // Newline (\\n) -> \\\\n

  // Escape backslash followed by a sequence of letters (length >= 2, or length 1 not in bfnrtu)
  return preCleaned.replace(/\\\\\\\\|\\\\([a-zA-Z]+)/g, (match, p1) => {
    if (match === '\\\\\\\\') {
      return '\\\\\\\\';
    }
    if (p1.length === 1 && 'bfnrtu'.includes(p1)) {
      return match;
    }
    return '\\\\\\\\' + p1;
  });
};

export const cleanJsonString = (str: string): string => {
  let cleaned = str.trim();
  
  if (cleaned.startsWith('\`\`\`')) {
    cleaned = cleaned.replace(/^\`\`\`(?:json)?\\s*\\n/, '').replace(/\\n\\s*\`\`\`$/, '').trim();
  }

  if (!((cleaned.startsWith('{') && cleaned.endsWith('}')) || (cleaned.startsWith('[') && cleaned.endsWith(']')))) {
    return cleaned;
  }

  // Pre-repair backslashes for LaTeX content before doing any JSON parsing/validation
  cleaned = repairLatexBackslashes(cleaned);

  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (_) {
    // repair mode
  }

  try {
    let repaired = cleaned
      .replace(/[\\u201C\\u201D]/g, '"')
      .replace(/[\\u2018\\u2019]/g, "'")
      // Replace single quotes surrounding keys
      .replace(/(?:\\s*['"]?([a-zA-Z0-9_.-]+)['"]?\\s*):/g, '"$1":')
      // Replace single quotes surrounding string values
      .replace(/:\\s*'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)'/g, ':"$1"')
      // Remove trailing commas
      .replace(/,\\s*([}\\]])/g, '$1');

    // Replace single quotes around list items/properties
    repaired = repaired.replace(/\\[\\s*'([^']*)'\\s*(?:,\\s*'([^']*)'\\s*)*\\]/g, (match) => {
      return match.replace(/'/g, '"');
    });

    JSON.parse(repaired);
    return repaired;
  } catch (_) {
    // fallback
  }

  return cleaned;
};

/**
 * Try parsing the text as JSON to see if it represents a structured diagram definition.
 */
const tryParseJsonDiagram = (text: string): any | null => {
  const cleaned = cleanJsonString(text);
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === 'object' && parsed.type) {
        return parsed;
      }
    } catch (_) {
      // ignore
    }
  }
  return null;
};

export const extractEmbeddedDiagram = (questionText: string): { cleanedText: string; diagram: any | null } => {
  if (!questionText) return { cleanedText: '', diagram: null };
  
  const jsonSplits = splitTextByJsonDiagrams(questionText);
  let cleanedText = '';
  let diagram: any = null;
  
  for (const split of jsonSplits) {
    if (split.type === 'json') {
      const parsed = tryParseJsonDiagram(split.content);
      if (parsed) {
        diagram = parsed;
      } else {
        cleanedText += split.content;
      }
    } else {
      cleanedText += split.content;
    }
  }
  
  return {
    cleanedText: cleanedText.trim(),
    diagram
  };
};

const KNOWN_DIAGRAM_TYPES = new Set([
  'circle', 'coordinate', 'plot', 'triangle', 'polygon', 'rectangle', 'geometry',
  'matrix', 'grid', 'distance', 'cone', 'probability', 'sequence', 'equation',
  'quadratic', 'sphereDivision', 'boatStream', 'ratio', 'statistics', 'profitLoss',
  'cylinder', 'numberTheory', 'square', 'rightTriangle', 'parallelogram', 'cube',
  'trapezium', 'semicircle', 'cuboid', 'equilateralTriangle', 'vector', 'universal'
]);

const repairObjectStrings = (val: any): any => {
  if (typeof val === 'string') {
    return repairJSStringLatex(val);
  }
  if (Array.isArray(val)) {
    return val.map(repairObjectStrings);
  }
  if (val && typeof val === 'object') {
    const res = {};
    for (const k in val) {
      if (Object.prototype.hasOwnProperty.call(val, k)) {
        res[k] = repairObjectStrings(val[k]);
      }
    }
    return res;
  }
  return val;
};

export const diagramValidator = (diagram: any): any => {
  if (!diagram || typeof diagram !== 'object') return null;
  
  // Recursively repair all string properties to recover any lost backslashes or corrupted control characters
  const repaired = repairObjectStrings(diagram);
  const clone = { ...repaired };
  
  if (typeof clone.type !== 'string') {
    clone.type = String(clone.type || 'unknown');
  }

  if (!KNOWN_DIAGRAM_TYPES.has(clone.type)) {
    console.warn(\`[Diagram Validation] Unknown diagram type: "\${clone.type}"\`);
    clone._unknownType = true;
  }

  // Map elements -> shapes if elements is present but shapes is not
  if (clone.elements && !clone.shapes) {
    clone.shapes = clone.elements;
  }

  // Validate vector shapes
  if (clone.type === 'vector' && Array.isArray(clone.shapes)) {
    clone.shapes = clone.shapes.filter((shape) => {
      if (!shape || typeof shape !== 'object') return false;
      const type = shape.type;
      if (typeof type !== 'string') return false;

      const isNum = (v) => v !== undefined && !isNaN(Number(v));
      const isValidPoint = (p) => Array.isArray(p) && p.length >= 2 && isNum(p[0]) && isNum(p[1]);

      switch (type) {
        case 'line': {
          const hasStartEnd = isValidPoint(shape.start) && isValidPoint(shape.end);
          const hasX1Y1X2Y2 = isNum(shape.x1) && isNum(shape.y1) && isNum(shape.x2) && isNum(shape.y2);
          if (!hasStartEnd && !hasX1Y1X2Y2) {
            console.warn('[Diagram Validation] Line shape missing start/end coordinates:', shape);
            return false;
          }
          return true;
        }
        case 'rect':
        case 'rectangle': {
          const hasPoints = Array.isArray(shape.points) && shape.points.length >= 2 && shape.points.every(isValidPoint);
          const hasXYWH = isNum(shape.x) && isNum(shape.y) && isNum(shape.width) && isNum(shape.height);
          if (!hasPoints && !hasXYWH) {
            console.warn('[Diagram Validation] Rectangle shape missing bounds/points:', shape);
            return false;
          }
          return true;
        }
        case 'circle':
        case 'ellipse': {
          const hasCenter = isValidPoint(shape.center) || (isNum(shape.cx) && isNum(shape.cy));
          const hasRadius = isNum(shape.r) || isNum(shape.rx) || isNum(shape.ry);
          if (!hasCenter || !hasRadius) {
            console.warn('[Diagram Validation] Circle/Ellipse shape missing center/radius:', shape);
            return false;
          }
          return true;
        }
        case 'polygon':
        case 'polyline': {
          const hasPoints = Array.isArray(shape.points) && shape.points.length >= 1 && shape.points.every(isValidPoint);
          if (!hasPoints) {
            console.warn('[Diagram Validation] Polygon/Polyline shape missing points:', shape);
            return false;
          }
          return true;
        }
        case 'path': {
          if (typeof shape.d !== 'string' || !shape.d.trim()) {
            console.warn('[Diagram Validation] Path shape missing d path data:', shape);
            return false;
          }
          return true;
        }
        case 'text': {
          const hasPos = isValidPoint(shape.pos) || (isNum(shape.x) && isNum(shape.y));
          if (!hasPos) {
            console.warn('[Diagram Validation] Text shape missing position:', shape);
            return false;
          }
          return true;
        }
        case 'arc': {
          const hasCenter = isValidPoint(shape.center) || (isNum(shape.cx) && isNum(shape.cy));
          if (!hasCenter) {
            console.warn('[Diagram Validation] Arc shape missing center:', shape);
            return false;
          }
          return true;
        }
        case 'curve': {
          const hasEndPoints = isValidPoint(shape.start) && isValidPoint(shape.end);
          const hasControl = isValidPoint(shape.control1);
          if (!hasEndPoints || !hasControl) {
            console.warn('[Diagram Validation] Curve shape missing start/end/control coordinates:', shape);
            return false;
          }
          return true;
        }
        case 'grid':
          return true;
        default:
          return true;
      }
    });
  }

  const numParams = [
    'radius', 'height', 'width', 'distance', 'speedA', 'speedB', 'distanceFromCenter',
    'red', 'blue', 'green', 'yellow', 'terms', 'firstTerm', 'difference', 'sides',
    'diagonal', 'perimeter', 'largeRadius', 'smallRadius', 'costPrice', 'profitPercent',
    'mean', 'count', 'upstreamTime', 'downstreamTime', 'angle', 'hypotenuse', 'adjacent', 'opposite',
    'side', 'leg', 'length'
  ];

  numParams.forEach(param => {
    if (clone[param] !== undefined) {
      const parsedVal = Number(clone[param]);
      if (isNaN(parsedVal)) {
        console.warn(\`[Diagram Validation] Parameter "\${param}" in diagram of type "\${clone.type}" is not a valid number:\`, clone[param]);
        delete clone[param];
      } else {
        clone[param] = parsedVal;
      }
    }
  });

  if (Array.isArray(clone.points)) {
    clone.points = clone.points.filter((pt) => {
      if (Array.isArray(pt)) {
        return pt.length >= 2 && !isNaN(Number(pt[0])) && !isNaN(Number(pt[1]));
      }
      if (pt && typeof pt === 'object') {
        return !isNaN(Number(pt.x)) && !isNaN(Number(pt.y));
      }
      return false;
    }).map((pt) => {
      if (Array.isArray(pt)) {
        return [Number(pt[0]), Number(pt[1])];
      }
      return { x: Number(pt.x), y: Number(pt.y), label: pt.label };
    });
  }

  return clone;
};

class DiagramErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[DiagramErrorBoundary] Diagram rendering crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const fallbackData = this.props.fallbackData;
      return React.createElement(
        "div",
        { className: "p-4 my-2 border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200 rounded-lg" },
        React.createElement(
          "div",
          { className: "font-bold flex items-center gap-2 mb-1" },
          React.createElement(
            "svg",
            { className: "w-5 h-5 text-rose-500", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: "2" },
            React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" })
          ),
          "Diagram Rendering Error"
        ),
        React.createElement(
          "p",
          { className: "text-xs mb-2 text-rose-600 dark:text-rose-400" },
          this.state.error && this.state.error.message ? this.state.error.message : "An unexpected error occurred during rendering."
        ),
        fallbackData && React.createElement(
          "div",
          { className: "bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 text-[10px] font-mono overflow-auto max-h-[120px]" },
          JSON.stringify(fallbackData, null, 2)
        )
      );
    }
    return this.props.children;
  }
}

\n\n`;

  content = content.substring(0, tryStartIdx) + replacementBlock + content.substring(tryEndIdx);
  console.log('Successfully replaced tryParseJsonDiagram and added helpers!');
} else {
  console.error('Failed to find tryParseJsonDiagram block boundaries!');
  process.exit(1);
}

// 3. Replace DiagramRenderer
const diagramRendererStartTag = 'export const DiagramRenderer: React.FC<DiagramRendererProps> = ({';
const diagramRendererStartIdx = content.indexOf(diagramRendererStartTag);
const nextSectionMarker = '// ─────────────────────────────────────────────────────────────\n// Dynamic Text & Diagram parser';
const diagramRendererEndIdx = content.indexOf(nextSectionMarker);

if (diagramRendererStartIdx !== -1 && diagramRendererEndIdx !== -1 && diagramRendererEndIdx > diagramRendererStartIdx) {
  const replacementRenderer = `export const DiagramRenderer: React.FC<DiagramRendererProps> = ({
  content,
  data,
  diagram: diagramProp,
  isOption = false,
}) => {
  let diagram = data || diagramProp || (content ? tryParseJsonDiagram(content) : null);
  if (typeof diagram === 'string') {
    diagram = tryParseJsonDiagram(diagram);
  }
  diagram = diagramValidator(diagram);

  if (diagram) {
    return (
      <DiagramErrorBoundary fallbackData={diagram}>
        <UniversalMathDiagramEngine data={diagram} />
      </DiagramErrorBoundary>
    );
  }

  return (
    <div className="p-5 my-4 bg-amber-50 dark:bg-amber-950/20 border border-dashed border-amber-300 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 flex flex-col items-center justify-center text-center">
      <svg className="w-8 h-8 text-amber-500 mb-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span className="text-sm font-bold">Diagram Not Available</span>
      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
        The diagram data is missing, empty, or failed validation.
      </p>
    </div>
  );
};\n\n`;

  content = content.substring(0, diagramRendererStartIdx) + replacementRenderer + content.substring(diagramRendererEndIdx);
  console.log('Successfully replaced DiagramRenderer!');
} else {
  console.error('Failed to find DiagramRenderer boundaries!');
  process.exit(1);
}

// 4. Pre-parse MathTextRenderer text
const mathRegexOriginal = `  const parts = text.split(MATH_REGEX);`;
const mathRegexReplacement = `  const repairedText = repairJSStringLatex(text);
  const parts = repairedText.split(MATH_REGEX);`;

if (content.includes(mathRegexOriginal)) {
  content = content.replace(mathRegexOriginal, mathRegexReplacement);
  console.log('Successfully replaced mathRegex split!');
} else {
  console.error('Failed to find mathRegexOriginal!');
  process.exit(1);
}

// 5. Remove SvgDiagramCanvas dead code
const canvasStartTag = `const SvgDiagramCanvas: React.FC<{ data: any }> = ({ data }) => {`;
const canvasStartIndex = content.indexOf(canvasStartTag);
if (canvasStartIndex !== -1) {
  const canvasEndTag = `export interface DiagramRendererProps {`;
  const canvasEndIndex = content.indexOf(canvasEndTag);
  if (canvasEndIndex !== -1 && canvasEndIndex > canvasStartIndex) {
    content = content.substring(0, canvasStartIndex) + content.substring(canvasEndIndex);
    console.log('Successfully removed SvgDiagramCanvas dead code!');
  } else {
    console.error('Failed to find end index for SvgDiagramCanvas!');
    process.exit(1);
  }
} else {
  console.log('SvgDiagramCanvas start not found. Maybe already removed or not present.');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('All replacements written successfully!');
