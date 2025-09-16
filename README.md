# Scripture Buddy (Web Only)

A minimal repo set up for building a web app with a sprinkle of AI. It contains:

- apps/web — React Router + Vite SSR app with API routes (Hono server). Includes the Scripture Buddy page that calls an LLM via a tiny proxy endpoint.

Both apps are intentionally lightweight and easy to customize.

## Quickstart (Web)

- Prereqs: Node 20+, Git. Optional: Bun or pnpm.

- cd apps/web
- npm install (or bun install / pnpm install)
- npm run dev
- Open http://localhost:4000

This repo is now web‑only. The previous mobile scaffold has been removed.

## What’s Inside

Web app
- Framework: React 18 + React Router v7 + Vite SSR
- Dev server: port 4000 (see apps/web/vite.config.ts)
- Routing: file-based, auto-discovers any src/app/**/page.jsx
- APIs: colocated under src/app/api/* (Node runtime via Hono)
- Styling: Tailwind CSS 3
- Data: Optional Neon SQL via DATABASE_URL
- LLM: Proxy endpoint at /api/llm/chat

Mobile app
- Removed. If you need a mobile app later, create a new Expo project in a separate repo and point it at the web API.

## Environment Variables (Web)
- AUTH_URL: The canonical origin for cookies (e.g. http://localhost:4000)
- AUTH_SECRET: Secret used by @auth/core
- DATABASE_URL: Neon connection string when using SQL helpers (optional)
- NEXT_PUBLIC_*: Any env prefixed with NEXT_PUBLIC_ is exposed to the client

Create a .env (or .env.local) file in apps/web as needed. Only expose public values with NEXT_PUBLIC_* on the client.

## LLM Proxy Overview

The web app includes a simple LLM proxy at /api/llm/chat that forwards requests to an OpenAI-compatible endpoint.

- File: apps/web/src/app/api/llm/chat/route.js:1
- Method: POST
- Body fields:
  - endpointBase: Base URL (e.g. https://api.openai.com/v1)
  - path: Path (default /chat/completions)
  - apiKey: Provider API key
  - model, messages, temperature, max_tokens
  - extraHeaders: Additional headers for the upstream call
  - requestOverride: Provide a full upstream JSON payload (skips defaults)
  - method: HTTP method for upstream call (default POST)

Curl example
- curl -X POST http://localhost:4000/api/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "endpointBase": "https://api.openai.com/v1",
    "path": "/chat/completions",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini",
    "messages": [
      {"role":"system","content":"You are concise."},
      {"role":"user","content":"Hello!"}
    ]
  }'

Security note: For production, prefer reading the API key from the server environment instead of accepting it from the client. See AGENTS.md for patterns.

## Agents

Two server-managed agents are available so clients (web/mobile) don’t need to ship provider API keys:

- Stylist: `POST /api/agents/stylist` → `{ text, style? }` returns `{ text }`
- Notes: `POST /api/agents/notes` → `{ text, preset? }` returns `{ text }`

Configure your provider key on the web server:

```
OPENAI_API_KEY=sk-...
```

Agents forward to the existing proxy under the hood to keep behavior consistent.

## File-Based Routing (Web)

- Add a new page: create src/app/some/page.jsx and it becomes /some
- Dynamic segments: [id] → :id, [[id]] → :id?, [...rest] → catch-all
- The route list is generated in apps/web/src/app/routes.ts:1

## APIs (Web)

Examples you can use or extend:
- Auth token exchange: apps/web/src/app/api/auth/token/route.js:1
- Auth iframe success: apps/web/src/app/api/auth/expo-web-success/route.js:1
- SQL via Neon helper: apps/web/src/app/api/utils/sql.js:1
- Upload helper to Create.xyz: apps/web/src/app/api/utils/upload.js:1

Create new endpoints under src/app/api/<name>/route.ts(x|js) and return a Response.

## Development Tips

- React Query is pre-configured for both apps
- Tailwind is set up in the web app (src/app/global.css)
- Hot reload and a dev error overlay are included for a fast loop
- Route files that change often trigger a Vite restart (see plugins)

## Testing (Web)

- Unit tests: Vitest + Testing Library
- From apps/web: npx vitest or add an npm script (e.g. "test": "vitest")

## Common Tasks

- Add a web page: create src/app/feature/page.jsx
- Add a web API route: create src/app/api/feature/route.js
- Build for production: from apps/web, run npx react-router build
- Start a production server: npx react-router serve ./build

## Troubleshooting

- Port 4000 in use: change server.port in apps/web/vite.config.ts
- LLM errors: check /api/llm/chat response body for upstream error details
- Auth issues (mobile): verify EXPO_PUBLIC_* vars and proxy origin match

---

See AGENTS.md for guidance on implementing LLM-backed agents and patterns.
