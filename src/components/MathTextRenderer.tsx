import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { cn } from '../lib/utils';

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
const tryParseJsonDiagram = (text: string): any | null => {
  let trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '').trim();
  }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && parsed.type) {
        return parsed;
      }
    } catch (_) {
      // ignore
    }
  }
  return null;
};

/**
 * Splits text into blocks of plain text and blocks containing valid JSON diagrams.
 */
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

const SvgDiagramCanvas: React.FC<{ data: any }> = ({ data }) => {
  const width = 1000;
  const height = 600;

  const arrowDefs = (
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
      </marker>
      <marker id="dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4">
        <circle cx="5" cy="5" r="5" fill="currentColor" />
      </marker>
    </defs>
  );

  if (data.type === 'circle') {
    const cx = data.cx !== undefined ? data.cx : 500;
    const cy = data.cy !== undefined ? data.cy : 300;
    
    // Auto-scale radius if it's small (e.g. math units like 10)
    const rawRadius = data.radius !== undefined ? data.radius : 180;
    const isMathUnits = rawRadius < 50;
    const screenRadius = isMathUnits ? 180 : rawRadius;
    const label = data.centerLabel || data.label || 'O';

    const hasChord = !!data.chord;
    const hasDist = data.distanceFromCenter !== undefined;

    let chordStart = { x: 0, y: 0 };
    let chordEnd = { x: 0, y: 0 };
    let perpFoot = { x: 0, y: 0 };
    let screenDist = 0;
    let halfChordLength = 0;

    if (hasChord || hasDist) {
      const mathRadius = isMathUnits ? rawRadius : 10;
      const mathDist = data.distanceFromCenter !== undefined ? data.distanceFromCenter : 6;
      screenDist = (mathDist / mathRadius) * screenRadius;
      // Clamp screen distance to prevent Math.sqrt errors
      if (screenDist >= screenRadius) screenDist = screenRadius * 0.9;
      halfChordLength = Math.sqrt(screenRadius * screenRadius - screenDist * screenDist);

      chordStart = { x: cx - halfChordLength, y: cy + screenDist };
      chordEnd = { x: cx + halfChordLength, y: cy + screenDist };
      perpFoot = { x: cx, y: cy + screenDist };
    }

    return (
      <svg 
        width="100%"
        height="500"
        viewBox="0 0 1000 600" 
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full text-slate-800 dark:text-slate-200"
      >
        {arrowDefs}
        {/* Draw main circle */}
        <circle 
          cx={cx} 
          cy={cy} 
          r={screenRadius} 
          fill={data.fill || "none"} 
          stroke={data.stroke || "currentColor"} 
          strokeWidth={data.strokeWidth || 3} 
          className="transition-colors duration-300"
        />
        
        {/* Draw center point */}
        <circle cx={cx} cy={cy} r="5" fill="currentColor" />
        <text x={cx - 10} y={cy - 12} className="text-base font-black font-serif fill-current">{label}</text>

        {/* If chord and/or perpendicular distance is specified */}
        {(hasChord || hasDist) && (
          <g>
            {/* Chord line */}
            <line 
              x1={chordStart.x} 
              y1={chordStart.y} 
              x2={chordEnd.x} 
              y2={chordEnd.y} 
              stroke="currentColor" 
              strokeWidth="3.5" 
            />
            {/* Chord labels */}
            <text x={chordStart.x - 20} y={chordStart.y + 18} className="text-base font-black font-serif fill-current">
              {data.chord ? data.chord[0] : 'A'}
            </text>
            <text x={chordEnd.x + 10} y={chordEnd.y + 18} className="text-base font-black font-serif fill-current">
              {data.chord ? data.chord[1] : 'B'}
            </text>

            {/* Perpendicular line to chord */}
            <line 
              x1={cx} 
              y1={cy} 
              x2={perpFoot.x} 
              y2={perpFoot.y} 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeDasharray="4 4" 
            />
            {/* Perpendicular foot point marker */}
            <circle cx={perpFoot.x} cy={perpFoot.y} r="3" fill="currentColor" />
            
            {/* Right-angle indicator at perpendicular intersection */}
            <rect 
              x={cx} 
              y={perpFoot.y - 12} 
              width="12" 
              height="12" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
            />

            {/* Radius line from center to chord end/start */}
            <line 
              x1={cx} 
              y1={cy} 
              x2={chordStart.x} 
              y2={chordStart.y} 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeDasharray="4 4" 
            />

            {/* Labels for values */}
            {/* Distance label */}
            {hasDist && (
              <text x={cx + 12} y={cy + screenDist / 2 + 5} className="text-sm font-extrabold fill-current text-indigo-650 dark:text-indigo-400">
                {data.distanceFromCenter}
              </text>
            )}
            {/* Radius value label */}
            <text x={(cx + chordStart.x) / 2 - 20} y={(cy + chordStart.y) / 2 - 10} className="text-sm font-extrabold fill-current text-indigo-650 dark:text-indigo-400">
              {isMathUnits ? rawRadius : 'r'}
            </text>
          </g>
        )}
      </svg>
    );
  }

  if (data.type === 'coordinate') {
    const points = data.points || [];
    const { xRange, yRange } = getCoordinateBounds(points);
    const mxVal = (x: number) => mapX(x, xRange, width);
    const myVal = (y: number) => mapY(y, yRange, height);

    return (
      <svg 
        width="100%"
        height="500"
        viewBox="0 0 1000 600" 
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full text-slate-800 dark:text-slate-200"
      >
        {arrowDefs}
        <CoordinateGrid xRange={xRange} yRange={yRange} width={width} height={height} />

        {data.xAxis !== false && (
          <g>
            <line x1={mapX(xRange[0], xRange, width)} y1={myVal(0)} x2={mapX(xRange[1], xRange, width)} y2={myVal(0)} stroke="currentColor" strokeWidth="2.5" markerEnd="url(#arrow)" />
            <text x={mapX(xRange[1], xRange, width) - 15} y={myVal(0) - 8} className="text-xs font-bold fill-current">X</text>
          </g>
        )}
        {data.yAxis !== false && (
          <g>
            <line x1={mxVal(0)} y1={mapY(yRange[0], yRange, height)} x2={mxVal(0)} y2={mapY(yRange[1], yRange, height)} stroke="currentColor" strokeWidth="2.5" markerEnd="url(#arrow)" />
            <text x={mxVal(0) + 8} y={mapY(yRange[1], yRange, height) + 15} className="text-xs font-bold fill-current">Y</text>
          </g>
        )}
        {data.xAxis !== false && data.yAxis !== false && (
          <text x={mxVal(0) - 12} y={myVal(0) + 14} className="text-[10px] font-bold fill-current">O</text>
        )}

        {points.map((pt: any, idx: number) => {
          const px = mxVal(pt.x);
          const py = myVal(pt.y);
          return (
            <g key={idx}>
              <circle cx={px} cy={py} r="5" fill="#8A1C36" />
              <text x={px + 8} y={py - 8} className="text-[10px] font-black fill-current">
                {pt.label || `(${pt.x}, ${pt.y})`}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  if (data.type === 'plot') {
    const equation = data.equation || '';
    const expr = equation.replace(/^y\s*=\s*/, '');
    const xRange = data.xRange || [-10, 10];
    const yRange = data.yRange || getPlotBounds(expr, xRange).yRange;
    const mxVal = (x: number) => mapX(x, xRange, width);
    const myVal = (y: number) => mapY(y, yRange, height);

    return (
      <svg 
        width="100%"
        height="500"
        viewBox="0 0 1000 600" 
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full text-slate-800 dark:text-slate-200"
      >
        {arrowDefs}
        <CoordinateGrid xRange={xRange} yRange={yRange} width={width} height={height} />

        <g>
          <line x1={mapX(xRange[0], xRange, width)} y1={myVal(0)} x2={mapX(xRange[1], xRange, width)} y2={myVal(0)} stroke="currentColor" strokeWidth="2.5" markerEnd="url(#arrow)" />
          <text x={mapX(xRange[1], xRange, width) - 15} y={myVal(0) - 8} className="text-xs font-bold fill-current">X</text>
        </g>
        <g>
          <line x1={mxVal(0)} y1={mapY(yRange[0], yRange, height)} x2={mxVal(0)} y2={mapY(yRange[1], yRange, height)} stroke="currentColor" strokeWidth="2.5" markerEnd="url(#arrow)" />
          <text x={mxVal(0) + 8} y={mapY(yRange[1], yRange, height) + 15} className="text-xs font-bold fill-current">Y</text>
        </g>
        {data.xAxis !== false && data.yAxis !== false && (
          <text x={mxVal(0) - 12} y={myVal(0) + 14} className="text-[10px] font-bold fill-current">O</text>
        )}

        <path 
          d={generatePlotPath(expr, xRange, yRange, width, height)}
          fill="none"
          stroke="rgb(79, 70, 229)"
          strokeWidth={3}
          className="transition-colors duration-300"
        />

        <text 
          x={100} 
          y={50} 
          className="text-xs font-bold fill-current text-indigo-600 dark:text-indigo-400"
        >
          {equation}
        </text>
      </svg>
    );
  }

  if (data.type === 'triangle' || data.type === 'polygon') {
    const points = data.points || [];
    const xs = points.map((p: any) => p[0]);
    const ys = points.map((p: any) => p[1]);
    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, 10);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 10);
    
    const padX = (maxX - minX) * 0.1 || 2;
    const padY = (maxY - minY) * 0.1 || 2;
    const xRange: [number, number] = [minX - padX, maxX + padX];
    const yRange: [number, number] = [minY - padY, maxY + padY];

    const mxVal = (x: number) => mapX(x, xRange, width);
    const myVal = (y: number) => mapY(y, yRange, height);

    const pointsStr = points.map((p: any) => `${mxVal(p[0])},${myVal(p[1])}`).join(' ');

    return (
      <svg 
        width="100%"
        height="500"
        viewBox="0 0 1000 600" 
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full text-slate-800 dark:text-slate-200"
      >
        {arrowDefs}
        <polygon 
          points={pointsStr}
          fill="rgba(138, 28, 54, 0.05)"
          stroke="currentColor"
          strokeWidth="3"
        />
        {points.map((pt: any, idx: number) => {
          const label = String.fromCharCode(65 + idx);
          const px = mxVal(pt[0]);
          const py = myVal(pt[1]);
          return (
            <g key={idx}>
              <circle cx={px} cy={py} r="5" fill="currentColor" />
              <text x={px + 10} y={py - 10} className="text-xs font-black fill-current font-serif" textAnchor="middle">{label}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  if (data.type === 'rectangle') {
    let rx = data.x !== undefined ? data.x : -2;
    let ry = data.y !== undefined ? data.y : -2;
    let rw = data.width !== undefined ? data.width : 4;
    let rh = data.height !== undefined ? data.height : 4;

    if (data.points && data.points.length >= 2) {
      const x1 = data.points[0][0];
      const y1 = data.points[0][1];
      const x2 = data.points[1][0];
      const y2 = data.points[1][1];
      rx = Math.min(x1, x2);
      ry = Math.min(y1, y2);
      rw = Math.abs(x1 - x2);
      rh = Math.abs(y1 - y2);
    }

    const xRange: [number, number] = [rx - rw * 0.2 - 1, rx + rw * 1.2 + 1];
    const yRange: [number, number] = [ry - rh * 0.2 - 1, ry + rh * 1.2 + 1];

    const mxVal = (x: number) => mapX(x, xRange, width);
    const myVal = (y: number) => mapY(y, yRange, height);

    const px = mxVal(rx);
    const py = myVal(ry + rh);
    const pw = mxVal(rx + rw) - px;
    const ph = myVal(ry) - py;

    return (
      <svg 
        width="100%"
        height="500"
        viewBox="0 0 1000 600" 
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full text-slate-800 dark:text-slate-200"
      >
        {arrowDefs}
        <rect 
          x={px} 
          y={py} 
          width={pw} 
          height={ph} 
          fill={data.fill || "rgba(79, 70, 229, 0.05)"} 
          stroke={data.stroke || "currentColor"} 
          strokeWidth={data.strokeWidth || 3} 
        />
        {data.label && (
          <text x={px + pw/2} y={py + ph/2} className="text-sm font-bold fill-current" textAnchor="middle" dominantBaseline="middle">
            {data.label}
          </text>
        )}
      </svg>
    );
  }

  // Fallback to legacy shape renderer if not matching coordinate/plot/circle/triangle
  const { xRange, yRange } = getBounds(data);
  const mx = (x: number) => mapX(x, xRange, width);
  const my = (y: number) => mapY(y, yRange, height);

  if (data.type === 'graph' || data.type === 'coordinate_plane') {
    return (
      <svg 
        width="100%"
        height="500"
        viewBox="0 0 1000 600" 
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full text-slate-800 dark:text-slate-200"
      >
        {arrowDefs}
        {data.grid !== false && <GridLines xRange={xRange} yRange={yRange} width={width} height={height} />}
        
        {data.xAxis !== false && (
          <g>
            <line x1={0} y1={my(0)} x2={width} y2={my(0)} stroke="currentColor" strokeWidth="2.5" markerEnd="url(#arrow)" />
            <text x={width - 15} y={my(0) - 8} className="text-xs font-bold fill-current">X</text>
          </g>
        )}
        {data.yAxis !== false && (
          <g>
            <line x1={mx(0)} y1={height} x2={mx(0)} y2={0} stroke="currentColor" strokeWidth="2.5" markerEnd="url(#arrow)" />
            <text x={mx(0) + 8} y={15} className="text-xs font-bold fill-current">Y</text>
          </g>
        )}

        {data.functions?.map((fn: any, idx: number) => (
          <path 
            key={idx}
            d={generateFunctionPath(fn.expr, xRange, yRange, width, height)}
            fill="none"
            stroke={fn.color || "rgb(79, 70, 229)"}
            strokeWidth={3}
            className="transition-colors duration-300"
          />
        ))}

        {data.lines?.map((line: any, idx: number) => (
          <g key={idx}>
            <line 
              x1={mx(line.start[0])} 
              y1={my(line.start[1])} 
              x2={mx(line.end[0])} 
              y2={my(line.end[1])} 
              stroke={line.color || "currentColor"} 
              strokeWidth="2" 
              strokeDasharray={line.dashed ? "4 4" : undefined}
            />
            {line.label && (
              <text 
                x={(mx(line.start[0]) + mx(line.end[0])) / 2 + 5} 
                y={(my(line.start[1]) + my(line.end[1])) / 2 - 5}
                className="text-[10px] font-semibold fill-current"
              >
                {line.label}
              </text>
            )}
          </g>
        ))}

        {data.points?.map((pt: any, idx: number) => {
          const pos = Array.isArray(pt) ? pt : pt.pos;
          const label = pt.label || (Array.isArray(pt) ? `(${pos[0]}, ${pos[1]})` : null);
          return (
            <g key={idx}>
              <circle cx={mx(pos[0])} cy={my(pos[1])} r="5" fill={data.pointColor || "#8A1C36"} />
              {label && (
                <text x={mx(pos[0]) + 6} y={my(pos[1]) - 6} className="text-[9px] font-black fill-current">
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  if (data.type === 'geometry') {
    return (
      <svg 
        width="100%"
        height="500"
        viewBox="0 0 1000 600" 
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full text-slate-800 dark:text-slate-200"
      >
        {arrowDefs}
        
        {data.shapes?.map((shape: any, idx: number) => {
          if (shape.type === 'triangle' || shape.type === 'polygon') {
            const pointsStr = shape.points.map((p: any) => `${mx(p[0])},${my(p[1])}`).join(' ');
            return (
              <polygon 
                key={idx}
                points={pointsStr}
                fill={shape.fill || "rgba(138, 28, 54, 0.05)"}
                stroke={shape.stroke || "currentColor"}
                strokeWidth={shape.strokeWidth || 2.5}
              />
            );
          }
          if (shape.type === 'rectangle') {
            let rx, ry, rw, rh;
            if (shape.points) {
              const x1 = mx(shape.points[0][0]);
              const y1 = my(shape.points[0][1]);
              const x2 = mx(shape.points[1][0]);
              const y2 = my(shape.points[1][1]);
              rx = Math.min(x1, x2);
              ry = Math.min(y1, y2);
              rw = Math.abs(x1 - x2);
              rh = Math.abs(y1 - y2);
            } else {
              rx = mx(shape.x);
              ry = my(shape.y);
              rw = shape.width * (width / (xRange[1] - xRange[0]));
              rh = shape.height * (height / (yRange[1] - yRange[0]));
            }
            return (
              <rect 
                key={idx}
                x={rx}
                y={ry}
                width={rw}
                height={rh}
                fill={shape.fill || "rgba(79, 70, 229, 0.05)"}
                stroke={shape.stroke || "currentColor"}
                strokeWidth={shape.strokeWidth || 2.5}
              />
            );
          }
          if (shape.type === 'circle') {
            const cx = mx(shape.cx !== undefined ? shape.cx : shape.center[0]);
            const cy = my(shape.cy !== undefined ? shape.cy : shape.center[1]);
            const r = shape.r * (width / (xRange[1] - xRange[0]));
            return (
              <circle 
                key={idx}
                cx={cx}
                cy={cy}
                r={r}
                fill={shape.fill || "none"}
                stroke={shape.stroke || "currentColor"}
                strokeWidth={shape.strokeWidth || 2.5}
              />
            );
          }
          if (shape.type === 'line') {
            return (
              <line 
                key={idx}
                x1={mx(shape.x1 !== undefined ? shape.x1 : shape.start[0])}
                y1={my(shape.y1 !== undefined ? shape.y1 : shape.start[1])}
                x2={mx(shape.x2 !== undefined ? shape.x2 : shape.end[0])}
                y2={my(shape.y2 !== undefined ? shape.y2 : shape.end[1])}
                stroke={shape.stroke || "currentColor"}
                strokeWidth={shape.strokeWidth || 2}
                strokeDasharray={shape.dashed ? "4 4" : undefined}
              />
            );
          }
          return null;
        })}

        {data.labels?.map((lbl: any, idx: number) => (
          <text 
            key={idx} 
            x={mx(lbl.pos[0])} 
            y={my(lbl.pos[1])} 
            className="text-xs font-black fill-current font-serif"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {lbl.text}
          </text>
        ))}
      </svg>
    );
  }

  if (data.type === 'matrix' || data.type === 'grid') {
    const isGrid = data.type === 'grid';
    const values = data.values || [[]];
    const rows = values.length;
    const cols = values[0]?.length || 0;

    if (isGrid) {
      const cellW = width / cols;
      const cellH = height / rows;

      return (
        <svg 
          width="100%"
          height="500"
          viewBox="0 0 1000 600" 
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full text-slate-800 dark:text-slate-200"
        >
          {values.map((rowArr: any[], rIdx: number) => (
            rowArr.map((val: any, cIdx: number) => {
              const x = cIdx * cellW;
              const y = rIdx * cellH;
              return (
                <g key={`${rIdx}-${cIdx}`}>
                  <rect 
                    x={x} 
                    y={y} 
                    width={cellW} 
                    height={cellH} 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                  />
                  <text 
                    x={x + cellW/2} 
                    y={y + cellH/2} 
                    className="text-sm font-bold fill-current"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {val}
                  </text>
                </g>
              );
            })
          ))}
        </svg>
      );
    } else {
      const cellW = (width - 60) / cols;
      const cellH = (height - 60) / rows;

      return (
        <svg 
          width="100%"
          height="500"
          viewBox="0 0 1000 600" 
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full text-slate-800 dark:text-slate-200"
        >
          <path 
            d={`M 25 20 L 15 20 L 15 ${height - 20} L 25 ${height - 20}`} 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3.5" 
          />
          {values.map((rowArr: any[], rIdx: number) => (
            rowArr.map((val: any, cIdx: number) => {
              const x = 30 + cIdx * cellW + cellW/2;
              const y = 30 + rIdx * cellH + cellH/2;
              return (
                <text 
                  key={`${rIdx}-${cIdx}`}
                  x={x} 
                  y={y} 
                  className="text-lg font-black fill-current font-serif"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {val}
                </text>
              );
            })
          ))}
          <path 
            d={`M ${width - 25} 20 L ${width - 15} 20 L ${width - 15} ${height - 20} L ${width - 25} ${height - 20}`} 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3.5" 
          />
        </svg>
      );
    }
  }

  // If type unknown, show raw JSON
  return (
    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 w-full overflow-auto max-h-[400px]">
      <pre className="font-mono text-xs text-slate-700 dark:text-slate-350 whitespace-pre">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export interface DiagramRendererProps {
  content?: string;
  data?: any;
  diagram?: any;
  isOption?: boolean;
}

export const DiagramRenderer: React.FC<DiagramRendererProps> = ({
  content,
  data,
  diagram: diagramProp,
  isOption = false,
}) => {
  const [zoom, setZoom] = React.useState(1.0);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStart = React.useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  let diagram = data || diagramProp || (content ? tryParseJsonDiagram(content) : null);
  if (typeof diagram === 'string') {
    diagram = tryParseJsonDiagram(diagram);
  }

  if (!diagram) {
    return <div>Diagram Missing</div>;
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left-click / primary touch
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
    setIsDragging(true);
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    // Divide delta by zoom to maintain 1:1 mouse tracking visually
    setOffset({
      x: dragStart.current.offsetX + dx / zoom,
      y: dragStart.current.offsetY + dy / zoom,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore
    }
    setIsDragging(false);
  };

  return (
    <div className="svg-diagram-card my-4 rounded-2xl border border-slate-200/80 bg-white dark:bg-slate-900 overflow-hidden shadow-md max-w-full relative group">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 select-none">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#8A1C36] dark:text-brand-400 shrink-0">
            <polygon points="7,1 13,5 13,9 7,13 1,9 1,5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {diagram.type} Diagram
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setZoom(1.0); setOffset({ x: 0, y: 0 }); }}
            className="px-2 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-650 cursor-pointer select-none active:scale-95 transition-all"
            title="Reset view"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
            className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer select-none active:scale-95 transition-all"
          >
            -
          </button>
          <span className="text-[10px] font-black text-slate-500 w-8 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(prev => Math.min(3.0, prev + 0.1))}
            className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer select-none active:scale-95 transition-all"
          >
            +
          </button>
        </div>
      </div>

      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="diagram-container p-6 flex justify-center items-center bg-slate-50/20 dark:bg-slate-950/10 overflow-hidden w-full custom-scrollbar select-none"
        style={{ 
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none'
        }}
      >
        <div 
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, 
            transformOrigin: 'center center', 
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)' 
          }}
          className="w-full max-w-[800px] flex justify-center items-center shrink-0 pointer-events-none"
        >
          <div className="w-full">
            <SvgDiagramCanvas data={diagram} />
          </div>
        </div>
      </div>
    </div>
  );
};

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

export const MathTextRenderer: React.FC<MathTextRendererProps> = ({
  text,
  isUser = false,
  className,
  blockSize = 'md',
  isOption = false,
}) => {
  if (!text) return null;

  const parts = text.split(MATH_REGEX);

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
};
