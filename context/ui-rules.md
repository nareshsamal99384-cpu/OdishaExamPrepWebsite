# UI Rules — OdishaExamPrep

This document defines the official UI implementation rules, layout standards, interaction guidelines, and responsive rules for **OdishaExamPrep** (`https://www.odishaexamprep.in`). While `ui-tokens.md` defines raw design tokens (colors, fonts, shadows), this file defines **HOW** components and layouts must be constructed.

---

## Purpose

- **When developers should use this file:** Every time a new component, page, layout, modal, or form is created.
- **Relationship with `ui-tokens.md`:** `ui-tokens.md` provides the design tokens (`brand-600`, `glass`, `rounded-2xl`). `ui-rules.md` provides the structural rules of how those tokens are assembled into complete UI screens.

---

## Core UI Principles

1. **Information Hierarchy:** Page titles (`text-3xl md:text-5xl font-black`) must lead every page, followed by section chips (`.section-chip`), section headings (`text-2xl font-extrabold`), and body content.
2. **Glassmorphic Depth:** Use `.glass` or `backdrop-blur-xl bg-white/80` for elevated surfaces over the `#FBF9F6` base portal background.
3. **Card-Driven Layouts:** Content blocks MUST be grouped in cards (`rounded-2xl border border-slate-200/80 p-6 shadow-sm`).
4. **Touch Target Size:** Interactive touch targets on mobile MUST maintain a minimum size of 44x44px.
5. **Zero Layout Shift:** Reserve layout space for images, skeletons, and scrollbars (`scrollbar-gutter: stable`).
6. **No Raw Un-Sanitized HTML:** All user math text and explanations MUST be rendered via `MathTextRenderer.tsx`.

---

## Global Layout Rules

