import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { cn } from '../lib/utils';
import { 
  ZoomIn, ZoomOut, RotateCcw, Play, Eye, EyeOff, Ruler, MapPin, 
  HelpCircle, ChevronRight, Layers, Tag
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types & Coordinate Mapping Helpers
// ─────────────────────────────────────────────────────────────

export interface ShapeElement {
  id: string;
  type: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  width?: number;
  height?: number;
  rotation?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  opacity?: number;
  label?: string;
  labelPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  labelX?: number;
  labelY?: number;
  fontSize?: number;
  zIndex?: number;
  draggable?: boolean;
  animated?: boolean;
  visible?: boolean;
  center?: [number, number];
  radius?: number;
  
  // Custom shape specific properties
  points?: [number, number][] | { x: number; y: number; label?: string }[];
  start?: [number, number];
  control1?: [number, number];
  control2?: [number, number];
  end?: [number, number];
  startAngle?: number;
  endAngle?: number;
  dashed?: boolean;
  arrow?: boolean;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  
  // 3D wireframe and specialized shapes properties
  size?: number;
  depth?: number;
  slant?: number;
  expression?: string;
  equation?: string;
  values?: any[];
  items?: string[];
  angle?: number;
  time?: string; // e.g. "10:10"
  year?: number;
  month?: number;
  
  // Venn / normal curve properties
  mean?: number;
  sd?: number;
  costPrice?: number;
  sellingPrice?: number;
  profitPercent?: number;
  lossPercent?: number;
  pos?: [number, number];
  text?: string;
  color?: string;

  // New unified properties for statistics, curves, reasoning, and trigonometry
  min?: number;
  q1?: number;
  median?: number;
  q3?: number;
  max?: number;
  steps?: { direction: string; distance: number; label?: string }[];
  highlightDays?: number[];
  faces?: string[];
  seatingType?: 'circular' | 'linear';
  names?: string[];
  elevationAngle?: number;
  depressionAngle?: number;

  // Custom X-Axis & Y-Axis properties
  startX?: number;
  endX?: number;
  startY?: number;
  endY?: number;
  valueStart?: number;
  valueEnd?: number;
  showLine?: boolean;
  showTicks?: boolean;
  showGrid?: boolean;
  tickSpacing?: number;
  tickLength?: number;
  showNumbers?: boolean;
  position?: 'bottom' | 'top' | 'center' | 'left' | 'right';
  unit?: string;
}

export interface UniversalMathDiagramProps {
  data: {
    type?: string;
    width?: number;
    height?: number;
    viewBox?: string | number[];
    xRange?: [number, number];
    yRange?: [number, number];
    grid?: boolean;
    xAxis?: boolean;
    yAxis?: boolean;
    xAxisLabel?: string;
    yAxisLabel?: string;
    xAxisArrow?: boolean;
    xAxisTicks?: boolean;
    xAxisNumbers?: boolean;
    xAxisPosition?: 'bottom' | 'top' | 'center' | number;
    xAxisStep?: number;
    xAxisUnit?: string;
    yAxisArrow?: boolean;
    yAxisTicks?: boolean;
    yAxisNumbers?: boolean;
    yAxisPosition?: 'left' | 'right' | 'center' | number;
    yAxisStep?: number;
    yAxisUnit?: string;
    shapes?: ShapeElement[];
    elements?: ShapeElement[];
    aspectRatio?: string;
  };
}

const getCenterX = (s: any): number => {
  if (s.cx !== undefined) return s.cx;
  if (s.center && Array.isArray(s.center)) return s.center[0];
  if (s.x !== undefined && (s.type === 'circle' || s.type === 'ellipse' || s.type === 'arc' || s.type === 'angle' || s.type === 'rightAngle')) return s.x;
  return 0;
};

const getCenterY = (s: any): number => {
  if (s.cy !== undefined) return s.cy;
  if (s.center && Array.isArray(s.center)) return s.center[1];
  if (s.y !== undefined && (s.type === 'circle' || s.type === 'ellipse' || s.type === 'arc' || s.type === 'angle' || s.type === 'rightAngle')) return s.y;
  return 0;
};

const mapX = (x: number, xRange: [number, number], width: number): number => {
  const [minX, maxX] = xRange;
  return 60 + ((x - minX) / (maxX - minX)) * (width - 120);
};

const mapY = (y: number, yRange: [number, number], height: number): number => {
  const [minY, maxY] = yRange;
  return (height - 60) - ((y - minY) / (maxY - minY)) * (height - 120);
};

const diagramKatexCache = new Map<string, string>();

const RenderLatexLabel: React.FC<{
  text: string;
  x: number;
  y: number;
  size?: number;
  color?: string;
  anchor?: 'start' | 'middle' | 'end';
  visible?: boolean;
}> = ({ text, x, y, size = 13, color, anchor = 'middle', visible = true }) => {
  if (!visible) return null;
  const isMath = text.includes('$') || text.includes('\\(') || text.includes('\\[');

  let elements: React.ReactNode;
  if (isMath) {
    try {
      // Split by $ to isolate math segments
      const parts = text.split('$');
      elements = parts.map((part, index) => {
        const isMathPart = index % 2 === 1;
        if (isMathPart) {
          try {
            let html = diagramKatexCache.get(part);
            if (!html) {
              html = katex.renderToString(part, { displayMode: false, throwOnError: false, output: 'html' });
              diagramKatexCache.set(part, html);
            }
            return (
              <span 
                key={index}
                dangerouslySetInnerHTML={{ __html: html }}
                style={{ display: 'inline-block', margin: '0 2px' }}
              />
            );
          } catch (err) {
            return <span key={index}>{part}</span>;
          }
        } else {
          return <span key={index}>{part}</span>;
        }
      });
    } catch (e) {
      elements = <span>{text}</span>;
    }
  } else {
    elements = <span>{text}</span>;
  }

  // Determine if it is a short point label (e.g. A, B, C, O, X, Y, or coordinates like "(3,4)")
  const plainText = text.replace(/[\$\\]/g, '').trim();
  const isPointLabel = plainText.length <= 2;

  const foWidth = 500;
  const foHeight = Math.max(40, size * 2.2);
  let foX = x - foWidth / 2;
  const foY = y - foHeight / 2;

  const divStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    color: color || 'currentColor',
    fontSize: `${size}px`,
    fontFamily: 'var(--font-sans), sans-serif',
    whiteSpace: 'nowrap',
    position: 'absolute',
    top: '50%',
  };

  if (anchor === 'start') {
    foX = x;
    divStyle.left = '0';
    divStyle.transform = 'translateY(-50%)';
  } else if (anchor === 'end') {
    foX = x - foWidth;
    divStyle.right = '0';
    divStyle.transform = 'translateY(-50%)';
  } else {
    foX = x - foWidth / 2;
    divStyle.left = '50%';
    divStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <foreignObject 
      x={foX} 
      y={foY} 
      width={foWidth} 
      height={foHeight} 
      style={{ overflow: 'visible', pointerEvents: 'none' }}
    >
      <div 
        className={cn(
          "bg-white dark:bg-[#070b12] border border-slate-200/90 dark:border-slate-800/80 font-black select-none text-slate-800 dark:text-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
          isPointLabel 
            ? (size > 15 ? "px-2 py-1 rounded" : "px-1.5 py-0.5 rounded") 
            : (size > 15 ? "px-3 py-1.5 rounded-md" : "px-2 py-0.5 rounded-md")
        )}
        style={divStyle}
      >
        {elements}
      </div>
    </foreignObject>
  );
};

// ─────────────────────────────────────────────────────────────
// Color readability helper for Dark Mode
// ─────────────────────────────────────────────────────────────
const getReadableColor = (colorStr: string, isDark: boolean): string => {
  if (!colorStr) return 'currentColor';
  if (!isDark) return colorStr;
  
  const cleanColor = colorStr.trim().toLowerCase();
  
  // Replace standard dark colors with high contrast slate/off-white in dark mode
  if (
    cleanColor === '#1e293b' || 
    cleanColor === '#0f172a' || 
    cleanColor === '#000000' || 
    cleanColor === 'black' || 
    cleanColor === '#333333' || 
    cleanColor === '#333' || 
    cleanColor === '#111827' ||
    cleanColor === '#1f2937' ||
    cleanColor === '#111' ||
    cleanColor === '#475569'
  ) {
    return '#f8fafc';
  }
  
  // If hex, calculate relative luminance and make sure it has high contrast
  if (cleanColor.startsWith('#')) {
    const hex = cleanColor.substring(1);
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (luminance < 0.35) {
      return '#f1f5f9';
    }
  }
  
  return colorStr;
};

// ─────────────────────────────────────────────────────────────
// Premium Color Palette Mapper
// ─────────────────────────────────────────────────────────────
const getPremiumColor = (colorStr: string | undefined, isDark: boolean, index?: number): string => {
  const premiumColors = [
    { light: '#4f46e5', dark: '#818cf8' }, // Indigo
    { light: '#f43f5e', dark: '#fb7185' }, // Rose-Red
    { light: '#059669', dark: '#34d399' }, // Emerald-Green
    { light: '#d97706', dark: '#fbbf24' }, // Amber-Gold
    { light: '#7c3aed', dark: '#a78bfa' }, // Violet-Purple
    { light: '#ea580c', dark: '#fb923c' }, // Orange
    { light: '#0d9488', dark: '#2dd4bf' }  // Teal
  ];

  if (!colorStr) {
    if (index !== undefined && !isNaN(index)) {
      const color = premiumColors[index % premiumColors.length];
      return isDark ? color.dark : color.light;
    }
    return isDark ? '#818cf8' : '#4f46e5'; // Premium Indigo default
  }
  
  const cleanColor = colorStr.trim().toLowerCase();
  if (cleanColor === 'none') return 'none';
  if (cleanColor === 'currentcolor' || cleanColor === 'inherit') return colorStr;
  
  // Map generic colors to premium curated colors
  const colorMap: Record<string, { light: string; dark: string }> = {
    'red': { light: '#f43f5e', dark: '#fb7185' }, // Premium vivid rose-red
    'blue': { light: '#2563eb', dark: '#60a5fa' }, // Sky-blue / electric blue
    'green': { light: '#059669', dark: '#34d399' }, // Premium mint-emerald
    'yellow': { light: '#d97706', dark: '#fbbf24' }, // Warm amber-gold
    'purple': { light: '#7c3aed', dark: '#a78bfa' }, // Premium violet
    'orange': { light: '#ea580c', dark: '#fb923c' }, // Bright coral-orange
    'pink': { light: '#db2777', dark: '#f472b6' }, // Premium rose-pink
    'teal': { light: '#0d9488', dark: '#2dd4bf' }, // Modern teal
    'indigo': { light: '#4f46e5', dark: '#818cf8' }, // Indigo
    'gray': { light: '#475569', dark: '#cbd5e1' }, // Cool slate-gray
    'black': { light: '#0f172a', dark: '#f8fafc' }, // Slate-900 / Slate-50
    'white': { light: '#ffffff', dark: '#070b12' },
  };

  if (colorMap[cleanColor]) {
    return isDark ? colorMap[cleanColor].dark : colorMap[cleanColor].light;
  }

  // Handle standard hex color readability
  return getReadableColor(colorStr, isDark);
};

