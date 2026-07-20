# Code Standards — OdishaExamPrep

This document defines the official engineering standards, architectural constraints, naming conventions, and coding guidelines for the **OdishaExamPrep** (`https://www.odishaexamprep.in`) codebase. Every human developer and AI assistant working on this project MUST strictly follow these standards.

---

## Purpose

- **Why this document exists:** To preserve architectural consistency, maintain high code quality, ensure security compliance, and prevent technical debt across the entire full-stack application.
- **How it should be used:** As a non-negotiable reference handbook before writing code, opening pull requests, or reviewing changes.
- **When it should be updated:** Only when new architectural decisions or core library migrations are explicitly approved by the platform lead.

---

## Engineering Mindset

1. **Think Before Coding:** Fully understand the problem, data flow, and user entitlement implications before modifying any code.
2. **Read Project Documentation First:** Always consult `project-overview.md`, `architecture.md`, and `build-plan.md`.
3. **Never Break Existing Architecture:** Respect the established React 19 + Express + Supabase + Tailwind CSS v4 separation of concerns.
4. **Finish One Feature Before Starting Another:** Implement, test, and verify UI, state, database policies, and error handling for a feature completely before moving forward.
5. **Prefer Clarity Over Cleverness:** Write readable, self-documenting TypeScript code over complex or obscure code shortcuts.
6. **Never Optimize Prematurely:** Focus on correctness, security, and responsive UI first; optimize bundle size or database query efficiency when backed by metrics.
7. **Maintain Strict Entitlement Enforcement:** Always verify user access against `entitlementEngine.ts` and Supabase RLS.

---

## General Engineering Rules

