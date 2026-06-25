import React, { Component, ReactNode } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { cn } from '../lib/utils';
import UniversalMathDiagramEngine from './UniversalMathDiagramEngine';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface MathTextRendererProps {
  text: string;
  isUser?: boolean;
  className?: string;
  /** Size hint for the block equation container */
  blockSize?: 'sm' | 'md' | 'lg';
  isOption?: boolean;
}

type MathPart = {
  raw: string;
  math: string;
  display: 'block' | 'inline' | 'text';
};

// ─────────────────────────────────────────────────────────────
// Delimiter helpers
// ─────────────────────────────────────────────────────────────

/** Returns true if the string contains operators/symbols → likely LaTeX */
const looksLikeMath = (s: string): boolean =>
  /[=^_\\+\-*/]/.test(s) && /[a-zA-Z0-9]/.test(s);

/**
 * Master regex that captures ALL supported math delimiters in one pass.
 *
 * Priority order (first match wins due to left-to-right alternation):
 *   1. $$...$$             → block display
 *   2. \[...\] or \\[...\\] → block display
 *   3. [...]               → block display (custom DB shorthand; content must look like math)
 *   4. \(...\) or \\(...\\) → inline
 *   5. $...$               → inline (guards against lone $ signs)
 */
const MATH_REGEX =
  /(\$\$[\s\S]*?\$\$|\\\\?\[[\s\S]*?\\\\?\]|\[[^\[\]\n]{2,160}\]|\\\\?\([\s\S]*?\\\\?\)|(?:\$(?!\s)[^$\n]+(?<!\s)\$))/g;

// ─────────────────────────────────────────────────────────────
// Part classifier
// ─────────────────────────────────────────────────────────────

function classifyPart(part: string): MathPart {
  // ── Block: $$ ... $$
  if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4)
    return { raw: part, math: part.slice(2, -2).trim(), display: 'block' };

  // ── Block: \[ ... \] or \\[ ... \\]
  if (
    (part.startsWith('\\[') && part.endsWith('\\]')) ||
    (part.startsWith('\\\\[') && part.endsWith('\\\\]'))
  )
    return {
      raw: part,
      math: part.startsWith('\\\\[') ? part.slice(3, -3).trim() : part.slice(2, -2).trim(),
      display: 'block',
    };

  // ── Block: [math] — custom shorthand used in this app's Supabase database
  if (part.startsWith('[') && part.endsWith(']')) {
    const inner = part.slice(1, -1).trim();
    if (looksLikeMath(inner))
      return { raw: part, math: inner, display: 'block' };
  }

  // ── Inline: \( ... \) or \\( ... \\)
  if (
    (part.startsWith('\\(') && part.endsWith('\\)')) ||
    (part.startsWith('\\\\(') && part.endsWith('\\\\)'))
  )
    return {
      raw: part,
      math: part.startsWith('\\\\(') ? part.slice(3, -3).trim() : part.slice(2, -2).trim(),
      display: 'inline',
    };

  // ── Inline: $ ... $
  if (part.startsWith('$') && part.endsWith('$') && part.length > 2)
    return { raw: part, math: part.slice(1, -1).trim(), display: 'inline' };

  return { raw: part, math: part, display: 'text' };
}

// ─────────────────────────────────────────────────────────────
// KaTeX render helper — never throws, always returns HTML + flag
// ─────────────────────────────────────────────────────────────