// Helper to classify if a label string is a measurement (number, dimension, variable like r/h/w/l/d)
const isMeasurementLabel = (textStr: string, shapeType?: string): boolean => {
  const clean = textStr.replace(/[\$\\]/g, '').trim();
  
  // 1. Explicitly associated with measurement/angle helper shape types
  if (shapeType === 'distanceLine' || shapeType === 'measurement' || shapeType === 'rightAngle' || shapeType === 'angle') {
    return true;
  }
  
  // 2. Contains digits (except coordinate values like "(3,4)" or "A(2,3)")
  const isCoordinate = /^[A-Z]?(?:_\w+|')?\s*\(-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\)$/i.test(clean) ||
                       /^\(-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\)$/.test(clean);
  if (/\d/.test(clean) && !isCoordinate) {
    return true;
  }
  
  // 3. Contains common measurement units or keywords
  const hasMeasurementKeywords = /cm|meter|inch|ft|yd|mm|deg|rad|°|\\circ|theta|\\theta|alpha|\\alpha|beta|\\beta|phi|\\phi|pi|\\pi|side|area|vol|width|height|length|radius|diag/i.test(clean);
  if (hasMeasurementKeywords) {
    return true;
  }
  
  // 4. Common single lowercase letters representing radius, height, width, length, diagonal, side, etc.
  if (/^[rhwldsxyzabcθ]$/.test(clean)) {
    return true;
  }
  
  return false;
};

// ─────────────────────────────────────────────────────────────
// Normalization Layer for Legacy Preset Templates
// ─────────────────────────────────────────────────────────────

const normalizeDiagramData = (raw: any): any => {
  if (!raw || typeof raw !== 'object') return { type: 'vector', shapes: [] };

  if (raw.type === 'vector' || raw.type === 'universal') {
    const shapes = raw.shapes || raw.elements || [];
    return {
      ...raw,
      type: 'vector',
      shapes: JSON.parse(JSON.stringify(shapes))
    };
  }

  // Create standard canvas structure
  const result: any = {
    type: 'vector',
    width: raw.width || 1000,
    height: raw.height || 600,
    grid: raw.grid !== undefined ? raw.grid : false,
    xAxis: raw.xAxis !== undefined ? raw.xAxis : false,
    yAxis: raw.yAxis !== undefined ? raw.yAxis : false,
    xAxisLabel: raw.xAxisLabel || '',
    yAxisLabel: raw.yAxisLabel || '',
    xAxisArrow: raw.xAxisArrow !== undefined ? raw.xAxisArrow : true,
    xAxisTicks: raw.xAxisTicks !== undefined ? raw.xAxisTicks : true,
    xAxisNumbers: raw.xAxisNumbers !== undefined ? raw.xAxisNumbers : true,
    xAxisPosition: raw.xAxisPosition !== undefined ? raw.xAxisPosition : 'bottom',
    xAxisStep: raw.xAxisStep || 0,
    xAxisUnit: raw.xAxisUnit || '',
    yAxisArrow: raw.yAxisArrow !== undefined ? raw.yAxisArrow : true,
    yAxisTicks: raw.yAxisTicks !== undefined ? raw.yAxisTicks : true,
    yAxisNumbers: raw.yAxisNumbers !== undefined ? raw.yAxisNumbers : true,
    yAxisPosition: raw.yAxisPosition !== undefined ? raw.yAxisPosition : 'left',
    yAxisStep: raw.yAxisStep || 0,
    yAxisUnit: raw.yAxisUnit || '',
    xRange: raw.xRange || [-10, 10],
    yRange: raw.yRange || [-10, 10],
    shapes: []
  };

  const shapes: any[] = [];

  if (raw.type === 'circle') {
    const r = raw.radius !== undefined ? raw.radius : 10;
    const centerLabel = raw.centerLabel || 'O';
    result.xRange = [-r - 2, r + 2];
    result.yRange = [-r - 2, r + 2];

    shapes.push({
      id: 'circle-base',
      type: 'circle',
      cx: 0,
      cy: 0,
      r: r,
      stroke: raw.stroke || '#4f46e5',
      strokeWidth: raw.strokeWidth || 3,
      fill: raw.fill || 'none'
    });

    shapes.push({
      id: 'circle-center',
      type: 'point',
      x: 0,
      y: 0,
      r: 5,
      fill: 'currentColor',
      label: centerLabel,
      labelPosition: 'top-left'
    });

    if (raw.chord || raw.distanceFromCenter !== undefined) {
      const d = raw.distanceFromCenter !== undefined ? raw.distanceFromCenter : 6;
      let clampedD = d;
      if (clampedD >= r) clampedD = r * 0.9;
      const halfChord = Math.sqrt(r * r - clampedD * clampedD);

      shapes.push({
        id: 'circle-chord',
        type: 'line',
        x1: -halfChord,
        y1: clampedD,
        x2: halfChord,
        y2: clampedD,
        stroke: 'currentColor',
        strokeWidth: 3.5,
        label: raw.chord || 'AB'
      });

      // perpendicular
      shapes.push({
        id: 'circle-perp',
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 0,
        y2: clampedD,
        stroke: 'currentColor',
        strokeWidth: 2,
        dashed: true,
        label: String(d)
      });

      // radius helper
      shapes.push({
        id: 'circle-radius',
        type: 'line',
        x1: 0,
        y1: 0,
        x2: -halfChord,
        y2: clampedD,
        stroke: 'currentColor',
        strokeWidth: 2,
        dashed: true,
        label: 'r'
      });

      // right angle
      shapes.push({
        id: 'circle-rightangle',
        type: 'rightAngle',
        cx: 0,
        cy: clampedD,
        r: 15,
        startAngle: 0,
        endAngle: 90,
        stroke: 'currentColor',
        strokeWidth: 1.5
      });
    }
  } else if (raw.type === 'coordinate') {
    result.grid = true;
    result.xAxis = true;
    result.yAxis = true;
    const points = raw.points || [];
    points.forEach((pt: any, idx: number) => {
      shapes.push({
        id: `coord-pt-${idx}`,
        type: 'point',
        x: pt.x,
        y: pt.y,
        r: 6,
        fill: '#ef4444',
        label: pt.label || `(${pt.x}, ${pt.y})`,
        labelPosition: 'top'
      });
    });

    let minX = -5, maxX = 5, minY = -5, maxY = 5;
    if (points.length > 0) {
      const xs = points.map((p: any) => p.x);
      const ys = points.map((p: any) => p.y);
      minX = Math.min(...xs) - 2;
      maxX = Math.max(...xs) + 2;
      minY = Math.min(...ys) - 2;
      maxY = Math.max(...ys) + 2;
    }
    result.xRange = [minX, maxX];
    result.yRange = [minY, maxY];
  } else if (raw.type === 'plot') {
    result.grid = true;
    result.xAxis = true;
    result.yAxis = true;
    const equation = raw.equation || '';
    const expr = equation.replace(/^y\s*=\s*/, '');
    const xr = raw.xRange || [-10, 10];
    result.xRange = xr;

    shapes.push({
      id: 'plot-curve',
      type: 'functionPlot',
      equation: expr,
      stroke: '#4f46e5',
      strokeWidth: 3,
      label: equation,
      labelX: (xr[0] + xr[1]) / 2,
      labelY: 4
    });
  } else if (raw.type === 'graph') {
    result.grid = true;
    result.xAxis = true;
    result.yAxis = true;
    result.xRange = raw.xRange || [-5, 5];
    result.yRange = raw.yRange || [-5, 5];

    if (raw.functions) {
      raw.functions.forEach((fn: any, idx: number) => {
        shapes.push({
          id: `graph-fn-${idx}`,
          type: 'functionPlot',
          equation: fn.expr,
          stroke: fn.color || '#4f46e5',
          strokeWidth: 3
        });
      });
    }
    if (raw.points) {
      raw.points.forEach((pt: any, idx: number) => {
        const pos = Array.isArray(pt) ? pt : pt.pos;
        shapes.push({
          id: `graph-pt-${idx}`,
          type: 'point',
          x: pos[0],
          y: pos[1],
          fill: '#ef4444',
          label: pt.label || `(${pos[0]}, ${pos[1]})`,
          labelPosition: 'top'
        });
      });
    }
  } else if (raw.type === 'triangle' || raw.type === 'polygon' || raw.type === 'rightTriangle' || raw.type === 'equilateralTriangle') {
    let pts = raw.points;
    if (!pts || pts.length === 0) {
      if (raw.type === 'rightTriangle') {
        const leg = raw.leg || 6;
        const hyp = raw.hypotenuse || 10;
        const otherLeg = Math.sqrt(hyp * hyp - leg * leg) || 8;
        pts = [[0, 0], [otherLeg, 0], [0, leg]];
      } else if (raw.type === 'equilateralTriangle') {
        const s = raw.side || 8;
        pts = [[0, 0], [s, 0], [s/2, s * Math.sqrt(3)/2]];
      } else {
        pts = [[0, 0], [6, 0], [0, 8]];
      }
    }
    shapes.push({
      id: 'poly-shape',
      type: 'polygon',
      points: pts,
      stroke: raw.stroke || '#8a1c36',
      strokeWidth: 3,
      fill: raw.fill || 'rgba(138, 28, 54, 0.05)'
    });

    pts.forEach((p: any, idx: number) => {
      shapes.push({
        id: `poly-pt-${idx}`,
        type: 'point',
        x: p[0],
        y: p[1],
        r: 5,
        label: String.fromCharCode(65 + idx),
        labelPosition: p[0] === 0 ? 'left' : 'right'
      });
    });

    if (raw.type === 'rightTriangle' || (pts.length === 3 && pts[0][0] === pts[2][0] && pts[0][1] === pts[1][1])) {
      shapes.push({
        id: 'poly-rightangle',
        type: 'rightAngle',
        cx: pts[0][0],
        cy: pts[0][1],
        r: 15,
        startAngle: 0,
        endAngle: 90,
        stroke: 'currentColor'
      });
    }

    const xs = pts.map((p: any) => p[0]);
    const ys = pts.map((p: any) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    result.xRange = [minX - 2, maxX + 2];
    result.yRange = [minY - 2, maxY + 2];
  } else if (raw.type === 'rectangle' || raw.type === 'square') {
    let w = raw.width || 8;
    let h = raw.height || 5;
    if (raw.type === 'square') {
      w = raw.side || raw.size || 6;
      h = w;
    }
    result.xRange = [-w/2 - 2, w/2 + 2];
    result.yRange = [-h/2 - 2, h/2 + 2];

    shapes.push({
      id: 'rect-shape',
      type: 'rectangle',
      x: -w/2,
      y: -h/2,
      width: w,
      height: h,
      stroke: raw.stroke || '#4f46e5',
      strokeWidth: 3,
      fill: raw.fill || 'rgba(79, 70, 229, 0.05)',
      label: raw.label || ''
    });

    if (raw.diagonal) {
      shapes.push({
        id: 'rect-diag',
        type: 'line',
        x1: -w/2,
        y1: -h/2,
        x2: w/2,
        y2: h/2,
        stroke: '#ef4444',
        strokeWidth: 2,
        dashed: true,
        label: `d = ${raw.diagonal}`
      });
    }
  } else if (raw.type === 'boatStream') {
    const d = raw.distance || 60;
    const upTime = raw.upstreamTime || 5;
    const downTime = raw.downstreamTime || 3;
    result.xRange = [-10, 10];
    result.yRange = [-6, 6];

    shapes.push({
      id: 'river-rect',
      type: 'rect',
      x: -9,
      y: -4,
      width: 18,
      height: 8,
      fill: 'rgba(56, 189, 248, 0.08)',
      stroke: 'rgba(56, 189, 248, 0.2)',
      strokeWidth: 2
    });

    shapes.push({
      id: 'wave-1',
      type: 'path',
      d: 'M -8 -2 Q -4 -3 0 -2 T 8 -2',
      stroke: 'rgba(14, 165, 233, 0.25)',
      strokeWidth: 3
    });

    shapes.push({
      id: 'wave-2',
      type: 'path',
      d: 'M -8 2 Q -4 1 0 2 T 8 2',
      stroke: 'rgba(14, 165, 233, 0.15)',
      strokeWidth: 2
    });

    shapes.push({
      id: 'boat-poly',
      type: 'polygon',
      points: [[-1.5, -1], [1.5, -1], [1, 0.5], [-1, 0.5]],
      fill: '#b45309',
      stroke: '#78350f',
      strokeWidth: 2,
      label: 'BOAT'
    });

    shapes.push({
      id: 'flow-arrow',
      type: 'vector',
      start: [-3, -3.2],
      end: [3, -3.2],
      stroke: '#0ea5e9',
      strokeWidth: 3,
      label: 'Stream Direction →'
    });

    shapes.push({
      id: 'downstream-lbl',
      type: 'text',
      pos: [4, 2],
      text: `Downstream: ${downTime}h`,
      color: '#10b981',
      size: 13
    });

    shapes.push({
      id: 'upstream-lbl',
      type: 'text',
      pos: [-4, 2],
      text: `Upstream: ${upTime}h`,
      color: '#ef4444',
      size: 13
    });

    shapes.push({
      id: 'dist-lbl',
      type: 'text',
      pos: [0, -4.8],
      text: `Total Distance: ${d} km`,
      color: 'currentColor',
      size: 14
    });
  } else if (raw.type === 'ratio') {
    const ratioStr = raw.ratio || '4:5';
    const parts = ratioStr.split(':').map(Number);
    const pA = parts[0] || 4;
    const pB = parts[1] || 5;

    result.xRange = [-2, Math.max(pA, pB) + 4];
    result.yRange = [-4, 4];

    for (let i = 0; i < pA; i++) {
      shapes.push({
        id: `ratio-a-${i}`,
        type: 'rect',
        x: i,
        y: 1,
        width: 0.9,
        height: 0.9,
        fill: 'rgba(99, 102, 241, 0.15)',
        stroke: '#4f46e5',
        strokeWidth: 2,
        label: 'x'
      });
    }

    shapes.push({
      id: 'ratio-lbl-a',
      type: 'text',
      pos: [-0.8, 1.45],
      text: raw.labelA || 'A',
      color: '#4f46e5',
      size: 14
    });

    for (let i = 0; i < pB; i++) {
      shapes.push({
        id: `ratio-b-${i}`,
        type: 'rect',
        x: i,
        y: -0.5,
        width: 0.9,
        height: 0.9,
        fill: 'rgba(244, 63, 94, 0.15)',
        stroke: '#f43f5e',
        strokeWidth: 2,
        label: 'x'
      });
    }

    shapes.push({
      id: 'ratio-lbl-b',
      type: 'text',
      pos: [-0.8, -0.05],
      text: raw.labelB || 'B',
      color: '#f43f5e',
      size: 14
    });
  } else if (raw.type === 'statistics') {
    result.grid = false;
    result.xAxis = true;
    result.yAxis = true;
    const mean = raw.mean !== undefined ? raw.mean : 50;
    const sd = raw.sd !== undefined ? raw.sd : 5;
    result.xRange = [mean - 4 * sd, mean + 4 * sd];
    result.yRange = [-0.05, 0.35];

    shapes.push({
      id: 'stat-curve',
      type: 'functionPlot',
      equation: `0.3 * Math.exp(-0.5 * Math.pow((x - ${mean}) / ${sd}, 2))`,
      stroke: '#6366f1',
      strokeWidth: 3.5,
      label: raw.label || `μ = ${mean}, σ = ${sd}`
    });

    shapes.push({
      id: 'stat-mean',
      type: 'line',
      x1: mean,
      y1: 0,
      x2: mean,
      y2: 0.3,
      stroke: '#f43f5e',
      strokeWidth: 2,
      dashed: true
    });

    shapes.push({
      id: 'stat-sd-minus',
      type: 'line',
      x1: mean - sd,
      y1: 0,
      x2: mean - sd,
      y2: 0.3 * Math.exp(-0.5),
      stroke: '#6366f1',
      strokeWidth: 1.5,
      dashed: true,
      label: 'μ - σ'
    });

    shapes.push({
      id: 'stat-sd-plus',
      type: 'line',
      x1: mean + sd,
      y1: 0,
      x2: mean + sd,
      y2: 0.3 * Math.exp(-0.5),
      stroke: '#6366f1',
      strokeWidth: 1.5,
      dashed: true,
      label: 'μ + σ'
    });
  } else if (raw.type === 'profitLoss') {
    const cp = raw.costPrice || 1200;
    const profit = raw.profitPercent || 15;
    const profitVal = (cp * profit) / 100;
    const sp = cp + profitVal;

    result.xRange = [-5, 5];
    result.yRange = [0, Math.max(cp, sp) + 300];

    shapes.push({
      id: 'pl-cp',
      type: 'rect',
      x: -2.5,
      y: 0,
      width: 1.5,
      height: cp,
      fill: 'rgba(100, 116, 139, 0.3)',
      stroke: '#475569',
      strokeWidth: 2,
      label: `CP: ₹${cp}`
    });

    shapes.push({
      id: 'pl-sp',
      type: 'rect',
      x: 1.0,
      y: 0,
      width: 1.5,
      height: sp,
      fill: 'rgba(16, 185, 129, 0.3)',
      stroke: '#047857',
      strokeWidth: 2,
      label: `SP: ₹${sp}`
    });

    shapes.push({
      id: 'pl-arrow',
      type: 'curve',
      start: [-1, cp],
      control1: [0, sp + 100],
      end: [1, sp],
      stroke: '#10b981',
      strokeWidth: 2.5,
      arrowEnd: true,
      label: `Profit: +${profit}%`
    });
  } else if (raw.type === 'numberTheory') {
    const expr = raw.expression || '7^100 mod 6';
    const base = expr.includes('mod 6') ? 6 : 8;
    result.xRange = [-4, 4];
    result.yRange = [-4, 4];

    shapes.push({
      id: 'nt-dial',
      type: 'circle',
      cx: 0,
      cy: 0,
      r: 2.5,
      stroke: 'currentColor',
      strokeWidth: 2
    });

    for (let i = 0; i < base; i++) {
      const angle = (i * 2 * Math.PI) / base - Math.PI / 2;
      const x = 2.5 * Math.cos(angle);
      const y = -2.5 * Math.sin(angle);
      shapes.push({
        id: `nt-num-${i}`,
        type: 'point',
        x,
        y,
        r: 10,
        fill: 'rgba(99, 102, 241, 0.1)',
        stroke: '#4f46e5',
        label: String(i)
      });
    }

    shapes.push({
      id: 'nt-lbl',
      type: 'text',
      pos: [0, -3.5],
      text: `${expr} ≡ 1 (mod ${base})`,
      color: '#4f46e5',
      size: 15
    });
  } else if (raw.type === 'cone' || raw.type === 'cylinder' || raw.type === 'cube' || raw.type === 'cuboid' || raw.type === 'sphere') {
    result.xRange = [-5, 5];
    result.yRange = [-5, 5];

    shapes.push({
      id: 'solid-3d',
      type: raw.type,
      x: -1.5,
      y: -1.5,
      width: 3,
      height: 3,
      depth: 2,
      stroke: raw.stroke || '#6366f1',
      fill: raw.fill || 'rgba(99, 102, 241, 0.04)',
      label: raw.label || `${raw.type.toUpperCase()}`
    });
  } else if (raw.type === 'matrix' || raw.type === 'grid') {
    const values = raw.values || [[1, 2], [3, 4]];
    const R = values.length;
    const C = values[0]?.length || 0;

    result.xRange = [-1, C];
    result.yRange = [-1, R];

    if (raw.type === 'grid') {
      for (let r = 0; r <= R; r++) {
        shapes.push({
          id: `grid-h-${r}`,
          type: 'line',
          x1: 0,
          y1: r,
          x2: C,
          y2: r,
          stroke: 'currentColor',
          strokeWidth: 1.5
        });
      }
      for (let c = 0; c <= C; c++) {
        shapes.push({
          id: `grid-v-${c}`,
          type: 'line',
          x1: c,
          y1: 0,
          x2: c,
          y2: R,
          stroke: 'currentColor',
          strokeWidth: 1.5
        });
      }
    } else {
      shapes.push({
        id: 'matrix-bracket-l',
        type: 'path',
        d: `M -0.2 0 L -0.5 0 L -0.5 ${R} L -0.2 ${R}`,
        stroke: 'currentColor',
        strokeWidth: 3,
        fill: 'none'
      });
      shapes.push({
        id: 'matrix-bracket-r',
        type: 'path',
        d: `M ${C - 0.8} 0 L ${C - 0.5} 0 L ${C - 0.5} ${R} L ${C - 0.8} ${R}`,
        stroke: 'currentColor',
        strokeWidth: 3,
        fill: 'none'
      });
    }

    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        shapes.push({
          id: `matrix-cell-${r}-${c}`,
          type: 'text',
          pos: [c + 0.5, R - r - 0.5],
          text: String(values[r][c]),
          size: 15
        });
      }
    }
  } else if (raw.type === 'distance') {
    const pointA = raw.pointA || 'A';
    const pointB = raw.pointB || 'B';
    const speedA = raw.speedA;
    const speedB = raw.speedB;
    const distVal = raw.distance;

    result.xRange = [-10, 10];
    result.yRange = [-5, 5];

    shapes.push({
      id: 'dist-road',
      type: 'rect',
      x: -9,
      y: -1,
      width: 18,
      height: 2,
      fill: '#1e293b',
      stroke: 'none'
    });

    shapes.push({
      id: 'dist-road-dashes',
      type: 'line',
      x1: -8.8,
      y1: 0,
      x2: 8.8,
      y2: 0,
      stroke: '#f1f5f9',
      strokeWidth: 2,
      dashed: true
    });

    shapes.push({
      id: 'dist-station-a',
      type: 'circle',
      cx: -7.5,
      cy: 0,
      r: 0.6,
      fill: '#6366f1'
    });

    shapes.push({
      id: 'dist-sta-lbl',
      type: 'text',
      pos: [-7.5, 1.2],
      text: `Station ${pointA}`
    });

    shapes.push({
      id: 'dist-station-b',
      type: 'circle',
      cx: 7.5,
      cy: 0,
      r: 0.6,
      fill: '#e11d48'
    });

    shapes.push({
      id: 'dist-stb-lbl',
      type: 'text',
      pos: [7.5, 1.2],
      text: `Station ${pointB}`
    });

    if (speedA !== undefined) {
      shapes.push({
        id: 'dist-speed-a',
        type: 'vector',
        start: [-5, 0.5],
        end: [-2, 0.5],
        stroke: '#818cf8',
        strokeWidth: 3,
        label: `Train A: ${speedA} km/h →`
      });
    }

    if (speedB !== undefined) {
      shapes.push({
        id: 'dist-speed-b',
        type: 'vector',
        start: [5, -0.5],
        end: [2, -0.5],
        stroke: '#fda4af',
        strokeWidth: 3,
        label: `← Train B: ${speedB} km/h`
      });
    }

    if (distVal !== undefined) {
      shapes.push({
        id: 'dist-measurement',
        type: 'distanceLine',
        x1: -7.5,
        y1: -2.2,
        x2: 7.5,
        y2: -2.2,
        label: `${distVal} km`
      });
    }
  } else {
    const originalShapes = raw.shapes || raw.elements || [];
    shapes.push(...JSON.parse(JSON.stringify(originalShapes)));
  }

  result.shapes = shapes;
  return result;
};

// ─────────────────────────────────────────────────────────────
// Main Diagram Component
// ─────────────────────────────────────────────────────────────