1. Never hardcode secret keys (`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `VITE_DEEPSEEK_API_KEY`) in client-side code.
2. Never perform database write operations directly from client code without passing through authorized Supabase SDK calls or server proxies.
3. Never bypass server-side price resolution when creating Razorpay payment orders.
4. Never duplicate business logic (always use centralized engines like `entitlementEngine.ts`).
5. Never output raw un-sanitized user HTML (always pass dynamic text through DOMPurify via `MathTextRenderer.tsx`).
6. Never render mathematical equations using plain text when KaTeX format (`$...$` or `$$...$$`) is applicable.
7. Never create geometric math diagrams using static image files when `UniversalMathDiagramEngine` JSON vectors can be used.
8. Never leave unhandled promise rejections or un-caught exceptions in async backend routes.
9. Never omit loading indicators (pulse skeletons or spinners) for asynchronous data requests.
10. Never hide network errors from users (always display clear toast notifications via `react-hot-toast`).
11. Never commit commented-out code, unused imports, or temporary diagnostic console logs to production.
12. Never modify `build/` assets directly (all edits belong in `src/` or `server.ts`).
13. Never perform client-side state mutation directly (always use immutable React state updates or reducers).
14. Always use TypeScript strict mode (`tsc --noEmit`).
15. Always test UI layouts on Mobile (`<640px`), Tablet (`640px-1024px`), and Desktop (`>1024px`).
16. Always set proper HTTP Cache-Control headers on static assets vs dynamic index HTML responses in Express.
17. Always protect administrative routes (`/admin`, `/api/admin/*`) with `requireAdmin` middleware.
18. Always write clean TypeScript interface definitions for props and database payloads.
19. Always maintain 100% alignment with official Odisha competitive exam syllabi (OPSC, OSSC, OSSSC).
20. Always run `npm run build` locally to ensure zero build or compilation errors before committing.

---

## Language Standards (TypeScript & JavaScript)

### TypeScript Rules
- **Strict Typing:** Avoid `any` wherever possible. Define explicit interfaces for exam objects, questions, user metadata, and attempt logs.
- **Naming Conventions:**
  - Interfaces & Types: `PascalCase` (e.g., `ExamQuestion`, `UserPurchase`, `EntitlementState`).
  - Constants: `UPPER_SNAKE_CASE` (e.g., `CACHE_TTL_MS`, `ANON_LIMIT`).
  - Variables & Functions: `camelCase` (e.g., `getUserEntitlements`, `checkAiRateLimit`).
- **Async/Await Pattern:** Always use `async/await` with `try/catch` blocks instead of raw `.then().catch()` chains for asynchronous calls.
- **Null & Undefined Handling:** Use optional chaining (`?.`) and nullish coalescing (`??`) defensively.

```typescript
// Good Example
export interface ExamQuestion {
  id: string;
  examId: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  diagram?: Record<string, any>;
}

export async function fetchQuestionsByExam(examId: string): Promise<ExamQuestion[]> {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('examId', examId);
      
    if (error) throw error;
    return data ?? [];
  } catch (err: any) {
    console.error(`Failed to fetch questions for ${examId}:`, err.message);
    toast.error('Unable to load questions. Please check your connection.');
    return [];
  }
}
```

---

## Framework Standards (React 19 & Express.js)

### React 19 Client Standards
- **Component Style:** Use functional components with hooks (`useState`, `useEffect`, `useContext`, `useReducer`, `useMemo`).
- **State Hydration:** Keep global user state inside `AuthContext.tsx` provider.
- **Styling:** Use Tailwind CSS utility classes combined with `cn()` (`clsx` + `tailwind-merge`) from `src/lib/utils.ts`.

### Express Server Standards (`server.ts`)
- **Route Matching:** Register explicit API endpoints under `/api/` prefix.
- **Trust Proxy:** Enable `app.set('trust proxy', true)` for correct client IP detection behind Hostinger/Nginx reverse proxies.
- **CORS Setup:** Configure allowed origins explicitly (`https://www.odishaexamprep.in`, `https://odishaexamprep.in`, `localhost`, `capacitor://localhost`).
- **SEO Pre-Injection:** Express middleware intercepts search engine requests to inject meta titles, OpenGraph images, and JSON-LD schema into `index.html`.

---

## Project Folder Standards

| Directory | Purpose | Allowed Contents | Forbidden Contents |
| :--- | :--- | :--- | :--- |
| `src/components/` | Reusable React UI components | Component `.tsx` files, component-level styles | Database access logic, raw SQL, express handlers |
| `src/pages/` | Top-level React page views | Standalone page components (`AiMentor.tsx`, `BlogList.tsx`) | Direct server route declarations |
| `src/lib/` | Core business logic, contexts & services | State providers, entitlement calculators, API service clients | Raw UI JSX markup |
| `supabase/migrations/` | Database schema migrations | SQL DDL files, RLS policy scripts, triggers | TypeScript/JavaScript code |
| `public/` | Public static web assets | Images, favicons, audio files, PWA web manifest, Service Worker (`sw.js`) | Private keys, `.env` files, source TypeScript code |

---

## Component Standards

1. **Single Responsibility:** Each component must focus on one UI task (e.g., `MathTextRenderer` only renders math text, `UniversalMathDiagramEngine` only renders diagrams).
2. **Prop Validation:** Export explicit TypeScript interfaces for component props.
3. **Import Order Standard:**
   ```typescript
   // 1. Core React & Router Imports
   import React, { useState, useEffect } from 'react';
   import { useNavigate } from 'react-router-dom';

   // 2. Third-Party Icon & Animation Libraries
   import { BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
   import { motion } from 'framer-motion';

   // 3. Application State & Contexts
   import { useAuth } from '../lib/AuthContext';

   // 4. Shared UI Components & Utilities
   import { cn } from '../lib/utils';
   import { MathTextRenderer } from './MathTextRenderer';
   ```

---

## UI & Styling Standards

- **Color Palette:**
  - Brand Primary: `brand-600` (`#2563EB` / Blue)
  - Brand Accent: Indigo (`#4F46E5`), Emerald Green (`#059669` for correct answers)
  - Background Neutral: Dark Slate (`#0F172A`), Slate 50 (`#F8FAFC`)
- **Typography:** Inter / Outfit clean sans-serif stack.
- **Card Design:** Card containers must use `bg-white dark:bg-slate-900 border border-slate-200/80 rounded-2xl shadow-sm`.
- **Responsive Grid:** Desktop 3 columns (`lg:grid-cols-3`), Tablet 2 columns (`md:grid-cols-2`), Mobile 1 column (`grid-cols-1`).

---

## API Standards

- **Endpoint Naming:** `camelCase` or kebab-case REST endpoints prefixed with `/api/` (e.g., `/api/admin/questions`, `/api/payment/verify`).
- **Response Format Standard:**
  ```json
  {
    "success": true,
    "data": [],
    "message": "Operation completed successfully"
  }
  ```
- **Error Response Standard:**
  ```json
  {
    "success": false,
    "error": "Detailed error message explanation"
  }
  ```
- **HTTP Status Codes:** `200` Success, `400` Bad Request / Missing Fields, `401` Unauthorized, `403` Forbidden (Non-admin), `500` Internal Server Error.

---

## Database & Security Standards

- **Row Level Security (RLS):** Every Supabase table MUST have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
- **Admin Access Policies:** Admins retain full write access based on email verification (`auth.jwt() ->> 'email' IN ('nareshsamal99384@gmail.com', 'odishaexamprep365@gmail.com')`).
- **User Ownership Policies:** Users can only view or modify records where `auth.uid() = user_id`.

---

## AI Integration Standards (NVIDIA NIM)

- **API Security:** Client MUST NEVER call NVIDIA NIM API directly. All chat completions MUST pass through server proxy `/api/chat/completions`.
- **Model Target:** `meta/llama-3.1-8b-instruct`.
- **System Prompt Integrity:** Always inject Odisha exam context and instruct the AI to output math equations in LaTeX format using `$...$` inline and `$$...$$` block delimiters.

---

## Code Review Checklist

Before approving any code change or merging a pull request, verify:

- [ ] Zero TypeScript errors (`tsc --noEmit` passes cleanly).
- [ ] No exposed secrets or hardcoded private keys in source code.
- [ ] Entitlements checked via `entitlementEngine.ts` and Supabase RLS policies.
- [ ] All payments processed via server-verified `/api/payment/order` and `/api/payment/verify`.
- [ ] Dynamic user explanations and math text sanitized via DOMPurify.
- [ ] Loading states (pulse skeletons or spinners) present for all async requests.
- [ ] Error handling (toast notifications) active for all network failures.
- [ ] Mobile responsive layout tested on `<640px` viewports.
- [ ] Express server build compiles without error (`npm run build`).

---

## Project Invariants (Core Rules Developers MUST NEVER Violate)

1. Client code MUST NEVER access the database using `SUPABASE_SERVICE_ROLE_KEY`.
2. Server API routes MUST NEVER render UI components.
3. Razorpay payment order prices MUST ALWAYS be calculated server-side from the database.
4. User purchases MUST be logged in `public.user_purchases` AND synced to Supabase Auth metadata.
5. All administrative routes (`/admin`, `/api/admin/*`) MUST enforce `requireAdmin` authentication middleware.
6. Questions containing LaTeX math MUST be rendered using `MathTextRenderer.tsx`.
7. Geometric math figures MUST be rendered dynamically via `UniversalMathDiagramEngine.tsx`.
8. AI completion API keys MUST stay encapsulated on the Express server (`server.ts`).
9. Raw SQL strings MUST NOT be concatenated dynamically with un-sanitized user input.
10. All user-facing network errors MUST display clear notifications via `react-hot-toast`.
