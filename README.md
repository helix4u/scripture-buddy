# Scripture Buddy

Scripture Buddy is a web-only playground for experimenting with LLM-powered scripture restyling and study notes. It ships a React Router + Vite SSR application backed by a tiny Hono API layer so prompts, agents, and provider keys stay on the server.

## Project Structure

```
apps/
  web/            # React Router app with colocated API routes
install.bat       # Windows helper to install web dependencies
start.bat         # Windows helper to run the dev server
```

## Getting Started

Prerequisites: Node 20+, npm (or pnpm / Bun if you prefer), Git.

```bash
cd apps/web
npm install
npm run dev
# visit http://localhost:4000
```

`start.bat` opens the dev server in a new terminal on Windows after dependencies are installed.

## Key Features

- **LLM proxy** (`/api/llm/chat`): forwards JSON requests to any OpenAI-compatible endpoint while keeping API keys server-side.
- **Agents** (`/api/agents/stylist`, `/api/agents/notes`): wrap the proxy with opinionated prompts for restyling passages and generating study notes.
- **Flexible themes & presets** inside `apps/web/src/app/page.jsx` so you can tune UI, prompts, and output formatting quickly.

## Environment Variables

Create an `.env` or `.env.local` file inside `apps/web` and set the values you need:

| Variable        | Purpose                                                       |
|-----------------|----------------------------------------------------------------|
| `AUTH_URL`      | Canonical origin used by @auth/core (if authentication enabled)|
| `AUTH_SECRET`   | Secret for auth session signing                               |
| `DATABASE_URL`  | Optional Neon connection string for SQL helpers               |
| `OPENAI_API_KEY`| Provider API key used by the agents/proxy                     |
| `NEXT_PUBLIC_*` | Any value prefixed `NEXT_PUBLIC_` is exposed to the client    |

Only commit example env files (e.g., `.env.example`). Keep real keys out of Git.

## LLM Proxy Reference

Endpoint: `POST /api/llm/chat`

Body fields:
- `endpointBase`, `path`, or `url` – target endpoint details
- `apiKey`, `authHeader`, `authPrefix` – authentication controls
- `model`, `messages`, `temperature`, `max_tokens`, `extraHeaders`
- `requestOverride` – send a fully custom payload instead of defaults
- `method` – HTTP verb for the upstream call (default `POST`)

Example curl:

```bash
curl -X POST http://localhost:4000/api/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "endpointBase": "https://api.openai.com/v1",
    "path": "/chat/completions",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "system", "content": "You are concise."},
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

## Developing & Extending

- **Routing**: Add `src/app/<route>/page.jsx` and it automatically becomes `/route`.
- **API routes**: Add `src/app/api/<name>/route.js` and export HTTP handlers.
- **Styling**: Tailwind CSS is enabled (see `src/app/global.css`).
- **State/query**: React Query is already configured for the web app.
- **Testing**: Vitest + Testing Library (run `npx vitest` inside `apps/web`).

See `AGENTS.md` for deeper patterns (RAG-lite, uploads, streaming, multi-agent workflows).

## Troubleshooting

- Port 4000 already in use → update `server.port` in `apps/web/vite.config.ts`.
- Proxy errors → inspect the JSON response from `POST /api/llm/chat` for upstream details.
- Auth issues → confirm `AUTH_URL`, `AUTH_SECRET`, and any `NEXT_PUBLIC_*` values.

## Contribution Notes

This repo intentionally ships only source files. Before committing, double-check that `.gitignore` covers build artefacts, node modules, environment files, and editor settings so secrets never land in Git history.