function renderKatex(math: string, display: boolean): { html: string; ok: boolean } {
  // First attempt: strict render — produces clean output for valid LaTeX
  try {
    const html = katex.renderToString(math, {
      throwOnError: true,
      displayMode: display,
      trust: false,
      strict: false,
    });
    return { html, ok: true };
  } catch (_) {
    // ignore
  }

  // Second attempt: lenient render — KaTeX inlines its own error highlight
  // and returns partial HTML without crashing the page
  try {
    const html = katex.renderToString(math, {
      throwOnError: false,
      displayMode: display,
      trust: false,
      strict: 'ignore',
    });
    // KaTeX adds class="katex-error" for parse failures
    const ok = !html.includes('katex-error');
    return { html, ok };
  } catch (e) {
    console.warn('[MathTextRenderer] KaTeX render failed:', math, e);
    return { html: '', ok: false };
  }
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

const BlockMath: React.FC<{
  math: string;
  raw: string;
  index: number;
  blockSize?: 'sm' | 'md' | 'lg';
}> = ({ math, raw, index, blockSize = 'md' }) => {
  const { html, ok } = renderKatex(math, true);

  // Graceful fallback: show the naked LaTeX source (without delimiters) in a
  // monospace code block — never show raw $$...$$ delimiters to the student.
  if (!ok || !html) {
    return (
      <span
        key={index}
        className="math-equation-block math-equation-block--fallback"
      >
        <code className="font-mono text-sm text-slate-700 whitespace-pre-wrap">{math}</code>
      </span>
    );
  }

  return (
    <span
      key={index}
      className={cn(
        'math-equation-block',
        blockSize === 'sm' && 'math-equation-block--sm',
        blockSize === 'lg' && 'math-equation-block--lg',
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const InlineMath: React.FC<{
  math: string;
  raw: string;
  index: number;
  isUser?: boolean;
}> = ({ math, raw, index, isUser }) => {
  const { html, ok } = renderKatex(math, false);

  // Graceful fallback: show the naked math source without inline $ delimiters
  if (!ok || !html) {
    return (
      <code
        key={index}
        className="inline-block px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 text-xs font-mono align-middle"
      >
        {math}
      </code>
    );
  }

  return (
    <span
      key={index}
      className={cn(
        'math-equation-inline',
        isUser ? 'math-equation-inline--user' : 'math-equation-inline--default',
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// ─────────────────────────────────────────────────────────────
// Plain text renderer — preserves internal line breaks as <br>
// ─────────────────────────────────────────────────────────────

const PlainText: React.FC<{ text: string; index: number }> = ({ text, index }) => {
  if (!text.includes('\n')) return <span key={index}>{text}</span>;
  return (
    <span key={index}>
      {text.split('\n').map((line, li, arr) => (
        <React.Fragment key={li}>
          {line}
          {li < arr.length - 1 && <br />}
        </React.Fragment>
      ))}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// ASCII Diagram Helpers & Renderer
// ─────────────────────────────────────────────────────────────

/**
 * Detects if a single line looks like part of an ASCII diagram.
 */
const lineIsDiagram = (line: string): boolean => {
  if (line.trim().length < 3) return false;
  const trimmed = line.trim();

  // Asterisk patterns (circles, shapes drawn with *)
  const asterisks = (trimmed.match(/\*/g) || []).length;
  if (asterisks >= 3) return true;

  // Dot-heavy patterns (dotted shapes, ellipses)
  const dots = (trimmed.match(/\./g) || []).length;
  if (dots >= 4 && dots / trimmed.length > 0.20) return true;

  // Hash/block patterns (#)
  const hashes = (trimmed.match(/#/g) || []).length;
  if (hashes >= 4) return true;

  // Standard line-art characters (/, \, |, -, +, _, ~, <, >)
  const lineArt = (trimmed.match(/[\/\\|\-+_~<>]/g) || []).length;
  if (lineArt >= 3 && lineArt / trimmed.length > 0.18) return true;

  // Mixed: line with geometry letters + symbols (like "A /|\ B---D")
  const mixedGeo = (trimmed.match(/[\/\\|\-+*\.O]/g) || []).length;
  const letters = (trimmed.match(/[A-Za-z]/g) || []).length;
  if (mixedGeo >= 3 && letters <= 6 && mixedGeo > letters) return true;

  // Box-drawing Unicode characters
  if (/[\u2500-\u257F\u2580-\u259F║═]/.test(trimmed)) return true;

  return false;
};

/**
 * A stricter check for isolated single-line diagrams to prevent false-positives.
 */
const isStrictDiagramLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (trimmed.length < 3) return false;

  // Box-drawing characters
  if (/[\u2500-\u257F\u2580-\u259F║═]/.test(trimmed)) return true;

  // High density line art
  const lineArt = (trimmed.match(/[\/\\|\-+_~<>]/g) || []).length;
  if (lineArt >= 4 && lineArt / trimmed.length > 0.3) return true;

  // Arrows or simple connectors
  if (/^<[\-═]+>$/.test(trimmed) || /^[\-═]+>$/.test(trimmed) || /^<[\-═]+$/.test(trimmed)) return true;

  return false;
};

/**
 * Detects if a line is a diagram label/connector.
 */
const isDiagramLabelLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length > 25) return false;

  // Check if it's composed only of spaces, digits, letters, arrows, and punctuation/geometry symbols
  return /^[A-Za-z0-9\s↑↓←→^<>v|()\-:.,+*=\[\]/\\~#%@θπαβγ°∠△≡≈≠≤≥]*$/.test(trimmed);
};

/**
 * Try parsing the text as JSON to see if it represents a structured diagram definition.
 */
export const repairJSStringLatex = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/\x0c(rac|orall|rown|lat|otnote)(?![a-zA-Z])/g, '\\$1')
    .replace(/\x08(eta|ar|ox|ullet|igcap|igcup|igsqcup|iguplus|igodot|mod|owtie)(?![a-zA-Z])/g, '\\$1')
    .replace(/\x09(heta|imes|riangle|an|tilde|ext|tfrac|tau|o|op|hickspace|iny|today|binom|extbf|extit|exttt|extsf)(?![a-zA-Z])/g, '\\$1')
    .replace(/\x0d(ight|ho|angle|ightarrow|ightharpoonup|ightharpoondown|brace|floor|ceil)(?![a-zA-Z])/g, '\\$1')
    .replace(/\x0a(eq|earrow|abla|eg|ode|u|otin|olimits|ormalsize|obreak|cong|parallel|exists|geq|leq|sub|sube|supe|sup|mid|succ|prec|sim|simeq|um)(?![a-zA-Z])/g, '\\$1');
};

export const repairLatexBackslashes = (str: string): string => {
  // Pre-repair raw control characters introduced by JSON parser escaping bugs
  let preCleaned = str
    .replace(/\x0c(rac|orall|rown|lat|otnote)(?![a-zA-Z])/g, '\\\\f$1') // Form Feed (\f) -> \\f
    .replace(/\x08(eta|ar|ox|ullet|igcap|igcup|igsqcup|iguplus|igodot|mod|owtie)(?![a-zA-Z])/g, '\\\\b$1') // Backspace (\b) -> \\b
    .replace(/\x09(heta|imes|riangle|an|tilde|ext|tfrac|tau|o|op|hickspace|iny|today|binom|extbf|extit|exttt|extsf)(?![a-zA-Z])/g, '\\\\t$1') // Tab (\t) -> \\t
    .replace(/\x0d(ight|ho|angle|ightarrow|ightharpoonup|ightharpoondown|brace|floor|ceil)(?![a-zA-Z])/g, '\\\\r$1') // Carriage Return (\r) -> \\r
    .replace(/\x0a(eq|earrow|abla|eg|ode|u|otin|olimits|ormalsize|obreak|cong|parallel|exists|geq|leq|sub|sube|supe|sup|mid|succ|prec|sim|simeq|um)(?![a-zA-Z])/g, '\\\\n$1'); // Newline (\n) -> \\n

  // Escape backslash followed by a sequence of letters (length >= 2, or length 1 not in bfnrtu)
  return preCleaned.replace(/\\\\|\\([a-zA-Z]+)/g, (match, p1) => {
    if (match === '\\\\') {
      return '\\\\';
    }
    if (p1.length === 1 && 'bfnrtu'.includes(p1)) {
      return match;
    }
    return '\\\\' + p1;
  });
};

export const cleanJsonString = (str: string): string => {
  let cleaned = str.trim();
  
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n/, '').replace(/\n\s*```$/, '').trim();
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
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      // Replace single quotes surrounding keys
      .replace(/(?:\s*['"]?([a-zA-Z0-9_.-]+)['"]?\s*):/g, '"$1":')
      // Replace single quotes surrounding string values
      .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, ':"$1"')
      // Remove trailing commas
      .replace(/,\s*([}\]])/g, '$1');

    // Replace single quotes around list items/properties
    repaired = repaired.replace(/\[\s*'([^']*)'\s*(?:,\s*'([^']*)'\s*)*\]/g, (match) => {
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
    console.warn(`[Diagram Validation] Unknown diagram type: "${clone.type}"`);
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
        console.warn(`[Diagram Validation] Parameter "${param}" in diagram of type "${clone.type}" is not a valid number:`, clone[param]);
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

class DiagramErrorBoundary extends Component<any, any> {
  props: { children: ReactNode; fallbackData: any };
  state: { hasError: boolean; error: any };

  constructor(props: { children: ReactNode; fallbackData: any }) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("[DiagramErrorBoundary] Diagram rendering crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const fallbackData = this.props.fallbackData;
      return (
        <div className="p-4 my-2 border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200 rounded-lg">
          <div className="font-bold flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Diagram Rendering Error
          </div>
          <p className="text-xs mb-2 text-rose-600 dark:text-rose-400">
            {this.state.error?.message || "An unexpected error occurred during rendering."}
          </p>
          {fallbackData && (
            <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 text-[10px] font-mono overflow-auto max-h-[120px]">
              {JSON.stringify(fallbackData, null, 2)}
            </div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}



function splitTextByJsonDiagrams(text: string): { type: 'text' | 'json'; content: string }[] {
  const result: { type: 'text' | 'json'; content: string }[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    const openBrace = text.indexOf('{', currentIndex);
    if (openBrace === -1) {
      result.push({ type: 'text', content: text.substring(currentIndex) });
      break;
    }

    if (openBrace > currentIndex) {
      result.push({ type: 'text', content: text.substring(currentIndex, openBrace) });
    }

    let foundJson = false;
    for (let closeBrace = openBrace + 1; closeBrace < text.length; closeBrace++) {
      if (text[closeBrace] === '}') {
        const potentialJsonStr = text.substring(openBrace, closeBrace + 1);
        const parsed = tryParseJsonDiagram(potentialJsonStr);
        if (parsed) {
          result.push({ type: 'json', content: potentialJsonStr });
          currentIndex = closeBrace + 1;
          foundJson = true;
          break;
        }
      }
    }

    if (!foundJson) {
      result.push({ type: 'text', content: text.substring(openBrace, openBrace + 1) });
      currentIndex = openBrace + 1;
    }
  }

  return result;
}

/**
 * Checks if the entire text block/paragraph is an ASCII or JSON diagram.
 */
const isDiagramBlock = (text: string): boolean => {
  // If it's a JSON diagram, it's definitely a diagram block!
  if (tryParseJsonDiagram(text)) {
    return true;
  }

  // If it contains LaTeX delimiters, it is math/text, not a pure diagram
  if (/(\$\$|\\\[|\\\(|\$)/.test(text)) {
    return false;
  }

  // Diagram characters specified by the user: | - / \ * ○ ● → ↑ ↓ ← + █
  const diagramChars = ['|', '-', '/', '\\', '*', '○', '●', '→', '↑', '↓', '←', '+', '█'];
  const hasDiagChar = diagramChars.some(char => text.includes(char));
  if (!hasDiagChar) {
    return false;
  }

  const lines = text.split('\n');
  if (lines.length === 1) {
    return isStrictDiagramLine(text);
  }

  // Multi-line check: if the block has diagram characters, and doesn't look like standard prose.
  let alphaCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (/[a-zA-Z]/.test(text[i])) {
      alphaCount++;
    }
  }

  // If alphabetical characters are less than 40% of the text, it is highly likely to be a diagram
  if (alphaCount / text.length < 0.40) {
    return true;
  }

  // Identify diagram lines (initial)
  const isDiag = lines.map(line => lineIsDiagram(line));

  // Propagate diagram status to adjacent label/connector lines
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < lines.length; i++) {
      if (!isDiag[i] && isDiag[i - 1] && isDiagramLabelLine(lines[i])) {
        isDiag[i] = true;
      }
    }
    for (let i = lines.length - 2; i >= 0; i--) {
      if (!isDiag[i] && isDiag[i + 1] && isDiagramLabelLine(lines[i])) {
        isDiag[i] = true;
      }
    }
  }

  const diagLinesCount = isDiag.filter(Boolean).length;
  // If at least one line is a diagram line, and at least 30% of the lines are diagram lines
  return diagLinesCount >= 1 && (diagLinesCount / lines.length >= 0.30);
};

// ─────────────────────────────────────────────────────────────
// SVG Rendering Math & Helpers
// ─────────────────────────────────────────────────────────────

const mapX = (x: number, xRange: [number, number], width: number = 600): number => {
  const [minX, maxX] = xRange;
  return 50 + ((x - minX) / (maxX - minX)) * (width - 100);
};

const mapY = (y: number, yRange: [number, number], height: number = 400): number => {
  const [minY, maxY] = yRange;
  return (height - 50) - ((y - minY) / (maxY - minY)) * (height - 100);
};

const getBounds = (data: any): { xRange: [number, number]; yRange: [number, number] } => {
  const xRange: [number, number] = data.xRange || [-10, 10];
  const yRange: [number, number] = data.yRange || [-10, 10];
  return { xRange, yRange };
};

const getCoordinateBounds = (points: any[]): { xRange: [number, number]; yRange: [number, number] } => {
  let minX = -2;
  let maxX = 10;
  let minY = -2;
  let maxY = 10;
  if (points && points.length > 0) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    minX = Math.min(...xs, 0) - 2;
    maxX = Math.max(...xs, 0) + 2;
    minY = Math.min(...ys, 0) - 2;
    maxY = Math.max(...ys, 0) + 2;
  }
  return { xRange: [minX, maxX], yRange: [minY, maxY] };
};

const getPlotBounds = (expr: string, customXRange?: [number, number]): { xRange: [number, number]; yRange: [number, number] } => {
  const xRange = customXRange || [-10, 10];
  const yValues: number[] = [];
  const steps = 100;
  const [minX, maxX] = xRange;
  for (let i = 0; i <= steps; i++) {
    const x = minX + (i / steps) * (maxX - minX);
    const y = evalExpr(expr, x);
    if (!isNaN(y) && isFinite(y)) {
      yValues.push(y);
    }
  }
  let minY = -10;
  let maxY = 10;
  if (yValues.length > 0) {
    minY = Math.min(...yValues);
    maxY = Math.max(...yValues);
    minY = Math.max(-100, Math.min(100, minY));
    maxY = Math.max(-100, Math.min(100, maxY));
    const padding = (maxY - minY) * 0.1 || 2;
    minY -= padding;
    maxY += padding;
  }
  return { xRange, yRange: [minY, maxY] };
};

const getPolygonBounds = (points: [number, number][]): { minX: number; minY: number; w: number; h: number } => {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const minX = Math.min(...xs) - 40;
  const maxX = Math.max(...xs) + 40;
  const minY = Math.min(...ys) - 40;
  const maxY = Math.max(...ys) + 40;
  return {
    minX,
    minY,
    w: Math.max(100, maxX - minX),
    h: Math.max(100, maxY - minY)
  };
};

const evalExpr = (expr: string, x: number): number => {
  try {
    const cleaned = expr
      .replace(/(\d)(x)/gi, '$1*$2')
      .replace(/(\d)\(/g, '$1*(')
      .replace(/\)(x)/gi, ')*$1')
      .replace(/\)\(/g, ')*(')
      .replace(/x/gi, `(${x})`)
      .replace(/sin/gi, 'Math.sin')
      .replace(/cos/gi, 'Math.cos')
      .replace(/tan/gi, 'Math.tan')
      .replace(/sqrt/gi, 'Math.sqrt')
      .replace(/pi/gi, 'Math.PI')
      .replace(/pow/gi, 'Math.pow')
      .replace(/\^/g, '**');
    return Function(`"use strict"; return (${cleaned})`)();
  } catch (e) {
    console.error('Failed to evaluate function expression:', expr, e);
    return 0;
  }
};

const generateFunctionPath = (
  expr: string,
  xRange: [number, number],
  yRange: [number, number],
  width: number,
  height: number
): string => {
  const [minX, maxX] = xRange;
  const steps = 100;
  const points: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const x = minX + (i / steps) * (maxX - minX);
    const y = evalExpr(expr, x);
    if (!isNaN(y) && isFinite(y)) {
      points.push([x, y]);
    }
  }

  const svgPoints = points
    .map(([x, y]) => [mapX(x, xRange, width), mapY(y, yRange, height)])
    .filter(([sx, sy]) => sx >= -10 && sx <= width + 10 && sy >= -10 && sy <= height + 10);

  if (svgPoints.length === 0) return '';
  return svgPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
};

const generatePlotPath = (
  expr: string,
  xRange: [number, number],
  yRange: [number, number],
  width: number = 600,
  height: number = 400
): string => {
  const [minX, maxX] = xRange;
  const steps = 100;
  const points: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const x = minX + (i / steps) * (maxX - minX);
    const y = evalExpr(expr, x);
    if (!isNaN(y) && isFinite(y)) {
      points.push([x, y]);
    }
  }

  const svgPoints = points.map(([x, y]) => [mapX(x, xRange, width), mapY(y, yRange, height)]);

  if (svgPoints.length === 0) return '';
  return svgPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
};

const GridLines: React.FC<{
  xRange: [number, number];
  yRange: [number, number];
  width: number;
  height: number;
}> = ({ xRange, yRange, width, height }) => {
  const [minX, maxX] = xRange;
  const [minY, maxY] = yRange;
  const lines: React.ReactNode[] = [];

  for (let x = Math.ceil(minX); x <= Math.floor(maxX); x++) {
    if (x === 0) continue;
    const sx = mapX(x, xRange, width);
    lines.push(
      <line 
        key={`v-${x}`} 
        x1={sx} 
        y1={0} 
        x2={sx} 
        y2={height} 
        stroke="rgba(148, 163, 184, 0.15)" 
        strokeWidth="1" 
      />
    );
  }

  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    if (y === 0) continue;
    const sy = mapY(y, yRange, height);
    lines.push(
      <line 
        key={`h-${y}`} 
        x1={0} 
        y1={sy} 
        x2={width} 
        y2={sy} 
        stroke="rgba(148, 163, 184, 0.15)" 
        strokeWidth="1" 
      />
    );
  }

  return <g>{lines}</g>;
};

const CoordinateGrid: React.FC<{
  xRange: [number, number];
  yRange: [number, number];
  width?: number;
  height?: number;
}> = ({ xRange, yRange, width = 600, height = 400 }) => {
  const [minX, maxX] = xRange;
  const [minY, maxY] = yRange;
  const lines: React.ReactNode[] = [];

  for (let x = Math.ceil(minX); x <= Math.floor(maxX); x++) {
    if (x === 0) continue;
    const sx = mapX(x, xRange, width);
    lines.push(
      <line 
        key={`cv-${x}`} 
        x1={sx} 
        y1={50} 
        x2={sx} 
        y2={height - 50} 
        stroke="rgba(148, 163, 184, 0.15)" 
        strokeWidth="1" 
      />
    );
  }

  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    if (y === 0) continue;
    const sy = mapY(y, yRange, height);
    lines.push(
      <line 
        key={`ch-${y}`} 
        x1={50} 
        y1={sy} 
        x2={width - 50} 
        y2={sy} 
        stroke="rgba(148, 163, 184, 0.15)" 
        strokeWidth="1" 
      />
    );
  }

  return <g>{lines}</g>;
};

export interface DiagramRendererProps {
  content?: string;
  data?: any;
  diagram?: any;
  isOption?: boolean;
}

export const DiagramRenderer: React.FC<DiagramRendererProps> = React.memo(({
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
});

// ─────────────────────────────────────────────────────────────
// Dynamic Text & Diagram parser
// ─────────────────────────────────────────────────────────────

function renderTextAndDiagrams(text: string, isOption: boolean, keyPrefix: string): React.ReactNode {
  const jsonSplits = splitTextByJsonDiagrams(text);
  
  if (jsonSplits.length > 1 || (jsonSplits.length === 1 && jsonSplits[0].type === 'json')) {
    return (
      <React.Fragment key={keyPrefix}>
        {jsonSplits.map((split, sIdx) => {
          const key = `${keyPrefix}-split-${sIdx}`;
          if (split.type === 'json') {
            return <DiagramRenderer key={key} content={split.content} isOption={isOption} />;
          } else {
            return renderTextAndDiagramsWithAscii(split.content, isOption, key);
          }
        })}
      </React.Fragment>
    );
  }

  return renderTextAndDiagramsWithAscii(text, isOption, keyPrefix);
}

function renderTextAndDiagramsWithAscii(text: string, isOption: boolean, keyPrefix: string): React.ReactNode {
  if (isDiagramBlock(text)) {
    return <DiagramRenderer content={text} isOption={isOption} />;
  }

  if (!text.includes('\n')) {
    if (isStrictDiagramLine(text)) {
      return <DiagramRenderer content={text} isOption={isOption} />;
    }
    return <span key={keyPrefix}>{text}</span>;
  }

  const lines = text.split('\n');
  const initialIsDiag = lines.map(line => lineIsDiagram(line));

  const isDiag = [...initialIsDiag];
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < lines.length; i++) {
      if (!isDiag[i] && isDiag[i - 1] && isDiagramLabelLine(lines[i])) {
        isDiag[i] = true;
      }
    }
    for (let i = lines.length - 2; i >= 0; i--) {
      if (!isDiag[i] && isDiag[i + 1] && isDiagramLabelLine(lines[i])) {
        isDiag[i] = true;
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') {
      let hasDiagBefore = false;
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].trim() !== '') {
          if (isDiag[j]) hasDiagBefore = true;
          break;
        }
      }
      let hasDiagAfter = false;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() !== '') {
          if (isDiag[j]) hasDiagAfter = true;
          break;
        }
      }
      if (hasDiagBefore && hasDiagAfter) {
        isDiag[i] = true;
      }
    }
  }

  interface LineBlock {
    type: 'text' | 'diagram';
    lines: string[];
  }

  const blocks: LineBlock[] = [];
  let currentType: 'text' | 'diagram' = 'text';
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isDiagram = isDiag[i];

    if (i === 0) {
      currentType = isDiagram ? 'diagram' : 'text';
      currentLines.push(line);
    } else {
      if (isDiagram === (currentType === 'diagram')) {
        currentLines.push(line);
      } else {
        blocks.push({ type: currentType, lines: currentLines });
        currentType = isDiagram ? 'diagram' : 'text';
        currentLines = [line];
      }
    }
  }
  if (currentLines.length > 0) {
    blocks.push({ type: currentType, lines: currentLines });
  }

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === 'diagram' && b.lines.length === 1) {
      if (!isStrictDiagramLine(b.lines[0])) {
        b.type = 'text';
      }
    }
  }

  const mergedBlocks: LineBlock[] = [];
  for (const b of blocks) {
    if (mergedBlocks.length === 0) {
      mergedBlocks.push(b);
    } else {
      const last = mergedBlocks[mergedBlocks.length - 1];
      if (last.type === b.type) {
        last.lines.push(...b.lines);
      } else {
        mergedBlocks.push(b);
      }
    }
  }

  return (
    <React.Fragment key={keyPrefix}>
      {mergedBlocks.map((block, bIdx) => {
        const key = `${keyPrefix}-${bIdx}`;
        const content = block.lines.join('\n');
        if (block.type === 'diagram') {
          return <DiagramRenderer content={content} isOption={isOption} />;
        } else {
          return <PlainText text={content} index={bIdx} key={key} />;
        }
      })}
    </React.Fragment>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export const MathTextRenderer: React.FC<MathTextRendererProps> = React.memo(({
  text,
  isUser = false,
  className,
  blockSize = 'md',
  isOption = false,
}) => {
  if (!text) return null;

  const repairedText = repairJSStringLatex(text);
  const parts = repairedText.split(MATH_REGEX);

  return (
    <span className={cn('math-text-container break-words', className)}>
      {parts.map((part, index) => {
        if (!part) return null;

        const classified = classifyPart(part);

        if (classified.display === 'block') {
          return (
            <BlockMath
              key={index}
              math={classified.math}
              raw={classified.raw}
              index={index}
              blockSize={blockSize}
            />
          );
        }

        if (classified.display === 'inline') {
          return (
            <InlineMath
              key={index}
              math={classified.math}
              raw={classified.raw}
              index={index}
              isUser={isUser}
            />
          );
        }

        return renderTextAndDiagrams(part, isOption, `text-${index}`);
      })}
    </span>
  );
});
