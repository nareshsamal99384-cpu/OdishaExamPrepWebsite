const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/components/MathTextRenderer.tsx');
console.log('Reading file:', filePath);

let content = fs.readFileSync(filePath, 'utf8');
// Normalize CRLF to LF
content = content.replace(/\r\n/g, '\n');

// 1. repairLatexBackslashes replacement
const repairLatexBackslashesOriginal = `export const repairLatexBackslashes = (str: string): string => {
  // Pre-repair raw control characters introduced by JSON parser escaping bugs
  let preCleaned = str
    .replace(/\\x0c(rac|orall|rown|lat|otnote)(?![a-zA-Z])/g, '\\\\\\\\f$1') // Form Feed (\\f) -> \\\\f (restores \\frac, \\flat, \\footnote)
    .replace(/\\x08(eta|ar|ox|ullet|igcap|igcup|igsqcup|iguplus|igodot|mod|owtie)(?![a-zA-Z])/g, '\\\\\\\\b$1') // Backspace (\\b) -> \\\\b (restores \\beta, \\bar, \\box, \\bullet)
    .replace(/\\x09(heta|imes|riangle|an|tilde|ext|tfrac|tau|o|op|hickspace|iny|today|binom|extbf|extit|exttt|extsf)(?![a-zA-Z])/g, '\\\\\\\\t$1') // Tab (\\t) -> \\\\t (restores \\theta, \\times, \\triangle, \\tan, \\tilde, \\text)
    .replace(/\\x0d(ight|ho|angle|ightarrow|ightharpoonup|ightharpoondown|brace|floor|ceil)(?![a-zA-Z])/g, '\\\\\\\\r$1') // Carriage Return (\\r) -> \\\\r (restores \\right, \\rho, \\rangle, \\rightarrow)
    .replace(/\\x0a(eq|earrow|abla|eg|ode|u|otin|olimits|ormalsize|obreak|cong|parallel|exists|geq|leq|sub|sube|supe|sup|mid|succ|prec|sim|simeq|um)(?![a-zA-Z])/g, '\\\\\\\\n$1'); // Newline (\\n) -> \\\\n (restores \\neq, \\nearrow, \\nabla, \\neg, \\nu, \\notin...)

  // 1. Escape backslash if followed by a character that is NOT a valid JSON escape char, consuming double backslashes first
  preCleaned = preCleaned.replace(/\\\\\\\\|\\\\([^bfnrtu"\\\\\\/])/g, (match, p1) => {
    return match === '\\\\\\\\' ? '\\\\\\\\' : '\\\\\\\\' + p1;
  });

  // 2. Escape \\u if NOT followed by 4 hex digits (e.g. \\underline)
  preCleaned = preCleaned.replace(/\\\\\\\\|\\\\u(?![0-9a-fA-F]{4})/g, (match) => {
    return match === '\\\\\\\\' ? '\\\\\\\\' : '\\\\\\\\u';
  });

  // 3. Escape known LaTeX commands starting with b, f, n, r, t
  const latexCommands = 'theta|imes|riangle|an|tilde|text|tfrac|tau|to|top|thickspace|tiny|today|tbinom|textbf|textit|texttt|textsf|frac|forall|frown|flat|footnote|beta|bar|box|bullet|bigcap|bigcup|bigsqcup|biguplus|bigodot|bmod|bowtie|right|rho|rangle|rightarrow|Rightarrow|rightharpoonup|rightharpoondown|rbrace|rfloor|rceil|neq|nearrow|nabla|neg|node|nu|notin';
  const latexRegex = new RegExp(\`\\\\\\\\\\\\\\\\|\\\\\\\\(\${latexCommands})(?![a-zA-Z])\`, 'g');
  preCleaned = preCleaned.replace(latexRegex, (match, p1) => {
    return match === '\\\\\\\\' ? '\\\\\\\\' : '\\\\\\\\' + p1;
  });

  // 4. Escape \\ne (if not followed by other letters)
  preCleaned = preCleaned.replace(/\\\\\\\\|\\\\ne(?![a-zA-Z])/g, (match) => {
    return match === '\\\\\\\\' ? '\\\\\\\\' : '\\\\\\\\ne';
  });

  return preCleaned;
};`;

