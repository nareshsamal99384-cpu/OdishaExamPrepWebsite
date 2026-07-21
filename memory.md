# Memory — Multi-Chat Sessions, Glassmorphic Voice UI & Chat Auto-Scroll Overhaul

Last updated: 2026-07-21T09:48:30+05:30

## What was built

- **Multi-Chat Session Manager & History Drawer (`AiMentor.tsx`)**:
  - Implemented `ChatSession[]` architecture (`id`, `title`, `createdAt`, `updatedAt`, `messages[]`).
  - Added **`+ New Chat`** button to create fresh conversation threads instantly.
  - Added **`History 🕒`** button with total session count badge.
  - Built a slide-over glassmorphic **Chat History Drawer** (`bg-white/95 backdrop-blur-xl border-r border-slate-200/80 shadow-2xl z-40`) with real-time keyword search, relative timestamps (*Today*, *Jun 15*), inline chat renaming (`[✏️]`), and session deletion (`[🗑️]`).
  - Implemented automatic chat titling from the student's first prompt (e.g. *"5 English GK Questions"*).
  - Configured automatic state persistence in `localStorage` (`oep_ai_chat_sessions` & `oep_ai_active_session_id`).
- **Neural/Natural Voice Scoring Engine (`useVoiceInteraction.ts`)**: Added `getBestVoice()` scoring matrix to prioritize high-definition HD human voices (Google US/UK, Microsoft Natural Jenny/Aria, Apple Samantha/Siri/Premium) over robotic desktop fallbacks.
- **Conversational Speech Filter (`useVoiceInteraction.ts`)**: Upgraded `sanitizeTextForSpeech()` to strip emojis, bullet markers (`•`, `-`, `*`), numbered lists, markdown syntax, and parenthetical site references into clean spoken English.
- **Single-Line Banner Polish (`VoiceWaveVisualizer.tsx`, `StickyAICompanion.tsx`, `AiMentor.tsx`)**: Fixed two-line text wrapping by enforcing `whitespace-nowrap shrink-0` on `VoiceWaveVisualizer` label spans and overlay containers.
- **Recording Console Flex Overflow Fix (`StickyAICompanion.tsx` & `AiMentor.tsx`)**: Added `min-w-0` to flex containers and `shrink-0` to control button rows, ensuring long dictated transcripts truncate smoothly (`...`) and never push control buttons off-screen.
- **Frosted Glassmorphic Action Chips (`StickyAICompanion.tsx` & `AiMentor.tsx`)**: Replaced flat solid colored block buttons with frosted glassmorphic action chips (`bg-emerald-500/20`, `bg-rose-500/20`) featuring hover scale micro-animations.
- **Apple-Style Dark Glass Capsule (`StickyAICompanion.tsx` & `AiMentor.tsx`)**: Upgraded recording bar container to dark glass (`bg-slate-950/95 backdrop-blur-xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]`) with top ambient gradient glow line.
- **Automatic Scroll-to-Bottom on Mount/Refresh (`AiMentor.tsx`)**: Placed `<div ref={chatEndRef} />` at the bottom of the message list and added mount `useEffect` to scroll instantly to the latest message (`behavior: 'auto'`) on page refresh/mount.
- **UI Registry Imprint (`context/ui-registry.md`)**: Imprinted multi-chat session tokens, frosted glass action chip rules, single-line banner guidelines, flex overflow prevention, and chat mount scroll patterns.

## Decisions made

- Multi-Chat Sessions apply strictly to the `OdishaExamPrep AI` section in `AiMentor.tsx` as specified by the user.
- New chats auto-title based on the first 32 characters of the student's first prompt.
- Deleting the last remaining chat session resets it to a fresh welcome session rather than leaving an empty screen state.
- Speech Synthesis MUST use `getBestVoice()` to score and rank Neural/Natural voices dynamically.
- All `VoiceWaveVisualizer` labels MUST use `whitespace-nowrap shrink-0` to prevent multi-line text breaks.
- All flex containers in voice dictation bars MUST declare `min-w-0` and action button rows MUST declare `shrink-0` to keep Check `[✓]` and Cancel `[X]` buttons 100% visible on screen.

## Problems solved

- **Single Chat Thread Limitation**: Replaced single-chat model with full multi-session history management.
- **Robotic Voice Quality**: Replaced flat eSpeak/Desktop system synthesizer voices with Neural/Natural human voices.
- **Visual Markdown Artifacts in Audio**: Stripped emojis, bullet markers, and brackets from spoken text output.
- **Two-Line Banner Text Wrapping**: Eliminated `"AI"` / `"SPEAKING..."` split by enforcing single-line whitespace rules.
- **Recording Bar Screen Overflow**: Fixed issue where long dictated sentences expanded the black bar past the right viewport boundary, hiding control buttons.
- **Scroll Top Position on Page Refresh**: Resolved issue where refreshing `OdishaExamPrep AI` stayed at `scrollTop = 0` (showing the top welcome card instead of latest chat history).

## Current state

- Multi-Chat Session Manager, Neural Voice Engine, Glassmorphic Voice UI, and Auto-Scroll Chat Console fully functional, responsive, and tested across `StickyAICompanion.tsx`, `AiMentor.tsx`, and `VoiceWaveVisualizer.tsx`.
- Dev server running smoothly on port 3000.
- `npx tsc --noEmit` verified with 0 errors.

## Next session starts with

- Ready for next platform feature enhancement, UI polish, or backend integration.

## Open questions

- None.