export default function UniversalMathDiagramEngine({ data: rawData }: UniversalMathDiagramProps) {
  const data = useMemo(() => normalizeDiagramData(rawData), [rawData]);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const vWidth = data.width || 1000;
  const vHeight = data.height || 600;

  // 1. Toggles State
  const [showLabels, setShowLabels] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [isMouseOverCanvas, setIsMouseOverCanvas] = useState(false);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);

  // Theme Detection State for Contrast Optimization
  const [isDark, setIsDark] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkDark = () => {
      const isHtmlDark = document.documentElement.classList.contains('dark');
      const isBodyDark = document.body ? document.body.classList.contains('dark') : false;
      const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(isHtmlDark || isBodyDark || isSystemDark);
    };
    checkDark();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkDark();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    if (document.body) {
      observer.observe(document.body, { attributes: true });
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      checkDark();
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      observer.disconnect();
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  // 2. Interactive Canvas State
  const [zoom, setZoom] = useState(1.0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // Pinch-to-zoom and wheel tracking refs
  const activePointers = useRef<Map<number, any>>(new Map());
  const prevPinchDistance = useRef<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Performance-optimized gesture tracking refs to bypass React render cycle
  const currentZoom = useRef(zoom);
  const currentOffset = useRef(offset);
  const transformWrapperRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);

  // Sync refs when state changes from external triggers (e.g. toolbar buttons)
  useEffect(() => {
    currentZoom.current = zoom;
  }, [zoom]);

  useEffect(() => {
    currentOffset.current = offset;
  }, [offset]);

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // Hover and Click selections
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Cursor coordinates
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, cx: 0, cy: 0, svgX: 0, svgY: 0 });

  // Draggable shapes state
  const shapesData = data.shapes || data.elements || [];
  const [dynamicShapes, setDynamicShapes] = useState<ShapeElement[]>([]);
  const sortedShapes = useMemo(() => {
    return [...dynamicShapes].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [dynamicShapes]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragStartCoords = useRef({ x: 0, y: 0, initialX: 0, initialY: 0, initialX1: 0, initialY1: 0, initialX2: 0, initialY2: 0 });

  // Initialize dynamic shapes from props
  useEffect(() => {
    setDynamicShapes(JSON.parse(JSON.stringify(shapesData)));
  }, [shapesData]);

  // Premium Grid Line Color
  const gridLineColor = isDark 
    ? (isMobile ? "rgba(99, 102, 241, 0.35)" : "rgba(99, 102, 241, 0.18)") 
    : (isMobile ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.12)");

  const arrowDefs = (
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
      </marker>
      <marker id="dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4">
        <circle cx="5" cy="5" r="5" fill="currentColor" />
      </marker>
      {isDark ? (
        <radialGradient id="grid-bg-gradient" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#0d1527" />
          <stop offset="100%" stopColor="#070b12" />
        </radialGradient>
      ) : (
        <radialGradient id="grid-bg-gradient" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </radialGradient>
      )}
    </defs>
  );

  // Replay animation trigger
  const triggerReplay = () => {
    setIsPlayingAnimation(false);
    setTimeout(() => {
      setAnimationKey(prev => prev + 1);
      setIsPlayingAnimation(true);
    }, 50);
  };

  // 3. Dynamic Bounding Box & Scale Calculations
  const { xRange, yRange, autoScaled } = useMemo(() => {
    if (data.xRange && data.yRange) {
      return { xRange: data.xRange, yRange: data.yRange, autoScaled: false };
    }

    // Auto-calculate bounds based on shape positions
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    const trackPoint = (x: number, y: number) => {
      if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) return;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    };

    shapesData.forEach(s => {
      if (!s) return;
      
      // 1. Coordinates with x/y (rect, square, text, clock, etc.)
      if (s.x !== undefined && s.y !== undefined) {
        trackPoint(s.x, s.y);
        if (s.width !== undefined) {
          trackPoint(s.x + s.width, s.y + (s.height !== undefined ? s.height : s.width));
        } else if (s.size !== undefined) {
          trackPoint(s.x + s.size, s.y + s.size);
        }
      }
      
      // 2. Center-radius shapes (circle, ellipse, arc, hexagon, pentagon, octagon, regularPolygon, rhombus, kite, etc.)
      const cxVal = getCenterX(s);
      const cyVal = getCenterY(s);
      const hasCenter = s.cx !== undefined || s.cy !== undefined || (s.center && Array.isArray(s.center));
      
      if (hasCenter || s.type === 'circle' || s.type === 'ellipse' || s.type === 'arc' || s.type === 'hexagon' || s.type === 'pentagon' || s.type === 'octagon' || s.type === 'regularPolygon' || s.type === 'rhombus' || s.type === 'kite') {
        trackPoint(cxVal, cyVal);
        const rVal = s.radius || s.r || s.rx || s.ry || s.size || 0;
        const rxVal = s.rx || (s.width ? s.width / 2 : rVal);
        const ryVal = s.ry || (s.height ? s.height / 2 : rVal);
        trackPoint(cxVal - rxVal, cyVal - ryVal);
        trackPoint(cxVal + rxVal, cyVal + ryVal);
      }
      
      // 3. Line ticks / segments (x1, y1, x2, y2)
      if (s.x1 !== undefined && s.y1 !== undefined) trackPoint(s.x1, s.y1);
      if (s.x2 !== undefined && s.y2 !== undefined) trackPoint(s.x2, s.y2);
      
      // 4. Start / End points (curves, lines, arrows)
      if (s.start) trackPoint(s.start[0], s.start[1]);
      if (s.end) trackPoint(s.end[0], s.end[1]);
      if (s.control1) trackPoint(s.control1[0], s.control1[1]);
      if (s.control2) trackPoint(s.control2[0], s.control2[1]);
      
      // 5. Polygon points arrays
      if (Array.isArray(s.points)) {
        s.points.forEach((p: any) => {
          if (Array.isArray(p)) trackPoint(p[0], p[1]);
          else if (p && typeof p === 'object') trackPoint(p.x, p.y);
        });
      }
    });

    const hasPoints = minX !== Infinity;
    const paddingX = hasPoints ? Math.max((maxX - minX) * 0.15, 2) : 10;
    const paddingY = hasPoints ? Math.max((maxY - minY) * 0.15, 2) : 10;

    const finalXRange: [number, number] = hasPoints ? [minX - paddingX, maxX + paddingX] : [-10, 10];
    const finalYRange: [number, number] = hasPoints ? [minY - paddingY, maxY + paddingY] : [-10, 10];

    return { xRange: finalXRange, yRange: finalYRange, autoScaled: true };
  }, [shapesData, data.xRange, data.yRange]);

  const mx = useCallback((x: number) => mapX(x, xRange, vWidth), [xRange, vWidth]);
  const my = useCallback((y: number) => mapY(y, yRange, vHeight), [yRange, vHeight]);

  // Map distances
  const muX = useCallback((dx: number) => {
    return dx * ((vWidth - 120) / (xRange[1] - xRange[0]));
  }, [xRange, vWidth]);

  const muY = useCallback((dy: number) => {
    return dy * ((vHeight - 120) / (yRange[1] - yRange[0]));
  }, [yRange, vHeight]);

  // Inverse coordinate mapping (SVG -> Cartesian)
  const getCartesian = useCallback((svgX: number, svgY: number) => {
    const x = ((svgX - 60) / (vWidth - 120)) * (xRange[1] - xRange[0]) + xRange[0];
    const y = (((vHeight - 60) - svgY) / (vHeight - 120)) * (yRange[1] - yRange[0]) + yRange[0];
    return { x, y };
  }, [xRange, yRange, vWidth, vHeight]);
  // Resolved Labels with Collision Resolution
  const resolvedLabels = useMemo(() => {
    if (!showLabels) return [];

    interface LabelInstance {
      id: string;
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      anchor: 'start' | 'middle' | 'end';
      size: number;
      color: string;
      labelPosition?: string;
      isMeasurement: boolean;
    }

    const instances: LabelInstance[] = [];

    dynamicShapes.forEach((shape, idx) => {
      if (shape.visible === false) return;

      let labelStr = shape.label || shape.text || (shape.type === 'text' ? shape.expression : '');
      
      // Calculate default label for distanceLine or measurement shapes if empty
      if (!labelStr && (shape.type === 'distanceLine' || shape.type === 'measurement')) {
        const dx = (shape.x2 || 0) - (shape.x1 || 0);
        const dy = (shape.y2 || 0) - (shape.y1 || 0);
        labelStr = `${Math.sqrt(dx * dx + dy * dy).toFixed(1)}`;
      }

      if (!labelStr) return;

      const baseSize = shape.fontSize || shape.size || 14;
      const size = isMobile ? baseSize * 1.4 : baseSize;
      const plainText = labelStr.replace(/[\$\\]/g, '').trim();
      const isPointLabel = plainText.length <= 2;

      // Estimate width and height of label text box
      let wWidth = 0;
      let hHeight = 0;
      if (isPointLabel) {
        wWidth = size * 0.75 * plainText.length;
        hHeight = size;
      } else {
        wWidth = Math.max(75, plainText.length * size * 0.6 + 18);
        hHeight = size + 12;
      }

      // Initial positions
      let lx = 0;
      let ly = 0;

      if (shape.labelX !== undefined && shape.labelY !== undefined) {
        lx = mx(shape.labelX);
        ly = my(shape.labelY);
      } else if (shape.pos && Array.isArray(shape.pos)) {
        lx = mx(shape.pos[0]);
        ly = my(shape.pos[1]);
      } else if (shape.x !== undefined && shape.y !== undefined) {
        lx = mx(shape.x);
        ly = my(shape.y);
      } else if (shape.cx !== undefined || shape.cy !== undefined || shape.center !== undefined) {
        lx = mx(getCenterX(shape));
        ly = my(getCenterY(shape));
      } else if (shape.x1 !== undefined && shape.y1 !== undefined) {
        lx = (mx(shape.x1) + mx(shape.x2 || 0)) / 2;
        ly = (my(shape.y1) + my(shape.y2 || 0)) / 2 - 10;
      } else if (shape.start) {
        const sx = mx(shape.start[0]);
        const sy = my(shape.start[1]);
        const ex = shape.end ? mx(shape.end[0]) : sx;
        const ey = shape.end ? my(shape.end[1]) : sy;
        lx = (sx + ex) / 2;
        ly = (sy + ey) / 2 - 10;
      } else {
        lx = vWidth / 2;
        ly = vHeight / 2;
      }

      // Apply positional offset if labelPosition exists
      const posOffset = 18;
      switch (shape.labelPosition) {
        case 'top': ly -= posOffset; break;
        case 'bottom': ly += posOffset; break;
        case 'left': lx -= posOffset; break;
        case 'right': lx += posOffset; break;
        case 'top-left': lx -= posOffset; ly -= posOffset; break;
        case 'top-right': lx += posOffset; ly -= posOffset; break;
        case 'bottom-left': lx -= posOffset; ly += posOffset; break;
        case 'bottom-right': lx += posOffset; ly += posOffset; break;
        default: break;
      }

      const labelColor = getPremiumColor(shape.color || shape.stroke || 'currentColor', isDark);
      const anchor = shape.labelPosition === 'left' ? 'end' : shape.labelPosition === 'right' ? 'start' : 'middle';

      instances.push({
        id: shape.id || `label-${idx}`,
        text: labelStr,
        x: lx,
        y: ly,
        width: wWidth,
        height: hHeight,
        anchor,
        size,
        color: labelColor,
        labelPosition: shape.labelPosition,
        isMeasurement: isMeasurementLabel(labelStr, shape.type)
      });
    });

    // Relaxation Collision loop (100 iterations)
    for (let iter = 0; iter < 100; iter++) {
      let moved = false;
      for (let i = 0; i < instances.length; i++) {
        for (let j = i + 1; j < instances.length; j++) {
          const l1 = instances[i];
          const l2 = instances[j];

          const getBounds = (l: LabelInstance) => {
            let left = l.x - l.width / 2;
            if (l.anchor === 'start') left = l.x;
            if (l.anchor === 'end') left = l.x - l.width;
            return {
              left,
              right: left + l.width,
              top: l.y - l.height / 2,
              bottom: l.y + l.height / 2,
              cx: left + l.width / 2,
              cy: l.y
            };
          };

          const b1 = getBounds(l1);
          const b2 = getBounds(l2);

          const padX = 14;
          const padY = 8;
          const overlapX = Math.max(0, Math.min(b1.right, b2.right) - Math.max(b1.left, b2.left) + padX);
          const overlapY = Math.max(0, Math.min(b1.bottom, b2.bottom) - Math.max(b1.top, b2.top) + padY);

          if (overlapX > padX && overlapY > padY) {
            moved = true;
            let dx = b1.cx - b2.cx;
            let dy = b1.cy - b2.cy;

            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
              dy = i % 2 === 0 ? 1 : -1;
              dx = 0;
            }

            const shiftY = (overlapY - padY) / 2 + 1;
            const shiftX = (overlapX - padX) / 2 + 1;

            if (overlapY < overlapX * 1.5) {
              if (dy >= 0) {
                l1.y += shiftY;
                l2.y -= shiftY;
              } else {
                l1.y -= shiftY;
                l2.y += shiftY;
              }
            } else {
              if (dx >= 0) {
                l1.x += shiftX;
                l2.x -= shiftX;
              } else {
                l1.x -= shiftX;
                l2.x += shiftX;
              }
            }
          }
        }
      }
      if (!moved) break;
    }

    // Keep labels within viewport bounds
    instances.forEach(l => {
      const halfW = l.width / 2;
      const halfH = l.height / 2;
      if (l.anchor === 'middle') {
        l.x = Math.max(halfW + 15, Math.min(vWidth - halfW - 15, l.x));
      } else if (l.anchor === 'start') {
        l.x = Math.max(15, Math.min(vWidth - l.width - 15, l.x));
      } else if (l.anchor === 'end') {
        l.x = Math.max(l.width + 15, Math.min(vWidth - 15, l.x));
      }
      l.y = Math.max(halfH + 15, Math.min(vHeight - halfH - 15, l.y));
    });

    return instances;
  }, [showLabels, dynamicShapes, mx, my, vWidth, vHeight, isDark]);
  // 4. Interactive Events (Panning & Zooming)
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // Handle mouse wheel zooming on desktop
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 0.08;
      const direction = e.deltaY < 0 ? 1 : -1;
      setZoom(prev => Math.min(3.0, Math.max(0.5, prev + direction * zoomFactor)));
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Track pointer for pinch gestures
    activePointers.current.set(e.pointerId, e.nativeEvent);

    if (activePointers.current.size === 2) {
      // Initialize pinch distance
      const pointers = Array.from(activePointers.current.values()) as any[];
      const dx = pointers[0].clientX - pointers[1].clientX;
      const dy = pointers[0].clientY - pointers[1].clientY;
      prevPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
      setIsPanning(false); // Disable normal panning when pinching
      return;
    }

    if (e.button !== 0 || draggedId || activePointers.current.size > 1) return;
    
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch (err) {}
    
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: currentOffset.current.x,
      offsetY: currentOffset.current.y,
    };
    setIsPanning(true);
    e.preventDefault();
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Update active pointer details
    activePointers.current.set(e.pointerId, e.nativeEvent);

    // 1. Pinch-to-zoom behavior on mobile
    if (activePointers.current.size === 2) {
      const pointers = Array.from(activePointers.current.values()) as any[];
      const dx = pointers[0].clientX - pointers[1].clientX;
      const dy = pointers[0].clientY - pointers[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (prevPinchDistance.current !== null && prevPinchDistance.current > 0) {
        const factor = distance / prevPinchDistance.current;
        // Dampen scale change for smooth zooming
        const scaleChange = (factor - 1) * 0.45;
        const newZoom = Math.min(3.0, Math.max(0.5, currentZoom.current * (1 + scaleChange)));
        currentZoom.current = newZoom;

        if (rafId.current) cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(() => {
          if (transformWrapperRef.current) {
            transformWrapperRef.current.style.transform = `translate3d(${currentOffset.current.x}px, ${currentOffset.current.y}px, 0) scale(${currentZoom.current})`;
          }
        });
      }
      prevPinchDistance.current = distance;
      return; // Skip standard panning and cursor coordinate tracking during pinch
    }

    // Track cursor Cartesian coordinates
    if (showCoordinates && !isPanning && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const containerRect = e.currentTarget.getBoundingClientRect();
      
      const localSvgX = ((e.clientX - rect.left) / rect.width) * vWidth;
      const localSvgY = ((e.clientY - rect.top) / rect.height) * vHeight;
      const { x, y } = getCartesian(localSvgX, localSvgY);
      
      const clientX = e.clientX - containerRect.left;
      const clientY = e.clientY - containerRect.top;
      
      // Prevent overflow layout bounds clipping of the coordinates tooltip
      const showLeft = clientX > containerRect.width - 120;
      const showTop = clientY > containerRect.height - 40;
      
      const tooltipX = showLeft ? clientX - 110 : clientX + 20;
      const tooltipY = showTop ? clientY - 35 : clientY + 15;
      
      setCursorPos({ 
        x: parseFloat(x.toFixed(2)), 
        y: parseFloat(y.toFixed(2)), 
        cx: tooltipX, 
        cy: tooltipY,
        svgX: localSvgX,
        svgY: localSvgY
      });
    }

    if (isPanning && activePointers.current.size === 1) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      
      const newX = panStart.current.offsetX + dx / currentZoom.current;
      const newY = panStart.current.offsetY + dy / currentZoom.current;
      currentOffset.current = { x: newX, y: newY };

      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        if (transformWrapperRef.current) {
          transformWrapperRef.current.style.transform = `translate3d(${currentOffset.current.x}px, ${currentOffset.current.y}px, 0) scale(${currentZoom.current})`;
        }
      });
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size === 0) {
      activePointers.current.clear();
      prevPinchDistance.current = null;
      
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      
      // Commit final values back to React state to ensure sync
      setOffset(currentOffset.current);
      setZoom(currentZoom.current);
    } else if (activePointers.current.size < 2) {
      prevPinchDistance.current = null;
    }

    if (isPanning) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      setIsPanning(false);
    }
  };

  // 5. Drag Object Logic
  const handleObjectDragStart = (e: React.PointerEvent, element: ShapeElement) => {
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    
    const initialCX = element.cx !== undefined ? element.cx : (element.center && Array.isArray(element.center) ? element.center[0] : 0);
    const initialCY = element.cy !== undefined ? element.cy : (element.center && Array.isArray(element.center) ? element.center[1] : 0);

    dragStartCoords.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: element.x !== undefined ? element.x : initialCX,
      initialY: element.y !== undefined ? element.y : initialCY,
      initialX1: element.x1 || 0,
      initialY1: element.y1 || 0,
      initialX2: element.x2 || 0,
      initialY2: element.y2 || 0
    };
    
    setDraggedId(element.id);
  };

  const handleObjectDragMove = (e: React.PointerEvent, element: ShapeElement) => {
    if (draggedId !== element.id) return;
    e.stopPropagation();

    if (!svgRef.current) return;
    
    // Scale client drag deltas into SVG coordinates, then convert to Cartesian delta
    const rect = svgRef.current.getBoundingClientRect();
    const clientDx = e.clientX - dragStartCoords.current.x;
    const clientDy = e.clientY - dragStartCoords.current.y;
    
    const svgDx = (clientDx / rect.width) * vWidth;
    const svgDy = (clientDy / rect.height) * vHeight;
    
    // Map delta from pixels to cartesian units
    const cartesianDx = svgDx * ((xRange[1] - xRange[0]) / (vWidth - 120));
    const cartesianDy = -svgDy * ((yRange[1] - yRange[0]) / (vHeight - 120)); // Flip Y-axis delta

    setDynamicShapes(prev => prev.map(s => {
      if (s.id !== element.id) return s;
      
      const clone = { ...s };
      if (clone.x !== undefined) clone.x = parseFloat((dragStartCoords.current.initialX + cartesianDx).toFixed(2));
      if (clone.y !== undefined) clone.y = parseFloat((dragStartCoords.current.initialY + cartesianDy).toFixed(2));
      if (clone.cx !== undefined) clone.cx = parseFloat((dragStartCoords.current.initialX + cartesianDx).toFixed(2));
      if (clone.cy !== undefined) clone.cy = parseFloat((dragStartCoords.current.initialY + cartesianDy).toFixed(2));
      if (clone.center && Array.isArray(clone.center)) {
        clone.center = [
          parseFloat((dragStartCoords.current.initialX + cartesianDx).toFixed(2)),
          parseFloat((dragStartCoords.current.initialY + cartesianDy).toFixed(2))
        ];
      }
      if (clone.x1 !== undefined) clone.x1 = parseFloat((dragStartCoords.current.initialX1 + cartesianDx).toFixed(2));
      if (clone.y1 !== undefined) clone.y1 = parseFloat((dragStartCoords.current.initialY1 + cartesianDy).toFixed(2));
      if (clone.x2 !== undefined) clone.x2 = parseFloat((dragStartCoords.current.initialX2 + cartesianDx).toFixed(2));
      if (clone.y2 !== undefined) clone.y2 = parseFloat((dragStartCoords.current.initialY2 + cartesianDy).toFixed(2));
      
      return clone;
    }));
  };

  const handleObjectDragEnd = (e: React.PointerEvent, element: ShapeElement) => {
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    setDraggedId(null);
  };

  // Grid tick generator
  const getTicks = (min: number, max: number) => {
    const range = max - min;
    let step = 1;
    if (range > 20) step = 2;
    if (range > 50) step = 5;
    if (range > 150) step = 20;
    if (range < 8) step = 0.5;

    const ticks = [];
    let start = Math.ceil(min / step) * step;
    for (let t = start; t <= max; t += step) {
      if (Math.abs(t) < 0.0001) continue; // Skip zero, axis will draw origin
      ticks.push(parseFloat(t.toFixed(2)));
    }
    return ticks;
  };

  const renderAngleArc = (cxVal: number, cyVal: number, rVal: number, startAngle: number, endAngle: number, shape: ShapeElement, key: string) => {
    const angleDiff = Math.abs(endAngle - startAngle);
    const isRightAngle = shape.type === 'rightAngle' || angleDiff === 90;

    const strokeColor = getPremiumColor(shape.stroke || 'orange', isDark);
    const fillColor = shape.fill ? getPremiumColor(shape.fill, isDark) : strokeColor;
    const fillOpacity = shape.fill ? 1 : 0.08;

    if (isRightAngle) {
      // Draw standard square corner block
      const r = rVal * 0.75;
      const angleRadStart = (startAngle - 90) * Math.PI / 180;
      const angleRadEnd = (endAngle - 90) * Math.PI / 180;
      
      const px1 = cxVal + r * Math.cos(angleRadStart);
      const py1 = cyVal + r * Math.sin(angleRadStart);
      const px3 = cxVal + r * Math.cos(angleRadEnd);
      const py3 = cyVal + r * Math.sin(angleRadEnd);
      
      // Compute the corner point of the square
      const px2 = px1 + r * Math.cos(angleRadEnd);
      const py2 = py1 + r * Math.sin(angleRadEnd);

      return (
        <path 
          key={key} 
          d={`M ${px1} ${py1} L ${px2} ${py2} L ${px3} ${py3}`}
          stroke={strokeColor}
          strokeWidth={shape.strokeWidth || 2}
          fill={fillColor}
          fillOpacity={fillOpacity}
        />
      );
    }

    // Draw standard curved arc
    const start = {
      x: cxVal + rVal * Math.cos((endAngle - 90) * Math.PI / 180),
      y: cyVal + rVal * Math.sin((endAngle - 90) * Math.PI / 180)
    };
    const end = {
      x: cxVal + rVal * Math.cos((startAngle - 90) * Math.PI / 180),
      y: cyVal + rVal * Math.sin((startAngle - 90) * Math.PI / 180)
    };

    const largeArcFlag = angleDiff <= 180 ? "0" : "1";
    const sweepFlag = "0"; // Counter-clockwise for SVG coordinate Y down orientation

    return (
      <path 
        key={key} 
        d={`M ${start.x} ${start.y} A ${rVal} ${rVal} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`}
        stroke={strokeColor}
        strokeWidth={shape.strokeWidth || 2}
        fill={fillColor}
        fillOpacity={fillOpacity}
      />
    );
  };

  // Render 3D Shape
  const render3DWireframe = (shape: ShapeElement, key: string, idx?: number) => {
    const strokeColor = getPremiumColor(shape.stroke, isDark, idx);
    const baseStrokeW = shape.strokeWidth || 2.0;
    const strokeW = isMobile ? baseStrokeW * 1.6 : baseStrokeW;
    const fill = shape.fill ? getPremiumColor(shape.fill, isDark, idx) : strokeColor;
    const fillOpacity = shape.fill ? 1 : 0.04;
    
    const xVal = mx(shape.x || 0);
    const yVal = my(shape.y || 0);
    const wVal = muX(shape.width || 1.5);
    const hVal = muY(shape.height || 1.5);
    const dVal = muX(shape.depth || 0.8);

    switch (shape.type) {
      case 'cube':
      case 'cuboid': {
        // Isometric / Oblique projection wireframe
        const ox = dVal * 0.5; // isometric offset X
        const oy = -dVal * 0.4; // isometric offset Y
        
        // Front face vertices
        const f = [
          { x: xVal, y: yVal },
          { x: xVal + wVal, y: yVal },
          { x: xVal + wVal, y: yVal + hVal },
          { x: xVal, y: yVal + hVal }
        ];

        // Back face vertices
        const b = f.map(pt => ({ x: pt.x + ox, y: pt.y + oy }));

        return (
          <g key={key}>
            {/* Faces */}
            <polygon points={`${f[0].x},${f[0].y} ${f[1].x},${f[1].y} ${f[2].x},${f[2].y} ${f[3].x},${f[3].y}`} fill={fill} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeW} />
            <polygon points={`${f[0].x},${f[0].y} ${b[0].x},${b[0].y} ${b[1].x},${b[1].y} ${f[1].x},${f[1].y}`} fill={fill} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeW} />
            <polygon points={`${f[1].x},${f[1].y} ${b[1].x},${b[1].y} ${b[2].x},${b[2].y} ${f[2].x},${f[2].y}`} fill={fill} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeW} />
            <polygon points={`${f[2].x},${f[2].y} ${b[2].x},${b[2].y} ${b[3].x},${b[3].y} ${f[3].x},${f[3].y}`} fill={fill} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeW} />
            <polygon points={`${f[3].x},${f[3].y} ${b[3].x},${b[3].y} ${b[0].x},${b[0].y} ${f[0].x},${f[0].y}`} fill={fill} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={strokeW} />
            
            {/* Hidden dashes representation */}
            <line x1={b[0].x} y1={b[0].y} x2={b[3].x} y2={b[3].y} stroke={strokeColor} strokeWidth={strokeW} strokeDasharray="3 3" />
            <line x1={b[3].x} y1={b[3].y} x2={b[2].x} y2={b[2].y} stroke={strokeColor} strokeWidth={strokeW} strokeDasharray="3 3" />
            <line x1={b[0].x} y1={b[0].y} x2={b[1].x} y2={b[1].y} stroke={strokeColor} strokeWidth={strokeW} />
            <line x1={b[1].x} y1={b[1].y} x2={b[2].x} y2={b[2].y} stroke={strokeColor} strokeWidth={strokeW} />
          </g>
        );
      }
      case 'cylinder': {
        const rx = wVal / 2;
        const ry = hVal * 0.15; // flattening ellipse ratio
        const cx = xVal + rx;

        return (
          <g key={key}>
            {/* Cylinder Body fill */}
            <path d={`M ${xVal} ${yVal} L ${xVal} ${yVal + hVal} A ${rx} ${ry} 0 0 0 ${xVal + wVal} ${yVal + hVal} L ${xVal + wVal} ${yVal} Z`} fill={fill} fillOpacity={fillOpacity} />
            
            {/* Lower ellipse outline (front solid, back dashed) */}
            <path d={`M ${xVal} ${yVal + hVal} A ${rx} ${ry} 0 0 0 ${xVal + wVal} ${yVal + hVal}`} stroke={strokeColor} strokeWidth={strokeW} fill="none" />
            <path d={`M ${xVal} ${yVal + hVal} A ${rx} ${ry} 0 0 1 ${xVal + wVal} ${yVal + hVal}`} stroke={strokeColor} strokeWidth={strokeW} fill="none" strokeDasharray="3 3" />
            
            {/* Verticals */}
            <line x1={xVal} y1={yVal} x2={xVal} y2={yVal + hVal} stroke={strokeColor} strokeWidth={strokeW} />
            <line x1={xVal + wVal} y1={yVal} x2={xVal + wVal} y2={yVal + hVal} stroke={strokeColor} strokeWidth={strokeW} />
            
            {/* Top ellipse */}
            <ellipse cx={cx} cy={yVal} rx={rx} ry={ry} stroke={strokeColor} strokeWidth={strokeW} fill={fill} fillOpacity={fillOpacity} />
          </g>
        );
      }
      case 'cone': {
        const rx = wVal / 2;
        const ry = hVal * 0.12;
        const cx = xVal + rx;
        const apexY = yVal - hVal;

        return (
          <g key={key}>
            {/* Shaded cone */}
            <path d={`M ${xVal} ${yVal} L ${cx} ${apexY} L ${xVal + wVal} ${yVal} A ${rx} ${ry} 0 0 1 ${xVal} ${yVal}`} fill={fill} fillOpacity={fillOpacity} />
            
            {/* Base ellipse */}
            <path d={`M ${xVal} ${yVal} A ${rx} ${ry} 0 0 0 ${xVal + wVal} ${yVal}`} stroke={strokeColor} strokeWidth={strokeW} fill="none" />
            <path d={`M ${xVal} ${yVal} A ${rx} ${ry} 0 0 1 ${xVal + wVal} ${yVal}`} stroke={strokeColor} strokeWidth={strokeW} fill="none" strokeDasharray="3 3" />
            
            {/* Side slants */}
            <line x1={xVal} y1={yVal} x2={cx} y2={apexY} stroke={strokeColor} strokeWidth={strokeW} />
            <line x1={xVal + wVal} y1={yVal} x2={cx} y2={apexY} stroke={strokeColor} strokeWidth={strokeW} />
            
            {/* Center height axis (dashed) */}
            <line x1={cx} y1={yVal} x2={cx} y2={apexY} stroke={strokeColor} strokeWidth={1.5} strokeDasharray="3 3" />
            <line x1={cx} y1={yVal} x2={xVal + wVal} y2={yVal} stroke={strokeColor} strokeWidth={1.5} strokeDasharray="3 3" />
          </g>
        );
      }
      case 'sphere': {
        const rRadius = wVal / 2;
        const cx = xVal + rRadius;
        const cy = yVal + rRadius;

        return (
          <g key={key}>
            <circle cx={cx} cy={cy} r={rRadius} stroke={strokeColor} strokeWidth={strokeW} fill={fill} fillOpacity={fillOpacity} />
            {/* 3D horizontal contour belt */}
            <ellipse cx={cx} cy={cy} rx={rRadius} ry={rRadius * 0.25} stroke={strokeColor} strokeWidth={strokeW - 0.5} fill="none" />
            <path d={`M ${cx - rRadius} ${cy} A ${rRadius} ${rRadius * 0.25} 0 0 1 ${cx + rRadius} ${cy}`} stroke={strokeColor} strokeWidth={strokeW} fill="none" strokeDasharray="3 3" />
          </g>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div 
      className="universal-math-engine rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl sm:shadow-2xl relative flex flex-col w-full select-none overflow-hidden group"
      ref={containerRef}
    >
      {/* 1. Header Toolbar Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 select-none backdrop-blur-md z-20 gap-3 rounded-t-2xl sm:rounded-t-[22px]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#8A1C36]" />
          <span className="text-[10px] font-black font-sans uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {data.type?.toUpperCase() || 'MATH'} DIAGRAM ENGINE v2.0
          </span>
        </div>
        
        {/* Toggle controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto justify-start sm:justify-end">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={cn(
              "p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer",
              showLabels 
                ? "bg-brand-50 border-brand-200 text-[#8A1C36]" 
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
            )}
            title="Toggle Labels"
          >
            <Tag className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={() => setShowMeasurements(!showMeasurements)}
            className={cn(
              "p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer",
              showMeasurements 
                ? "bg-brand-50 border-brand-200 text-[#8A1C36]" 
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
            )}
            title="Toggle Measurements"
          >
            <Ruler className="w-3.5 h-3.5" />
          </button>
 
          <button
            onClick={() => setShowCoordinates(!showCoordinates)}
            className={cn(
              "p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer",
              showCoordinates 
                ? "bg-brand-50 border-brand-200 text-[#8A1C36]" 
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
            )}
            title="Toggle Cursor Coordinates"
          >
            <MapPin className="w-3.5 h-3.5" />
          </button>
 
          <button
            onClick={triggerReplay}
            className="p-1.5 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
            title="Replay Animation"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
 
          <div className="hidden sm:block h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1" />
 
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.15))}
              className="p-1.5 rounded-l-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-bold font-mono text-slate-400 w-11 text-center bg-white dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700 py-1 select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.min(3.0, prev + 0.15))}
              className="p-1.5 rounded-r-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
 
          <button
            onClick={() => { setZoom(1.0); setOffset({ x: 0, y: 0 }); }}
            className="p-1.5 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
            title="Reset Canvas View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
 
      {/* 2. Interactive SVG Canvas wrapper */}
      <div 
        ref={viewportRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        onPointerLeave={(e) => { handleCanvasPointerUp(e); setIsMouseOverCanvas(false); }}
        onPointerEnter={() => setIsMouseOverCanvas(true)}
        className="canvas-viewport p-3.5 sm:p-10 flex justify-center items-center bg-slate-50/50 dark:bg-[#070b12] overflow-hidden w-full select-none relative min-h-[260px] sm:min-h-[420px]"
        style={{ 
          cursor: isPanning ? 'grabbing' : (draggedId ? 'grabbing' : 'grab'),
          touchAction: 'none'
        }}
      >
        {/* Real-time Cartesian plane coordinate tooltip */}
        {showCoordinates && isMouseOverCanvas && svgRef.current && (
          <div 
            className="absolute z-30 pointer-events-none bg-slate-900/90 text-white border border-slate-700/80 px-2 py-1 rounded-lg text-[10px] font-mono shadow-md flex items-center gap-1.5 transition-all"
            style={{ 
              left: `${cursorPos.cx}px`,
              top: `${cursorPos.cy}px`,
            }}
          >
            <span>X: <b>{cursorPos.x}</b></span>
            <span className="text-slate-500">|</span>
            <span>Y: <b>{cursorPos.y}</b></span>
          </div>
        )}
 
        {/* The Animated/Panned Diagram Wrapper */}
        <div 
          ref={transformWrapperRef}
          style={{ 
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`, 
            transformOrigin: 'center center', 
            transition: isPanning || draggedId ? 'none' : 'transform 0.15s cubic-bezier(0.1, 0.8, 0.25, 1)',
            willChange: isPanning || draggedId ? 'transform' : 'auto',
            touchAction: 'none'
          }}
          className="w-full max-w-[800px] flex justify-center items-center text-slate-800 dark:text-slate-200"
        >
          <svg
            ref={svgRef}
            width="100%"
            style={{ aspectRatio: `${vWidth}/${vHeight}`, touchAction: 'none' }}
            viewBox={`0 0 ${vWidth} ${vHeight}`}
            preserveAspectRatio={data.aspectRatio || "xMidYMid meet"}
            className="w-full h-auto pointer-events-auto"
          >
            {/* Arrows, markers and dash-array templates key */}
            {arrowDefs}
            
            {/* Canvas background card with dynamic radial gradient */}
            <rect 
              width={vWidth} 
              height={vHeight} 
              fill="url(#grid-bg-gradient)" 
              rx={12} 
            />

            {/* A. Grid lines */}
            {data.grid !== false && (
              <g className="grid-layer">
                {/* Vertical grid lines */}
                {getTicks(xRange[0], xRange[1]).map(x => (
                  <line 
                    key={`vgrid-${x}`} 
                    x1={mx(x)} 
                    y1={0} 
                    x2={mx(x)} 
                    y2={vHeight} 
                    stroke={gridLineColor} 
                    strokeWidth={isMobile ? 1.75 : 1} 
                    strokeDasharray={isMobile ? "6 6" : "4 4"} 
                  />
                ))}
                {/* Horizontal grid lines */}
                {getTicks(yRange[0], yRange[1]).map(y => (
                  <line 
                    key={`hgrid-${y}`} 
                    x1={0} 
                    y1={my(y)} 
                    x2={vWidth} 
                    y2={my(y)} 
                    stroke={gridLineColor} 
                    strokeWidth={isMobile ? 1.75 : 1} 
                    strokeDasharray={isMobile ? "6 6" : "4 4"} 
                  />
                ))}
              </g>
            )}
 
            {/* B. Coordinate Axes */}
            {data.xAxis !== false && (() => {
              const position = data.xAxisPosition !== undefined ? data.xAxisPosition : 'bottom';
              let yVal = 0;
              if (typeof position === 'number') {
                yVal = position;
              } else if (position === 'bottom') {
                yVal = yRange[0];
              } else if (position === 'top') {
                yVal = yRange[1];
              } else if (position === 'center') {
                yVal = 0;
              } else {
                yVal = (yRange[0] <= 0 && yRange[1] >= 0) ? 0 : yRange[0];
              }

              const sy = my(yVal);
              if (sy < 0 || sy > vHeight) return null;

              const showLine = true;
              const showArrow = data.xAxisArrow !== false;
              const showTicks = data.xAxisTicks !== false;
              const showNumbers = data.xAxisNumbers !== false;
              const unit = data.xAxisUnit || '';

              const rangeVal = xRange[1] - xRange[0];

              let spacing = data.xAxisStep || 0;
              if (spacing <= 0) {
                const idealTicks = isMobile ? 5 : 10;
                const rawSpacing = rangeVal > 0 ? (rangeVal / idealTicks) : 1;
                const log = Math.log10(rawSpacing);
                const power = Math.pow(10, Math.floor(log));
                const ratio = rawSpacing / power;
                let niceSpacing = 1;
                if (ratio < 1.5) niceSpacing = 1;
                else if (ratio < 3.5) niceSpacing = 2;
                else if (ratio < 7.5) niceSpacing = 5;
                else niceSpacing = 10;
                spacing = niceSpacing * power;
              }

              const ticks: number[] = [];
              if (rangeVal > 0 && spacing > 0) {
                let tStart = Math.ceil(xRange[0] / spacing) * spacing;
                for (let t = tStart; t <= xRange[1] + (spacing * 0.0001); t += spacing) {
                  const val = parseFloat(t.toFixed(4));
                  if (val >= xRange[0] && val <= xRange[1]) {
                    ticks.push(val);
                  }
                }
              }

              let tickSpacingInPixels = 0;
              if (ticks.length > 1 && rangeVal > 0) {
                const dxVal = mx(xRange[0] + ((ticks[1] - xRange[0]) / rangeVal) * (xRange[1] - xRange[0])) - mx(xRange[0] + ((ticks[0] - xRange[0]) / rangeVal) * (xRange[1] - xRange[0]));
                tickSpacingInPixels = Math.abs(dxVal);
              }

              let skipFactor = 1;
              if (tickSpacingInPixels > 0) {
                const maxCharCount = ticks.reduce((max, t) => Math.max(max, t.toString().length + unit.length), 1);
                const labelWidthEst = maxCharCount * 7.5 + 16; 
                if (tickSpacingInPixels < labelWidthEst) {
                  skipFactor = Math.ceil(labelWidthEst / tickSpacingInPixels);
                }
              }
              if (isMobile && skipFactor === 1 && ticks.length > 5) {
                skipFactor = 2;
              }

              return (
                <g className="x-axis-layer text-indigo-500/60 dark:text-indigo-400/50">
                  {showLine && (
                    <line 
                      x1={0} 
                      y1={sy} 
                      x2={vWidth - (showArrow ? (isMobile ? 24 : 15) : 0)} 
                      y2={sy} 
                      stroke={isDark ? "#818cf8" : "#4f46e5"} 
                      strokeWidth={isMobile ? 4.5 : 2.5} 
                      opacity={isDark ? 0.65 : 0.75}
                      color={isDark ? "#818cf8" : "#4f46e5"}
                      markerEnd={showArrow ? "url(#arrow)" : undefined} 
                    />
                  )}
                  {data.xAxisLabel && (
                    <text 
                      x={vWidth - 10} 
                      y={sy + (isMobile ? 8 : 5)} 
                      className={cn("font-black fill-indigo-600 dark:fill-indigo-400 font-serif", isMobile ? "text-xl" : "text-base")} 
                      stroke="none" 
                      textAnchor="start"
                    >
                      {data.xAxisLabel}
                    </text>
                  )}
                  {ticks.map((x, idx) => {
                    const px = mx(x);
                    const nearBottom = sy > vHeight - 30;
                    const renderLabel = showNumbers && (idx % skipFactor === 0) && Math.abs(x) > 0.0001;

                    return (
                      <g key={`xtick-diag-${x}`}>
                        {showTicks && (
                          <line 
                            x1={px} 
                            y1={sy - (isMobile ? 7 : 4)} 
                            x2={px} 
                            y2={sy + (isMobile ? 7 : 4)} 
                            stroke={isDark ? "#818cf8" : "#4f46e5"} 
                            strokeWidth={isMobile ? 3.0 : 1.5}
                            opacity={isDark ? 0.65 : 0.75}
                          />
                        )}
                        {renderLabel && (
                          <text 
                            x={px} 
                            y={nearBottom ? sy - (isMobile ? 18 : 12) : sy + (isMobile ? 28 : 20)} 
                            stroke="none"
                            className={cn(
                              "font-black font-mono fill-slate-700 dark:fill-slate-200 select-none",
                              isMobile ? "text-[21px]" : "text-[15px]"
                            )}
                            textAnchor="middle"
                          >
                            {x}{unit}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })()}
 
            {data.yAxis !== false && (() => {
              const position = data.yAxisPosition !== undefined ? data.yAxisPosition : 'left';
              let xVal = 0;
              if (typeof position === 'number') {
                xVal = position;
              } else if (position === 'left') {
                xVal = xRange[0];
              } else if (position === 'right') {
                xVal = xRange[1];
              } else if (position === 'center') {
                xVal = (xRange[0] + xRange[1]) / 2;
              } else {
                xVal = (xRange[0] <= 0 && xRange[1] >= 0) ? 0 : xRange[0];
              }

              const sx = mx(xVal);
              if (sx < 0 || sx > vWidth) return null;

              const showLine = true;
              const showArrow = data.yAxisArrow !== false;
              const showTicks = data.yAxisTicks !== false;
              const showNumbers = data.yAxisNumbers !== false;
              const unit = data.yAxisUnit || '';

              const rangeVal = yRange[1] - yRange[0];

              let spacing = data.yAxisStep || 0;
              if (spacing <= 0) {
                const idealTicks = isMobile ? 5 : 10;
                const rawSpacing = rangeVal > 0 ? (rangeVal / idealTicks) : 1;
                const log = Math.log10(rawSpacing);
                const power = Math.pow(10, Math.floor(log));
                const ratio = rawSpacing / power;
                let niceSpacing = 1;
                if (ratio < 1.5) niceSpacing = 1;
                else if (ratio < 3.5) niceSpacing = 2;
                else if (ratio < 7.5) niceSpacing = 5;
                else niceSpacing = 10;
                spacing = niceSpacing * power;
              }

              const ticks: number[] = [];
              if (rangeVal > 0 && spacing > 0) {
                let tStart = Math.ceil(yRange[0] / spacing) * spacing;
                for (let t = tStart; t <= yRange[1] + (spacing * 0.0001); t += spacing) {
                  const val = parseFloat(t.toFixed(4));
                  if (val >= yRange[0] && val <= yRange[1]) {
                    ticks.push(val);
                  }
                }
              }

              let tickSpacingInPixels = 0;
              if (ticks.length > 1 && rangeVal > 0) {
                const dyVal = my(yRange[0] + ((ticks[1] - yRange[0]) / rangeVal) * (yRange[1] - yRange[0])) - my(yRange[0] + ((ticks[0] - yRange[0]) / rangeVal) * (yRange[1] - yRange[0]));
                tickSpacingInPixels = Math.abs(dyVal);
              }

              let skipFactor = 1;
              const labelHeightEst = 18; 
              if (tickSpacingInPixels > 0 && tickSpacingInPixels < labelHeightEst) {
                skipFactor = Math.ceil(labelHeightEst / tickSpacingInPixels);
              }
              if (isMobile && skipFactor === 1 && ticks.length > 5) {
                skipFactor = 2;
              }

              return (
                <g className="y-axis-layer text-indigo-500/60 dark:text-indigo-400/50">
                  {showLine && (
                    <line 
                      x1={sx} 
                      y1={vHeight} 
                      x2={sx} 
                      y2={showArrow ? (isMobile ? 24 : 15) : 0} 
                      stroke={isDark ? "#818cf8" : "#4f46e5"} 
                      strokeWidth={isMobile ? 4.5 : 2.5} 
                      opacity={isDark ? 0.65 : 0.75}
                      color={isDark ? "#818cf8" : "#4f46e5"}
                      markerEnd={showArrow ? "url(#arrow)" : undefined} 
                    />
                  )}
                  {data.yAxisLabel && (
                    <text 
                      x={sx} 
                      y={isMobile ? 14 : 10} 
                      className={cn("font-black fill-indigo-600 dark:fill-indigo-400 font-serif", isMobile ? "text-xl" : "text-base")} 
                      stroke="none" 
                      textAnchor="middle"
                    >
                      {data.yAxisLabel}
                    </text>
                  )}
                  {ticks.map((y, idx) => {
                    const py = my(y);
                    const nearLeft = sx < 30;
                    const renderLabel = showNumbers && (idx % skipFactor === 0) && Math.abs(y) > 0.0001;

                    return (
                      <g key={`ytick-diag-${y}`}>
                        {showTicks && (
                          <line 
                            x1={sx - (isMobile ? 7 : 4)} 
                            y1={py} 
                            x2={sx + (isMobile ? 7 : 4)} 
                            y2={py} 
                            stroke={isDark ? "#818cf8" : "#4f46e5"} 
                            strokeWidth={isMobile ? 3.0 : 1.5}
                            opacity={isDark ? 0.65 : 0.75}
                          />
                        )}
                        {renderLabel && (
                          <text 
                            x={nearLeft ? sx + (isMobile ? 18 : 12) : sx - (isMobile ? 18 : 12)} 
                            y={py + (isMobile ? 7 : 5)} 
                            stroke="none"
                            className={cn(
                              "font-black font-mono fill-slate-700 dark:fill-slate-200 select-none",
                              isMobile ? "text-[21px]" : "text-[15px]"
                            )}
                            textAnchor={nearLeft ? 'start' : 'end'}
                          >
                            {y}{unit}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })()}

            {/* Origin Dot highlight */}
            {data.xAxis !== false && data.yAxis !== false && mx(0) >= 0 && mx(0) <= vWidth && my(0) >= 0 && my(0) <= vHeight && (
              <circle 
                cx={mx(0)} 
                cy={my(0)} 
                r={isMobile ? "6" : "4"} 
                fill={isDark ? '#818cf8' : '#4f46e5'} 
                className="opacity-80" 
                stroke={isDark ? 'rgba(129, 140, 248, 0.4)' : 'rgba(79, 70, 229, 0.4)'}
                strokeWidth={isMobile ? "4.5" : "3"}
              />
            )}

            {/* C. Render SVG Shapes elements */}
            {sortedShapes.map((shape, idx) => {
              if (shape.visible === false) return null;
              
              const shapeKey = `${shape.id || 'shape'}-${idx}-${animationKey}`;
              const isHovered = hoveredId === shape.id;
              const isSelected = selectedId === shape.id;
              const isInteractive = shape.draggable;
              
              // Standard styling
              const strokeColor = getPremiumColor(shape.stroke, isDark, idx);
              const hasExplicitFill = shape.fill !== undefined;
              const isClosedShape = ['circle', 'ellipse', 'rectangle', 'roundedRectangle', 'square', 'rect', 'polygon', 'triangle', 'trapezium', 'regularPolygon', 'hexagon', 'pentagon', 'octagon', 'rhombus', 'kite'].includes(shape.type);
              
              let fillColor = 'none';
              let fillOpacity = shape.opacity !== undefined ? shape.opacity : 1;
              
              if (hasExplicitFill) {
                fillColor = getPremiumColor(shape.fill, isDark, idx);
              } else if (isClosedShape) {
                // Faint premium tint for closed geometry shapes
                fillColor = strokeColor;
                fillOpacity = isDark ? 0.06 : 0.04;
              }

              const baseStrokeWidth = shape.strokeWidth !== undefined ? shape.strokeWidth : 2.5;
              const scaledStrokeWidth = isMobile ? baseStrokeWidth * 1.6 : baseStrokeWidth;
              const sWidth = isHovered ? scaledStrokeWidth + 1.5 : scaledStrokeWidth;
              const opacity = shape.opacity !== undefined ? shape.opacity : 1;
              const isDashed = !!shape.dashed;

              // Pointer Event handlers for dragging/hovering
              const interactiveProps = {
                onPointerDown: (e: React.PointerEvent) => {
                  if (shape.draggable) handleObjectDragStart(e, shape);
                  setSelectedId(shape.id);
                },
                onPointerMove: (e: React.PointerEvent) => {
                  if (shape.draggable) handleObjectDragMove(e, shape);
                },
                onPointerUp: (e: React.PointerEvent) => {
                  if (shape.draggable) handleObjectDragEnd(e, shape);
                },
                onPointerEnter: () => setHoveredId(shape.id),
                onPointerLeave: () => setHoveredId(null),
                style: { 
                  cursor: shape.draggable ? 'grabbing' : 'pointer',
                  pointerEvents: 'all' as any,
                }
              };

              // Check animation parameters
              const isMobileOrTablet = isMobile || (typeof window !== 'undefined' && window.innerWidth < 1024);
              const shouldAnimate = isPlayingAnimation && !isMobileOrTablet && shape.animated !== false;
              const dashProps = shouldAnimate ? {
                strokeDasharray: '2500',
                strokeDashoffset: '2500',
                className: 'animate-drawing-path'
              } : (isDashed ? { strokeDasharray: '6 6' } : {});

              // ─────────────────────────────────────────────────────────────
              // Compute Rotation Center Coordinates
              // ─────────────────────────────────────────────────────────────
              let rotCenterX = 0;
              let rotCenterY = 0;
              if (shape.x !== undefined && shape.y !== undefined) {
                rotCenterX = mx(shape.x);
                rotCenterY = my(shape.y);
                if (shape.width !== undefined && shape.height !== undefined) {
                  rotCenterX += muX(shape.width) / 2;
                  rotCenterY += muY(shape.height) / 2;
                }
              } else if (shape.x1 !== undefined && shape.y1 !== undefined) {
                rotCenterX = (mx(shape.x1) + mx(shape.x2 || 0)) / 2;
                rotCenterY = (my(shape.y1) + my(shape.y2 || 0)) / 2;
              } else if (shape.start) {
                rotCenterX = (mx(shape.start[0]) + mx(shape.end ? shape.end[0] : shape.start[0])) / 2;
                rotCenterY = (my(shape.start[1]) + my(shape.end ? shape.end[1] : shape.start[1])) / 2;
              } else {
                rotCenterX = mx(getCenterX(shape));
                rotCenterY = my(getCenterY(shape));
              }

              const renderShape = () => {
                switch (shape.type) {
                  // 0. Custom X Axis component
                  case 'xAxis': {
                    const startX = shape.startX !== undefined ? shape.startX : xRange[0];
                    const endX = shape.endX !== undefined ? shape.endX : xRange[1];
                    const valStart = shape.valueStart !== undefined ? shape.valueStart : startX;
                    const valEnd = shape.valueEnd !== undefined ? shape.valueEnd : endX;

                    const position = shape.position || 'bottom';
                    let yVal = 0;
                    if (shape.y !== undefined) {
                      yVal = shape.y;
                    } else if (position === 'bottom') {
                      yVal = yRange[0] + (yRange[1] - yRange[0]) * 0.15;
                    } else if (position === 'top') {
                      yVal = yRange[1] - (yRange[1] - yRange[0]) * 0.15;
                    } else if (position === 'center') {
                      yVal = 0;
                    } else {
                      yVal = 0;
                    }

                    const sx = mx(startX);
                    const ex = mx(endX);
                    const sy = my(yVal);

                    const showLine = shape.showLine !== false;
                    const showArrow = shape.showArrow !== false;
                    const showTicks = shape.showTicks !== false;
                    const showGrid = !!shape.showGrid;
                    const showNumbers = shape.showNumbers !== false;
                    const allowNegative = shape.allowNegative !== false;

                    const strokeColor = getPremiumColor(shape.color || 'currentColor', isDark);
                    const baseLineWidth = shape.lineWidth || 2.5;
                    const lineWidth = isMobile ? baseLineWidth * 1.6 : baseLineWidth;
                    const baseFontSize = shape.fontSize || 13;
                    const fontSize = isMobile ? baseFontSize * 1.5 : baseFontSize;
                    const baseTickLen = shape.tickLength || 6;
                    const tickLen = isMobile ? baseTickLen * 1.5 : baseTickLen;
                    const rotation = shape.rotation || 0;

                    const rangeVal = valEnd - valStart;

                    // 1. Calculate Nice Spacing automatically if not provided or <= 0
                    let spacing = shape.tickSpacing;
                    if (spacing === undefined || spacing <= 0) {
                      const idealTicks = isMobile ? 5 : 10;
                      const rawSpacing = rangeVal > 0 ? (rangeVal / idealTicks) : 1;
                      const log = Math.log10(rawSpacing);
                      const power = Math.pow(10, Math.floor(log));
                      const ratio = rawSpacing / power;
                      let niceSpacing = 1;
                      if (ratio < 1.5) niceSpacing = 1;
                      else if (ratio < 3.5) niceSpacing = 2;
                      else if (ratio < 7.5) niceSpacing = 5;
                      else niceSpacing = 10;
                      spacing = niceSpacing * power;
                    }

                    // 2. Generate tick values
                    const ticks: number[] = [];
                    if (rangeVal > 0 && spacing > 0) {
                      let tStart = Math.ceil(valStart / spacing) * spacing;
                      for (let t = tStart; t <= valEnd + (spacing * 0.0001); t += spacing) {
                        const val = parseFloat(t.toFixed(4));
                        if (val >= valStart && val <= valEnd) {
                          ticks.push(val);
                        }
                      }
                      if (ticks.length === 0 || ticks[0] > valStart + (spacing * 0.01)) {
                        const cleanStart = parseFloat(valStart.toFixed(4));
                        if (cleanStart >= valStart) ticks.unshift(cleanStart);
                      }
                    } else if (valStart === valEnd) {
                      ticks.push(valStart);
                    }

                    // 3. Prevent overlapping labels by calculating actual space in SVG pixels
                    let tickSpacingInPixels = 0;
                    if (ticks.length > 1 && rangeVal > 0) {
                      const dxVal = mx(startX + ((ticks[1] - valStart) / rangeVal) * (endX - startX)) - mx(startX + ((ticks[0] - valStart) / rangeVal) * (endX - startX));
                      tickSpacingInPixels = Math.abs(dxVal);
                    }

                    let skipFactor = 1;
                    if (tickSpacingInPixels > 0) {
                      const maxCharCount = ticks.reduce((max, t) => Math.max(max, t.toString().length), 1);
                      const labelWidthEst = maxCharCount * (fontSize * 0.6) + 16; 
                      if (tickSpacingInPixels < labelWidthEst) {
                        skipFactor = Math.ceil(labelWidthEst / tickSpacingInPixels);
                      }
                    }

                    if (isMobile && skipFactor === 1 && ticks.length > 4) {
                      skipFactor = 2;
                    }

                    const axisCenterX = (sx + ex) / 2;
                    const axisCenterY = sy;

                    const axisGroupContent = (
                      <>
                        {/* Grid lines */}
                        {showGrid && ticks.map((t, idx) => {
                          if (!allowNegative && t < 0) return null;
                          const pct = rangeVal > 0 ? (t - valStart) / rangeVal : 0.5;
                          const cx = startX + pct * (endX - startX);
                          return (
                            <line
                              key={`x-grid-${t}-${idx}`}
                              x1={mx(cx)}
                              y1={0}
                              x2={mx(cx)}
                              y2={vHeight}
                              stroke={gridLineColor}
                              strokeWidth={isMobile ? 1.75 : 1}
                              strokeDasharray={isMobile ? "6 6" : "4 4"}
                            />
                          );
                        })}

                        {/* Axis main line */}
                        {showLine && (
                          <line
                            x1={sx}
                            y1={sy}
                            x2={ex}
                            y2={sy}
                            stroke={strokeColor}
                            strokeWidth={lineWidth}
                            markerEnd={showArrow ? 'url(#arrow)' : undefined}
                          />
                        )}

                        {/* Ticks and Numbers */}
                        {ticks.map((t, idx) => {
                          if (!allowNegative && t < 0) return null;

                          const pct = rangeVal > 0 ? (t - valStart) / rangeVal : 0.5;
                          const cx = startX + pct * (endX - startX);
                          const px = mx(cx);

                          const renderLabel = showNumbers && (idx % skipFactor === 0);

                          return (
                            <g key={`x-tick-${t}-${idx}`}>
                              {showTicks && (
                                <line
                                  x1={px}
                                  y1={sy - tickLen}
                                  x2={px}
                                  y2={sy + tickLen}
                                  stroke={strokeColor}
                                  strokeWidth={lineWidth * 0.75}
                                />
                              )}
                              {renderLabel && (
                                <text
                                  x={px}
                                  y={sy + fontSize + (isMobile ? 9 : 6)}
                                  fontSize={fontSize}
                                  fontFamily="var(--font-mono, monospace)"
                                  fontWeight="bold"
                                  fill={strokeColor}
                                  textAnchor="middle"
                                >
                                  {t}
                                </text>
                              )}
                            </g>
                          );
                        })}

                        {/* Axis title label */}
                        {shape.label && (() => {
                          let labelX = (sx + ex) / 2;
                          let labelY = sy + fontSize + (isMobile ? 36 : 24);
                          let anchor = "middle";

                          const labelPos = shape.labelPosition || 'center';
                          if (labelPos === 'start') {
                            labelX = sx;
                            anchor = 'start';
                          } else if (labelPos === 'end') {
                            labelX = ex;
                            anchor = 'end';
                          } else {
                            labelX = (sx + ex) / 2;
                            anchor = 'middle';
                          }

                          return (
                            <text
                              x={labelX}
                              y={labelY}
                              fontSize={fontSize + (isMobile ? 3 : 2)}
                              fontFamily="var(--font-sans, sans-serif)"
                              fontWeight="black"
                              fill={strokeColor}
                              textAnchor={anchor}
                            >
                              {shape.label}
                            </text>
                          );
                        })()}
                      </>
                    );

                    if (rotation !== 0) {
                      return (
                        <g 
                          key={shapeKey} 
                          className="custom-x-axis" 
                          transform={`rotate(${rotation}, ${axisCenterX}, ${axisCenterY})`}
                          {...(isInteractive ? interactiveProps : {})}
                        >
                          {axisGroupContent}
                        </g>
                      );
                    }

                    return (
                      <g 
                        key={shapeKey} 
                        className="custom-x-axis" 
                        {...(isInteractive ? interactiveProps : {})}
                      >
                        {axisGroupContent}
                      </g>
                    );
                  }

                  case 'yAxis': {
                    const startY = shape.startY !== undefined ? shape.startY : yRange[0];
                    const endY = shape.endY !== undefined ? shape.endY : yRange[1];
                    const valStart = shape.valueStart !== undefined ? shape.valueStart : startY;
                    const valEnd = shape.valueEnd !== undefined ? shape.valueEnd : endY;

                    const position = shape.position || 'left';
                    let xVal = 0;
                    if (shape.x !== undefined) {
                      xVal = shape.x;
                    } else if (position === 'left') {
                      xVal = xRange[0] + (xRange[1] - xRange[0]) * 0.05;
                    } else if (position === 'right') {
                      xVal = xRange[1] - (xRange[1] - xRange[0]) * 0.05;
                    } else if (position === 'center') {
                      xVal = (xRange[0] + xRange[1]) / 2;
                    } else {
                      xVal = 0;
                    }

                    const sx = mx(xVal);
                    const sy = my(startY);
                    const ey = my(endY);

                    const showLine = shape.showLine !== false;
                    const showArrow = shape.showArrow !== false;
                    const showTicks = shape.showTicks !== false;
                    const showGrid = !!shape.showGrid;
                    const showNumbers = shape.showNumbers !== false;
                    const allowNegative = shape.allowNegative !== false;

                    const strokeColor = getPremiumColor(shape.color || 'currentColor', isDark);
                    const baseLineWidth = shape.lineWidth || 2.5;
                    const lineWidth = isMobile ? baseLineWidth * 1.6 : baseLineWidth;
                    const baseFontSize = shape.fontSize || 13;
                    const fontSize = isMobile ? baseFontSize * 1.5 : baseFontSize;
                    const baseTickLen = shape.tickLength || 6;
                    const tickLen = isMobile ? baseTickLen * 1.5 : baseTickLen;
                    const rotation = shape.rotation || 0;
                    const unit = shape.unit || '';

                    const rangeVal = valEnd - valStart;

                    // 1. Calculate Nice Spacing automatically if not provided or <= 0
                    let spacing = shape.tickSpacing;
                    if (spacing === undefined || spacing <= 0) {
                      const idealTicks = isMobile ? 5 : 10;
                      const rawSpacing = rangeVal > 0 ? (rangeVal / idealTicks) : 1;
                      const log = Math.log10(rawSpacing);
                      const power = Math.pow(10, Math.floor(log));
                      const ratio = rawSpacing / power;
                      let niceSpacing = 1;
                      if (ratio < 1.5) niceSpacing = 1;
                      else if (ratio < 3.5) niceSpacing = 2;
                      else if (ratio < 7.5) niceSpacing = 5;
                      else niceSpacing = 10;
                      spacing = niceSpacing * power;
                    }

                    // 2. Generate tick values
                    const ticks: number[] = [];
                    if (rangeVal > 0 && spacing > 0) {
                      let tStart = Math.ceil(valStart / spacing) * spacing;
                      for (let t = tStart; t <= valEnd + (spacing * 0.0001); t += spacing) {
                        const val = parseFloat(t.toFixed(4));
                        if (val >= valStart && val <= valEnd) {
                          ticks.push(val);
                        }
                      }
                      if (ticks.length === 0 || ticks[0] > valStart + (spacing * 0.01)) {
                        const cleanStart = parseFloat(valStart.toFixed(4));
                        if (cleanStart >= valStart) ticks.unshift(cleanStart);
                      }
                    } else if (valStart === valEnd) {
                      ticks.push(valStart);
                    }

                    // 3. Prevent overlapping labels vertically
                    let tickSpacingInPixels = 0;
                    if (ticks.length > 1 && rangeVal > 0) {
                      const dyVal = my(startY + ((ticks[1] - valStart) / rangeVal) * (endY - startY)) - my(startY + ((ticks[0] - valStart) / rangeVal) * (endY - startY));
                      tickSpacingInPixels = Math.abs(dyVal);
                    }

                    let skipFactor = 1;
                    const labelHeightEst = fontSize + 6;
                    if (tickSpacingInPixels > 0 && tickSpacingInPixels < labelHeightEst) {
                      skipFactor = Math.ceil(labelHeightEst / tickSpacingInPixels);
                    }

                    if (isMobile && skipFactor === 1 && ticks.length > 4) {
                      skipFactor = 2;
                    }

                    const axisCenterX = sx;
                    const axisCenterY = (sy + ey) / 2;

                    const axisGroupContent = (
                      <>
                        {/* Grid lines (horizontal) */}
                        {showGrid && ticks.map((t, idx) => {
                          if (!allowNegative && t < 0) return null;
                          const pct = rangeVal > 0 ? (t - valStart) / rangeVal : 0.5;
                          const cy = startY + pct * (endY - startY);
                          return (
                            <line
                              key={`y-grid-${t}-${idx}`}
                              x1={0}
                              y1={my(cy)}
                              x2={vWidth}
                              y2={my(cy)}
                              stroke={gridLineColor}
                              strokeWidth={isMobile ? 1.75 : 1}
                              strokeDasharray={isMobile ? "6 6" : "4 4"}
                            />
                          );
                        })}

                        {/* Axis main line */}
                        {showLine && (
                          <line
                            x1={sx}
                            y1={sy}
                            x2={sx}
                            y2={ey}
                            stroke={strokeColor}
                            strokeWidth={lineWidth}
                            markerEnd={showArrow ? 'url(#arrow)' : undefined}
                          />
                        )}

                        {/* Ticks and Numbers */}
                        {ticks.map((t, idx) => {
                          if (!allowNegative && t < 0) return null;

                          const pct = rangeVal > 0 ? (t - valStart) / rangeVal : 0.5;
                          const cy = startY + pct * (endY - startY);
                          const py = my(cy);

                          const renderLabel = showNumbers && (idx % skipFactor === 0);
                          const nearLeft = sx < 30;

                          return (
                            <g key={`y-tick-${t}-${idx}`}>
                              {showTicks && (
                                <line
                                  x1={sx - tickLen}
                                  y1={py}
                                  x2={sx + tickLen}
                                  y2={py}
                                  stroke={strokeColor}
                                  strokeWidth={lineWidth * 0.75}
                                />
                              )}
                              {renderLabel && (
                                <text
                                  x={nearLeft ? sx + tickLen + (isMobile ? 8 : 4) : sx - tickLen - (isMobile ? 8 : 4)}
                                  y={py + fontSize * 0.3}
                                  fontSize={fontSize}
                                  fontFamily="var(--font-mono, monospace)"
                                  fontWeight="bold"
                                  fill={strokeColor}
                                  textAnchor={nearLeft ? 'start' : 'end'}
                                >
                                  {t}{unit}
                                </text>
                              )}
                            </g>
                          );
                        })}

                        {/* Axis title label */}
                        {shape.label && (() => {
                          const labelPos = shape.labelPosition || 'center';
                          let labelX = sx - (isMobile ? 48 : 35);
                          let labelY = (sy + ey) / 2;
                          let rot = -90;

                          if (labelPos === 'start') {
                            labelY = sy + 15;
                          } else if (labelPos === 'end') {
                            labelY = ey - 15;
                          }

                          return (
                            <text
                              x={labelX}
                              y={labelY}
                              fontSize={fontSize + (isMobile ? 3 : 2)}
                              fontFamily="var(--font-sans, sans-serif)"
                              fontWeight="black"
                              fill={strokeColor}
                              textAnchor="middle"
                              transform={`rotate(${rot}, ${labelX}, ${labelY})`}
                            >
                              {shape.label}
                            </text>
                          );
                        })()}
                      </>
                    );

                    if (rotation !== 0) {
                      return (
                        <g 
                          key={shapeKey} 
                          className="custom-y-axis" 
                          transform={`rotate(${rotation}, ${axisCenterX}, ${axisCenterY})`}
                          {...(isInteractive ? interactiveProps : {})}
                        >
                          {axisGroupContent}
                        </g>
                      );
                    }

                    return (
                      <g 
                        key={shapeKey} 
                        className="custom-y-axis" 
                        {...(isInteractive ? interactiveProps : {})}
                      >
                        {axisGroupContent}
                      </g>
                    );
                  }

                  // 1. Point primitive
                  case 'point':
                  case 'coordinatePoint': {
                    const cxVal = mx(shape.x || 0);
                    const cyVal = my(shape.y || 0);
                    const baseRadius = shape.r || 6;
                    const rVal = isMobile ? baseRadius * 1.5 : baseRadius;
                    
                    return (
                      <g key={shapeKey}>
                        {isHovered && (
                          <circle cx={cxVal} cy={cyVal} r={rVal + (isMobile ? 9 : 6)} fill={strokeColor} opacity={0.2} stroke="none" />
                        )}
                        <circle 
                          cx={cxVal} 
                          cy={cyVal} 
                          r={rVal} 
                          fill={isHovered ? (isDark ? '#cbd5e1' : '#1e293b') : getPremiumColor(shape.fill || shape.stroke, isDark)}
                          stroke="#ffffff"
                          strokeWidth={isMobile ? 2.5 : 1.5}
                          {...interactiveProps}
                        />
                      </g>
                    );
                  }

                  // 2. Line / Arrow primitives
                  case 'line':
                  case 'segment':
                  case 'polyline':
                  case 'ray':
                  case 'arrow':
                  case 'vector': {
                    const sx = mx(shape.x1 !== undefined ? shape.x1 : (shape.start ? shape.start[0] : 0));
                    const sy = my(shape.y1 !== undefined ? shape.y1 : (shape.start ? shape.start[1] : 0));
                    const ex = mx(shape.x2 !== undefined ? shape.x2 : (shape.end ? shape.end[0] : 0));
                    const ey = my(shape.y2 !== undefined ? shape.y2 : (shape.end ? shape.end[1] : 0));

                    const isVector = shape.type === 'vector' || shape.type === 'arrow' || shape.type === 'ray';

                    return (
                      <line 
                        key={shapeKey}
                        x1={sx} y1={sy} x2={ex} y2={ey}
                        stroke={strokeColor}
                        strokeWidth={sWidth}
                        opacity={opacity}
                        markerEnd={isVector || shape.arrowEnd ? 'url(#arrow)' : undefined}
                        markerStart={shape.arrowStart ? 'url(#arrow)' : undefined}
                        {...dashProps}
                        {...(isInteractive ? interactiveProps : {})}
                      />
                    );
                  }

                  // 3. Rectangles & Squares
                  case 'rectangle':
                  case 'roundedRectangle':
                  case 'square':
                  case 'rect': {
                    let rx = 0;
                    let ry = 0;
                    let w = 0;
                    let h = 0;

                    if (shape.points && shape.points.length >= 2) {
                      const getPointX = (p: any) => Array.isArray(p) ? p[0] : (p && typeof p === 'object' ? p.x : 0);
                      const getPointY = (p: any) => Array.isArray(p) ? p[1] : (p && typeof p === 'object' ? p.y : 0);
                      const x1 = mx(getPointX(shape.points[0]));
                      const y1 = my(getPointY(shape.points[0]));
                      const x2 = mx(getPointX(shape.points[1]));
                      const y2 = my(getPointY(shape.points[1]));
                      rx = Math.min(x1, x2);
                      ry = Math.min(y1, y2);
                      w = Math.abs(x1 - x2);
                      h = Math.abs(y1 - y2);
                    } else {
                      rx = mx(shape.x !== undefined ? shape.x : 0);
                      ry = my(shape.y !== undefined ? shape.y : 0);
                      w = shape.width !== undefined ? muX(shape.width) : 100;
                      h = shape.height !== undefined ? muY(shape.height) : 100;

                      if (shape.type === 'square') {
                        const side = shape.size || 2;
                        w = muX(side);
                        h = muY(side);
                      }

                      if (yRange[0] < yRange[1] && (shape.height !== undefined || shape.type === 'square')) {
                        ry = my(shape.y || 0) - h;
                      }
                    }

                    const cornerRadiusX = shape.rx || 0;
                    const cornerRadiusY = shape.ry || 0;

                    return (
                      <rect 
                        key={shapeKey}
                        x={rx} y={ry} width={w} height={h}
                        fill={fillColor}
                        fillOpacity={fillOpacity}
                        stroke={strokeColor}
                        strokeWidth={sWidth}
                        opacity={opacity}
                        rx={cornerRadiusX}
                        ry={cornerRadiusY}
                        {...dashProps}
                        {...(isInteractive ? interactiveProps : {})}
                      />
                    );
                  }

                  // 4. Circle System
                  case 'circle': {
                    const cxVal = mx(getCenterX(shape));
                    const cyVal = my(getCenterY(shape));
                    const rVal = shape.r !== undefined ? muX(shape.r) : 50;

                    return (
                      <circle 
                        key={shapeKey}
                        cx={cxVal} cy={cyVal} r={rVal}
                        fill={fillColor}
                        fillOpacity={fillOpacity}
                        stroke={strokeColor}
                        strokeWidth={sWidth}
                        opacity={opacity}
                        {...dashProps}
                        {...(isInteractive ? interactiveProps : {})}
                      />
                    );
                  }

                  case 'ellipse': {
                    const cxVal = mx(getCenterX(shape));
                    const cyVal = my(getCenterY(shape));
                    const rxVal = shape.rx !== undefined ? muX(shape.rx) : 80;
                    const ryVal = shape.ry !== undefined ? muY(shape.ry) : 50;

                    return (
                      <ellipse 
                        key={shapeKey}
                        cx={cxVal} cy={cyVal} rx={rxVal} ry={ryVal}
                        fill={fillColor}
                        fillOpacity={fillOpacity}
                        stroke={strokeColor}
                        strokeWidth={sWidth}
                        opacity={opacity}
                        {...dashProps}
                        {...(isInteractive ? interactiveProps : {})}
                      />
                    );
                  }

                  case 'polygon':
                  case 'triangle':
                  case 'trapezium': {
                    const pts = shape.points || [];
                    const mappedPoints = pts.map((p: any) => {
                      if (Array.isArray(p)) return `${mx(p[0])},${my(p[1])}`;
                      return `${mx(p.x)},${my(p.y)}`;
                    }).join(' ');

                    return (
                      <polygon 
                        key={shapeKey}
                        points={mappedPoints}
                        fill={fillColor}
                        fillOpacity={fillOpacity}
                        stroke={strokeColor}
                        strokeWidth={sWidth}
                        opacity={opacity}
                        {...dashProps}
                        {...(isInteractive ? interactiveProps : {})}
                      />
                    );
                  }

                  case 'hexagon':
                  case 'pentagon':
                  case 'octagon':
                  case 'regularPolygon': {
                    const cxCart = getCenterX(shape);
                    const cyCart = getCenterY(shape);
                    const rCart = shape.radius || shape.r || 2;
                    
                    let sides = 5;
                    if (shape.type === 'hexagon') sides = 6;
                    else if (shape.type === 'octagon') sides = 8;
                    else if (shape.type === 'regularPolygon') {
                      sides = (shape as any).sides || (shape as any).n || 5;
                    }
                    
                    const pointsArray = [];
                    for (let i = 0; i < sides; i++) {
                      const angleRad = (i * 2 * Math.PI) / sides - Math.PI / 2;
                      const px = mx(cxCart + rCart * Math.cos(angleRad));
                      const py = my(cyCart + rCart * Math.sin(angleRad));
                      pointsArray.push(`${px},${py}`);
                    }
                    
                    const mappedPoints = pointsArray.join(' ');
                    
                    return (
                      <polygon 
                        key={shapeKey}
                        points={mappedPoints}
                        fill={fillColor}
                        fillOpacity={fillOpacity}
                        stroke={strokeColor}
                        strokeWidth={sWidth}
                        opacity={opacity}
                        {...dashProps}
                        {...(isInteractive ? interactiveProps : {})}
                      />
                    );
                  }

                  case 'rhombus':
                  case 'kite': {
                    const cxCart = getCenterX(shape);
                    const cyCart = getCenterY(shape);
                    const rxCart = (shape.width || (shape as any).d1 || shape.size || 2) / 2;
                    const ryCart = (shape.height || (shape as any).d2 || shape.size || 2) / 2;
                    
                    const p1 = `${mx(cxCart)},${my(cyCart + ryCart)}`;
                    const p2 = `${mx(cxCart + rxCart)},${my(cyCart)}`;
                    const p3 = `${mx(cxCart)},${my(cyCart - ryCart)}`;
                    const p4 = `${mx(cxCart - rxCart)},${my(cyCart)}`;
                    
                    const mappedPoints = `${p1} ${p2} ${p3} ${p4}`;
                    
                    return (
                      <polygon 
                        key={shapeKey}
                        points={mappedPoints}
                        fill={fillColor}
                        fillOpacity={fillOpacity}
                        stroke={strokeColor}
                        strokeWidth={sWidth}
                        opacity={opacity}
                        {...dashProps}
                        {...(isInteractive ? interactiveProps : {})}
                      />
                    );
                  }

                  case 'path':
                  case 'svgPath': {
                    if (!shape.d) return null;
                    return (
                      <path 
                        key={shapeKey}
                        d={shape.d}
                        fill={fillColor}
                        fillOpacity={fillOpacity}
                        stroke={strokeColor}
                        strokeWidth={sWidth}
                        opacity={opacity}
                        {...dashProps}
                        {...(isInteractive ? interactiveProps : {})}
                      />
                    );
                  }

                  case 'arc': {
                    const cxVal = mx(getCenterX(shape));
                    const cyVal = my(getCenterY(shape));
                    const rVal = shape.r !== undefined ? muX(shape.r) : 50;
                    const sa = shape.startAngle !== undefined ? shape.startAngle : 0;
                    const ea = shape.endAngle !== undefined ? shape.endAngle : 90;
                    
                    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
                      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
                      return {
                        x: centerX + (radius * Math.cos(angleInRadians)),
                        y: centerY + (radius * Math.sin(angleInRadians))
                      };
                    };
                    
                    const start = polarToCartesian(cxVal, cyVal, rVal, ea);
                    const end = polarToCartesian(cxVal, cyVal, rVal, sa);
                    const largeArcFlag = ea - sa <= 180 ? "0" : "1";
                    const dVal = [
                      "M", start.x, start.y, 
                      "A", rVal, rVal, 0, largeArcFlag, 0, end.x, end.y
                    ].join(" ");

                    return (
                      <path 
                        key={shapeKey}
                        d={dVal}
                        fill={fillColor}
                        fillOpacity={fillOpacity}
                        stroke={strokeColor}
                        strokeWidth={sWidth}
                        opacity={opacity}
                        {...dashProps}
                        {...(isInteractive ? interactiveProps : {})}
                      />
                    );
                  }

                  // 5. Angles arcs
                  case 'angle':
                  case 'acuteAngle':
                  case 'rightAngle':
                  case 'obtuseAngle':
                  case 'reflexAngle': {
                    const cxVal = mx(getCenterX(shape));
                    const cyVal = my(getCenterY(shape));
                    const rVal = shape.r || 35;
                    const sa = shape.startAngle || 0;
                    const ea = shape.endAngle || 90;

                    return renderAngleArc(cxVal, cyVal, rVal, sa, ea, shape, shapeKey);
                  }

                  // 6. Graphs & curves plotting
                  case 'curve':
                  case 'quadraticCurve':
                  case 'cubicBezier': {
                    const csx = mx(shape.start ? shape.start[0] : 0);
                    const csy = my(shape.start ? shape.start[1] : 0);
                    const cx1 = mx(shape.control1 ? shape.control1[0] : 0);
                    const cy1 = my(shape.control1 ? shape.control1[1] : 0);
                    const cex = mx(shape.end ? shape.end[0] : 0);
                    const cey = my(shape.end ? shape.end[1] : 0);
                    
                    let curveD = "";
                    if (shape.control2) {
                      const cx2 = mx(shape.control2[0]);
                      const cy2 = my(shape.control2[1]);
                      curveD = `M ${csx} ${csy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${cex} ${cey}`;
                    } else {
                      curveD = `M ${csx} ${csy} Q ${cx1} ${cy1}, ${cex} ${cey}`;
                    }

                    return (
                      <path 
                        key={shapeKey}
                        d={curveD}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={sWidth}
                        opacity={opacity}
                        markerEnd={shape.arrowEnd ? 'url(#arrow)' : undefined}
                        {...dashProps}
                        {...(isInteractive ? interactiveProps : {})}
                      />
                    );
                  }

                  case 'functionPlot': {
                    const eqExpr = shape.equation || shape.expression;
                    if (!eqExpr) return null;
                    
                    const evaluateY = (x: number) => {
                      try {
                        const expr = eqExpr
                          .replace(/x\^2/g, 'Math.pow(x,2)')
                          .replace(/x\^3/g, 'Math.pow(x,3)')
                          .replace(/sin\(x\)/g, 'Math.sin(x)')
                          .replace(/cos\(x\)/g, 'Math.cos(x)')
                          .replace(/ln\(x\)/g, 'Math.log(x)')
                          .replace(/e\^x/g, 'Math.exp(x)');
                        
                        const fn = new Function('x', `return ${expr};`);
                        return fn(x);
                      } catch(e) {
                        return 0;
                      }
                    };

                    const steps = 100;
                    const stepX = (xRange[1] - xRange[0]) / steps;
                    const curvePts = [];
                    for (let i = 0; i <= steps; i++) {
                      const cx = xRange[0] + i * stepX;
                      const cy = evaluateY(cx);
                      if (!isNaN(cy) && isFinite(cy)) {
                        curvePts.push(`${mx(cx)},${my(cy)}`);
                      }
                    }

                    return (
                      <path 
                        key={shapeKey}
                        d={`M ${curvePts.join(' L ')}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={sWidth}
                        opacity={opacity}
                      />
                    );
                  }

                  // 7. 3D Mensuration Wireframes
                  case 'cube':
                  case 'cuboid':
                  case 'cylinder':
                  case 'cone':
                  case 'sphere': {
                    return render3DWireframe(shape, shapeKey, idx);
                  }

                  // 8. Statistics Venn Circle
                  case 'vennDiagram': {
                    const rVal = muX(shape.r || 2.5);
                    const count = shape.values?.length || 2;
                    const cyVal = my(0);

                    if (count === 3) {
                      const cx1 = mx(-1.0);
                      const cx2 = mx(1.0);
                      const cx3 = mx(0);
                      const cy3 = my(-1.2);
                      return (
                        <g key={shapeKey} opacity={opacity}>
                          <circle cx={cx1} cy={cyVal} r={rVal} fill="rgba(138,28,54,0.05)" stroke="#8a1c36" strokeWidth={sWidth} />
                          <circle cx={cx2} cy={cyVal} r={rVal} fill="rgba(99,102,241,0.05)" stroke="#4f46e5" strokeWidth={sWidth} />
                          <circle cx={cx3} cy={cy3} r={rVal} fill="rgba(16,185,129,0.05)" stroke="#059669" strokeWidth={sWidth} />
                          {showLabels && (
                            <>
                              <text x={cx1 - rVal * 0.4} y={cyVal} className={cn("font-black fill-[#8a1c36]", isMobile ? "text-[14px]" : "text-xs")}>Set A</text>
                              <text x={cx2 + rVal * 0.4} y={cyVal} className={cn("font-black fill-[#4f46e5]", isMobile ? "text-[14px]" : "text-xs")}>Set B</text>
                              <text x={cx3} y={cy3 - rVal * 0.4} className={cn("font-black fill-[#059669]", isMobile ? "text-[14px]" : "text-xs")} textAnchor="middle">Set C</text>
                            </>
                          )}
                        </g>
                      );
                    } else {
                      const cx1 = mx(-1.2);
                      const cx2 = mx(1.2);
                      return (
                        <g key={shapeKey} opacity={opacity}>
                          <circle cx={cx1} cy={cyVal} r={rVal} fill="rgba(138,28,54,0.06)" stroke="#8a1c36" strokeWidth={sWidth} />
                          <circle cx={cx2} cy={cyVal} r={rVal} fill="rgba(99,102,241,0.06)" stroke="#4f46e5" strokeWidth={sWidth} />
                          {showLabels && (
                            <>
                              <text x={cx1 - 30} y={cyVal - rVal - 10} className={cn("font-black fill-[#8a1c36]", isMobile ? "text-[14px]" : "text-xs")} textAnchor="middle">Set A</text>
                              <text x={cx2 + 30} y={cyVal - rVal - 10} className={cn("font-black fill-[#4f46e5]", isMobile ? "text-[14px]" : "text-xs")} textAnchor="middle">Set B</text>
                            </>
                          )}
                        </g>
                      );
                    }
                  }

                  // 9. Logical reasoning items (Clock, direction)
                  case 'clock': {
                    const cxVal = mx(shape.x || 0);
                    const cyVal = my(shape.y || 0);
                    const rVal = muX(shape.r || 2.0);
                    const timeStr = shape.time || "10:10";
                    const [hr, min] = timeStr.split(':').map(Number);
                    
                    const minAngle = (min * 6) - 90;
                    const hrAngle = (hr * 30 + min * 0.5) - 90;

                    return (
                      <g key={shapeKey} className="clock-group">
                        <circle cx={cxVal} cy={cyVal} r={rVal} fill="#ffffff" stroke={strokeColor} strokeWidth={sWidth} />
                        <circle cx={cxVal} cy={cyVal} r={isMobile ? 8 : 5} fill="#8a1c36" />
                        
                        <line 
                          x1={cxVal} y1={cyVal} 
                          x2={cxVal + rVal * 0.5 * Math.cos(hrAngle * Math.PI / 180)} 
                          y2={cyVal + rVal * 0.5 * Math.sin(hrAngle * Math.PI / 180)} 
                          stroke="#8a1c36" strokeWidth={isMobile ? 6 : 4} strokeLinecap="round"
                        />
                        
                        <line 
                          x1={cxVal} y1={cyVal} 
                          x2={cxVal + rVal * 0.8 * Math.cos(minAngle * Math.PI / 180)} 
                          y2={cyVal + rVal * 0.8 * Math.sin(minAngle * Math.PI / 180)} 
                          stroke="#1e293b" strokeWidth={isMobile ? 4 : 2.5} strokeLinecap="round"
                        />

                        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
                          const tickX1 = cxVal + rVal * 0.9 * Math.cos(deg * Math.PI / 180);
                          const tickY1 = cyVal + rVal * 0.9 * Math.sin(deg * Math.PI / 180);
                          const tickX2 = cxVal + rVal * 0.98 * Math.cos(deg * Math.PI / 180);
                          const tickY2 = cyVal + rVal * 0.98 * Math.sin(deg * Math.PI / 180);
                          return <line key={deg} x1={tickX1} y1={tickY1} x2={tickX2} y2={tickY2} stroke="#475569" strokeWidth={isMobile ? 2.5 : 1.5} />;
                        })}
                      </g>
                    );
                  }

                  // 10. Graph & Chart shape types
                  case 'lineGraph': {
                    const pts = shape.points || [];
                    const pointsStr = pts.map((p: any) => `${mx(Array.isArray(p) ? p[0] : p.x)},${my(Array.isArray(p) ? p[1] : p.y)}`).join(' L ');
                    return (
                      <g key={shapeKey}>
                        <path d={`M ${pointsStr}`} fill="none" stroke={strokeColor} strokeWidth={sWidth} {...dashProps} />
                        {pts.map((p: any, pIdx: number) => {
                          const px = mx(Array.isArray(p) ? p[0] : p.x);
                          const py = my(Array.isArray(p) ? p[1] : p.y);
                          return (
                            <g key={pIdx}>
                              <circle cx={px} cy={py} r={isMobile ? 7.5 : 5} fill="#ffffff" stroke={strokeColor} strokeWidth={isMobile ? 3.0 : 2} />
                              {showLabels && (
                                <text x={px} y={py - (isMobile ? 14 : 10)} className={cn("font-bold fill-current", isMobile ? "text-[14px]" : "text-[10px]")} textAnchor="middle">
                                  {p.label || `${Array.isArray(p) ? p[1] : p.y}`}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </g>
                    );
                  }

                  case 'barGraph':
                  case 'histogram': {
                    const pts = shape.points || [];
                    const barW = shape.width || 0.4;
                    const zeroY = my(0);
                    return (
                      <g key={shapeKey}>
                        {pts.map((p: any, pIdx: number) => {
                          const px = mx(Array.isArray(p) ? p[0] : p.x) - muX(barW) / 2;
                          const py = my(Array.isArray(p) ? p[1] : p.y);
                          const bh = Math.abs(zeroY - py);
                          const by = Math.min(zeroY, py);
                          const bw = muX(barW);
                          return (
                            <g key={pIdx}>
                              <rect
                                x={px}
                                y={by}
                                width={bw}
                                height={bh}
                                fill={fillColor}
                                fillOpacity={fillOpacity}
                                stroke={strokeColor}
                                strokeWidth={sWidth}
                              />
                              {showLabels && (
                                <text x={px + bw / 2} y={by - (isMobile ? 12 : 8)} className={cn("font-bold fill-current", isMobile ? "text-[14px]" : "text-[10px]")} textAnchor="middle">
                                  {p.label || `${Array.isArray(p) ? p[1] : p.y}`}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </g>
                    );
                  }

                  case 'pieChart': {
                    const cxVal = mx(getCenterX(shape));
                    const cyVal = my(getCenterY(shape));
                    const rVal = shape.r !== undefined ? muX(shape.r) : 100;
                    const vals = shape.values || [30, 20, 50];
                    const total = vals.reduce((a: number, b: number) => a + b, 0);
                    let currentAngle = 0;
                    
                    const premiumColors = ['#4f46e5', '#f43f5e', '#059669', '#d97706', '#7c3aed', '#ea580c', '#0d9488'];
                    
                    return (
                      <g key={shapeKey}>
                        {vals.map((v: number, vIdx: number) => {
                          const angle = (v / total) * 360;
                          const startRad = (currentAngle - 90) * Math.PI / 180;
                          const endRad = (currentAngle + angle - 90) * Math.PI / 180;
                          
                          const x1 = cxVal + rVal * Math.cos(startRad);
                          const y1 = cyVal + rVal * Math.sin(startRad);
                          const x2 = cxVal + rVal * Math.cos(endRad);
                          const y2 = cyVal + rVal * Math.sin(endRad);
                          
                          const largeArcFlag = angle > 180 ? 1 : 0;
                          const pathD = `M ${cxVal} ${cyVal} L ${x1} ${y1} A ${rVal} ${rVal} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                          const segmentColor = premiumColors[vIdx % premiumColors.length];
                          
                          const midRad = (currentAngle + angle / 2 - 90) * Math.PI / 180;
                          const lx = cxVal + (rVal * 0.6) * Math.cos(midRad);
                          const ly = cyVal + (rVal * 0.6) * Math.sin(midRad);
                          
                          currentAngle += angle;
                          
                          return (
                            <g key={vIdx}>
                              <path
                                d={pathD}
                                fill={segmentColor}
                                fillOpacity={0.7}
                                stroke="#ffffff"
                                strokeWidth={isMobile ? 2.5 : 1.5}
                              />
                              {showLabels && (
                                <text x={lx} y={ly} className={cn("font-black fill-white", isMobile ? "text-[14px]" : "text-[10px]")} textAnchor="middle" dominantBaseline="middle">
                                  {Math.round((v / total) * 100)}%
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </g>
                    );
                  }

                  case 'scatterPlot': {
                    const pts = shape.points || [];
                    return (
                      <g key={shapeKey}>
                        {pts.map((p: any, pIdx: number) => {
                          const px = mx(Array.isArray(p) ? p[0] : p.x);
                          const py = my(Array.isArray(p) ? p[1] : p.y);
                          return (
                            <g key={pIdx}>
                              <line x1={px - (isMobile ? 6 : 4)} y1={py - (isMobile ? 6 : 4)} x2={px + (isMobile ? 6 : 4)} y2={py + (isMobile ? 6 : 4)} stroke={strokeColor} strokeWidth={isMobile ? 3.0 : 2} />
                              <line x1={px + (isMobile ? 6 : 4)} y1={py - (isMobile ? 6 : 4)} x2={px - (isMobile ? 6 : 4)} y2={py + (isMobile ? 6 : 4)} stroke={strokeColor} strokeWidth={isMobile ? 3.0 : 2} />
                              {showLabels && (
                                <text x={px} y={py - (isMobile ? 12 : 8)} className={cn("font-bold fill-current", isMobile ? "text-[13px]" : "text-[9px]")} textAnchor="middle">
                                  {p.label || `(${Array.isArray(p) ? p[0] : p.x}, ${Array.isArray(p) ? p[1] : p.y})`}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </g>
                    );
                  }

                  // 11. Trigonometry & Advanced Curves
                  case 'unitCircle': {
                    const cxVal = mx(getCenterX(shape));
                    const cyVal = my(getCenterY(shape));
                    const rVal = shape.r !== undefined ? muX(shape.r) : 100;
                    const angleDeg = shape.angle !== undefined ? shape.angle : 30;
                    const thetaRad = angleDeg * Math.PI / 180;
                    const px = cxVal + rVal * Math.cos(thetaRad);
                    const py = cyVal - rVal * Math.sin(thetaRad);
                    
                    return (
                      <g key={shapeKey}>
                        <circle cx={cxVal} cy={cyVal} r={rVal} fill="none" stroke={strokeColor} strokeWidth={isMobile ? 3.2 : 2} />
                        <line x1={cxVal - rVal - (isMobile ? 30 : 20)} y1={cyVal} x2={cxVal + rVal + (isMobile ? 30 : 20)} y2={cyVal} stroke="currentColor" strokeWidth={isMobile ? 1.6 : 1} opacity={0.3} />
                        <line x1={cxVal} y1={cyVal - rVal - (isMobile ? 30 : 20)} x2={cxVal} y2={cyVal + rVal + (isMobile ? 30 : 20)} stroke="currentColor" strokeWidth={isMobile ? 1.6 : 1} opacity={0.3} />
                        <line x1={cxVal} y1={cyVal} x2={px} y2={py} stroke="#f43f5e" strokeWidth={isMobile ? 4.0 : 2.5} />
                        <line x1={px} y1={py} x2={px} y2={cyVal} stroke="#059669" strokeWidth={isMobile ? 2.5 : 1.5} strokeDasharray="3 3" />
                        <line x1={px} y1={py} x2={cxVal} y2={py} stroke="#059669" strokeWidth={isMobile ? 2.5 : 1.5} strokeDasharray="3 3" />
                        <path
                          d={`M ${cxVal + (isMobile ? 35 : 25)} ${cyVal} A ${isMobile ? 35 : 25} ${isMobile ? 35 : 25} 0 0 0 ${cxVal + (isMobile ? 35 : 25) * Math.cos(thetaRad)} ${cyVal - (isMobile ? 35 : 25) * Math.sin(thetaRad)}`}
                          fill="none"
                          stroke="orange"
                          strokeWidth={isMobile ? 3.0 : 2}
                        />
                        <circle cx={px} cy={py} r={isMobile ? 7 : 4.5} fill="#f43f5e" />
                        {showLabels && (
                          <>
                            <text x={px + (isMobile ? 15 : 10)} y={py - (isMobile ? 15 : 10)} className={cn("font-black fill-current", isMobile ? "text-[14px]" : "text-[10px]")}>
                              P(cos θ, sin θ)
                            </text>
                            <text x={cxVal + (isMobile ? 45 : 35)} y={cyVal - (isMobile ? 15 : 10)} className={cn("font-black fill-current", isMobile ? "text-[14px]" : "text-[10px]")}>
                              θ = {angleDeg}°
                            </text>
                          </>
                        )}
                      </g>
                    );
                  }

                  case 'heightDistance': {
                    const h = shape.height || 4;
                    const d = shape.width || 6;
                    const elevAngle = shape.elevationAngle || 30;
                    
                    const gX = mx(0);
                    const gY = my(0);
                    const tX = mx(d);
                    const tY = my(0);
                    const topX = mx(d);
                    const topY = my(h);
                    
                    return (
                      <g key={shapeKey}>
                        <line x1={gX - (isMobile ? 60 : 40)} y1={gY} x2={tX + (isMobile ? 60 : 40)} y2={tY} stroke="currentColor" strokeWidth={isMobile ? 4.8 : 3} />
                        <line x1={tX} y1={tY} x2={topX} y2={topY} stroke={strokeColor} strokeWidth={isMobile ? 4.8 : 3} />
                        <line x1={gX} y1={gY} x2={topX} y2={topY} stroke="#f43f5e" strokeWidth={isMobile ? 4.0 : 2.5} />
                        
                        <text x={tX + (isMobile ? 22 : 15)} y={(tY + topY)/2} className={cn("font-black fill-current", isMobile ? "text-[16px]" : "text-xs")} dominantBaseline="middle">
                          Height = {h}m
                        </text>
                        <text x={(gX + tX)/2} y={gY + (isMobile ? 26 : 18)} className={cn("font-black fill-current", isMobile ? "text-[16px]" : "text-xs")} textAnchor="middle">
                          Distance = {d}m
                        </text>
                        
                        <path
                          d={`M ${gX + (isMobile ? 50 : 35)} ${gY} A ${isMobile ? 50 : 35} ${isMobile ? 50 : 35} 0 0 0 ${gX + (isMobile ? 50 : 35) * Math.cos(elevAngle * Math.PI / 180)} ${gY - (isMobile ? 50 : 35) * Math.sin(elevAngle * Math.PI / 180)}`}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={isMobile ? 3.0 : 2}
                        />
                        <text x={gX + (isMobile ? 70 : 50)} y={gY - (isMobile ? 18 : 12)} className={cn("font-black fill-[#ef4444]", isMobile ? "text-[14px]" : "text-[10px]")}>
                          {elevAngle}°
                        </text>
                        <rect x={tX - (isMobile ? 22 : 15)} y={tY - (isMobile ? 22 : 15)} width={isMobile ? 22 : 15} height={isMobile ? 22 : 15} fill="none" stroke="currentColor" strokeWidth={isMobile ? 2.5 : 1.5} />
                      </g>
                    );
                  }

                  case 'parabola': {
                    const hc = shape.center ? shape.center[0] : 0;
                    const kc = shape.center ? shape.center[1] : 0;
                    const aCoeff = shape.size || 0.5;
                    
                    const steps = 100;
                    const stepX = (xRange[1] - xRange[0]) / steps;
                    const curvePts = [];
                    for (let i = 0; i <= steps; i++) {
                      const cx = xRange[0] + i * stepX;
                      const cy = aCoeff * Math.pow(cx - hc, 2) + kc;
                      if (!isNaN(cy) && isFinite(cy) && cy >= yRange[0] - 2 && cy <= yRange[1] + 2) {
                        curvePts.push(`${mx(cx)},${my(cy)}`);
                      }
                    }
                    return (
                      <path
                        key={shapeKey}
                        d={`M ${curvePts.join(' L ')}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={sWidth}
                        {...dashProps}
                      />
                    );
                  }

                  case 'hyperbola': {
                    const hc = shape.center ? shape.center[0] : 0;
                    const kc = shape.center ? shape.center[1] : 0;
                    const aVal = shape.width || 1.5;
                    const bVal = shape.height || 1.0;
                    
                    const steps = 50;
                    const leftBranch = [];
                    const rightBranch = [];
                    
                    for (let i = 0; i <= steps; i++) {
                      const t = -2 + (i / steps) * 4;
                      const xR = hc + aVal * Math.cosh(t);
                      const yR = kc + bVal * Math.sinh(t);
                      rightBranch.push(`${mx(xR)},${my(yR)}`);
                      
                      const xL = hc - aVal * Math.cosh(t);
                      const yL = kc + bVal * Math.sinh(t);
                      leftBranch.push(`${mx(xL)},${my(yL)}`);
                    }
                    
                    return (
                      <g key={shapeKey}>
                        <path d={`M ${rightBranch.join(' L ')}`} fill="none" stroke={strokeColor} strokeWidth={sWidth} />
                        <path d={`M ${leftBranch.join(' L ')}`} fill="none" stroke={strokeColor} strokeWidth={sWidth} />
                      </g>
                    );
                  }

                  case 'boxPlot': {
                    const minVal = shape.min !== undefined ? shape.min : -4;
                    const q1Val = shape.q1 !== undefined ? shape.q1 : -2;
                    const medVal = shape.median !== undefined ? shape.median : 0;
                    const q3Val = shape.q3 !== undefined ? shape.q3 : 2;
                    const maxVal = shape.max !== undefined ? shape.max : 4;
                    const yLoc = shape.y !== undefined ? shape.y : 0;
                    
                    const sy = my(yLoc);
                    const hSize = 25;
                    
                    return (
                      <g key={shapeKey}>
                        <line x1={mx(minVal)} y1={sy} x2={mx(q1Val)} y2={sy} stroke={strokeColor} strokeWidth={sWidth} />
                        <line x1={mx(q3Val)} y1={sy} x2={mx(maxVal)} y2={sy} stroke={strokeColor} strokeWidth={sWidth} />
                        <line x1={mx(minVal)} y1={sy - hSize/2} x2={mx(minVal)} y2={sy + hSize/2} stroke={strokeColor} strokeWidth={sWidth} />
                        <line x1={mx(maxVal)} y1={sy - hSize/2} x2={mx(maxVal)} y2={sy + hSize/2} stroke={strokeColor} strokeWidth={sWidth} />
                        <rect
                          x={mx(q1Val)}
                          y={sy - hSize}
                          width={mx(q3Val) - mx(q1Val)}
                          height={hSize * 2}
                          fill={fillColor}
                          fillOpacity={fillOpacity}
                          stroke={strokeColor}
                          strokeWidth={sWidth}
                        />
                        <line x1={mx(medVal)} y1={sy - hSize} x2={mx(medVal)} y2={sy + hSize} stroke="#f43f5e" strokeWidth={sWidth + 1} />
                        {showLabels && (
                          <>
                            <text x={mx(minVal)} y={sy + hSize + 12} className="text-[9px] font-bold fill-current" textAnchor="middle">Min: {minVal}</text>
                            <text x={mx(q1Val)} y={sy - hSize - 5} className="text-[9px] font-bold fill-current" textAnchor="middle">Q1: {q1Val}</text>
                            <text x={mx(medVal)} y={sy + hSize + 12} className="text-[9px] font-bold fill-[#f43f5e]" textAnchor="middle">Med: {medVal}</text>
                            <text x={mx(q3Val)} y={sy - hSize - 5} className="text-[9px] font-bold fill-current" textAnchor="middle">Q3: {q3Val}</text>
                            <text x={mx(maxVal)} y={sy + hSize + 12} className="text-[9px] font-bold fill-current" textAnchor="middle">Max: {maxVal}</text>
                          </>
                        )}
                      </g>
                    );
                  }

                  case 'probabilityTree':
                  case 'treeDiagram': {
                    const nodes = shape.points || [{ x: 0, y: 0, label: 'Root' }];
                    const root = nodes[0];
                    if (!root) return null;
                    const rxVal = mx(Array.isArray(root) ? root[0] : (root as any).x || 0);
                    const ryVal = my(Array.isArray(root) ? root[1] : (root as any).y || 0);
                    
                    return (
                      <g key={shapeKey}>
                        {nodes.slice(1).map((node: any, idx: number) => {
                          const nx = mx(Array.isArray(node) ? node[0] : node.x);
                          const ny = my(Array.isArray(node) ? node[1] : node.y);
                          const label = Array.isArray(node) ? '' : node.label;
                          return (
                            <g key={idx}>
                              <line x1={rxVal} y1={ryVal} x2={nx} y2={ny} stroke={strokeColor} strokeWidth={sWidth} />
                              {label && (
                                <rect x={(rxVal + nx)/2 - 15} y={(ryVal + ny)/2 - 10} width={30} height={16} rx={4} fill="#ffffff" stroke="rgba(148, 163, 184, 0.15)" strokeWidth={1} />
                              )}
                              {label && (
                                <text x={(rxVal + nx)/2} y={(ryVal + ny)/2} className="text-[9px] font-black fill-[#059669]" textAnchor="middle" dominantBaseline="middle">
                                  {label}
                                </text>
                              )}
                              <circle cx={nx} cy={ny} r={6} fill={strokeColor} />
                            </g>
                          );
                        })}
                        <circle cx={rxVal} cy={ryVal} r={8} fill="#4f46e5" />
                      </g>
                    );
                  }

                  case 'pyramid': {
                    const xVal = mx(shape.x || 0);
                    const yVal = my(shape.y || 0);
                    const wVal = muX(shape.width || 2);
                    const hVal = muY(shape.height || 2);
                    const dVal = muX(shape.depth || 1.2);
                    
                    const p1 = { x: xVal, y: yVal };
                    const p2 = { x: xVal + wVal, y: yVal };
                    const p3 = { x: xVal + wVal + dVal * 0.5, y: yVal - dVal * 0.4 };
                    const p4 = { x: xVal + dVal * 0.5, y: yVal - dVal * 0.4 };
                    const apex = { x: xVal + wVal/2 + dVal * 0.25, y: yVal - hVal };
                    
                    return (
                      <g key={shapeKey}>
                        <polygon points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={sWidth} />
                        <line x1={p1.x} y1={p1.y} x2={apex.x} y2={apex.y} stroke={strokeColor} strokeWidth={sWidth} />
                        <line x1={p2.x} y1={p2.y} x2={apex.x} y2={apex.y} stroke={strokeColor} strokeWidth={sWidth} />
                        <line x1={p3.x} y1={p3.y} x2={apex.x} y2={apex.y} stroke={strokeColor} strokeWidth={sWidth} />
                        <line x1={p4.x} y1={p4.y} x2={apex.x} y2={apex.y} stroke={strokeColor} strokeWidth={sWidth} strokeDasharray="3 3" />
                      </g>
                    );
                  }

                  case 'prism': {
                    const xVal = mx(shape.x || 0);
                    const yVal = my(shape.y || 0);
                    const wVal = muX(shape.width || 2);
                    const hVal = muY(shape.height || 2);
                    const dVal = muX(shape.depth || 2.5);
                    
                    const ox = dVal * 0.6;
                    const oy = -dVal * 0.4;
                    
                    const f1 = { x: xVal, y: yVal };
                    const f2 = { x: xVal + wVal, y: yVal };
                    const f3 = { x: xVal + wVal/2, y: yVal - hVal };
                    
                    const b1 = { x: f1.x + ox, y: f1.y + oy };
                    const b2 = { x: f2.x + ox, y: f2.y + oy };
                    const b3 = { x: f3.x + ox, y: f3.y + oy };
                    
                    return (
                      <g key={shapeKey}>
                        <polygon points={`${f1.x},${f1.y} ${f2.x},${f2.y} ${f3.x},${f3.y}`} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={sWidth} />
                        <polygon points={`${b1.x},${b1.y} ${b2.x},${b2.y} ${b3.x},${b3.y}`} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={sWidth} />
                        <line x1={f1.x} y1={f1.y} x2={b1.x} y2={b1.y} stroke={strokeColor} strokeWidth={sWidth} strokeDasharray="3 3" />
                        <line x1={f2.x} y1={f2.y} x2={b2.x} y2={b2.y} stroke={strokeColor} strokeWidth={sWidth} />
                        <line x1={f3.x} y1={f3.y} x2={b3.x} y2={b3.y} stroke={strokeColor} strokeWidth={sWidth} />
                      </g>
                    );
                  }

                  case 'seatingArrangement': {
                    const type = shape.seatingType || 'circular';
                    const names = shape.points || [];
                    const n = names.length || 6;
                    const cx = mx(shape.x || 0);
                    const cy = my(shape.y || 0);
                    
                    if (type === 'circular') {
                      const tableR = muX(shape.r || 1.8);
                      return (
                        <g key={shapeKey}>
                          <circle cx={cx} cy={cy} r={tableR} fill="rgba(99, 102, 241, 0.05)" stroke={strokeColor} strokeWidth={3} />
                          {names.map((chair: any, idx: number) => {
                            const angle = (idx * 2 * Math.PI) / n;
                            const cxChair = cx + tableR * Math.cos(angle);
                            const cyChair = cy + tableR * Math.sin(angle);
                            const label = typeof chair === 'string' ? chair : (chair.label || chair.text || String.fromCharCode(65 + idx));
                            return (
                              <g key={idx}>
                                <circle cx={cxChair} cy={cyChair} r={16} fill="#ffffff" stroke={strokeColor} strokeWidth={2} />
                                <text x={cxChair} y={cyChair} className="text-[10px] font-black fill-current" textAnchor="middle" dominantBaseline="middle">
                                  {label}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    } else {
                      const widthVal = muX(shape.width || 6);
                      return (
                        <g key={shapeKey}>
                          <rect x={cx - widthVal/2} y={cy - 10} width={widthVal} height={20} rx={4} fill="rgba(79, 70, 229, 0.05)" stroke={strokeColor} strokeWidth={2.5} />
                          {names.map((seat: any, idx: number) => {
                            const offset = names.length > 1 ? (idx / (names.length - 1) - 0.5) * (widthVal - 40) : 0;
                            const sx = cx + offset;
                            const label = typeof seat === 'string' ? seat : (seat.label || seat.text || String.fromCharCode(65 + idx));
                            return (
                              <g key={idx}>
                                <circle cx={sx} cy={cy} r={14} fill="#ffffff" stroke={strokeColor} strokeWidth={1.5} />
                                <text x={sx} y={cy} className="text-[10px] font-black fill-current" textAnchor="middle" dominantBaseline="middle">
                                  {label}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    }
                  }

                  case 'directionDiagram': {
                    const steps = shape.steps || [];
                    const cx = mx(shape.x || 0);
                    const cy = my(shape.y || 0);
                    
                    let curX = cx;
                    let curY = cy;
                    const paths: any[] = [];
                    const pointsList = [{ x: curX, y: curY, label: 'Start' }];
                    
                    steps.forEach((step, sIdx) => {
                      const d = step.distance || 2;
                      const dir = (step.direction || 'N').toUpperCase();
                      let dx = 0;
                      let dy = 0;
                      
                      switch (dir) {
                        case 'N': dy = -muY(d); break;
                        case 'S': dy = muY(d); break;
                        case 'E': dx = muX(d); break;
                        case 'W': dx = -muX(d); break;
                        case 'NE': dx = muX(d * 0.7); dy = -muY(d * 0.7); break;
                        case 'NW': dx = -muX(d * 0.7); dy = -muY(d * 0.7); break;
                        case 'SE': dx = muX(d * 0.7); dy = muY(d * 0.7); break;
                        case 'SW': dx = -muX(d * 0.7); dy = muY(d * 0.7); break;
                        default: break;
                      }
                      
                      const nextX = curX + dx;
                      const nextY = curY + dy;
                      paths.push(
                        <line key={`line-${sIdx}`} x1={curX} y1={curY} x2={nextX} y2={nextY} stroke={strokeColor} strokeWidth={3} markerEnd="url(#arrow)" />
                      );
                      paths.push(
                        <rect key={`lbl-bg-${sIdx}`} x={(curX + nextX)/2 - 20} y={(curY + nextY)/2 - 8} width={40} height={16} rx={4} fill="#ffffff" stroke="rgba(148, 163, 184, 0.1)" strokeWidth={1} />
                      );
                      paths.push(
                        <text key={`lbl-${sIdx}`} x={(curX + nextX)/2} y={(curY + nextY)/2} className="text-[9px] font-black fill-[#4f46e5]" textAnchor="middle" dominantBaseline="middle">
                          {step.label || `${d}m`}
                        </text>
                      );
                      
                      curX = nextX;
                      curY = nextY;
                      pointsList.push({ x: curX, y: curY, label: sIdx === steps.length - 1 ? 'End' : '' });
                    });
                    
                    return (
                      <g key={shapeKey}>
                        {paths}
                        {pointsList.map((pt, idx) => (
                          <g key={idx}>
                            <circle cx={pt.x} cy={pt.y} r={idx === 0 ? 5 : 4} fill={idx === 0 ? '#10b981' : (idx === pointsList.length - 1 ? '#ef4444' : '#475569')} />
                            {pt.label && (
                              <text x={pt.x} y={pt.y - 10} className="text-[10px] font-black fill-current" textAnchor="middle">
                                {pt.label}
                              </text>
                            )}
                          </g>
                        ))}
                        <g transform={`translate(${vWidth - 60}, 60)`}>
                          <circle cx={0} cy={0} r={20} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.3} />
                          <line x1={0} y1={-25} x2={0} y2={25} stroke="currentColor" strokeWidth={1} />
                          <line x1={-25} y1={0} x2={25} y2={0} stroke="currentColor" strokeWidth={1} />
                          <text x={0} y={-27} className="text-[9px] font-bold fill-current" textAnchor="middle">N</text>
                          <text x={0} y={33} className="text-[9px] font-bold fill-current" textAnchor="middle">S</text>
                          <text x={28} y={3} className="text-[9px] font-bold fill-current">E</text>
                          <text x="-34" y={3} className="text-[9px] font-bold fill-current">W</text>
                        </g>
                      </g>
                    );
                  }

                  case 'calendar': {
                    const year = shape.year || 2026;
                    const month = shape.month || 6;
                    const highlightDays = shape.highlightDays || [];
                    const cx = mx(shape.x || -3);
                    const cy = my(shape.y || 2);
                    
                    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                    const dateObj = new Date(year, month - 1, 1);
                    const startDay = dateObj.getDay();
                    const totalDays = new Date(year, month, 0).getDate();
                    
                    const monthNames = [
                      "January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"
                    ];
                    
                    const gridCell = 32;
                    const boardW = gridCell * 7 + 24;
                    const boardH = gridCell * 7 + 45;
                    
                    const days = [];
                    for (let i = 0; i < startDay; i++) days.push(null);
                    for (let i = 1; i <= totalDays; i++) days.push(i);
                    
                    return (
                      <g key={shapeKey} transform={`translate(${cx}, ${cy})`}>
                        <rect x={-12} y={-45} width={boardW} height={boardH} rx={12} fill="#ffffff" stroke={strokeColor} strokeWidth={2.5} />
                        <rect x={-12} y={-45} width={boardW} height={32} rx={12} fill={strokeColor} />
                        <rect x={-12} y={-25} width={boardW} height={12} fill={strokeColor} />
                        
                        <text x={boardW/2 - 12} y={-25} className="text-[11px] font-black fill-white font-sans" textAnchor="middle">
                          {monthNames[month - 1].toUpperCase()} {year}
                        </text>
                        
                        {weekdays.map((day, idx) => (
                          <text key={idx} x={idx * gridCell + gridCell/2} y={0} className="text-[10px] font-black fill-slate-400" textAnchor="middle">
                            {day}
                          </text>
                        ))}
                        
                        {days.map((day, idx) => {
                          if (day === null) return null;
                          const r = Math.floor(idx / 7);
                          const c = idx % 7;
                          const dx = c * gridCell + gridCell/2;
                          const dy = (r + 1) * gridCell;
                          const isHighlighted = highlightDays.includes(day);
                          
                          return (
                            <g key={idx}>
                              {isHighlighted && (
                                <circle cx={dx} cy={dy - 3} r={11} fill="#ef4444" fillOpacity={0.2} stroke="#ef4444" strokeWidth={1} />
                              )}
                              <text x={dx} y={dy} className={`text-[10px] ${isHighlighted ? 'font-black fill-rose-600' : 'font-bold fill-slate-700'}`} textAnchor="middle">
                                {day}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    );
                  }

                  case 'cubeFolding': {
                    const faces = shape.faces || ['1', '2', '3', '4', '5', '6'];
                    const cx = mx(shape.x || 0);
                    const cy = my(shape.y || 0);
                    const cellSize = 45;
                    
                    const offsets = [
                      { x: 0, y: -cellSize, face: faces[0] },
                      { x: -cellSize, y: 0, face: faces[1] },
                      { x: 0, y: 0, face: faces[2] },
                      { x: cellSize, y: 0, face: faces[3] },
                      { x: 0, y: cellSize, face: faces[4] },
                      { x: 0, y: cellSize * 2, face: faces[5] }
                    ];
                    
                    return (
                      <g key={shapeKey} transform={`translate(${cx}, ${cy})`}>
                        {offsets.map((cell, idx) => (
                          <g key={idx}>
                            <rect x={cell.x - cellSize/2} y={cell.y - cellSize/2} width={cellSize} height={cellSize} fill="rgba(99, 102, 241, 0.05)" stroke={strokeColor} strokeWidth={2.5} />
                            <text x={cell.x} y={cell.y} className="text-sm font-black fill-current" textAnchor="middle" dominantBaseline="middle">
                              {cell.face}
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  }

                  case 'mirrorImage': {
                    const mirrorText = shape.text || 'REFLECT';
                    const cx = mx(shape.x || 0);
                    const cy = my(shape.y || 0);
                    
                    return (
                      <g key={shapeKey}>
                        <line x1={cx} y1={cy - 120} x2={cx} y2={cy + 120} stroke="#8a1c36" strokeWidth={3} strokeDasharray="6 4" />
                        <text x={cx} y={cy - 130} className="text-[10px] font-black fill-[#8a1c36]" textAnchor="middle">MIRROR</text>
                        <text x={cx - 80} y={cy} className="text-2xl font-black fill-current" textAnchor="middle" dominantBaseline="middle">
                          {mirrorText}
                        </text>
                        <g transform={`translate(${cx + 80}, ${cy}) scale(-1, 1)`}>
                          <text x={0} y={0} className="text-2xl font-black fill-current opacity-70" textAnchor="middle" dominantBaseline="middle">
                            {mirrorText}
                          </text>
                        </g>
                      </g>
                    );
                  }

                  default:
                    return null;
                }
              };

              const element = renderShape();
              if (!element) return null;

              if (shape.rotation) {
                return (
                  <g key={shapeKey} transform={`rotate(${shape.rotation}, ${rotCenterX}, ${rotCenterY})`}>
                    {element}
                  </g>
                );
              }
              return element;
            })}

            {/* D. Render labels & text on top */}
            {resolvedLabels.map((l) => {
              const labelKey = `label-resolved-${l.id}`;
              const isVisible = showLabels && (showMeasurements || !l.isMeasurement);

              return (
                <RenderLatexLabel 
                  key={labelKey}
                  text={l.text}
                  x={l.x}
                  y={l.y}
                  size={l.size}
                  color={l.color}
                  anchor={l.anchor}
                  visible={isVisible}
                />
              );
            })}

            {/* E. Render Measurements overlay details */}
            {showMeasurements && dynamicShapes.map((shape, idx) => {
              if (shape.type !== 'distanceLine' && shape.type !== 'measurement') return null;

              const sx = mx(shape.x1 !== undefined ? shape.x1 : 0);
              const sy = my(shape.y1 !== undefined ? shape.y1 : 0);
              const ex = mx(shape.x2 !== undefined ? shape.x2 : 0);
              const ey = my(shape.y2 !== undefined ? shape.y2 : 0);

              // perpendicular offsets to draw dimension extension tick lines
              const angle = Math.atan2(ey - sy, ex - sx);
              const perpX = Math.sin(angle) * 12;
              const perpY = -Math.cos(angle) * 12;

              return (
                <g key={`measurement-${idx}`} className="measurement-overlay opacity-80 text-amber-600">
                  {/* Extension marks */}
                  <line x1={sx} y1={sy} x2={sx - perpX} y2={sy - perpY} stroke="currentColor" strokeWidth={1.5} />
                  <line x1={ex} y1={ey} x2={ex - perpX} y2={ey - perpY} stroke="currentColor" strokeWidth={1.5} />
                  
                  {/* Labeled Line */}
                  <line x1={sx - perpX} y1={sy - perpY} x2={ex - perpX} y2={ey - perpY} stroke="currentColor" strokeWidth={1.5} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                </g>
              );
            })}

            {/* F. Crosshair tracker lines */}
            {showCoordinates && isMouseOverCanvas && cursorPos.svgX >= 60 && cursorPos.svgX <= vWidth - 60 && cursorPos.svgY >= 60 && cursorPos.svgY <= vHeight - 60 && (
              <g className="crosshair-layer pointer-events-none opacity-50 text-[#8A1C36] dark:text-[#fda4af]">
                <line 
                  x1={cursorPos.svgX} 
                  y1={60} 
                  x2={cursorPos.svgX} 
                  y2={vHeight - 60} 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeDasharray="3 3" 
                />
                <line 
                  x1={60} 
                  y1={cursorPos.svgY} 
                  x2={vWidth - 60} 
                  y2={cursorPos.svgY} 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeDasharray="3 3" 
                />
                <circle 
                  cx={cursorPos.svgX} 
                  cy={cursorPos.svgY} 
                  r="4" 
                  fill="currentColor" 
                />
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* 3. Style definition for mounting draw paths animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes draw-svg-path {
          0% {
            stroke-dashoffset: 2500;
            stroke-dasharray: 2500;
          }
          99.9% {
            stroke-dashoffset: 0;
            stroke-dasharray: 2500;
          }
          100% {
            stroke-dashoffset: 0;
            stroke-dasharray: none;
          }
        }
        .animate-drawing-path {
          animation: draw-svg-path 4.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .universal-math-engine .katex {
          color: inherit !important;
        }
      `}} />
    </div>
  );
}