const repairLatexBackslashesReplacement = `export const repairLatexBackslashes = (str: string): string => {
  // Pre-repair raw control characters introduced by JSON parser escaping bugs
  let preCleaned = str
    .replace(/\\x0c(rac|orall|rown|lat|otnote)(?![a-zA-Z])/g, '\\\\\\\\f$1') // Form Feed (\\f) -> \\\\f (restores \\frac, \\flat, \\footnote)
    .replace(/\\x08(eta|ar|ox|ullet|igcap|igcup|igsqcup|iguplus|igodot|mod|owtie)(?![a-zA-Z])/g, '\\\\\\\\b$1') // Backspace (\\b) -> \\\\b (restores \\beta, \\bar, \\box, \\bullet)
    .replace(/\\x09(heta|imes|riangle|an|tilde|ext|tfrac|tau|o|op|hickspace|iny|today|binom|extbf|extit|exttt|extsf)(?![a-zA-Z])/g, '\\\\\\\\t$1') // Tab (\\t) -> \\\\t (restores \\theta, \\times, \\triangle, \\tan, \\tilde, \\text)
    .replace(/\\x0d(ight|ho|angle|ightarrow|ightharpoonup|ightharpoondown|brace|floor|ceil)(?![a-zA-Z])/g, '\\\\\\\\r$1') // Carriage Return (\\r) -> \\\\r (restores \\right, \\rho, \\rangle, \\rightarrow)
    .replace(/\\x0a(eq|earrow|abla|eg|ode|u|otin|olimits|ormalsize|obreak|cong|parallel|exists|geq|leq|sub|sube|supe|sup|mid|succ|prec|sim|simeq|um)(?![a-zA-Z])/g, '\\\\\\\\n$1'); // Newline (\\n) -> \\\\n (restores \\neq, \\nearrow, \\nabla, \neg, \nu, \notin...)

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
};`;

// 2. tryParseJsonDiagram replacement
const tryParseJsonDiagramOriginal = `const tryParseJsonDiagram = (text: string): any | null => {
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
};`;

const tryParseJsonDiagramReplacement = `const tryParseJsonDiagram = (text: string): any | null => {
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
    } else if (split.type === 'malformed_json') {
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
    const res: any = {};
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
    clone.shapes = clone.shapes.filter((shape: any) => {
      if (!shape || typeof shape !== 'object') return false;
      const type = shape.type;
      if (typeof type !== 'string') return false;

      const isNum = (v: any) => v !== undefined && !isNaN(Number(v));
      const isValidPoint = (p: any) => Array.isArray(p) && p.length >= 2 && isNum(p[0]) && isNum(p[1]);

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
};`;

// 3. DiagramRenderer replacement
const diagramRendererOriginal = `export const DiagramRenderer: React.FC<DiagramRendererProps> = ({
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
            className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-650 cursor-pointer select-none active:scale-95 transition-all"
          >
            -
          </button>
          <span className="text-[10px] font-black text-slate-500 w-8 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(prev => Math.min(3.0, prev + 0.1))}
            className="w-6 h-6 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-650 cursor-pointer select-none active:scale-95 transition-all"
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
};`;

const diagramRendererReplacement = `export const DiagramRenderer: React.FC<DiagramRendererProps> = ({
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
};`;

// 4. MathTextRenderer MATH_REGEX split replacement
const mathRegexOriginal = `  const parts = text.split(MATH_REGEX);`;
const mathRegexReplacement = `  const repairedText = repairJSStringLatex(text);
  const parts = repairedText.split(MATH_REGEX);`;

// Execute replacements
console.log('Replacing repairLatexBackslashes...');
let index = content.indexOf(repairLatexBackslashesOriginal);
if (index !== -1) {
  content = content.replace(repairLatexBackslashesOriginal, repairLatexBackslashesReplacement);
  console.log('Successfully replaced repairLatexBackslashes!');
} else {
  console.error('Failed to find repairLatexBackslashesOriginal!');
  process.exit(1);
}

console.log('Replacing tryParseJsonDiagram...');
index = content.indexOf(tryParseJsonDiagramOriginal);
if (index !== -1) {
  content = content.replace(tryParseJsonDiagramOriginal, tryParseJsonDiagramReplacement);
  console.log('Successfully replaced tryParseJsonDiagram!');
} else {
  console.error('Failed to find tryParseJsonDiagramOriginal!');
  process.exit(1);
}

console.log('Replacing DiagramRenderer...');
index = content.indexOf(diagramRendererOriginal);
if (index !== -1) {
  content = content.replace(diagramRendererOriginal, diagramRendererReplacement);
  console.log('Successfully replaced DiagramRenderer!');
} else {
  console.error('Failed to find diagramRendererOriginal!');
  process.exit(1);
}

console.log('Replacing mathRegex split...');
index = content.indexOf(mathRegexOriginal);
if (index !== -1) {
  content = content.replace(mathRegexOriginal, mathRegexReplacement);
  console.log('Successfully replaced mathRegex split!');
} else {
  console.error('Failed to find mathRegexOriginal!');
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('All replacements written successfully!');
