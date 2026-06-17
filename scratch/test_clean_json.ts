const repairLatexBackslashes = (str: string): string => {
  // Pre-repair raw control characters introduced by JSON parser escaping bugs
  // We use suffix checks so we don't destroy formatting newlines (\x0a) and tabs (\x09) in the JSON
  let preCleaned = str
    .replace(/\x0c(rac|orall|rown|lat|otnote)(?![a-zA-Z])/g, '\\\\f$1') // Form Feed (\f) -> \\f
    .replace(/\x08(eta|ar|ox|ullet|igcap|igcup|igsqcup|iguplus|igodot|mod|owtie)(?![a-zA-Z])/g, '\\\\b$1') // Backspace (\b) -> \\b
    .replace(/\x09(heta|imes|riangle|an|tilde|ext|tfrac|tau|o|op|hickspace|iny|oday|binom|extbf|extit|exttt|extsf)(?![a-zA-Z])/g, '\\\\t$1') // Tab (\t) -> \\t
    .replace(/\x0d(ight|ho|angle|ightarrow|ightharpoonup|ightharpoondown|brace|floor|ceil)(?![a-zA-Z])/g, '\\\\r$1') // Carriage Return (\r) -> \\r
    .replace(/\x0a(eq|earrow|abla|eg|ode)(?![a-zA-Z])/g, '\\\\n$1'); // Newline (\n) -> \\n

  // 1. Escape backslash if followed by a character that is NOT a valid JSON escape char, consuming double backslashes first
  preCleaned = preCleaned.replace(/\\\\|\\([^bfnrtu"\\/])/g, (match, p1) => {
    return match === '\\\\' ? '\\\\' : '\\\\' + p1;
  });

  // 2. Escape \u if NOT followed by 4 hex digits (e.g. \underline)
  preCleaned = preCleaned.replace(/\\\\|\\u(?![0-9a-fA-F]{4})/g, (match) => {
    return match === '\\\\' ? '\\\\' : '\\\\u';
  });

  // 3. Escape known LaTeX commands starting with b, f, n, r, t
  const latexCommands = 'theta|imes|riangle|an|tilde|text|tfrac|tau|to|top|thickspace|tiny|today|tbinom|textbf|textit|texttt|textsf|frac|forall|frown|flat|footnote|beta|bar|box|bullet|bigcap|bigcup|bigsqcup|biguplus|bigodot|bmod|bowtie|right|rho|rangle|rightarrow|Rightarrow|rightharpoonup|rightharpoondown|rbrace|rfloor|rceil|neq|nearrow|nabla|neg|node';
  const latexRegex = new RegExp(`\\\\\\\\|\\\\(${latexCommands})(?![a-zA-Z])`, 'g');
  preCleaned = preCleaned.replace(latexRegex, (match, p1) => {
    return match === '\\\\' ? '\\\\' : '\\\\' + p1;
  });

  // 4. Escape \ne (if not followed by other letters)
  preCleaned = preCleaned.replace(/\\\\|\\ne(?![a-zA-Z])/g, (match) => {
    return match === '\\\\' ? '\\\\' : '\\\\ne';
  });

  return preCleaned;
};

const cleanJsonString = (str: string): string => {
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

const jsonInput = `[
  {
    "questionText": "In the vector diagram below, determine the area enclosed by the rectangle.",
    "options": [
      "32",
      "24",
      "28",
      "36"
    ],
    "correctAnswerIndex": 0,
    "explanation": "Rectangle area = width × height = 8 × 4 = 32.",
    "diagram": {
      "type": "vector",
      "width": 900,
      "height": 550,
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
          "stroke": "#2563eb",
          "strokeWidth": 3,
          "fill": "rgba(37,99,235,0.08)",
          "label": "Rectangle"
        }
      ]
    }
  },
  {
    "questionText": "Find the radius of the circle shown if the diameter extends from x=2 to x=8.",
    "options": [
      "2",
      "3",
      "4",
      "6"
    ],
    "correctAnswerIndex": 1,
    "explanation": "Diameter = 6 units so radius = 3.",
    "diagram": {
      "type": "vector",
      "width": 900,
      "height": 550,
      "xRange": [0, 10],
      "yRange": [0, 8],
      "grid": true,
      "xAxis": true,
      "yAxis": true,
      "shapes": [
        {
          "type": "circle",
          "center": [5, 4],
          "r": 3,
          "stroke": "#dc2626",
          "strokeWidth": 3,
          "label": "$r=?$"
        },
        {
          "type": "line",
          "start": [2, 4],
          "end": [8, 4],
          "stroke": "#111827",
          "arrowEnd": true
        }
      ]
    }
  },
  {
    "questionText": "Calculate the slope of the line joining A(1,1) and B(7,4).",
    "options": [
      "1/2",
      "3/6",
      "2/3",
      "1"
    ],
    "correctAnswerIndex": 0,
    "explanation": "Slope = (4−1)/(7−1)=3/6=1/2.",
    "diagram": {
      "type": "vector",
      "width": 900,
      "height": 500,
      "xRange": [0, 8],
      "yRange": [0, 6],
      "grid": true,
      "xAxis": true,
      "yAxis": true,
      "shapes": [
        {
          "type": "line",
          "start": [1, 1],
          "end": [7, 4],
          "stroke": "#7c3aed",
          "strokeWidth": 3,
          "label": "$m=?$"
        }
      ]
    }
  },
  {
    "questionText": "Find the area of the right triangle shown.",
    "options": [
      "6",
      "8",
      "10",
      "12"
    ],
    "correctAnswerIndex": 0,
    "explanation": "Area = (4×3)/2 = 6.",
    "diagram": {
      "type": "vector",
      "width": 900,
      "height": 500,
      "xRange": [0, 7],
      "yRange": [0, 6],
      "grid": true,
      "xAxis": true,
      "yAxis": true,
      "shapes": [
        {
          "type": "polygon",
          "points": [
            [1,1],
            [5,1],
            [5,4]
          ],
          "stroke": "#059669",
          "fill": "rgba(5,150,105,0.08)",
          "strokeWidth": 3
        }
      ]
    }
  },
  {
    "questionText": "Determine the angle represented by the arc.",
    "options": [
      "45°",
      "60°",
      "90°",
      "120°"
    ],
    "correctAnswerIndex": 2,
    "explanation": "Arc starts at 0° and ends at 90°.",
    "diagram": {
      "type": "vector",
      "width": 800,
      "height": 500,
      "xRange": [0, 6],
      "yRange": [0, 6],
      "grid": true,
      "xAxis": true,
      "yAxis": true,
      "shapes": [
        {
          "type": "arc",
          "center": [3,3],
          "r": 2,
          "startAngle": 0,
          "endAngle": 90,
          "stroke": "#f59e0b",
          "strokeWidth": 4,
          "label": "$\\\\theta$"
        }
      ]
    }
  },
  {
    "questionText": "Evaluate the distance between points P(2,2) and Q(6,5).",
    "options": [
      "$5$",
      "$4$",
      "$\\sqrt{20}$",
      "$6$"
    ],
    "correctAnswerIndex": 0,
    "explanation": "Distance = $\\sqrt{(6-2)^2+(5-2)^2}=5$.",
    "diagram": {
      "type": "vector",
      "width": 900,
      "height": 500,
      "xRange": [0, 8],
      "yRange": [0, 7],
      "grid": true,
      "xAxis": true,
      "yAxis": true,
      "shapes": [
        {
          "type": "line",
          "start": [2,2],
          "end": [6,5],
          "stroke": "#ef4444",
          "strokeWidth": 3
        }
      ]
    }
  },
  {
    "questionText": "Find the equation represented by the vertical line.",
    "options": [
      "$x=3$",
      "$y=3$",
      "$x=5$",
      "$y=5$"
    ],
    "correctAnswerIndex": 2,
    "explanation": "Vertical line remains at x=5.",
    "diagram": {
      "type": "vector",
      "width": 850,
      "height": 500,
      "xRange": [0, 10],
      "yRange": [0, 8],
      "grid": true,
      "xAxis": true,
      "yAxis": true,
      "shapes": [
        {
          "type": "line",
          "start": [5,1],
          "end": [5,7],
          "stroke": "#0f766e",
          "strokeWidth": 4
        }
      ]
    }
  },
  {
    "questionText": "Identify the centroid x-coordinate of the triangle shown.",
    "options": [
      "4",
      "3",
      "5",
      "2"
    ],
    "correctAnswerIndex": 0,
    "explanation": "Centroid x=(2+6+4)/3=4.",
    "diagram": {
      "type": "vector",
      "width": 900,
      "height": 550,
      "xRange": [0, 8],
      "yRange": [0, 7],
      "grid": true,
      "xAxis": true,
      "yAxis": true,
      "shapes": [
        {
          "type": "polygon",
          "points": [
            [2,1],
            [6,1],
            [4,6]
          ],
          "stroke": "#2563eb",
          "strokeWidth": 3
        }
      ]
    }
  },
  {
    "questionText": "Find the circumference of the circle with radius 2.",
    "options": [
      "$4\\pi$",
      "$2\\pi$",
      "$8\\pi$",
      "$6\\pi$"
    ],
    "correctAnswerIndex": 0,
    "explanation": "Circumference = $2\\pi r = 4\\pi$.",
    "diagram": {
      "type": "vector",
      "width": 850,
      "height": 500,
      "xRange": [0, 8],
      "yRange": [0, 8],
      "grid": true,
      "xAxis": true,
      "yAxis": true,
      "shapes": [
        {
          "type": "circle",
          "center": [4,4],
          "r": 2,
          "stroke": "#dc2626",
          "strokeWidth": 3
        }
      ]
    }
  },
  {
    "questionText": "Evaluate \\\\int_0^2 x\\\\,dx represented geometrically by the shaded region.",
    "options": [
      "2",
      "4",
      "1",
      "3"
    ],
    "correctAnswerIndex": 0,
    "explanation": "Integral = $x^2/2$ from 0 to 2 = 2.",
    "diagram": {
      "type": "vector",
      "width": 900,
      "height": 550,
      "xRange": [0, 4],
      "yRange": [0, 4],
      "grid": true,
      "xAxis": true,
      "yAxis": true,
      "shapes": [
        {
          "type": "curve",
          "start": [0,0],
          "control1": [1,1],
          "end": [2,2],
          "stroke": "#7c3aed",
          "strokeWidth": 3,
          "label": "$y=x$"
        },
        {
          "type": "text",
          "pos": [2.5,3],
          "text": "$\\\\int_0^2 xdx$",
          "size": 16
        }
      ]
    }
  }
]`;

console.log("Input length:", jsonInput.length);
const cleaned = cleanJsonString(jsonInput);
console.log("Cleaned length:", cleaned.length);
try {
  const parsed = JSON.parse(cleaned);
  console.log("Success! Parsed items count:", parsed.length);
} catch (e: any) {
  console.error("FAIL parsing cleaned:", e.message);
  
  // Find where it's failing
  const match = e.message.match(/at position (\d+)/);
  if (match) {
    const pos = parseInt(match[1], 10);
    console.error("Context around position:", pos);
    console.error("BEFORE:", cleaned.substring(Math.max(0, pos - 40), pos));
    console.error("ERROR CHARS:", cleaned.substring(pos, pos + 40));
  }
}
