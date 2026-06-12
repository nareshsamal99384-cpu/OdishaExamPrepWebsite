import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, Layers } from 'lucide-react';
import { cn } from '../lib/utils';
import { dropdown } from '../lib/animations';

export interface DiagramTemplateSelectorProps {
  onSelect: (jsonStr: string) => void;
  className?: string;
}

const DIAGRAM_TEMPLATES = {
  circle: {
    name: "⭕ Circle & Chord",
    description: "Circle with chord AB, radius & center distance",
    json: [
      {
        "questionText": "In the circle below, O is the center and AB is a chord. If radius = 10 and distance from center to chord = 8, find chord length AB.",
        "options": ["12", "10", "8", "16"],
        "correctAnswerIndex": 0,
        "explanation": "Using Pythagoras theorem: half chord = sqrt(10^2 - 8^2) = 6. Total chord length AB = 2 * 6 = 12.",
        "diagram": {
          "type": "circle",
          "radius": 10,
          "centerLabel": "O",
          "chord": "AB",
          "distanceFromCenter": 8
        }
      }
    ]
  },
  coordinate: {
    name: "📍 Plotted Points",
    description: "Coordinate plane with specific labeled points",
    json: [
      {
        "questionText": "Find the distance between the plotted points A(2, 3) and B(8, 7) on the coordinate plane.",
        "options": ["7.21", "8.06", "6.50", "9.12"],
        "correctAnswerIndex": 0,
        "explanation": "Distance = sqrt((8-2)^2 + (7-3)^2) = sqrt(6^2 + 4^2) = sqrt(52) ≈ 7.21.",
        "diagram": {
          "type": "coordinate",
          "points": [
            { "x": 2, "y": 3, "label": "A(2,3)" },
            { "x": 8, "y": 7, "label": "B(8,7)" }
          ],
          "xAxis": true,
          "yAxis": true
        }
      }
    ]
  },
  plot: {
    name: "📈 Function Plot (Single Curve)",
    description: "Coordinate system plotting a mathematical equation",
    json: [
      {
        "questionText": "Given the quadratic curve y = x^2 - 8x + 12 plotted below, find the coordinates of its vertex.",
        "options": ["(4, -4)", "(4, 4)", "(2, 6)", "(3, -3)"],
        "correctAnswerIndex": 0,
        "explanation": "The vertex of y = x^2 - 8x + 12 is at x = -b/(2a) = 8/2 = 4. Substituting x = 4 gives y = 16 - 32 + 12 = -4. Vertex is (4, -4).",
        "diagram": {
          "type": "plot",
          "equation": "y = x^2 - 8x + 12",
          "xRange": [-2, 10]
        }
      }
    ]
  },
  graph: {
    name: "📊 Multi-Curve Graph",
    description: "Coordinate plane plotting multiple functions and intersections",
    json: [
      {
        "questionText": "Find the point of intersection of the functions y = x^2 - 4 and y = 2x - 1 in the positive quadrant.",
        "options": ["(3, 5)", "(-1, -3)", "(2, 0)", "(1, -1)"],
        "correctAnswerIndex": 0,
        "explanation": "x^2 - 4 = 2x - 1 => x^2 - 2x - 3 = 0 => (x-3)(x+1) = 0. The positive solution is x = 3, y = 5. So (3, 5).",
        "diagram": {
          "type": "graph",
          "xRange": [-4, 6],
          "yRange": [-6, 10],
          "grid": true,
          "xAxis": true,
          "yAxis": true,
          "functions": [
            { "expr": "x^2 - 4", "color": "rgb(79, 70, 229)" },
            { "expr": "2*x - 1", "color": "#8A1C36" }
          ],
          "points": [
            { "pos": [3, 5], "label": "(3,5)" },
            { "pos": [-1, -3], "label": "(-1,-3)" }
          ]
        }
      }
    ]
  },
  triangle: {
    name: "📐 Triangle / Polygon",
    description: "Triangles or general polygons defined by vertices",
    json: [
      {
        "questionText": "In the right-angled triangle ABC shown below, if side AB = 8 and BC = 6, find the length of hypotenuse AC.",
        "options": ["10", "12", "9", "14"],
        "correctAnswerIndex": 0,
        "explanation": "AC = sqrt(AB^2 + BC^2) = sqrt(64 + 36) = 10.",
        "diagram": {
          "type": "triangle",
          "points": [
            [0, 0],
            [6, 0],
            [0, 8]
          ]
        }
      }
    ]
  },
  rectangle: {
    name: "🟦 Rectangle shape",
    description: "A standard rectangle with custom dimensions and central label",
    json: [
      {
        "questionText": "Find the area of the rectangle shown below with width 8 units and height 5 units.",
        "options": ["40 sq units", "30 sq units", "35 sq units", "45 sq units"],
        "correctAnswerIndex": 0,
        "explanation": "Area of rectangle = width * height = 8 * 5 = 40 sq units.",
        "diagram": {
          "type": "rectangle",
          "width": 8,
          "height": 5,
          "label": "Area = ?"
        }
      }
    ]
  },
  geometry: {
    name: "✨ Composite Geometry shapes",
    description: "Sleek combinations of circle, rectangle, lines, and custom text labels",
    json: [
      {
        "questionText": "A circle of radius 3 is inscribed in a rectangle of 10x8. Calculate the area of the region outside the circle but inside the rectangle.",
        "options": ["51.73", "80.00", "28.27", "62.50"],
        "correctAnswerIndex": 0,
        "explanation": "Area of rectangle = 10 * 8 = 80. Area of circle = pi * 3^2 ≈ 28.27. Difference = 80 - 28.27 = 51.73.",
        "diagram": {
          "type": "geometry",
          "xRange": [-1, 11],
          "yRange": [-1, 9],
          "shapes": [
            {
              "type": "rectangle",
              "points": [[0, 0], [10, 8]],
              "fill": "rgba(79, 70, 229, 0.03)",
              "stroke": "currentColor",
              "strokeWidth": 2.5
            },
            {
              "type": "circle",
              "center": [5, 4],
              "r": 3,
              "fill": "rgba(138, 28, 54, 0.1)",
              "stroke": "#8A1C36",
              "strokeWidth": 2.5
            }
          ],
          "labels": [
            { "pos": [5, 4], "text": "r = 3" },
            { "pos": [5, -0.5], "text": "10" },
            { "pos": [-0.5, 4], "text": "8" }
          ]
        }
      }
    ]
  },
  matrix: {
    name: "🔢 Matrix / Grid Table",
    description: "Math matrices or general values inside grids",
    json: [
      {
        "questionText": "Evaluate the determinant of the 2x2 matrix shown below.",
        "options": ["-2", "2", "10", "14"],
        "correctAnswerIndex": 0,
        "explanation": "Determinant = 3*2 - 4*2 = 6 - 8 = -2.",
        "diagram": {
          "type": "matrix",
          "values": [
            [3, 4],
            [2, 2]
          ]
        }
      }
    ]
  }
};

export default function DiagramTemplateSelector({
  onSelect,
  className = ""
}: DiagramTemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (key: keyof typeof DIAGRAM_TEMPLATES) => {
    const template = DIAGRAM_TEMPLATES[key];
    onSelect(JSON.stringify(template.json, null, 2));
    setIsOpen(false);
  };

  return (
    <div className={cn("relative inline-block text-left", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 hover:text-brand-800 transition-all select-none focus:outline-none cursor-pointer"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Import Diagram Template</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            {...dropdown}
            className="absolute right-0 mt-1.5 w-80 z-[200] bg-white border border-slate-200 rounded-2xl shadow-[0_10px_45px_-10px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col"
          >
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Choose Math Diagram Schema
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
              {Object.keys(DIAGRAM_TEMPLATES).map((key) => {
                const k = key as keyof typeof DIAGRAM_TEMPLATES;
                const item = DIAGRAM_TEMPLATES[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleSelect(k)}
                    className="w-full flex flex-col items-start px-3.5 py-2.5 text-left rounded-xl hover:bg-slate-50 transition-all group cursor-pointer"
                  >
                    <span className="text-xs font-black text-slate-800 group-hover:text-brand-700 transition-colors">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
