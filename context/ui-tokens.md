# UI Tokens — OdishaExamPrep Design System

This document is the official design system and UI token reference for **OdishaExamPrep** (`https://www.odishaexamprep.in`). Every human developer and AI assistant MUST strictly adhere to these design tokens and UI patterns when building or modifying user interfaces. Project design tokens ALWAYS override generic Tailwind defaults.

---

## Design Philosophy

- **Visual Style:** Modern, premium glassmorphic aesthetic with rich vibrant blue accents, soft depth shadows, 3D card transforms, and crisp typography.
- **Brand Personality:** Trustworthy, encouraging, state-exam focused, high-tech, and accessible.
- **UI Principles:**
  1. **Visual Excellence:** High-contrast legible text, subtle borders (`border-slate-200/80`), frosted glass overlays (`backdrop-blur-xl`), and rounded corners (`rounded-2xl`).
  2. **Zero Layout Shifts:** Fixed aspect ratios, reserved scrollbar gutters (`scrollbar-gutter: stable`), and pulse skeleton loading placeholders.
  3. **Performance First:** Pre-rasterized noise textures, GPU-accelerated smooth scrolling, hardware-accelerated animations (`transform: translateZ(0)`).

---

## Design Token System

### 1. Colors & Theme Configuration

Configured in `@theme` block in `src/index.css`:

```css
@theme {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Fraunces", Georgia, serif;
  
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-300: #93c5fd;
  --color-brand-400: #60a5fa;
  --color-brand-500: #2563eb;
  --color-brand-600: #1d4ed8;
  --color-brand-700: #1e40af;
  --color-brand-800: #1e3a8a;
  --color-brand-900: #172554;
  --color-brand-950: #0f172a;

  --color-slate-950: #0d1117;
  --color-indigo-650: #4338ca;
  --color-emerald-650: #047857;
  --color-amber-650: #b45309;
}
```

#### Color Mapping Table

| Category | Token Name | Hex Value | Purpose & Usage |
| :--- | :--- | :--- | :--- |
| **Brand Primary** | `brand-500` | `#2563EB` | Primary buttons, active tabs, main accents |
| **Brand Deep** | `brand-600` | `#1D4ED8` | Hover states for primary actions |
| **Brand Dark** | `brand-950` | `#0F172A` | Hero headers, dark mode surfaces, text contrast |
| **Background Neutral** | Base Body | `#FBF9F6` | Portal background color |
| **Success** | `emerald-650` | `#047857` | Correct answer options, active subscription badges |
| **Warning / Notice** | `amber-650` | `#B45309` | Unanswered questions, review flags, syllabus badges |
| **Accent Indigo** | `indigo-650` | `#4338CA` | Premium badges, AI companion highlights |

---

### 2. Typography

- **Primary Sans Font:** `Plus Jakarta Sans` (Google Fonts), fallback `ui-sans-serif, system-ui, sans-serif`.
- **Serif Accent Font:** `Fraunces` (Google Fonts), fallback `Georgia, serif`.
- **Heading Hierarchy:**
  - `H1` (Page Title): `text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900`
  - `H2` (Section Title): `text-2xl sm:text-3xl font-extrabold text-slate-800`
  - `H3` (Card Title): `text-lg sm:text-xl font-bold text-slate-800`
  - Body Text: `text-sm sm:text-base text-slate-600 leading-relaxed`
  - Captions / Chips: `text-[11px] font-black uppercase tracking-widest`

---

### 3. Glassmorphism & Elevation Tokens

Defined in `@layer utilities` in `src/index.css`:

```css
/* Light Glass Overlay */
.glass {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(32px) saturate(180%);
  -webkit-backdrop-filter: blur(32px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8);
}

/* Dark Glass Overlay */
.glass-dark {
  background: rgba(10, 10, 30, 0.65);
  backdrop-filter: blur(28px) saturate(150%);
  -webkit-backdrop-filter: blur(28px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
}

/* Glass Card Container */
.glass-card {
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.25);
  box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 30px 100px rgba(0,0,0,0.03);
}
```

