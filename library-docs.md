# Library Docs — OdishaExamPrep

This document defines project-specific usage rules, wrapper patterns, initialization procedures, and security constraints for every external library used in the **OdishaExamPrep** (`https://www.odishaexamprep.in`) codebase. These rules override generic online documentation.

---

## Order of Authority

When integrating or using libraries in this project, developers and AI agents MUST follow this exact hierarchy of authority:

1. **Project Wrapper / Singleton:** (e.g., `src/lib/supabase.ts`, `src/components/MathTextRenderer.tsx`)
2. **Project Service / Engine:** (e.g., `src/lib/examService.ts`, `src/lib/entitlementEngine.ts`)
3. **Project Code Standards:** (`code-standards.md`)
4. **Official Library Documentation**
5. **General Web Knowledge**

---

## 1. Supabase Client & Service SDK (`@supabase/supabase-js`)

### Purpose
Provides database persistence (PostgreSQL), user authentication, session management, and backend administrative operations.

### Installation
- **Package Name:** `@supabase/supabase-js`
- **Version:** `^2.103.0`
- **Compatibility:** Node.js v22+ server runtime and React 19 client environment.

### Wrapper Files
- **Client SDK Wrapper:** [`src/lib/supabase.ts`](file:///c:/Users/Naresh%20Samal/Downloads/OdishaExamPrep%20Website/src/lib/supabase.ts)
  - **Exports:** `supabase` (Singleton client instance)
  - **Purpose:** Initializes client-side Supabase client using public anonymous key.
- **Server Admin Client:** [`server.ts`](file:///c:/Users/Naresh%20Samal/Downloads/OdishaExamPrep%20Website/server.ts#L30)
  - **Exports:** `supabaseAdmin`
  - **Purpose:** Express server admin client initialized with `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for secure backend operations.

### Initialization Pattern

```typescript
// Client-side initialization (src/lib/supabase.ts)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side admin initialization (server.ts)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy_key";

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
```

### Project Usage Pattern
- **Client Code (`src/`):** Always import `supabase` from `../lib/supabase`. Never call `createClient` inside components.
- **Server Code (`server.ts`):** Always use `supabaseAdmin` for price verification, payment ledger inserts, user list management, and bulk uploads.

### Folder Rules
- **Allowed:** `src/lib/`, `src/App.tsx`, `src/AdminPanel.tsx`, `server.ts`.
- **Forbidden:** Never instantiate Supabase clients inside low-level UI render components (`Button.tsx`, `MathTextRenderer.tsx`).

### Environment Variables
- `VITE_SUPABASE_URL` (Required, Public)
- `VITE_SUPABASE_ANON_KEY` (Required, Public)
- `SUPABASE_SERVICE_ROLE_KEY` (Required, Secret / Server Only)

### Project Constraints & Anti-Patterns
- ❌ **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` to browser client code.
- ❌ **NEVER** perform direct database writes for user purchases without server-side Razorpay verification.
- ❌ **NEVER** bypass Row Level Security (RLS) policies on content tables.

---

## 2. Express.js Server (`express`)

### Purpose
Powers the backend application server (`server.ts`), API endpoints (`/api/*`), payment order creation, webhook handling, VAPID push dispatches, AI completion proxies, and server-side SEO meta tag injection.

### Installation
- **Package Name:** `express`
- **Version:** `^4.21.2`

### Wrapper Files
- Main Server Implementation: [`server.ts`](file:///c:/Users/Naresh%20Samal/Downloads/OdishaExamPrep%20Website/server.ts)

### Initialization & Configuration

```typescript
import express from "express";

const app = express();
app.set('trust proxy', true);

// Transparent API path redirect
app.use((req: any, res, next) => {
  if (req.url.startsWith('/app-api/')) {
    req.url = req.url.replace('/app-api/', '/api/');
  }
  next();
});

// JSON Body Parser with rawBody preservation for Webhook Signature verification
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));
```

### CORS Configuration
```typescript
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://www.odishaexamprep.in",
    "https://odishaexamprep.in",
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:3000",
    "capacitor://localhost"
  ];
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
```

---

## 3. KaTeX Mathematical Notation (`katex` & `@types/katex`)

### Purpose
Client-side mathematical equation rendering engine. Renders mathematical formulas in exam questions, option choices, and solution explanations.

### Installation
- **Package Name:** `katex`
- **Version:** `^0.17.0`

### Wrapper Components
- [`src/components/MathTextRenderer.tsx`](file:///c:/Users/Naresh%20Samal/Downloads/OdishaExamPrep%20Website/src/components/MathTextRenderer.tsx)
- [`src/components/UniversalMathDiagramEngine.tsx`](file:///c:/Users/Naresh%20Samal/Downloads/OdishaExamPrep%20Website/src/components/UniversalMathDiagramEngine.tsx)

### Usage Pattern
- Raw LaTeX delimiters: Inline math `$E = mc^2$`, Block math `$$\frac{-b \pm \sqrt{b^2-4ac}}{2a}$$`.
- Developers MUST render mathematical text using `<MathTextRenderer text={content} />`.

```typescript
// Example usage in question viewport
import { MathTextRenderer } from '../components/MathTextRenderer';

<MathTextRenderer 
  text="Solve for x: $x^2 + 5x + 6 = 0$" 
  className="text-slate-800 text-lg font-medium" 
/>
```

---

## 4. DOMPurify HTML Sanitizer (`dompurify`)

### Purpose
Sanitizes user-generated HTML and dynamic math explanations to prevent Cross-Site Scripting (XSS) attacks.

### Installation
- **Package Name:** `dompurify`
- **Version:** `^3.4.1`

### Wrapper Integration
Integrated directly inside `MathTextRenderer.tsx`:

```typescript
import DOMPurify from 'dompurify';

const sanitizedHtml = DOMPurify.sanitize(rawText, {
  ADD_ATTR: ['target', 'rel', 'class', 'style'],
  ADD_TAGS: ['span', 'div', 'p', 'br', 'strong', 'em', 'sub', 'sup']
});
```

---

## 5. Web Push Notification Engine (`web-push`)

### Purpose
Sends VAPID-signed push notifications from `server.ts` to student web browsers and mobile PWA service workers (`public/sw.js`).

### Installation
- **Package Name:** `web-push`
- **Version:** `^3.6.7`

### Usage Pattern in `server.ts`

```typescript
import webpush from "web-push";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.ADMIN_EMAIL || 'admin@odishaexamprep.in';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey);
}

// Sending payload to endpoint
await webpush.sendNotification(
  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
  payload
);
```

---

## 6. Recharts Visualization Library (`recharts`)

### Purpose
Renders analytics charts, subject strength radar graphs, and attempt score progress trends in student dashboards.

### Installation
- **Package Name:** `recharts`
- **Version:** `^3.8.1`

### Primary Components Used
- `ResponsiveContainer`, `RadarChart`, `Radar`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis`, `AreaChart`, `Area`, `XAxis`, `YAxis`, `Tooltip`.

### Usage Location
- [`src/AnalyticsView.tsx`](file:///c:/Users/Naresh%20Samal/Downloads/OdishaExamPrep%20Website/src/AnalyticsView.tsx)
- [`src/TestResultsView.tsx`](file:///c:/Users/Naresh%20Samal/Downloads/OdishaExamPrep%20Website/src/TestResultsView.tsx)

---

## 7. Capacitor Cross-Platform Container (`@capacitor/core` & `@capacitor/android`)

### Purpose
Packages the React SPA into a native Android APK application (`app-release.apk`).

### Installation
- **Package Name:** `@capacitor/core`, `@capacitor/android`
- **Version:** `^8.4.1`

### Mobile Bridge Helper
- [`src/lib/capacitorShim.ts`](file:///c:/Users/Naresh%20Samal/Downloads/OdishaExamPrep%20Website/src/lib/capacitorShim.ts)

```typescript
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export const isNativePlatform = Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();
```

---

## 8. Framer Motion Animation Engine (`framer-motion` & `motion`)

### Purpose
Provides fluid spring animations, route transition effects, modal entrances, and expandable solution accordion animations.

### Installation
- **Package Name:** `framer-motion`, `motion`
- **Version:** `^12.38.0`

### Shared Variants Helper
- [`src/lib/animations.ts`](file:///c:/Users/Naresh%20Samal/Downloads/OdishaExamPrep%20Website/src/lib/animations.ts)
- [`src/components/AnimatedRoutes.tsx`](file:///c:/Users/Naresh%20Samal/Downloads/OdishaExamPrep%20Website/src/components/AnimatedRoutes.tsx)

---

## 9. Lucide React Icons (`lucide-react`)

### Purpose
Provides uniform SVG icons across the platform UI (`BookOpen`, `CheckCircle`, `Clock`, `Sparkles`, `ShieldAlert`, `Search`, etc.).

### Installation
- **Package Name:** `lucide-react`
- **Version:** `^0.546.0`

---

## 10. Classnames Merger (`clsx` & `tailwind-merge`)

### Purpose
Combines conditional CSS classes and merges conflicting Tailwind v4 utility classes.

### Installation
- **Package Name:** `clsx`, `tailwind-merge`
- **Version:** `clsx ^2.1.1`, `tailwind-merge ^3.5.0`

### Wrapper File
- [`src/lib/utils.ts`](file:///c:/Users/Naresh%20Samal/Downloads/OdishaExamPrep%20Website/src/lib/utils.ts)

```typescript
import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Shared Environment Variables

```env
# Supabase Database & Auth Keys
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Razorpay Gateway Secrets
RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
VITE_RAZORPAY_KEY_ID=rzp_live_your_key_id

# NVIDIA NIM AI Inference Key
VITE_DEEPSEEK_API_KEY=your_nvidia_nim_api_key
VITE_DEEPSEEK_BASE_URL=https://integrate.api.nvidia.com/v1

# Web Push Notification VAPID Keys
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key

# Admin Fallback Credentials
ADMIN_EMAIL=odishaexamprep365@gmail.com
ADMIN_PASSWORD=your_admin_password
```

---

## Project Invariants (Library & SDK Usage Rules)

1. NEVER call `createClient` inside individual React components; always use the singleton `supabase` from `src/lib/supabase.ts`.
2. NEVER import or use `SUPABASE_SERVICE_ROLE_KEY` inside client-side TypeScript files (`src/`).
3. NEVER call Razorpay Checkout APIs without validating prices server-side via `/api/payment/order`.
4. NEVER output raw LaTeX text strings without passing them through `MathTextRenderer.tsx`.
5. NEVER bypass DOMPurify HTML sanitization when displaying user-generated explanations.
6. NEVER invoke NVIDIA NIM API endpoints directly from client code; always use server proxy `/api/chat/completions`.
7. NEVER send raw un-signed push notification payloads without VAPID key signing via `web-push`.
8. ALWAYS merge dynamic Tailwind CSS classes using `cn()` from `src/lib/utils.ts`.
9. ALWAYS handle Capacitor native device fallbacks defensively via `src/lib/capacitorShim.ts`.
10. ALWAYS register server API routes under the `/api/` path prefix in `server.ts`.
