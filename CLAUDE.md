# Help Wanted Stream Assistant

## Purpose
Private idea assistant for a Minecraft let's play series called "Help Wanted."
One user (the streamer). Passcode protected. Answers are grounded in the
series plan in `content/series-plan.md`.

## Stack
- Next.js App Router, TypeScript, Tailwind CSS, `src/` directory
- @anthropic-ai/sdk, server side only
- Vercel hosting, no database, localStorage for client state

## Hard rules
- ANTHROPIC_API_KEY is read only in server code (route handlers). Never
  prefix it with NEXT_PUBLIC_, never send it to the client, never log it.
- Every /api route except /api/login checks the auth cookie.
- Cap max_tokens and input length on every model call.
- The series plan lives in content/series-plan.md. Edit the plan there,
  not inside prompts.

## Environment variables
- ANTHROPIC_API_KEY: Anthropic API key (server only)
- ANTHROPIC_MODEL: model ID, defaults to claude-sonnet-5
- APP_PASSCODE: passcode the streamer types to get in
- AUTH_SECRET: random string used to sign the auth cookie

## Commands
- npm run dev: local dev server
- npm run build: production build (must pass before calling a phase done)
- npm run lint: lint (must pass)

## Key files
- `content/series-plan.md`: the series bible, injected into the system prompt.
- `src/proxy.ts`: auth gate (Next 16 renamed middleware to proxy). Redirects
  pages to /login, returns 401 for /api/* except /api/login.
- `src/lib/auth.ts`: HMAC-SHA256 cookie token (create/verify), constant-time
  compare, cookie options. Node crypto only.
- `src/lib/session.ts`: `isAuthenticated()` for use inside route handlers.
- `src/app/api/login/route.ts`, `src/app/api/logout/route.ts`: set/clear cookie.
- `src/app/api/assist/route.ts`: validates the body, builds the system prompt,
  streams plain text from the Messages API, maps SDK errors to friendly JSON.
- `src/lib/modes.ts`: the six modes (id, label, quick prompt, placeholder,
  server instruction). Shared by client and server.
- `src/lib/sessions.ts`: S1 to S16 titles, weeks, planned work order ranges.
- `src/lib/series-plan.ts`: reads the plan from disk once (module cache).
- `src/lib/storage.ts`: localStorage helpers and the ChatMessage/SavedIdea types.
- `src/components/Assistant.tsx`: the whole main page (client only).
- `src/components/AssistantLoader.tsx`: `next/dynamic` with ssr:false wrapper.
- `src/components/MessageCard.tsx`, `src/components/SavedDrawer.tsx`: memo
  cards and the saved ideas drawer.
- `src/app/login/page.tsx`: passcode form.
- `src/app/layout.tsx`, `src/app/globals.css`: fonts (Archivo Narrow, Special
  Elite) and the paperwork theme tokens (light + dark via prefers-color-scheme).
- `next.config.ts`: `outputFileTracingIncludes` so `content/` ships with the
  /api/assist function on Vercel.
- `AGENTS.md`: written by `next dev`; points at Next docs in
  `node_modules/next/dist/docs/`. Leave it.

## Decisions
- Next.js 16.3.6. Middleware is deprecated there, so the auth gate is
  `src/proxy.ts` (Node runtime by default, so Node crypto is fine in it).
- Model ID `claude-sonnet-5` (from Anthropic's current model list, checked
  2026-09-26). Thinking is explicitly disabled so the 1200-token cap goes to
  visible output. If ANTHROPIC_MODEL matches fable, mythos, or opus-5-5 the
  route omits `thinking` (those models reject disabled) and sets
  `output_config.effort: "low"` instead.
- The series plan block carries `cache_control: ephemeral`; session, mode, and
  output rules go in a second system block after it so the cached prefix is
  stable.
- Route handlers re-check the cookie via `isAuthenticated()` even though the
  proxy already gates /api/*. Belt and braces per the hard rules.
- Cookie is `secure` only when NODE_ENV=production so local http dev works.
- Login failure adds a fixed 400 ms delay as a cheap brute-force slowdown.
  No real rate limiting (serverless memory isn't shared).
- The assist route awaits the first stream event before returning a Response,
  so key/model/rate-limit errors get a real status code and a friendly JSON
  body instead of a 200 that dies mid-stream. Errors after streaming starts
  are appended to the text in brackets.
- The main page is rendered client-only (`next/dynamic`, ssr:false) so
  localStorage can be read in lazy useState initializers. This satisfies the
  React Compiler lint rule `react-hooks/set-state-in-effect`, which rejects
  setState inside a mount effect.
- Chat history is capped at the last 60 messages in localStorage; the request
  sends the last 20 non-error messages, each trimmed to 4000 chars.
- Quick-mode buttons include any text already typed in the box as
  "Extra context" so she can steer without switching to chat mode.
- Work-order numbering: each session owns 3 numbers (S1 #001-003, S2
  #004-006, ...). The prompt tells the model to use letter suffixes for extras.
- `.gitignore` un-ignores `.env.example` (the scaffold's `.env*` rule hid it).

## Progress log
- Phase 1 (2026-09-26): Scaffolded Next.js 16.3.6 (Turbopack, Tailwind v4, ESLint 9), added @anthropic-ai/sdk 0.128, .env.example. Build + lint pass.
- Phase 2 (2026-09-26): Passcode auth. HMAC cookie, proxy.ts gate, login/logout routes, login page. Verified with curl (redirects, 401s, tampered cookie rejected).
- Phase 3 (2026-09-26): POST /api/assist with validation, cached series plan, streaming plain text, friendly errors. Verified validation + 401 + bogus-key 502 with curl.
- Phase 4 (2026-09-26): UI. Session picker, mode buttons, streaming memos, copy/save, saved drawer, clear chat, stop button, light/dark, phone layout. Drove it in headless Chrome against a mock Messages API (streaming, stop, save, shred, persistence, logout all verified).
- Phase 5 (2026-09-26): README, leak greps on source and .next/static, 401 check, final build + lint clean. No live model call was made (no API key available locally).
