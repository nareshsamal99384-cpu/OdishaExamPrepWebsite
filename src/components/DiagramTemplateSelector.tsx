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
  universal: {
    name: "🎨 Universal Custom Vector",
    description: "Demonstrates all vector elements (grid, rect, circle, arc, curves, polygon, math text)",
    json: [
      {
        "questionText": "Observe the composite vector diagram below and identify which geometric shape is not represented in the template schema.",
        "options": ["Hexagon", "Circle", "Bezier Curve", "Arc Line"],
        "correctAnswerIndex": 0,
        "explanation": "The template demonstrates circles, rectangles, lines, Bezier curves, and arcs, but not a hexagon.",
        "diagram": {
          "type": "vector",
          "width": 1000,
          "height": 600,
          "xRange": [0, 10],
          "yRange": [0, 6],
          "grid": true,
          "xAxis": true,
          "yAxis": true,
          "shapes": [
            {
              "type": "rect",
              "x": 1,
              "y": 1,
              "width": 8,
              "height": 4,
              "fill": "rgba(99, 102, 241, 0.03)",
              "stroke": "#4f46e5",
              "strokeWidth": 2.5,
              "label": "Rectangle Boundary"
            },
            {
              "type": "circle",
              "center": [5, 3],
              "r": 1.5,
              "fill": "rgba(239, 68, 68, 0.05)",
              "stroke": "#ef4444",
              "strokeWidth": 2.5,
              "label": "Center Circle"
            },
            {
              "type": "line",
              "start": [5, 3],
              "end": [8, 3],
              "stroke": "#ef4444",
              "strokeWidth": 2,
              "dashed": true,
              "arrowEnd": true,
              "label": "$r = 1.5$"
            },
            {
              "type": "arc",
              "center": [5, 3],
              "r": 1.0,
              "startAngle": 0,
              "endAngle": 90,
              "stroke": "#f59e0b",
              "strokeWidth": 3,
              "label": "$\\theta = 90^\\circ$"
            },
            {
              "type": "curve",
              "start": [1, 1],
              "control1": [3, 5],
              "end": [5, 3],
              "stroke": "#10b981",
              "strokeWidth": 2,
              "label": "Bezier Curve"
            },
            {
              "type": "polygon",
              "points": [[2, 1.5], [3, 2.5], [1.5, 2.5]],
              "fill": "rgba(16, 185, 129, 0.1)",
              "stroke": "#10b981",
              "strokeWidth": 2,
              "label": "Triangle"
            },
            {
              "type": "text",
              "pos": [5, 5.5],
              "text": "Universal Layout Showcase: $E = mc^2$ and $\\int f(x)dx$",
              "color": "#1e293b",
              "size": 16
            }
          ]
        }
      }
    ]
  },
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
  },
  vector: {
    name: "📐 Vector / Custom Shapes",
    description: "Composite shapes (grid, rect, circle, lines, text with KaTeX formulas)",
    json: [
      {
        "questionText": "In the composite diagram below, a circle is inscribed within a rectangle. Find the area of the shaded region outside the circle if the rectangle is 10x8 and circle radius is 3.",
        "options": ["51.73 sq units", "80.00 sq units", "28.27 sq units", "62.50 sq units"],
        "correctAnswerIndex": 0,
        "explanation": "Area of rectangle = 10 * 8 = 80. Area of circle = pi * r^2 = 9 * pi ≈ 28.27. Shaded area = 80 - 28.27 = 51.73 sq units.",
        "diagram": {
          "type": "vector",
          "width": 800,
          "height": 500,
          "xRange": [0, 10],
          "yRange": [0, 8],
          "grid": true,
          "shapes": [
            {
              "type": "rect",
              "points": [[1, 1], [9, 7]],
              "fill": "rgba(99, 102, 241, 0.05)",
              "stroke": "#4f46e5",
              "strokeWidth": 3
            },
            {
              "type": "circle",
              "center": [5, 4],
              "r": 2.5,
              "fill": "rgba(239, 68, 68, 0.08)",
              "stroke": "#ef4444",
              "strokeWidth": 3
            },
            {
              "type": "line",
              "start": [5, 4],
              "end": [7.5, 4],
              "stroke": "#ef4444",
              "strokeWidth": 2,
              "dashed": true,
              "label": "$r = 2.5$"
            },
            {
              "type": "text",
              "pos": [5, 0.5],
              "text": "width = 10",
              "color": "#4f46e5"
            },
            {
              "type": "text",
              "pos": [0.5, 4],
              "text": "height = 8",
              "color": "#4f46e5",
              "anchor": "end"
            }
          ]
        }
      }
    ]
  },
  boatStream: {
    name: "⛵ Boat & Stream Flow",
    description: "Visualizes downstream/upstream flow velocities and times",
    json: [
      {
        "questionText": "A boat travels 60 km downstream in 3 hours and returns upstream in 5 hours. Find the speed of the boat in still water.",
        "options": ["16 km/h", "12 km/h", "14 km/h", "18 km/h"],
        "correctAnswerIndex": 0,
        "explanation": "Downstream speed = 60 / 3 = 20 km/h. Upstream speed = 60 / 5 = 12 km/h. Boat speed in still water = (20 + 12) / 2 = 16 km/h.",
        "diagram": {
          "type": "boatStream",
          "distance": 60,
          "upstreamTime": 5,
          "downstreamTime": 3
        }
      }
    ]
  },
  ratio: {
    name: "📊 Tape model / Ratio blocks",
    description: "Visualizes bar/tape models comparing two quantities",
    json: [
      {
        "questionText": "The ratio of ages of A and B is 4:5. After 8 years, their ratio becomes 5:6. Find their present ages.",
        "options": ["A: 32, B: 40", "A: 24, B: 30", "A: 40, B: 50", "A: 16, B: 20"],
        "correctAnswerIndex": 0,
        "explanation": "Let ages be 4x and 5x. (4x+8)/(5x+8) = 5/6 => 24x+48 = 25x+40 => x = 8. Present ages: A = 32, B = 40.",
        "diagram": {
          "type": "ratio",
          "ratio": "4:5",
          "labelA": "A's Block",
          "labelB": "B's Block"
        }
      }
    ]
  },
  statistics: {
    name: "📉 Normal Distribution Bell Curve",
    description: "Plots normal bell curve with mean and standard deviation lines",
    json: [
      {
        "questionText": "In a normal distribution with mean μ = 50 and standard deviation σ = 5, what percentage of values lie between 45 and 55?",
        "options": ["68.2%", "95.4%", "99.7%", "50.0%"],
        "correctAnswerIndex": 0,
        "explanation": "Values between 45 and 55 lie within 1 standard deviation from the mean (50 - 5 to 50 + 5). In a normal curve, approximately 68.2% of data falls within ±1σ.",
        "diagram": {
          "type": "statistics",
          "mean": 50,
          "sd": 5,
          "label": "μ = 50, σ = 5"
        }
      }
    ]
  },
  profitLoss: {
    name: "💰 Profit & Loss CP/SP chart",
    description: "Compares Cost Price vs Selling Price with dynamic arrow",
    json: [
      {
        "questionText": "A man buys an item for ₹1200 and sells it at 15% profit. Find the Selling Price.",
        "options": ["₹1380", "₹1400", "₹1350", "₹1420"],
        "correctAnswerIndex": 0,
        "explanation": "Profit = 15% of 1200 = ₹180. SP = CP + Profit = 1200 + 180 = ₹1380.",
        "diagram": {
          "type": "profitLoss",
          "costPrice": 1200,
          "profitPercent": 15
        }
      }
    ]
  },
  cylinder: {
    name: "🛢️ Cylinder 3D Shape",
    description: "Renders a 3D cylindrical container with radius and height",
    json: [
      {
        "questionText": "A cylindrical water tank has radius 7 m and height 10 m. Find its volume.",
        "options": ["1540 m³", "1480 m³", "1620 m³", "1500 m³"],
        "correctAnswerIndex": 0,
        "explanation": "Volume of cylinder = pi * r^2 * h = (22/7) * 49 * 10 = 1540 m³.",
        "diagram": {
          "type": "cylinder",
          "radius": 7,
          "height": 10
        }
      }
    ]
  },
  numberTheory: {
    name: "🕒 Modular Clock Arithmetic",
    description: "Visualizes modulus operations using clock dial arithmetic",
    json: [
      {
        "questionText": "Find the remainder when 7^100 is divided by 6.",
        "options": ["1", "5", "0", "2"],
        "correctAnswerIndex": 0,
        "explanation": "7 ≡ 1 (mod 6). Therefore, 7^100 ≡ 1^100 ≡ 1 (mod 6).",
        "diagram": {
          "type": "numberTheory",
          "expression": "7^100 mod 6"
        }
      }
    ]
  },
  universalEngine: {
    name: "⚡ Universal Diagram Engine Showcase",
    description: "Draggable points, 3D cone wireframe, clock diagram, function plotting, and Latex labels",
    json: [
      {
        "questionText": "Observe the universal diagram below. A cylinder and a cone have equal heights and bases. Drag the coordinates point A to see the updated positions. At what angle is the hour hand of the analog clock showing 10:10?",
        "options": ["300°", "120°", "60°", "90°"],
        "correctAnswerIndex": 0,
        "explanation": "At 10:10, the hour hand has moved 10 * 30° + 10 * 0.5° = 305° from 12 o'clock, which is standard clock logic.",
        "diagram": {
          "type": "universal",
          "width": 1000,
          "height": 600,
          "grid": true,
          "xAxis": true,
          "yAxis": true,
          "xRange": [-6, 6],
          "yRange": [-4, 4],
          "shapes": [
            {
              "id": "drag-pt-a",
              "type": "point",
              "x": 2,
              "y": 2,
              "r": 8,
              "fill": "#3b82f6",
              "draggable": true,
              "label": "Point A (Draggable)",
              "labelPosition": "top"
            },
            {
              "id": "cone-3d",
              "type": "cone",
              "x": -5,
              "y": -3,
              "width": 3,
              "height": 4,
              "stroke": "#10b981",
              "fill": "rgba(16, 185, 129, 0.05)",
              "label": "3D Cone Wireframe"
            },
            {
              "id": "clock-logic",
              "type": "clock",
              "x": -3,
              "y": 2,
              "r": 1.2,
              "time": "10:10",
              "stroke": "#8a1c36",
              "label": "Analog Clock (10:10)",
              "labelPosition": "bottom"
            },
            {
              "id": "trig-sin",
              "type": "functionPlot",
              "equation": "sin(x)",
              "stroke": "#f59e0b",
              "strokeWidth": 3.5,
              "label": "$y = \\sin(x)$",
              "labelX": 3,
              "labelY": 1.2
            },
            {
              "id": "rt-triangle-angle",
              "type": "rightAngle",
              "cx": 2,
              "cy": -2,
              "r": 40,
              "startAngle": 0,
              "endAngle": 90,
              "stroke": "#8b5cf6",
              "fill": "rgba(139, 92, 246, 0.1)",
              "label": "$90^\\circ$"
            }
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
