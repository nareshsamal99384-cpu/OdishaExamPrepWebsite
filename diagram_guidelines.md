# Mathematical Diagram Creation Guidelines

Welcome! The OdishaExamPrep Website contains a state-of-the-art vector diagram rendering engine. You can embed visual, interactive, mathematical diagrams directly inside your question text using clean JSON blocks. 

This document explains the formatting rules and provides templates so you can design any custom diagram perfectly.

---

## 1. How Diagrams are Written

You can embed a diagram inside any question text by adding a JSON block enclosed in curly braces `{}`. 
> [!TIP]
> **Resilient Formatting**: The parser automatically repairs common formatting mistakes (such as using single quotes `'` instead of double quotes `"`, smart curly quotes, or leaving trailing commas).

Example:
```text
In the circle below, O is the center and AB is a chord.
{
  "type": "circle",
  "radius": 13,
  "chord": "AB",
  "distanceFromCenter": 5
}
Find the length of the chord AB.
```

---

## 2. Supported Shape Templates

You can use the following preset templates for fast rendering. The engine automatically draws them:

### `circle`
Draws a circle with optional chord and center distance.
- `radius` (number)
- `centerLabel` (string, e.g. `"O"`)
- `chord` (string, e.g. `"AB"`)
- `distanceFromCenter` (number)

### `rectangle` / `square`
Draws a rectangle or square.
- `width` (number) & `height` (number) (for rectangle)
- `side` (number) or `diagonal` (number) (for square)
- `label` (string, e.g. `"Area = 40"`)

### `triangle` / `rightTriangle` / `equilateralTriangle`
Draws triangle shapes.
- `points` (array of 3 coordinates, e.g. `[[0,0], [6,0], [0,8]]` for custom triangle)
- `leg` (number) & `hypotenuse` (number) (for rightTriangle)
- `side` (number) (for equilateralTriangle)
- `angle` (string, e.g. `"\theta"` or `"30°"`)

### `parallelogram` / `trapezium`
Draws quadrilateral models.
- `base` (number) & `height` (number) (for parallelogram)
- `parallelSides` (array of 2 numbers, e.g. `[10, 14]`) & `height` (number) (for trapezium)

### `cube` / `cuboid` / `cylinder`
Draws 3D solid geometries.
- `side` (number) (for cube)
- `length` (number) & `width` (number) & `height` (number) (for cuboid)
- `radius` (number) & `height` (number) (for cylinder)

### `semicircle`
Draws a semicircle.
- `radius` (number)

### `boatStream`
Draws a river flow with a boat, current direction, and upstream/downstream statistics.
- `distance` (number)
- `upstreamTime` (number)
- `downstreamTime` (number)

### `ratio`
Draws a tape block diagram comparing two quantities.
- `ratio` (string, e.g. `"4:5"`)
- `labelA` (string, e.g. `"A's age"`)
- `labelB` (string, e.g. `"B's age"`)

---

## 3. Generic Vector Layouts (`type": "vector"`)

For complex, custom, or composite shapes that don't fit any preset template, use the generic `vector` renderer. This allows you to combine multiple drawing primitives on a single grid.

### Grid & Viewport Settings
- `width` (optional, default `1000`): Canvas width.
- `height` (optional, default `600`): Canvas height.
- `xRange` (optional `[min, max]`): Maps shape coordinates to a mathematical coordinate system.
- `yRange` (optional `[min, max]`): Maps shape coordinates to a mathematical coordinate system.
- `grid` (boolean): Shows coordinate lines.
- `xAxis` / `yAxis` (boolean): Shows coordinate axes.

### Primitive Shapes (`shapes` list)

Inside the `"shapes"` array, you can define these elements:

| Primitive Type | Parameters | Description |
|---|---|---|
| **`line`** | `start: [x,y]`, `end: [x,y]`, `stroke`, `strokeWidth`, `dashed` (bool), `arrow` (bool), `label` | Draws a line with optional arrows and labels. |
| **`rect`** | `x`, `y`, `width`, `height` OR `points: [[x1,y1],[x2,y2]]`, `fill`, `stroke`, `rx` (corner radius) | Draws a rectangle. |
| **`circle`** / **`ellipse`** | `center: [x,y]`, `r` (radius) OR `rx`, `ry`, `fill`, `stroke` | Draws a circle or ellipse. |
| **`polygon`** / **`polyline`** | `points: [[x1,y1],[x2,y2],...]`, `fill`, `stroke`, `closed` (bool) | Draws polygon vertices. |
| **`path`** | `d` (SVG path string), `fill`, `stroke` | Draws custom Bezier paths. |
| **`arc`** | `center: [x,y]`, `r`, `startAngle`, `endAngle`, `stroke` | Draws arc curves. |
| **`curve`** | `start: [x,y]`, `control1: [x,y]`, `control2: [x,y]` (optional), `end: [x,y]`, `stroke` | Draws Bezier curves. |
| **`text`** | `pos: [x,y]`, `text` (string), `color`, `size` (number), `anchor` (`"start"\|"middle"\|"end"`) | Renders labels. |

---

## 4. Mathematical Notations inside Diagrams (KaTeX)

You can write standard math equations and Greek symbols inside **any text label** (such as line labels, text coordinates, or shape descriptions). Wrap the formula with dollar signs `$` to trigger the KaTeX renderer.

### Example:
```json
{
  "type": "vector",
  "shapes": [
    {
      "type": "text",
      "pos": [500, 300],
      "text": "Solve for $\\theta$: $\\sin(\\theta) = \\frac{1}{2}$",
      "size": 18
    }
  ]
}
```
*Note: Remember to escape the backslash `\\` inside JSON strings (e.g. write `\\theta` and `\\frac` instead of `\theta` and `\frac`).*

---

## 5. Universal Question Format (Recommended)

When uploading questions via bulk upload (JSON or JavaScript arrays), we recommend defining the `"diagram"` as a separate, root-level JSON property rather than embedding it inside `"questionText"` as a raw string. 

### Recommended Bulk Upload Format:
```json
[
  {
    "questionText": "Find the value of $\\theta$ in the right triangle shown.",
    "options": ["30°", "45°", "60°", "90°"],
    "correctAnswerIndex": 2,
    "explanation": "In a right triangle with adjacent side 1 and hypotenuse 2, $\\cos(\\theta) = 1/2 \\implies \\theta = 60°$.",
    "diagram": {
      "type": "rightTriangle",
      "leg": 1,
      "hypotenuse": 2,
      "angle": "$\\theta$"
    }
  }
]
```

### Automatic Diagram Extraction:
To ensure backwards-compatibility, the system also supports the legacy format. If a valid JSON diagram block is embedded anywhere inside the `"questionText"` string (e.g. `"... { \"type\": \"circle\", ... } ..."`), the uploader automatically extracts it, sanitizes its fields, saves it to the database's dedicated `diagram` column, and removes the raw JSON block from the question text automatically.