---

### 4. Shadow & Glow Tokens

```css
/* Premium Card Shadow */
.premium-shadow {
  box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 40px rgba(0,0,0,0.03), 0 20px 80px rgba(37,99,235,0.02);
}

/* Button & Active Card Glow */
.premium-glow {
  box-shadow: 0 0 20px rgba(37, 99, 235, 0.15), 0 0 60px rgba(37, 99, 235, 0.05), 0 0 0 1px rgba(37, 99, 235, 0.1) inset;
}

.premium-glow-sm {
  box-shadow: 0 0 12px rgba(37, 99, 235, 0.2), 0 4px 16px rgba(37,99,235,0.1);
}
```

---

### 5. 3D Card Animation Transforms

```css
.card-3d {
  transform-style: preserve-3d;
  transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease;
  will-change: transform;
}
.card-3d:hover {
  transform: perspective(1200px) rotateX(-1deg) rotateY(1.5deg) translateY(-6px);
  box-shadow: 0 40px 100px rgba(124,58,237,0.1), 0 15px 40px rgba(0,0,0,0.02);
}
```

---

## Component Tokens

### 1. Buttons

```tsx
// Primary Brand Button
<button className="bg-brand-600 hover:bg-brand-700 text-white font-black px-6 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-brand-500/20 hover:-translate-y-0.5 active:translate-y-0">
  Start Test Now
</button>

// Glass / Secondary Button
<button className="glass hover:bg-white text-slate-800 font-bold px-5 py-2.5 rounded-xl border border-slate-200/80 transition-all duration-300">
  View Solution
</button>
```

---

### 2. Badges & Chips

```tsx
// Brand Badge
<span className="badge-brand">
  <Sparkles className="w-3 h-3 text-purple-600" /> Premium Series
</span>

// Success Badge
<span className="badge-success">
  <CheckCircle className="w-3 h-3 text-emerald-600" /> Active Pass
</span>
```

---

### 3. Cards & Containers

```tsx
<div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 card-3d">
  {/* Card Content */}
</div>
```

---

## Tailwind Utility Mapping Reference

| CSS Variable / Token | Tailwind Utility Class | Example Code Component |
| :--- | :--- | :--- |
| `--color-brand-500` | `bg-brand-500` / `text-brand-500` | `<button className="bg-brand-500 text-white" />` |
| `--color-brand-600` | `bg-brand-600` / `border-brand-600` | `<div className="border-2 border-brand-600" />` |
| `--font-sans` | `font-sans` | `<p className="font-sans text-slate-700" />` |
| `.glass` | `glass` | `<nav className="glass sticky top-0 z-50" />` |
| `.badge-brand` | `badge-brand` | `<span className="badge-brand">Free</span>` |
| `.premium-glow` | `premium-glow` | `<div className="premium-glow p-4 rounded-2xl" />` |

---

## Design Invariants (Design Rules)

1. NEVER use raw un-themed HEX color codes in components when brand tokens (`brand-600`, `slate-900`) are available.
2. ALWAYS use `rounded-2xl` for major content cards and `rounded-xl` for buttons and input fields.
3. ALWAYS apply `backdrop-blur-xl` or the `.glass` utility class for floating headers and sticky overlays.
4. ALWAYS use `Plus Jakarta Sans` as the primary font family across all components.
5. ALWAYS provide pulse skeleton loading states (`animate-pulse bg-slate-200 rounded-xl`) while data is fetching.
6. ALWAYS maintain standard responsive breakpoints (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
7. ALWAYS sanitize user text containing math markup using `MathTextRenderer.tsx`.
8. NEVER override border radius scales with arbitrary values (e.g. `rounded-[23px]`).
9. ALWAYS ensure minimum touch target size of 44x44px for interactive mobile buttons.
10. ALWAYS place action buttons on the right side of card footers and modal action bars.