- **Maximum Page Container Width:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- **Section Vertical Spacing:** `py-12 md:py-20` between major landing sections; `space-y-6` inside page content blocks.
- **Grid System:**
  - Desktop (`lg`): 3 columns (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`).
  - Tablet (`md`): 2 columns.
  - Mobile (`sm`): Single column (`grid-cols-1 gap-4`).
- **Sticky Elements:** Main header MUST use `sticky top-0 z-50 glass`. Sticky sidebars MUST use `sticky top-24 z-30`.

---

## Page Structure Rules

Every main route page MUST follow this layout ordering:

```tsx
<PageLayout>
  {/* 1. Page Header & Hero Section */}
  <header className="mb-8 space-y-4">
    <div className="section-chip">
      <Sparkles className="w-3.5 h-3.5" /> Odisha Exam Prep
    </div>
    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900">
      {pageTitle}
    </h1>
    <p className="text-base sm:text-lg text-slate-600 max-w-3xl">
      {pageSubtitle}
    </p>
  </header>

  {/* 2. Main Content Grid */}
  <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div className="lg:col-span-2 space-y-6">
      {/* Primary Feature Cards */}
    </div>
    <aside className="space-y-6">
      {/* Sidebar Cards & Analytics Widgets */}
    </aside>
  </main>
</PageLayout>
```

---

## Navigation Rules

- **Desktop Header Navigation:** Horizontal menu links with active state indicator (`border-b-2 border-brand-600 text-brand-600 font-bold`).
- **Mobile Header Navigation:** Header collapses into a full-height slide-out drawer on `<768px` viewports (`fixed inset-y-0 right-0 w-80 glass-dark z-50`).
- **Active Navigation States:**
  - Active Link: `bg-brand-50 text-brand-600 font-bold`
  - Inactive Link: `text-slate-600 hover:text-brand-600 hover:bg-slate-50`

---

## Card Implementation Rules

### Standard Card (`.glass-card` or White Card)
- **Container:** `bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300`
- **Header:** Title on the left, badge/chip on the right.
- **Footer:** Action buttons right-aligned.
- **When NOT to use:** Do NOT nest cards inside other cards unless displaying question option cards inside a test container.

```tsx
// Standard Card Example
<div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-6 shadow-sm card-3d">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-bold text-slate-800">OPSC CGL Mock Test #01</h3>
    <span className="badge-brand">Free</span>
  </div>
  <p className="text-sm text-slate-600 mb-6">100 Questions • 120 Minutes • Full Syllabus</p>
  <button className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-all">
    Start Practice
  </button>
</div>
```

---

## Button Implementation Rules

| Button Variant | CSS Utility Classes | Used For |
| :--- | :--- | :--- |
| **Primary Brand** | `bg-brand-600 hover:bg-brand-700 text-white font-black px-6 py-3 rounded-xl shadow-md transition-all` | Main call-to-action buttons (e.g., "Start Test", "Unlock Now") |
| **Secondary Glass** | `glass hover:bg-white text-slate-800 font-bold px-5 py-2.5 rounded-xl border border-slate-200/80` | Secondary actions (e.g., "View Solution", "Cancel") |
| **Danger / Red** | `bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl` | Destructive operations (e.g., "Revoke Access", "Delete Question") |
| **Icon Only** | `p-2.5 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors` | Header search, drawer toggle, modal close buttons |

- **Loading State:** Must replace button text with `<Loader2 className="w-5 h-5 animate-spin mx-auto" />` and disable interaction (`disabled`).

---

## Form Implementation Rules

- **Labels:** `block text-xs font-black uppercase tracking-wider text-slate-700 mb-2`.
- **Text Inputs:** `w-full px-4 py-3 bg-white/80 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 outline-none transition-all`.
- **Required Fields:** Mark with an explicit red asterisk `<span className="text-rose-500">*</span>`.
- **Error Messages:** Display directly below the input field in red: `text-xs font-semibold text-rose-600 mt-1.5 flex items-center gap-1`.

---

## Table Implementation Rules

- **Container:** Wrapped inside `overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80`.
- **Table Header:** `bg-slate-50/80 text-left text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-200/80`.
- **Rows:** `border-b border-slate-100 hover:bg-slate-50/50 transition-colors`.

---

## Feedback & Loading States

- **Initial Fetch:** Display full skeleton placeholders (`animate-pulse bg-slate-200 rounded-xl`).
- **Submitting Operations:** Show inline spinner overlay or disable action button with loading text.
- **Empty States:** Center-align an illustrative Lucide icon (`BookOpen` or `Search`), a bold title, description, and primary CTA button.

---

## Responsive Breakpoints & Adaptations

- **Desktop (`>1024px`):** Full 3-column layout, sticky navigation bar, visible sidebars.
- **Tablet (`640px – 1024px`):** 2-column card grid, top tabs.
- **Mobile (`<640px`):** Single column grid, hamburger drawer header, bottom sheet drawers for test palette.

---

## Iconography Rules (Lucide React)

- **Library:** ONLY use Lucide React (`lucide-react`).
- **Standard Sizes:**
  - Inline Text Icon: `w-4 h-4`
  - Button Icon: `w-5 h-5`
  - Hero / Card Feature Icon: `w-8 h-8`
- **Color Matching:** Icons must match their parent text or badge color tokens.

---

## Design Rules (What Developers MUST NEVER Do)

1. NEVER use raw HEX colors when brand utility tokens (`bg-brand-600`, `text-slate-900`) exist.
2. NEVER mix border radius scales on the same screen (cards use `rounded-2xl`, controls use `rounded-xl`).
3. NEVER place more than ONE primary CTA button (`bg-brand-600`) in the same component section.
4. NEVER output un-sanitized user math text without `MathTextRenderer.tsx`.
5. NEVER leave form inputs without clear label text or focus outline states.
6. NEVER render tables on mobile without horizontal scroll wrapper (`overflow-x-auto`).
7. NEVER hide loading states during API data fetches.
8. NEVER override header z-index below `z-50`.
9. NEVER omit touch target padding on mobile interactive elements.
10. NEVER remove the visual hover lift effect (`hover:-translate-y-0.5`) from primary CTA buttons.
