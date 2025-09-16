# Agents

This document explains how to add AI-powered “agents” to this repo using the existing web API and utilities. It favors simple, composable patterns you can extend as needs grow.

## Concepts

- **Agent:** A focused LLM-backed capability (e.g., summarizer, styler, planner). An agent is typically a server route with a clear input/output contract and optional tools.
- **Proxy:** The existing LLM endpoint that forwards requests to an OpenAI‑compatible API. See `apps/web/src/app/api/llm/chat/route.js:1`.
- **Messages:** Standard Chat Completions array of `{ role, content }`. Keep system instructions concise and targeted.
- **Tools/Data:** Optional helpers (SQL, file upload, auth) for retrieval, post‑processing, and persistence.

## Building Blocks

- **LLM Proxy:** `/api/llm/chat` accepts `endpointBase`, `path`, `apiKey`, `model`, `messages`, `temperature`, `max_tokens`, `extraHeaders`, `requestOverride`, `method`.
- **Web Page Example:** The sample UI calls the proxy in `apps/web/src/app/page.jsx:1`. Use it as a reference for request/response handling.
- **SQL Helper:** `apps/web/src/app/api/utils/sql.js:1` exposes Neon via `process.env.DATABASE_URL` for simple queries/transactions.
- **Upload Helper:** `apps/web/src/app/api/utils/upload.js:1` uploads a buffer/URL/base64 to Create.xyz and returns a URL.

## A Minimal Agent

Goal: A “Stylist” agent that restyles input text based on a fixed system prompt. This is a server route that hides provider details and API keys from the client.

- **Route:** Create `apps/web/src/app/api/agents/stylist/route.js`
- **Contract:** `POST { text: string, style?: string } → { text: string }`
- **Implementation sketch:**
```js
// apps/web/src/app/api/agents/stylist/route.js
export async function POST(request) {
  const { text = '', style = 'Modern, clear and plain language' } = await request.json();
  if (!text.trim()) {
    return Response.json({ error: 'Missing text' }, { status: 400 });
  }

  // Prefer server‑side secrets in production
  const apiKey = process.env.OPENAI_API_KEY; // or ANTHROPIC_API_KEY, etc.
  if (!apiKey) {
    return Response.json({ error: 'Server LLM key not configured' }, { status: 500 });
  }

  const system = `You restyle text while preserving meaning. Style preset: ${style}.`;

  // Call the existing proxy to keep behavior consistent
  const upstream = await fetch(new URL('/api/llm/chat', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpointBase: 'https://api.openai.com/v1',
      path: '/chat/completions',
      apiKey,
      model: 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!upstream.ok) {
    const details = await upstream.json().catch(() => ({}));
    return Response.json({ error: details?.error || 'LLM failed' }, { status: upstream.status });
  }
  const data = await upstream.json();
  return Response.json({ text: data?.text || '' });
}
```

- **Client use:**
```ts
const res = await fetch('/api/agents/stylist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: userInput, style: 'Poetic' }),
});
const { text } = await res.json();
```

## Secrets and Security

- **Server‑managed keys:** In production, read provider keys from `process.env` on the server. Avoid accepting API keys from the client.
- **CORS/proxy:** `/api/llm/chat` is a convenience proxy. For locked‑down apps, bypass it and call your provider SDK directly with server secrets.
- **Validation:** Validate inputs strictly; cap `max_tokens` and enforce allowlists for `model`.
- **Rate limits:** Add per‑IP/user limits and backoff as needed.

## Patterns to Extend

- **Tool Use:**
  - Retrieval: query with `sql` and add context to prompts (RAG‑lite)
  - Upload: accept user files, store via `upload()`, pass URLs to the model
  - Structured output: ask for JSON and `JSON.parse` with guards
- **Streaming:**
  - For chat streaming, return `text/event-stream` and incrementally flush chunks
  - Vite/React Router supports custom Response bodies in routes
- **Multi‑Agent:**
  - Planner → Workers → Reviewer pipeline coordinating through shared state
  - Persist short‑term memory in a table; include summaries in prompts
- **Prompt Hygiene:**
  - Keep system prompt stable, put ephemeral instructions in user content
  - Constrain output format to reduce post‑processing errors

## Testing

- **Unit tests:** Use Vitest in `apps/web` to test route handlers (import and call exported functions with Request objects).
- **E2E smoke:** Issue real requests against the dev server, assert shapes only.
- **Red teaming:** Add adversarial prompts to a test set; check guardrails.

## Where to Look

- LLM proxy: `apps/web/src/app/api/llm/chat/route.js:1`
- Sample UI calling the proxy: `apps/web/src/app/page.jsx:1`
- SQL helper: `apps/web/src/app/api/utils/sql.js:1`
- Upload helper: `apps/web/src/app/api/utils/upload.js:1`

Start small (one agent/one route) and grow by composing more tools and routes.
