
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const safeLocalStorage =
  typeof window !== "undefined" ? window.localStorage : null;

const SETTINGS_KEY = "scripture-buddy:settings";
const SLOTS_KEY = "scripture-buddy:slots";
const DEFAULT_PRESET_ID = "openai";
const DEFAULT_MODELS = [
  "gpt-4o-mini",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "llama-3.1-8b-instruct",
  "mistral-small-latest",
  "qwen3-4b-instruct-2507",
];

const VENDOR_PRESETS = [
  {
    id: "openai",
    label: "OpenAI",
    values: {
      endpointBase: "https://api.openai.com/v1",
      endpointPath: "/chat/completions",
      completionsUrl: "",
      authHeader: "Authorization",
      authPrefix: "Bearer ",
      model: "gpt-4o-mini",
    },
  },
  {
    id: "azure",
    label: "Azure OpenAI",
    values: {
      endpointBase: "",
      endpointPath: "",
      completionsUrl:
        "https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT/chat/completions?api-version=2024-02-01",
      authHeader: "api-key",
      authPrefix: "",
      model: "",
    },
    description:
      "Replace placeholders with your Azure resource name and deployment id.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    values: {
      endpointBase: "https://openrouter.ai/api/v1",
      endpointPath: "/chat/completions",
      completionsUrl: "",
      authHeader: "Authorization",
      authPrefix: "Bearer ",
      model: "openrouter/auto",
    },
  },
  {
    id: "together",
    label: "Together AI",
    values: {
      endpointBase: "https://api.together.xyz/v1",
      endpointPath: "/chat/completions",
      completionsUrl: "",
      authHeader: "Authorization",
      authPrefix: "Bearer ",
      model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    },
  },
  {
    id: "groq",
    label: "Groq",
    values: {
      endpointBase: "https://api.groq.com/openai/v1",
      endpointPath: "/chat/completions",
      completionsUrl: "",
      authHeader: "Authorization",
      authPrefix: "Bearer ",
      model: "mixtral-8x7b-32768",
    },
  },
  {
    id: "mistral",
    label: "Mistral",
    values: {
      endpointBase: "https://api.mistral.ai/v1",
      endpointPath: "/chat/completions",
      completionsUrl: "",
      authHeader: "Authorization",
      authPrefix: "Bearer ",
      model: "open-mixtral-8x7b",
    },
  },
  {
    id: "fireworks",
    label: "Fireworks",
    values: {
      endpointBase: "https://api.fireworks.ai/inference/v1",
      endpointPath: "/chat/completions",
      completionsUrl: "",
      authHeader: "Authorization",
      authPrefix: "Bearer ",
      model: "accounts/fireworks/models/mixtral-8x7b-instruct",
    },
  },
  {
    id: "perplexity",
    label: "Perplexity",
    values: {
      endpointBase: "https://api.perplexity.ai",
      endpointPath: "/chat/completions",
      completionsUrl: "",
      authHeader: "Authorization",
      authPrefix: "Bearer ",
      model: "llama-3.1-sonar-large-128k-chat",
    },
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    values: {
      endpointBase: "https://api.deepseek.com/v1",
      endpointPath: "/chat/completions",
      completionsUrl: "",
      authHeader: "Authorization",
      authPrefix: "Bearer ",
      model: "deepseek-chat",
    },
  },
  {
    id: "custom",
    label: "Custom (base + path)",
    isCustom: true,
  },
  {
    id: "custom-url",
    label: "Custom (full URL)",
    isCustom: true,
  },
];
const PERSONA_PRESETS = {
  stoner:
    "You are rewriting each scripture verse in a stoner voice. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Make every line unique. No Repetition. Do not narrate what you are doing. Just do it... and do it with exaggerated tone.",
  zoomer:
    "You are rewriting each scripture verse in a zoomer voice. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Make every line unique. No Repetition. Use tight, internet-native phrasing with occasional slang and lowercasing where natural, but keep names correctly cased. No emojis. No slurs.",
  houseish:
    "You are rewriting each scripture verse in the voice of a cynical, brilliant diagnostician from a medical drama. Dry, acerbic, brutally honest, skeptical of neat moral explanations, but precise. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Make every line unique. No Repetition. Inject cutting diagnostic metaphors and bleak wit, but stay faithful to facts. No emojis. No slurs.",
  plain:
    "You are rewriting each scripture verse in plain modern English. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Short, clear sentences. Make every line unique. No Repetition. No emojis. No slurs.",
  kid:
    "You are rewriting each scripture verse for kids. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Use simple words and short, friendly phrases. Make every line unique. No Repetition. No emojis. No slurs.",
  headline:
    "You are rewriting each scripture verse as a news headline. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Compact and punchy; ~12-18 words. Make every line unique. No Repetition. No emojis. No slurs.",
  legal:
    "You are rewriting each scripture verse in the tone of a formal legal brief. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Precise, neutral wording; use whereas/therefore sparingly. Make every line unique. No Repetition. No emojis. No slurs.",
  study:
    "You are rewriting each scripture verse as a concise study note. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Clarify relationships with plain connectors (because, therefore, but). Make every line unique. No Repetition. No emojis. No slurs.",
  clinical:
    "You are rewriting each scripture verse in a clinical, scientific tone. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Neutral cause-and-effect phrasing; avoid metaphor. Make every line unique. No Repetition. No emojis. No slurs.",
  minimalist:
    "You are rewriting each scripture verse in a minimalist style. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. 15-25 words max; remove filler; keep structure clear. Make every line unique. No Repetition. No emojis. No slurs.",
  tweet:
    "You are rewriting each scripture verse as a tweet-length line (<=180 chars). Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Make every line unique. No Repetition. No emojis. No slurs.",
  bard:
    "You are rewriting each scripture verse in a Shakespeare-like bardic voice. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Use thee/thy/'tis where natural. Make every line unique. No Repetition. No emojis. No slurs.",
  pirate:
    "You are rewriting each scripture verse in a clean pirate voice. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Light nautical slang; no profanity. Make every line unique. No Repetition. No emojis. No slurs.",
  noir:
    "You are rewriting each scripture verse in a noir detective voice. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Short, moody, hardboiled cadence. Make every line unique. No Repetition. No emojis. No slurs.",
  coach:
    "You are rewriting each scripture verse as a sports coach pep-talk. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Upbeat, imperative metaphors; clean language. Make every line unique. No Repetition. No emojis. No slurs.",
  stoic:
    "You are rewriting each scripture verse in a stoic, aphoristic voice. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Calm, terse, disciplined tone. Make every line unique. No Repetition. No emojis. No slurs.",
  hacker:
    "You are rewriting each scripture verse like a concise system log. Keep all proper nouns unchanged. One output line per verse. No extra commentary. Keep info density similar to the source. Do not add or remove facts. Use bracketed tags and status-like phrasing sparingly. Make every line unique. No Repetition. No emojis. No slurs.",
};

const DEFAULT_JSON_SOURCES = [
  {
    label: "Standard Works (Book_of_Mormon_Scriptures)",
    url: "https://raw.githubusercontent.com/johngthecreator/Book_of_Mormon_Scriptures/main/standard-works.json",
  },
  {
    label: "Bhagavad Gita (helix4u/Bible-Styler)",
    url: "https://raw.githubusercontent.com/helix4u/Bible-Styler/refs/heads/main/gita_standard_works.json",
  },
  { label: "Custom URL ...", url: "" },
];

const DEFAULT_THEME = "monochrome";

const THEMES = {
  blackout: {
    "--bg": "#000000",
    "--bg-elev": "#0a0a0a",
    "--bg-input": "#0f0f0f",
    "--border": "#1a1a1a",
    "--border-strong": "#262626",
    "--text": "#e5e5e5",
    "--text-muted": "#a3a3a3",
    "--accent": "#60a5fa",
    "--accent-2": "#3b82f6",
    "--danger": "#ef4444",
    "--ok": "#22c55e",
    "--term": "#e5e5e5",
    "--term-bg": "#030303",
    "--focus": "0 0 0 3px rgba(59, 130, 246, 0.35)",
  },
  doom: {
    "--bg": "#000000",
    "--bg-elev": "#0d0d0d",
    "--bg-input": "#0a0a0a",
    "--border": "#1f1f1f",
    "--border-strong": "#2a2a2a",
    "--text": "#a6e22e",
    "--text-muted": "#74c476",
    "--accent": "#98fb98",
    "--accent-2": "#7fffd4",
    "--danger": "#ff5555",
    "--ok": "#50fa7b",
    "--term": "#a6e22e",
    "--term-bg": "#020202",
    "--focus": "0 0 0 3px rgba(152, 251, 152, 0.28)",
  },
  atari: {
    "--bg": "#0c0b16",
    "--bg-elev": "#14132b",
    "--bg-input": "#0f0e22",
    "--border": "#2a2857",
    "--border-strong": "#3a377c",
    "--text": "#e4d5ff",
    "--text-muted": "#b1a8d9",
    "--accent": "#ff7f11",
    "--accent-2": "#ff4f5a",
    "--danger": "#ff4d4d",
    "--ok": "#2de2e6",
    "--term": "#ffd166",
    "--term-bg": "#0a0920",
    "--focus": "0 0 0 3px rgba(255, 127, 17, 0.32)",
  },
  nes: {
    "--bg": "#161616",
    "--bg-elev": "#202020",
    "--bg-input": "#1a1a1a",
    "--border": "#2a2a2a",
    "--border-strong": "#3a3a3a",
    "--text": "#e5e5e5",
    "--text-muted": "#a8a8a8",
    "--accent": "#e60012",
    "--accent-2": "#cc0010",
    "--danger": "#ff3b30",
    "--ok": "#34c759",
    "--term": "#f2f2f2",
    "--term-bg": "#121212",
    "--focus": "0 0 0 3px rgba(230, 0, 18, 0.32)",
  },
  midnight: {
    "--bg": "#070b16",
    "--bg-elev": "#0c1527",
    "--bg-input": "#101c33",
    "--border": "#16233f",
    "--border-strong": "#23345a",
    "--text": "#e4ecff",
    "--text-muted": "#8ba2c7",
    "--accent": "#4f9dff",
    "--accent-2": "#316dff",
    "--danger": "#ff6b81",
    "--ok": "#43d6a6",
    "--term": "#cde5ff",
    "--term-bg": "#081022",
    "--focus": "0 0 0 3px rgba(79, 157, 255, 0.35)",
  },
  daylight: {
    "--bg": "#f7fafc",
    "--bg-elev": "#ffffff",
    "--bg-input": "#eef2f7",
    "--border": "#dbe4f3",
    "--border-strong": "#c3d1e6",
    "--text": "#0f172a",
    "--text-muted": "#475569",
    "--accent": "#0ea5e9",
    "--accent-2": "#22d3ee",
    "--danger": "#ef4444",
    "--ok": "#059669",
    "--term": "#1f2937",
    "--term-bg": "#e2e8f0",
    "--focus": "0 0 0 3px rgba(14, 165, 233, 0.25)",
  },
  cyberpunk: {
    "--bg": "#0a1420",
    "--bg-elev": "#0f1f30",
    "--bg-input": "#0c1a2b",
    "--border": "#203349",
    "--border-strong": "#2f4b63",
    "--text": "#cde7ff",
    "--text-muted": "#6aa0bb",
    "--accent": "#00eaff",
    "--accent-2": "#00b7ff",
    "--danger": "#ff2d55",
    "--ok": "#00ffa3",
    "--term": "#00eaff",
    "--term-bg": "#071321",
    "--focus": "0 0 0 3px rgba(0, 234, 255, 0.3)",
  },
  oceanic: {
    "--bg": "#04161d",
    "--bg-elev": "#06222b",
    "--bg-input": "#0c2f3b",
    "--border": "#123b4a",
    "--border-strong": "#1a4d61",
    "--text": "#cce9f4",
    "--text-muted": "#7fb1c0",
    "--accent": "#4fd1c5",
    "--accent-2": "#38b2ac",
    "--danger": "#f97360",
    "--ok": "#5eead4",
    "--term": "#b1f0ff",
    "--term-bg": "#052029",
    "--focus": "0 0 0 3px rgba(79, 209, 197, 0.32)",
  },
  forest: {
    "--bg": "#0b120d",
    "--bg-elev": "#101b13",
    "--bg-input": "#142419",
    "--border": "#1c3523",
    "--border-strong": "#285033",
    "--text": "#e4f2e8",
    "--text-muted": "#9fc3aa",
    "--accent": "#4ade80",
    "--accent-2": "#22c55e",
    "--danger": "#ef4444",
    "--ok": "#86efac",
    "--term": "#d1fae5",
    "--term-bg": "#0a1610",
    "--focus": "0 0 0 3px rgba(34, 197, 94, 0.28)",
  },
  desert: {
    "--bg": "#2a1a0f",
    "--bg-elev": "#382316",
    "--bg-input": "#432a1a",
    "--border": "#53311e",
    "--border-strong": "#7a4930",
    "--text": "#f9ead8",
    "--text-muted": "#d1b7a0",
    "--accent": "#f97316",
    "--accent-2": "#fb923c",
    "--danger": "#f87171",
    "--ok": "#fbbf24",
    "--term": "#fde68a",
    "--term-bg": "#2d1b0f",
    "--focus": "0 0 0 3px rgba(249, 115, 22, 0.28)",
  },
  ember: {
    "--bg": "#1a0909",
    "--bg-elev": "#220c0c",
    "--bg-input": "#2d1010",
    "--border": "#3a1616",
    "--border-strong": "#552020",
    "--text": "#ffe4e6",
    "--text-muted": "#fca5a5",
    "--accent": "#fb7185",
    "--accent-2": "#f43f5e",
    "--danger": "#f87171",
    "--ok": "#fbbf24",
    "--term": "#ffe4e6",
    "--term-bg": "#2b0d0d",
    "--focus": "0 0 0 3px rgba(251, 113, 133, 0.35)",
  },
  aurora: {
    "--bg": "#0a0f1f",
    "--bg-elev": "#101833",
    "--bg-input": "#172042",
    "--border": "#1f2b57",
    "--border-strong": "#304079",
    "--text": "#e0f2ff",
    "--text-muted": "#9dc5ff",
    "--accent": "#60a5fa",
    "--accent-2": "#a855f7",
    "--danger": "#f472b6",
    "--ok": "#34d399",
    "--term": "#cbdcf9",
    "--term-bg": "#0d1429",
    "--focus": "0 0 0 3px rgba(96, 165, 250, 0.32)",
  },
  blossom: {
    "--bg": "#1f0f1f",
    "--bg-elev": "#2b1430",
    "--bg-input": "#34193a",
    "--border": "#42204b",
    "--border-strong": "#5a2a63",
    "--text": "#f9e8ff",
    "--text-muted": "#e5baff",
    "--accent": "#f472b6",
    "--accent-2": "#ec4899",
    "--danger": "#ff8fab",
    "--ok": "#facc15",
    "--term": "#fce7f3",
    "--term-bg": "#241129",
    "--focus": "0 0 0 3px rgba(236, 72, 153, 0.32)",
  },
  parchment: {
    "--bg": "#f6f1e4",
    "--bg-elev": "#fffaf1",
    "--bg-input": "#f1e6d4",
    "--border": "#e2d5c1",
    "--border-strong": "#d3bea0",
    "--text": "#362c1f",
    "--text-muted": "#87765f",
    "--accent": "#d97706",
    "--accent-2": "#f59e0b",
    "--danger": "#b45309",
    "--ok": "#15803d",
    "--term": "#433422",
    "--term-bg": "#f3e3cb",
    "--focus": "0 0 0 3px rgba(217, 119, 6, 0.28)",
  },
  velvet: {
    "--bg": "#09070f",
    "--bg-elev": "#120d1f",
    "--bg-input": "#1b142b",
    "--border": "#241738",
    "--border-strong": "#382056",
    "--text": "#ede9fe",
    "--text-muted": "#c4b5fd",
    "--accent": "#a855f7",
    "--accent-2": "#7c3aed",
    "--danger": "#f472b6",
    "--ok": "#38bdf8",
    "--term": "#d6bcff",
    "--term-bg": "#130d24",
    "--focus": "0 0 0 3px rgba(168, 85, 247, 0.32)",
  },
  monochrome: {
    "--bg": "#000000",
    "--bg-elev": "#080808",
    "--bg-input": "#111111",
    "--border": "#1f1f1f",
    "--border-strong": "#2f2f2f",
    "--text": "#f5f5f5",
    "--text-muted": "#bdbdbd",
    "--accent": "#fcd34d",
    "--accent-2": "#f87171",
    "--danger": "#ef4444",
    "--ok": "#22c55e",
    "--term": "#f5f5f5",
    "--term-bg": "#050505",
    "--focus": "0 0 0 3px rgba(252, 211, 77, 0.32)",
  },
  custom: {
    "--bg": "#0b0f14",
    "--bg-elev": "#0f172a",
    "--bg-input": "#0b1220",
    "--border": "#1e293b",
    "--border-strong": "#334155",
    "--text": "#e5e7eb",
    "--text-muted": "#94a3b8",
    "--accent": "#38bdf8",
    "--accent-2": "#22d3ee",
    "--danger": "#f43f5e",
    "--ok": "#34d399",
    "--term": "#a7f3d0",
    "--term-bg": "#071019",
    "--focus": "0 0 0 3px rgba(56, 189, 248, 0.35)",
  },
};

const THEME_OPTIONS = [
  { id: "blackout", label: "Blackout (Pure Black)" },
  { id: "doom", label: "DOOM Green" },
  { id: "atari", label: "Atari Retro" },
  { id: "nes", label: "NES Classic" },
  { id: "midnight", label: "Midnight Slate" },
  { id: "daylight", label: "Daylight Ivory" },
  { id: "cyberpunk", label: "Cyberpunk Neon" },
  { id: "oceanic", label: "Oceanic Teal" },
  { id: "forest", label: "Forest Canopy" },
  { id: "desert", label: "Desert Dusk" },
  { id: "ember", label: "Ember Glow" },
  { id: "aurora", label: "Aurora Skies" },
  { id: "blossom", label: "Blossom Pastel" },
  { id: "parchment", label: "Parchment Sepia" },
  { id: "velvet", label: "Velvet Noir" },
  { id: "monochrome", label: "High Contrast Mono" },
  { id: "custom", label: "Custom (use overrides)" },
];


const FONT_OPTIONS = [
  { id: "system", label: "System Sans" },
  { id: "geist", label: "Geist-like" },
  { id: "inter", label: "Inter-like" },
  { id: "plex", label: "IBM Plex Sans" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Monospace UI" },
];

const FONT_MAP = {
  system: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
  geist: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
  inter: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
  plex: '"IBM Plex Sans", system-ui, Segoe UI, Roboto, Arial, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
};


function createDefaultSlots() {
  return Array.from({ length: 5 }, () => ({ name: "", prompt: "" }));
}

function parseJSONOrEmpty(value) {
  const raw = String(value || "").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

function parseList(value) {
  if (!value) return null;
  const arr = String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return arr.length ? arr : null;
}

function normalizeAscii(value) {
  return String(value || "")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2013|\u2014/g, "---")
    .replace(/\u00A0/g, " ");
}

function sanitizeOneLine(value) {
  if (!value) return "";
  let s = normalizeAscii(value);
  s = s.replace(/\r/g, " ").replace(/\n/g, " ").trim();
  s = s.replace(/\s*---.*$/i, "");
  s = s.replace(/^\s*(AI|Answer|Output)\s*:\s*/i, "");
  s = s.replace(/\s*Reference\s*:.*$/i, "");
  s = Array.from(s)
    .filter((ch) => ch.codePointAt(0) < 0x2500)
    .join("");
  return s.trim();
}

function refString(book, chapter, verse) {
  return `${book} ${chapter}:${verse}`;
}

function openingNgram(value, size = 4) {
  const tokens = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return tokens.slice(0, size).join(" ").toLowerCase();
}

function filterVerses(rows, volumes, books) {
  const volSet = volumes ? new Set(volumes.map((item) => item.toLowerCase())) : null;
  const bookSet = books ? new Set(books.map((item) => item.toLowerCase())) : null;
  if (!volSet && !bookSet) return rows;
  return rows.filter((row) => {
    const vol = String(row.volume_title || "").trim().toLowerCase();
    const book = String(row.book_title || "").trim().toLowerCase();
    if (volSet && !volSet.has(vol)) return false;
    if (bookSet && !bookSet.has(book)) return false;
    return true;
  });
}

function bodyOk(line, prefix, minChars = 6) {
  const body = line.slice(prefix.length).trim();
  return body.length >= minChars;
}

function resolveCompletionsTarget(config) {
  const full = (config.completionsUrl || "").trim();
  if (full) {
    if (/\/chat\/completions(\?|$)/i.test(full)) {
      return { url: full };
    }
    return { url: full.replace(/\/+$/, "") + "/chat/completions" };
  }
  const base = (config.endpointBase || "").trim();
  const fallbackPath = (config.endpointPath || "/chat/completions").trim() || "/chat/completions";
  const normalizedPath = fallbackPath.startsWith("/") ? fallbackPath : `/${fallbackPath}`;
  if (!base) {
    return { base: undefined, path: normalizedPath };
  }
  return { base, path: normalizedPath };
}

// Lightweight LLM caller that lets us override the system prompt
// without touching the main restyling pipeline.
function useLLMCaller({ ensureConnectionConfigured, apiKey, extraHeadersObj, effectiveModel, temperature }) {
  const callLLM = useCallback(
    async ({ system, userPrompt, temperatureOverride }) => {
      const config = ensureConnectionConfigured();
      const target = resolveCompletionsTarget(config);
      const requestBody = {
        endpointBase: target.base,
        path: target.path,
        url: target.url,
        apiKey: apiKey || undefined,
        authHeader: config.authHeader || undefined,
        authPrefix: config.authPrefix || "",
        extraHeaders: extraHeadersObj,
        requestOverride: {
          model: effectiveModel,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
          temperature: temperatureOverride ?? temperature,
        },
      };
      const response = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        let message = `LLM request failed (${response.status})`;
        try {
          const details = await response.json();
          if (details?.error) message = details.error;
        } catch (err) {}
        throw new Error(message);
      }
      const data = await response.json();
      return String(data?.text || "").trim();
    },
    [ensureConnectionConfigured, apiKey, extraHeadersObj, effectiveModel, temperature]
  );

  return callLLM;
}

function postprocessLine(result, expectedPrefix) {
  if (!result) return expectedPrefix;
  const safe = expectedPrefix
    .slice(1, -1)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp("\\[" + safe + "\\][^\\n\\r]*");
  const match = result.match(rx);
  let text = match ? match[0] : result;
  text = sanitizeOneLine(text);
  if (!text.startsWith(expectedPrefix)) {
    const body = text.replace(/^[\[\"']+/, "").trim();
    text = `${expectedPrefix} ${body}`;
  }
  return text;
}

function applyTheme(themeName, overrides) {
  if (typeof document === "undefined") return;
  const vars = THEMES[themeName] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  if (overrides && typeof overrides === "object") {
    Object.entries(overrides).forEach(([key, value]) => {
      if (String(key).startsWith("--")) root.style.setProperty(key, value);
    });
  }
  const bg = root.style.getPropertyValue("--bg");
  if (bg) document.body.style.backgroundColor = bg.trim();
}
function Page() {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [fontPreset, setFontPreset] = useState('system');
  const [themeOverridesInput, setThemeOverridesInput] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const [providerPreset, setProviderPreset] = useState(DEFAULT_PRESET_ID);
  const [endpointBase, setEndpointBase] = useState("https://api.openai.com/v1");
  const [endpointPath, setEndpointPath] = useState("/chat/completions");
  const [completionsUrl, setCompletionsUrl] = useState("");
  const [authHeader, setAuthHeader] = useState("Authorization");
  const [authPrefix, setAuthPrefix] = useState("Bearer ");
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODELS[0]);
  const [customModel, setCustomModel] = useState("");
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [modelOptions, setModelOptions] = useState(DEFAULT_MODELS);
  const [temperature, setTemperature] = useState(0.9);
  const [streamOption, setStreamOption] = useState("true");
  const [extraHeadersInput, setExtraHeadersInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(PERSONA_PRESETS.stoner);
  const [stopsInput, setStopsInput] = useState("Reference:,AI:,---");
  const [jsonUrl, setJsonUrl] = useState(DEFAULT_JSON_SOURCES[0].url);
  const [autoFetchJson, setAutoFetchJson] = useState("false");
  const [volumesInput, setVolumesInput] = useState("Old Testament,New Testament");
  const [booksInput, setBooksInput] = useState("");
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState("");
  const [ctxPairs, setCtxPairs] = useState(3);
  const [verses, setVerses] = useState([]);
  const [selectedBook, setSelectedBook] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedVerse, setSelectedVerse] = useState("");
  const [singleOverride, setSingleOverride] = useState("");
  const [outputText, setOutputText] = useState("");
  const [notesText, setNotesText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [singleStatus, setSingleStatus] = useState("");
  const [notesStatus, setNotesStatus] = useState("");
  const [outStatus, setOutStatus] = useState("");
  const [activePanel, setActivePanel] = useState("single");
  const [personaSlots, setPersonaSlots] = useState(() => createDefaultSlots());
  const [slotIndex, setSlotIndex] = useState(0);
  const [modelsStatus, setModelsStatus] = useState("");
  const [notesStyle, setNotesStyle] = useState("outline");

  const isHttps = (typeof window !== "undefined" && window.location.protocol === "https:");

  const batchAbortRef = useRef(false);
  const downloadRef = useRef("");
  const statusTimerRef = useRef(null);

  const themeOverrides = useMemo(() => {
    try {
      return JSON.parse(themeOverridesInput || "{}");
    } catch (error) {
      return {};
    }
  }, [themeOverridesInput]);

  const extraHeadersObj = useMemo(() => parseJSONOrEmpty(extraHeadersInput), [
    extraHeadersInput,
  ]);

  const parsedStops = useMemo(
    () =>
      stopsInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [stopsInput],
  );

  const effectiveModel = useMemo(() => {
    const typed = customModel.trim();
    if (useCustomModel && typed) return typed;
    return selectedModel.trim();
  }, [useCustomModel, customModel, selectedModel]);

  const connectionSettings = useMemo(() => {
    const base = endpointBase.trim();
    const path = endpointPath.trim() || "/chat/completions";
    const url = completionsUrl.trim();
    const header = authHeader.trim();
    return {
      endpointBase: base,
      endpointPath: path,
      completionsUrl: url,
      authHeader: header,
      authPrefix,
      requiresApiKey: header.length > 0,
    };
  }, [endpointBase, endpointPath, completionsUrl, authHeader, authPrefix]);

  useEffect(() => {
    applyTheme(theme, themeOverrides);
    // apply font preset
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    if (root) {
      const families = FONT_MAP[fontPreset] || FONT_MAP.system;
      root.style.setProperty('--font-sans', families);
      // Keep monospace as-is unless explicitly selected
      if (fontPreset === 'mono') {
        root.style.setProperty('--font-mono', FONT_MAP.mono);
      }
    }
  }, [theme, themeOverrides, fontPreset]);

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      const raw = safeLocalStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const savedTheme =
        typeof saved.theme === "string" && THEMES[saved.theme]
          ? saved.theme
          : DEFAULT_THEME;
      setTheme(savedTheme);
      if (typeof saved.themeOverrides === "string")
        setThemeOverridesInput(saved.themeOverrides);
      if (typeof saved.setupOpen === "boolean") setSetupOpen(saved.setupOpen);
      if (typeof saved.providerPreset === "string")
        setProviderPreset(saved.providerPreset);
      if (typeof saved.endpointBase === "string")
        setEndpointBase(saved.endpointBase);
      if (typeof saved.endpointPath === "string")
        setEndpointPath(saved.endpointPath);
      if (typeof saved.completionsUrl === "string")
        setCompletionsUrl(saved.completionsUrl);
      if (typeof saved.authHeader === "string") setAuthHeader(saved.authHeader);
      if (typeof saved.authPrefix === "string") setAuthPrefix(saved.authPrefix);
      if (typeof saved.apiKey === "string") setApiKey(saved.apiKey);
      if (typeof saved.selectedModel === "string")
        setSelectedModel(saved.selectedModel);
      if (typeof saved.customModel === "string") setCustomModel(saved.customModel);
      if (typeof saved.useCustomModel === "boolean")
        setUseCustomModel(saved.useCustomModel);
      if (typeof saved.temperature === "number")
        setTemperature(saved.temperature);
      if (typeof saved.streamOption === "string")
        setStreamOption(saved.streamOption);
      if (typeof saved.extraHeadersInput === "string")
        setExtraHeadersInput(saved.extraHeadersInput);
      if (typeof saved.systemPrompt === "string")
        setSystemPrompt(saved.systemPrompt);
      if (typeof saved.stopsInput === "string") setStopsInput(saved.stopsInput);
      if (typeof saved.jsonUrl === "string") setJsonUrl(saved.jsonUrl);
      if (typeof saved.autoFetchJson === "string")
        setAutoFetchJson(saved.autoFetchJson);
      if (typeof saved.volumesInput === "string")
        setVolumesInput(saved.volumesInput);
      if (typeof saved.booksInput === "string") setBooksInput(saved.booksInput);
      if (typeof saved.startIndex === "number") setStartIndex(saved.startIndex);
      if (typeof saved.endIndex === "string") setEndIndex(saved.endIndex);
      if (typeof saved.ctxPairs === "number") setCtxPairs(saved.ctxPairs);
      if (typeof saved.activePanel === "string") {
        const stored = saved.activePanel;
        setActivePanel(stored === "batchPanel" ? "batch" : stored === "singlePanel" ? "single" : stored);
      }
    } catch (error) {
      console.error("Failed to load bible styler settings", error);
    }
  }, []);

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      const payload = {
        theme,
        themeOverrides: themeOverridesInput,
        setupOpen,
        providerPreset,
        endpointBase,
        endpointPath,
        completionsUrl,
        authHeader,
        authPrefix,
        apiKey,
        selectedModel,
        customModel,
        useCustomModel,
        temperature,
        streamOption,
        extraHeadersInput,
        systemPrompt,
        stopsInput,
        jsonUrl,
        autoFetchJson,
        volumesInput,
        booksInput,
        startIndex,
        endIndex,
        ctxPairs,
        activePanel,
      };
      safeLocalStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to persist bible styler settings", error);
    }
  }, [
    theme,
    themeOverridesInput,
    setupOpen,
    providerPreset,
    endpointBase,
    endpointPath,
    completionsUrl,
    authHeader,
    authPrefix,
    apiKey,
    selectedModel,
    customModel,
    useCustomModel,
    temperature,
    streamOption,
    extraHeadersInput,
    systemPrompt,
    stopsInput,
    jsonUrl,
    autoFetchJson,
    volumesInput,
    booksInput,
    startIndex,
    endIndex,
    ctxPairs,
    activePanel,
  ]);

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      const raw = safeLocalStorage.getItem(SLOTS_KEY);
      if (!raw) return;
      const slots = JSON.parse(raw);
      if (Array.isArray(slots) && slots.length === 5) {
        setPersonaSlots(
          slots.map((item) => ({
            name: String(item?.name || ""),
            prompt: String(item?.prompt || ""),
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load persona slots", error);
    }
  }, []);

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      safeLocalStorage.setItem(SLOTS_KEY, JSON.stringify(personaSlots));
    } catch (error) {
      console.error("Failed to persist persona slots", error);
    }
  }, [personaSlots]);

  const booksList = useMemo(() => {
    const unique = new Set(
      verses.map((item) => String(item.book_title || "").trim()).filter(Boolean),
    );
    return Array.from(unique);
  }, [verses]);

  useEffect(() => {
    if (!booksList.length) {
      setSelectedBook("");
      return;
    }
    if (!booksList.includes(selectedBook)) {
      setSelectedBook(booksList[0]);
    }
  }, [booksList, selectedBook]);

  const chaptersList = useMemo(() => {
    if (!selectedBook) return [];
    const filtered = verses.filter(
      (item) => String(item.book_title || "").trim() === selectedBook,
    );
    const unique = new Set(filtered.map((item) => Number(item.chapter_number)));
    return Array.from(unique).sort((a, b) => a - b);
  }, [verses, selectedBook]);

  useEffect(() => {
    if (!chaptersList.length) {
      setSelectedChapter("");
      return;
    }
    if (!chaptersList.includes(Number(selectedChapter))) {
      setSelectedChapter(String(chaptersList[0]));
    }
  }, [chaptersList, selectedChapter]);

  const versesList = useMemo(() => {
    if (!selectedBook || !selectedChapter) return [];
    const filtered = verses.filter(
      (item) =>
        String(item.book_title || "").trim() === selectedBook &&
        Number(item.chapter_number) === Number(selectedChapter),
    );
    const unique = new Set(filtered.map((item) => Number(item.verse_number)));
    return Array.from(unique).sort((a, b) => a - b);
  }, [verses, selectedBook, selectedChapter]);

  useEffect(() => {
    if (!versesList.length) {
      setSelectedVerse("");
      return;
    }
    if (!versesList.includes(Number(selectedVerse))) {
      setSelectedVerse(String(versesList[0]));
    }
  }, [versesList, selectedVerse]);

  const selectedVerseRow = useMemo(() => {
    if (!selectedBook || !selectedChapter || !selectedVerse) return "";
    const row = verses.find(
      (item) =>
        String(item.book_title || "").trim() === selectedBook &&
        Number(item.chapter_number) === Number(selectedChapter) &&
        Number(item.verse_number) === Number(selectedVerse),
    );
    return row ? String(row.scripture_text || "") : "";
  }, [verses, selectedBook, selectedChapter, selectedVerse]);
  const ensureConnectionConfigured = useCallback(() => {
    const model = effectiveModel;
    if (!model) throw new Error("Select a model or type a custom id.");
    if (!connectionSettings.completionsUrl && !connectionSettings.endpointBase) {
      throw new Error("Provide an API base or a full completions URL.");
    }
    if (connectionSettings.requiresApiKey && !apiKey.trim()) {
      throw new Error("API key required for this provider.");
    }
    return connectionSettings;
  }, [connectionSettings, apiKey, effectiveModel]);

  const runChat = useCallback(
    async ({ userPrompt, temperatureOverride }) => {
      const config = ensureConnectionConfigured();
      const target = resolveCompletionsTarget(config);
      const requestBody = {
        endpointBase: target.base,
        path: target.path,
        url: target.url,
        apiKey: apiKey || undefined,
        authHeader: config.authHeader || undefined,
        authPrefix: config.authPrefix || "",
        extraHeaders: extraHeadersObj,
        requestOverride: {
          model: effectiveModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: temperatureOverride ?? temperature,
          ...(parsedStops.length ? { stop: parsedStops } : {}),
        },
      };
      const response = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        let message = `LLM request failed (${response.status})`;
        try {
          const details = await response.json();
          if (details?.error) message = details.error;
        } catch (error) {}
        throw new Error(message);
      }
      const data = await response.json();
      return String(data?.text || "").trim();
    },
    [
      ensureConnectionConfigured,
      apiKey,
      extraHeadersObj,
      effectiveModel,
      systemPrompt,
      temperature,
      parsedStops,
    ],
  );

  const setStatus = useCallback((message) => {
    setStatusMessage(message);
  }, []);

  const setOutputStatus = useCallback((message) => {
    setOutStatus(message);
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
    if (message) {
      statusTimerRef.current = window.setTimeout(() => setOutStatus(""), 2500);
    }
  }, []);

  const handleFetchJson = useCallback(async () => {
    const url = jsonUrl.trim();
    if (!url) {
      setStatus("Enter a JSON URL first.");
      return;
    }
    try {
      setStatus("Fetching JSON ...");
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data) || !data.length) throw new Error("Expected JSON array with verses.");
      setVerses(data);
      setStatus(`Loaded ${data.length} records.`);
    } catch (error) {
      setStatus(`Failed to load JSON: ${error.message}`);
    }
  }, [jsonUrl, setStatus]);

  const handleJsonFile = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        setStatus("Reading file ...");
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data) || !data.length) throw new Error("Expected JSON array with verses.");
        setVerses(data);
        setStatus(`Loaded ${data.length} records from file.`);
      } catch (error) {
        setStatus(`Could not read JSON file: ${error.message}`);
      }
    },
    [setStatus],
  );

  const handleFetchModels = useCallback(async () => {
    try {
      setModelsStatus("Loading models ...");
      const base = completionsUrl.trim()
        ? completionsUrl.trim()
        : `${endpointBase.trim().replace(/\/$/, "")}/models`;
      const response = await fetch(base, {
        headers: {
          Accept: "application/json",
          ...(apiKey
            ? {
                Authorization: `${authPrefix || "Bearer "}${apiKey}`,
                "X-API-Key": apiKey,
              }
            : {}),
          ...extraHeadersObj,
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      let ids = [];
      if (Array.isArray(data?.data)) ids = data.data.map((item) => item.id || item.name).filter(Boolean);
      else if (Array.isArray(data?.models)) ids = data.models.map((item) => item.id || item.name).filter(Boolean);
      if (!ids.length) throw new Error("No models returned.");
      setModelOptions(ids);
      if (!ids.includes(effectiveModel)) setSelectedModel(ids[0]);
      setModelsStatus(`Loaded ${ids.length}`);
    } catch (error) {
      setModelsStatus(`Failed: ${error.message}`);
    }
  }, [
    completionsUrl,
    endpointBase,
    apiKey,
    authPrefix,
    extraHeadersObj,
    effectiveModel,
  ]);

  const handleVendorPreset = useCallback((id) => {
    setProviderPreset(id);
    const preset = VENDOR_PRESETS.find((item) => item.id === id);
    if (!preset || preset.isCustom) return;
    const values = preset.values || {};
    if (values.endpointBase !== undefined) setEndpointBase(values.endpointBase);
    if (values.endpointPath !== undefined) setEndpointPath(values.endpointPath);
    if (values.completionsUrl !== undefined) setCompletionsUrl(values.completionsUrl);
    if (values.authHeader !== undefined) setAuthHeader(values.authHeader);
    if (values.authPrefix !== undefined) setAuthPrefix(values.authPrefix);
    if (values.model) setSelectedModel(values.model);
    setModelsStatus("Preset applied");
  }, []);

  const copyOutput = useCallback(async () => {
    const text = outputText.trim();
    if (!text) {
      setOutputStatus("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setOutputStatus("Copied to clipboard");
    } catch (error) {
      setOutputStatus("Copy failed");
    }
  }, [outputText, setOutputStatus]);

  const downloadOutput = useCallback(() => {
    const text = (downloadRef.current || outputText).trim();
    if (!text) {
      setOutputStatus("Nothing to download");
      return;
    }
    const blob = new Blob([text + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "styled_bible.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    setOutputStatus("Download started");
  }, [outputText, setOutputStatus]);

  const handleSaveSlot = useCallback(() => {
    const idx = Number(slotIndex) || 0;
    const current = personaSlots[idx];
    const suggestion = current?.name || systemPrompt.split("\n")[0]?.slice(0, 48) || `Persona ${idx + 1}`;
    const name =
      typeof window === "undefined"
        ? suggestion
        : window.prompt("Name for this slot:", suggestion) || suggestion;
    const next = [...personaSlots];
    next[idx] = { name: name.trim(), prompt: systemPrompt };
    setPersonaSlots(next);
  }, [personaSlots, slotIndex, systemPrompt]);

  const handleLoadSlot = useCallback(() => {
    const idx = Number(slotIndex) || 0;
    const slot = personaSlots[idx];
    if (!slot || !slot.prompt) {
      if (typeof window !== "undefined") window.alert("Slot is empty");
      return;
    }
    setSystemPrompt(slot.prompt);
  }, [personaSlots, slotIndex]);

  const handleRenameSlot = useCallback(() => {
    const idx = Number(slotIndex) || 0;
    const slot = personaSlots[idx];
    if (!slot) return;
    const name =
      typeof window === "undefined"
        ? slot.name
        : window.prompt("New name:", slot.name || `Persona ${idx + 1}`);
    if (name == null) return;
    const next = [...personaSlots];
    next[idx] = { ...slot, name: name.trim() };
    setPersonaSlots(next);
  }, [personaSlots, slotIndex]);

  const handleClearSlot = useCallback(() => {
    const idx = Number(slotIndex) || 0;
    const slot = personaSlots[idx];
    const label = slot?.name || `Persona ${idx + 1}`;
    const confirmClear =
      typeof window === "undefined"
        ? true
        : window.confirm(`Clear saved slot "${label}"? This cannot be undone.`);
    if (!confirmClear) return;
    const next = [...personaSlots];
    next[idx] = { name: "", prompt: "" };
    setPersonaSlots(next);
  }, [personaSlots, slotIndex]);

  const setPanel = useCallback((panel) => {
    setActivePanel(panel);
  }, []);

  const ensureJsonLoaded = useCallback(() => {
    if (!verses.length) throw new Error("Load a scripture JSON source first.");
  }, [verses.length]);
  const runSingle = useCallback(async () => {
    try {
      ensureJsonLoaded();
      setSingleStatus("Running ...");
      const book = selectedBook;
      const chapterNum = Number(selectedChapter);
      const verseNum = Number(selectedVerse);
      if (!book || !chapterNum || !verseNum) throw new Error("Select book, chapter, and verse.");
      const src = singleOverride.trim() || selectedVerseRow;
      if (!src) throw new Error("No verse text found. Provide override or load JSON.");
      const prompt = `Reference: ${refString(book, chapterNum, verseNum)}\nText: \"${normalizeAscii(src)}\"`;
      const expectedPrefix = `[${refString(book, chapterNum, verseNum)}]`;
      let raw = await runChat({ userPrompt: prompt });
      let line = postprocessLine(raw, expectedPrefix);
      if (!bodyOk(line, expectedPrefix)) {
        raw = await runChat({
          userPrompt: prompt,
          temperatureOverride: Math.max(1, temperature),
        });
        line = postprocessLine(raw, expectedPrefix);
      }
      setOutputText(line + "\n");
      downloadRef.current = line + "\n";
      setSingleStatus("Done.");
    } catch (error) {
      setSingleStatus(`Error: ${error.message}`);
    }
  }, [
    ensureJsonLoaded,
    selectedBook,
    selectedChapter,
    selectedVerse,
    singleOverride,
    selectedVerseRow,
    runChat,
    temperature,
  ]);

  const runChapter = useCallback(async () => {
    try {
      ensureJsonLoaded();
      setSingleStatus("Running chapter ...");
      const book = selectedBook;
      const chapterNum = Number(selectedChapter);
      if (!book || !chapterNum) throw new Error("Select book and chapter.");
      const chapterRows = verses
        .filter(
          (item) =>
            String(item.book_title || "").trim() === book &&
            Number(item.chapter_number) === chapterNum,
        )
        .sort((a, b) => Number(a.verse_number) - Number(b.verse_number));
      if (!chapterRows.length) throw new Error("No verses for this chapter.");
      const ctxWindow = Math.max(0, Number(ctxPairs) || 0);
      const history = [];
      let collected = "";
      for (let index = 0; index < chapterRows.length; index += 1) {
        const row = chapterRows[index];
        const verseNum = Number(row.verse_number);
        const src = String(row.scripture_text || "");
        const prompt = `Reference: ${refString(book, chapterNum, verseNum)}\nText: \"${normalizeAscii(src)}\"`;
        const expectedPrefix = `[${refString(book, chapterNum, verseNum)}]`;
        setSingleStatus(`Verse ${index + 1} / ${chapterRows.length}`);
        let raw = await runChat({ userPrompt: prompt });
        let line = postprocessLine(raw, expectedPrefix);
        if (!bodyOk(line, expectedPrefix)) {
          raw = await runChat({
            userPrompt: prompt,
            temperatureOverride: Math.max(1, temperature),
          });
          line = postprocessLine(raw, expectedPrefix);
        }
        const recentAssistant = history
          .filter((entry) => entry.role === "assistant")
          .map((entry) => entry.content);
        const recentStarts = new Set(
          recentAssistant.map((entry) => openingNgram((entry.split("]", 1)[1] || ""))),
        );
        const thisStart = openingNgram((line.split("]", 1)[1] || ""));
        if (ctxWindow > 0 && recentStarts.has(thisStart)) {
          raw = await runChat({
            userPrompt: prompt,
            temperatureOverride: Math.max(1.05, temperature + 0.1),
          });
          const alt = postprocessLine(raw, expectedPrefix);
          if (bodyOk(alt, expectedPrefix)) line = alt;
        }
        history.push({ role: "user", content: prompt });
        history.push({ role: "assistant", content: line });
        if (history.length > ctxWindow * 2) history.splice(0, history.length - ctxWindow * 2);
        collected += line + "\n";
        setOutputText((prev) => prev + line + "\n");
        await new Promise((resolve) => setTimeout(resolve, 35));
      }
      downloadRef.current = collected;
      setSingleStatus("Done.");
    } catch (error) {
      setSingleStatus(`Error: ${error.message}`);
    }
  }, [ensureJsonLoaded, selectedBook, selectedChapter, verses, ctxPairs, runChat, temperature]);

  const runBatch = useCallback(async () => {
    try {
      ensureJsonLoaded();
      batchAbortRef.current = false;
      downloadRef.current = "";
      setOutputText("");
      setStatus("Starting batch ...");
      const volumes = parseList(volumesInput);
      const books = parseList(booksInput);
      const filtered = filterVerses(verses, volumes, books);
      if (!filtered.length) throw new Error("Filter removed all verses.");
      const start = Math.max(0, Number(startIndex) || 0);
      const end = endIndex ? Math.min(Number(endIndex), filtered.length) : filtered.length;
      const history = [];
      const ctxWindow = Math.max(0, Number(ctxPairs) || 0);
      let collected = "";
      for (let index = start; index < end; index += 1) {
        if (batchAbortRef.current) break;
        const row = filtered[index];
        const book = String(row.book_title || "");
        const chapterNum = Number(row.chapter_number);
        const verseNum = Number(row.verse_number);
        const src = String(row.scripture_text || "");
        setStatus(`Verse ${index + 1 - start} / ${end - start}`);
        const prompt = `Reference: ${refString(book, chapterNum, verseNum)}\nText: \"${normalizeAscii(src)}\"`;
        const expectedPrefix = `[${refString(book, chapterNum, verseNum)}]`;
        let raw = await runChat({ userPrompt: prompt });
        let line = postprocessLine(raw, expectedPrefix);
        if (!bodyOk(line, expectedPrefix)) {
          raw = await runChat({
            userPrompt: prompt,
            temperatureOverride: Math.max(1, temperature),
          });
          line = postprocessLine(raw, expectedPrefix);
        }
        const recentAssistant = history
          .filter((entry) => entry.role === "assistant")
          .map((entry) => entry.content);
        const recentStarts = new Set(
          recentAssistant.map((entry) => openingNgram((entry.split("]", 1)[1] || ""))),
        );
        const thisStart = openingNgram((line.split("]", 1)[1] || ""));
        if (ctxWindow > 0 && recentStarts.has(thisStart)) {
          raw = await runChat({
            userPrompt: prompt,
            temperatureOverride: Math.max(1.05, temperature + 0.1),
          });
          const alt = postprocessLine(raw, expectedPrefix);
          if (bodyOk(alt, expectedPrefix)) line = alt;
        }
        history.push({ role: "user", content: prompt });
        history.push({ role: "assistant", content: line });
        if (history.length > ctxWindow * 2) history.splice(0, history.length - ctxWindow * 2);
        collected += line + "\n";
        setOutputText((prev) => prev + line + "\n");
        await new Promise((resolve) => setTimeout(resolve, 35));
      }
      downloadRef.current = collected;
      setStatus(batchAbortRef.current ? "Stopped." : "Batch complete.");
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  }, [
    ensureJsonLoaded,
    volumesInput,
    booksInput,
    verses,
    startIndex,
    endIndex,
    ctxPairs,
    runChat,
    temperature,
    setStatus,
  ]);

  const stopBatch = useCallback(() => {
    batchAbortRef.current = true;
  }, []);

  const maybeAutoFetch = useCallback(async () => {
    if (autoFetchJson !== "true") return;
    if (!jsonUrl.trim()) return;
    await handleFetchJson();
  }, [autoFetchJson, jsonUrl, handleFetchJson]);

  useEffect(() => {
    maybeAutoFetch();
  }, [maybeAutoFetch]);
  
  // Shared LLM caller for features beyond restyling
  const callLLM = useLLMCaller({
    ensureConnectionConfigured,
    apiKey,
    extraHeadersObj,
    effectiveModel,
    temperature,
  });

  const NOTES_PRESETS = {
    outline:
      "Produce concise study notes with the following markdown sections: Summary, Literary Context, Historical/Cultural Context, Cross-References (list key passages with brief phrases), Themes, Key Terms, Application Ideas, Questions for Reflection. Remain non-sectarian and acknowledge uncertainty when relevant.",
    exegetical:
      "Create verse-by-verse exegetical notes. For each reference, give: Translation observations (if any), Key terms, Immediate context, Cross-references, Interpretive options, and a 1-sentence takeaway.",
    sermon:
      "Draft sermon-prep notes: Big Idea, Supporting Movements (2–4), Illustrations/analogies suggestions, Cross-References, Application, Call to Action. Warm, accessible tone.",
    youth:
      "Write youth-friendly notes: Short Summary, What's Happening, Why It Matters, Cross-References, Try This, Discussion Questions (3). Simple language, no slang.",
    academic:
      "Provide academic-style notes with citations where possible: Literary form/genre, Intertextual links, Historical-critical background, Semantic range of key terms (high-level), Interpretive debates, Bibliography suggestions (placeholder if unknown).",
  };

  const generateNotes = useCallback(async () => {
    try {
      setNotesStatus("Generating notes ...");
      const passage = (outputText || "").trim();
      if (!passage) throw new Error("No styled output to analyze. Run single or chapter first.");
      const style = NOTES_PRESETS[notesStyle] || NOTES_PRESETS.outline;
      const system = `You are Scripture Buddy, a neutral multi-tradition study assistant. You write clear, reliable notes for passages from any scripture tradition. Avoid dogma; cite cross-references by canonical name when apparent, otherwise suggest likely parallels. Maintain respect across faiths.`;
      const user = `Passage (may contain [Book C:V] markers):\n\n${passage}\n\nInstructions: ${style}`;
      const text = await callLLM({ system, userPrompt: user, temperatureOverride: Math.min(0.7, Math.max(0.2, Number(temperature) || 0.4)) });
      setNotesText(text);
      setNotesStatus("Done.");
    } catch (error) {
      setNotesStatus(`Error: ${error.message}`);
    }
  }, [outputText, notesStyle, callLLM, temperature]);

  const copyNotes = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(notesText || "");
      setOutStatus("Notes copied");
      window.setTimeout(() => setOutStatus(""), 1600);
    } catch (error) {}
  }, [notesText]);

  const downloadNotes = useCallback(() => {
    const text = notesText || "";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
    a.download = "study-notes.md";
    a.click();
  }, [notesText]);

  const clearAll = useCallback(() => {
    setOutputText("");
    setNotesText("");
    setOutStatus("Cleared");
    downloadRef.current = "";
    window.setTimeout(() => setOutStatus(""), 1200);
  }, []);
  const surpriseTheme = useCallback(() => {
    const keys = Object.keys(THEMES);
    if (!keys.length) return;
    const next = keys[Math.floor(Math.random() * keys.length)];
    setTheme(THEMES[next] ? next : DEFAULT_THEME);
  }, [setTheme]);

  return (
    <div className="sb-shell">
      <style jsx global>{`
        :root {
          --bg: #0b0f14;
          --bg-elev: #0f172a;
          --bg-input: #0b1220;
          --border: #1e293b;
          --border-strong: #334155;
          --text: #e5e7eb;
          --text-muted: #94a3b8;
          --accent: #38bdf8;
          --accent-2: #22d3ee;
          --danger: #f43f5e;
          --ok: #34d399;
          --term: #a7f3d0;
          --term-bg: #071019;
          --focus: 0 0 0 3px rgba(56, 189, 248, 0.35);
          --radius: 10px;
          --shadow-1: 0 10px 30px rgba(0,0,0,0.45);
          --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
          --font-sans: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          --btn-bg: var(--accent);
          --btn-bg-2: var(--accent-2);
          --btn-fg: #001018;
          --btn-secondary-fg: var(--text);
          --btn-danger-top: #fb7185;
          --btn-danger-bg: var(--danger);
          --btn-danger-fg: #1b0310;
          --btn-ok-top: #6ee7b7;
          --btn-ok-bg: var(--ok);
          --btn-ok-fg: #032018;
          --btn-py: 6px;
          --btn-px: 10px;
          --btn-font: 13px;
          --btn-min-h: 34px;
          --btn-radius: 8px;
          --btn-neutral-bg: #4b5563;
          --btn-neutral-bg-2: #374151;
          --btn-neutral-fg: #f3f4f6;
          --btn-neutral-border: #6b7280;
          --link: #16a34a;
        }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 50; }
        .modal { width: 100%; max-width: 980px; max-height: 86vh; overflow: auto; background: var(--bg-elev); border: 1px solid var(--border-strong); border-radius: 14px; box-shadow: var(--shadow-1); padding: 18px; }
        .modal .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .modal .close { cursor: pointer; color: var(--text-muted); }
        body {
          background: var(--bg);
          color: var(--text);
          margin: 0;
          padding: 16px;
          padding-left: max(16px, env(safe-area-inset-left));
          padding-right: max(16px, env(safe-area-inset-right));
          padding-bottom: max(16px, env(safe-area-inset-bottom));
          font-family: var(--font-sans);
          -webkit-text-size-adjust: 100%;
        }
        h1 {
          margin: 0 0 12px 0;
          font-size: 20px;
          letter-spacing: 0.2px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 10px;
        }
        .row {
          grid-column: 1 / -1;
        }
        .card {
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px;
          background: var(--bg-elev);
          box-shadow: 0 1px 0 rgba(255,255,255,0.02) inset, 0 0 0 1px rgba(255,255,255,0.02);
        }
        .grid > * { min-width: 0; }
        label {
          font-size: 12px;
          display: block;
          margin-bottom: 6px;
          color: var(--text-muted);
        }
        input, textarea, select, button {
          font: inherit;
          color: inherit;
        }
        input, textarea, select {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 12px;
          border: 1px solid var(--border-strong);
          border-radius: 10px;
          background: var(--bg-input);
          color: var(--text);
          outline: none;
          transition: border-color 120ms ease, box-shadow 120ms ease, background 120ms ease;
          font-size: 16px;
          line-height: 1.2;
          -webkit-tap-highlight-color: rgba(0,0,0,0);
        }
        input::placeholder, textarea::placeholder { color: #6b7280; }
        input:focus, textarea:focus, select:focus {
          border-color: var(--accent);
          box-shadow: var(--focus);
        }
        textarea { min-height: 120px; resize: vertical; }
        .mono { font-family: var(--font-mono); }
        .btn {
          padding: var(--btn-py) var(--btn-px);
          border: 1px solid transparent;
          border-radius: var(--btn-radius);
          background: var(--accent);
          color: var(--btn-fg);
          cursor: pointer;
          font-weight: 600;
          transition: background 120ms ease, opacity 120ms ease, transform 60ms ease;
          user-select: none;
          min-height: var(--btn-min-h);
          font-size: var(--btn-font);
        }
        .btn:hover { filter: brightness(1.05); }
        .btn:active { transform: translateY(1px); }
        .btn.secondary {
          background: transparent;
          color: var(--btn-secondary-fg);
          border-color: var(--border-strong);
        }
        .btn.danger { background: var(--btn-danger-bg); color: var(--btn-danger-fg); }
        .btn.ok { background: var(--btn-ok-bg); color: var(--btn-ok-fg); }
        .btn.neutral { border-color: var(--btn-neutral-border); background: var(--btn-neutral-bg); color: var(--btn-neutral-fg); }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .inline {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .muted { color: var(--text-muted); font-size: 12px; }
        .out {
          white-space: pre-wrap;
          font-family: var(--font-mono);
          background: var(--term-bg);
          color: var(--term);
          padding: 14px;
          border-radius: 10px;
          min-height: 180px;
          border: 1px solid var(--border-strong);
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          background: var(--bg-input);
          color: var(--accent);
          border: 1px solid var(--accent-2);
          font-size: 11px;
          font-weight: 600;
        }
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .tab {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-strong);
          cursor: pointer;
          user-select: none;
          background: var(--bg-input);
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          color: var(--text);
        }
        .tab.active {
          border-color: var(--accent);
          box-shadow: var(--focus);
          background: var(--bg-elev);
        }
        a, a:visited { color: var(--link) !important; }
        a { text-decoration: none; }
        a:hover, a:focus { text-decoration: underline; }
        @media (max-width: 920px) {
          body { padding: 16px; }
          .grid { grid-template-columns: repeat(6, 1fr); gap: 10px; }
        }
        @media (max-width: 640px) {
          .grid { grid-template-columns: repeat(4, 1fr); gap: 8px; }
          .grid > * { grid-column: 1 / -1 !important; }
          .inline { gap: 6px; }
          label { margin-bottom: 4px; }
          input, textarea, select { font-size: 16px; }
          .btn { width: 100%; justify-content: center; }
        }
      `}</style>

      <h1>
        Scripture Buddy <span className="badge">{theme}</span>
      </h1>
      <div className="muted" style={{ margin: "6px 0 12px 0" }}>
        Scripture styling studio. Keys stay in your browser.
      </div>

      <div className="grid">
        <div className="row card" id="setupSummary">
          <div className="inline" style={{ justifyContent: "space-between", width: "100%" }}>
            <div className="inline">
              <button
                type="button"
                className="btn secondary"
                aria-expanded={setupOpen}
                onClick={() => setSetupOpen((prev) => !prev)}
              >
                Setup & Settings {setupOpen ? "▾" : "▸"}
              </button>
              <span className="muted">API, models, persona, data, options</span>
            </div>
            <div className="inline">
              <label htmlFor="theme-select" style={{ margin: 0 }}>Theme</label>
              <select
                id="theme-select"
                value={THEMES[theme] ? theme : DEFAULT_THEME}
                onChange={(event) => {
                  const next = event.target.value;
                  setTheme(THEMES[next] ? next : DEFAULT_THEME);
                }}
              >
                {THEME_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button type="button" className="btn secondary" onClick={surpriseTheme}>
                Surprise me
              </button>
              <label htmlFor="font-select" style={{ margin: 0 }}>Font</label>
              <select
                id="font-select"
                value={fontPreset}
                onChange={(e) => setFontPreset(e.target.value)}
              >
                {FONT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {setupOpen && (
          <div className="modal-overlay" onClick={() => setSetupOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div style={{fontWeight:600}}>API Setup</div>
                <button className="btn secondary" onClick={() => setSetupOpen(false)}>Close</button>
              </div>
              <div className="row card" id="setupApiCard" style={{ boxShadow: 'none' }}>
                <div className="grid">
                <div style={{ gridColumn: "span 4" }}>
                  <label htmlFor="vendor">Vendor preset</label>
                  <select
                    id="vendor"
                    value={providerPreset}
                    onChange={(event) => handleVendorPreset(event.target.value)}
                  >
                    {VENDOR_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "span 5" }}>
                  <label htmlFor="apiBase">API base</label>
                  <input
                    id="apiBase"
                    value={endpointBase}
                    onChange={(event) => setEndpointBase(event.target.value)}
                    placeholder="https://api.openai.com/v1"
                    spellCheck={false}
                  />
                  <div className="muted">
                    Leave empty if using a full chat completions URL.
                  </div>
                </div>
                <div style={{ gridColumn: "span 3" }}>
                  <label>Fetch models</label>
                  <div className="inline">
                    <button type="button" className="btn secondary" onClick={handleFetchModels}>
                      Fetch
                    </button>
                    <span className="muted" aria-live="polite">
                      {modelsStatus}
                    </span>
                  </div>
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <label htmlFor="apiKey">API key</label>
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="sk-..."
                    autoComplete="off"
                  />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <label htmlFor="themeOverrides">Theme overrides (JSON)</label>
                  <textarea
                    id="themeOverrides"
                    className="mono"
                    value={themeOverridesInput}
                    onChange={(event) => setThemeOverridesInput(event.target.value)}
                    placeholder='{"--accent":"#22d3ee","--bg":"#0b0f14"}'
                  />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <label htmlFor="modelSelect">Model</label>
                  <select
                    id="modelSelect"
                    value={selectedModel}
                    onChange={(event) => setSelectedModel(event.target.value)}
                    disabled={useCustomModel}
                  >
                    {modelOptions.map((modelId) => (
                      <option key={modelId} value={modelId}>
                        {modelId}
                      </option>
                    ))}
                  </select>
                  <input
                    id="modelText"
                    style={{ marginTop: 8, display: useCustomModel ? "block" : "none" }}
                    value={customModel}
                    onChange={(event) => setCustomModel(event.target.value)}
                    placeholder="type a model id..."
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <div className="inline" style={{ marginTop: 6 }}>
                    <input
                      id="customModelToggle"
                      type="checkbox"
                      style={{ width: "auto" }}
                      checked={useCustomModel}
                      onChange={(event) => setUseCustomModel(event.target.checked)}
                    />
                    <label htmlFor="customModelToggle" style={{ margin: 0 }}>
                      type custom
                    </label>
                  </div>
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <label htmlFor="temperature">Temperature</label>
                  <input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={temperature}
                    onChange={(event) => setTemperature(Number(event.target.value) || 0)}
                  />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <label htmlFor="stream">Stream tokens</label>
                  <select
                    id="stream"
                    value={streamOption}
                    onChange={(event) => setStreamOption(event.target.value)}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </div>

                <div style={{ gridColumn: "span 9" }}>
                  <label htmlFor="extraHeaders">Extra headers (JSON)</label>
                  <textarea
                    id="extraHeaders"
                    className="mono"
                    value={extraHeadersInput}
                    onChange={(event) => setExtraHeadersInput(event.target.value)}
                    placeholder='{"HTTP-Referer":"https://your.site","X-Title":"Scripture Buddy"}'
                  />
                </div>

                <div style={{ gridColumn: "span 12" }}>
                  <label htmlFor="systemPrompt">Style system prompt</label>
                  <textarea
                    id="systemPrompt"
                    className="mono"
                    value={systemPrompt}
                    onChange={(event) => setSystemPrompt(event.target.value)}
                  />
                </div>

                <div style={{ gridColumn: "span 12" }}>
                  <div className="grid">
                    <div style={{ gridColumn: "span 6" }}>
                      <label htmlFor="presetSelect">Built-in presets</label>
                      <div className="inline">
                        <select
                          id="presetSelect"
                          value={Object.entries(PERSONA_PRESETS).find(([_, text]) => text === systemPrompt)?.[0] || "stoner"}
                          onChange={(event) => setSystemPrompt(PERSONA_PRESETS[event.target.value] || PERSONA_PRESETS.stoner)}
                        >
                          {Object.keys(PERSONA_PRESETS).map((key) => (
                            <option key={key} value={key}>
                              {key}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ gridColumn: "span 6" }}>
                      <label>Saved persona slots (local to this browser)</label>
                      <div className="inline">
                        <select
                          id="slotSelect"
                          value={slotIndex}
                          onChange={(event) => setSlotIndex(event.target.value)}
                        >
                          {personaSlots.map((slot, index) => (
                            <option key={index} value={index}>
                              {slot.name ? `Slot ${index + 1}: ${slot.name}` : `Slot ${index + 1}: (empty)`}
                            </option>
                          ))}
                        </select>
                        <button type="button" className="btn" onClick={handleSaveSlot}>
                          Save to slot
                        </button>
                        <button type="button" className="btn secondary" onClick={handleLoadSlot}>
                          Load slot
                        </button>
                        <button type="button" className="btn secondary" onClick={handleRenameSlot}>
                          Rename
                        </button>
                        <button type="button" className="btn danger" onClick={handleClearSlot}>
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ gridColumn: "span 12" }}>
                  <label htmlFor="stops">Stops (comma separated)</label>
                  <input
                    id="stops"
                    value={stopsInput}
                    onChange={(event) => setStopsInput(event.target.value)}
                  />
                </div>
              </div>
              <div className="muted">Do not commit keys. This page saves to localStorage on this device only.</div>
            </div>

            {isHttps && (
              <div className="row card" id="httpsWarn" style={{ boxShadow: 'none' }}>
                Heads up ... this page is HTTPS. Calls to http://localhost are often blocked by browsers. Prefer an HTTPS API endpoint or test locally over http.
              </div>
            )}

            <div className="row card" id="setupDataCard" style={{ boxShadow: 'none' }}>
              <div className="grid">
                <div style={{ gridColumn: "span 8" }}>
                  <label htmlFor="jsonPreset">Default sources</label>
                  <select
                    id="jsonPreset"
                    value={DEFAULT_JSON_SOURCES.find((item) => item.url === jsonUrl)?.url || ""}
                    onChange={(event) => {
                      const src = DEFAULT_JSON_SOURCES.find((item) => item.url === event.target.value);
                      if (src) setJsonUrl(src.url);
                    }}
                  >
                    {DEFAULT_JSON_SOURCES.map((item) => (
                      <option key={item.label} value={item.url}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "span 8" }}>
                  <label htmlFor="jsonUrl">Scripture JSON URL</label>
                  <input
                    id="jsonUrl"
                    className="mono"
                    value={jsonUrl}
                    onChange={(event) => setJsonUrl(event.target.value)}
                    spellCheck={false}
                  />
                </div>
                <div style={{ gridColumn: "span 4" }}>
                  <label>Load JSON</label>
                  <div className="inline">
                    <button type="button" className="btn secondary" onClick={handleFetchJson}>
                      Fetch
                    </button>
                    <input id="jsonFile" type="file" accept=".json" onChange={handleJsonFile} />
                  </div>
                </div>
                <div style={{ gridColumn: "span 4" }}>
                  <label htmlFor="autoFetchJson">Auto-fetch JSON on load</label>
                  <select
                    id="autoFetchJson"
                    value={autoFetchJson}
                    onChange={(event) => setAutoFetchJson(event.target.value)}
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <label htmlFor="volumes">Include volumes</label>
                  <input
                    id="volumes"
                    value={volumesInput}
                    onChange={(event) => setVolumesInput(event.target.value)}
                    placeholder="Old Testament,New Testament"
                  />
                </div>
                <div style={{ gridColumn: "span 6" }}>
                  <label htmlFor="books">Limit to books (optional)</label>
                  <input
                    id="books"
                    value={booksInput}
                    onChange={(event) => setBooksInput(event.target.value)}
                    placeholder="Genesis,Exodus"
                  />
                </div>
                <div style={{ gridColumn: "span 4" }}>
                  <label htmlFor="startIndex">Start index</label>
                  <input
                    id="startIndex"
                    type="number"
                    min="0"
                    value={startIndex}
                    onChange={(event) => setStartIndex(Number(event.target.value) || 0)}
                  />
                </div>
                <div style={{ gridColumn: "span 4" }}>
                  <label htmlFor="endIndex">End before index (optional)</label>
                  <input
                    id="endIndex"
                    type="number"
                    min="0"
                    value={endIndex}
                    onChange={(event) => setEndIndex(event.target.value)}
                  />
                </div>
                <div style={{ gridColumn: "span 4" }}>
                  <label htmlFor="ctxPairs">Context pairs memory</label>
                  <input
                    id="ctxPairs"
                    type="number"
                    min="0"
                    value={ctxPairs}
                    onChange={(event) => setCtxPairs(Number(event.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="muted">JSON must be an array with keys ... book_title, chapter_number, verse_number, scripture_text.</div>
            </div>
          </div>
        </div>
        )}

        <div className="row card">
          <div className="tabs">
            <div
              className={`tab ${activePanel === "batch" ? "active" : ""}`}
              data-panel="batch"
              tabIndex={0}
              onClick={() => setPanel("batch")}
            >
              Batch mode
            </div>
            <div
              className={`tab ${activePanel === "single" ? "active" : ""}`}
              data-panel="single"
              tabIndex={0}
              onClick={() => setPanel("single")}
            >
              Single verse/chapter
            </div>
          </div>

          {activePanel === "batch" ? (
            <div id="batchPanel" style={{ display: "block" }}>
              <div className="inline" style={{ marginBottom: 8 }}>
                <button type="button" className="btn" onClick={runBatch}>
                  Start
                </button>
                <button type="button" className="btn danger" onClick={stopBatch}>
                  Stop
                </button>
                <button type="button" className="btn secondary" onClick={downloadOutput}>
                  Download .txt
                </button>
              </div>
              <div id="status" className="muted" style={{ marginTop: 8 }} aria-live="polite">
                {statusMessage}
              </div>
            </div>
          ) : (
            <div id="singlePanel" style={{ display: "block" }}>
              <div className="grid" style={{ marginBottom: 8 }}>
                <div style={{ gridColumn: "span 4" }}>
                  <label htmlFor="bookSel">Book</label>
                  <select
                    id="bookSel"
                    value={selectedBook}
                    onChange={(event) => setSelectedBook(event.target.value)}
                  >
                    {booksList.map((book) => (
                      <option key={book} value={book}>
                        {book}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "span 4" }}>
                  <label htmlFor="chapterSel">Chapter</label>
                  <select
                    id="chapterSel"
                    value={selectedChapter}
                    onChange={(event) => setSelectedChapter(event.target.value)}
                  >
                    {chaptersList.map((chapter) => (
                      <option key={chapter} value={chapter}>
                        {chapter}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "span 4" }}>
                  <label htmlFor="verseSel">Verse</label>
                  <select
                    id="verseSel"
                    value={selectedVerse}
                    onChange={(event) => setSelectedVerse(event.target.value)}
                  >
                    {versesList.map((verseNumber) => (
                      <option key={verseNumber} value={verseNumber}>
                        {verseNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "span 12" }}>
                  <label htmlFor="singleText">Text override (optional)</label>
                  <textarea
                    id="singleText"
                    className="mono"
                    placeholder={selectedVerseRow ? `Leave empty to use JSON text: ${selectedVerseRow}` : "Leave empty to use text from JSON"}
                    value={singleOverride}
                    onChange={(event) => setSingleOverride(event.target.value)}
                  />
                </div>
              </div>
              <div className="inline" style={{ marginBottom: 8 }}>
                <button type="button" className="btn ok" onClick={runSingle}>
                  Run single verse
                </button>
                <button type="button" className="btn neutral" onClick={runChapter}>
                  Run chapter
                </button>
              </div>
              <div id="singleStatus" className="muted" aria-live="polite">
                {singleStatus}
              </div>
            </div>
          )}
        </div>

        <div className="row card">
          <label>Output</label>
          <div className="inline" style={{ margin: "8px 0" }}>
            <button type="button" className="btn secondary" onClick={copyOutput}>
              Copy output
            </button>
            <button type="button" className="btn neutral" onClick={downloadOutput}>
              Download .txt
            </button>
            <button type="button" className="btn danger" onClick={clearAll}>
              Clear
            </button>
            <span id="outStatus" className="muted" aria-live="polite">
              {outStatus}
            </span>
          </div>
          <div id="out" className="out">
            {outputText || "Output will appear here."}
          </div>
        </div>

        <div className="row card">
          <label>Study Notes</label>
          <div className="grid" style={{ margin: "8px 0" }}>
            <div style={{ gridColumn: "span 6" }}>
              <label htmlFor="notesStyle">Notes preset</label>
              <select id="notesStyle" value={notesStyle} onChange={(e) => setNotesStyle(e.target.value)}>
                <option value="outline">Concise outline</option>
                <option value="exegetical">Exegetical (verse-by-verse)</option>
                <option value="sermon">Sermon prep</option>
                <option value="youth">Youth-friendly</option>
                <option value="academic">Academic</option>
              </select>
            </div>
          </div>
          <div className="inline" style={{ margin: "8px 0" }}>
            <button type="button" className="btn ok" onClick={generateNotes}>
              Generate notes
            </button>
            <button type="button" className="btn secondary" onClick={copyNotes}>
              Copy
            </button>
            <button type="button" className="btn neutral" onClick={downloadNotes}>
              Download .md
            </button>
            <span className="muted" aria-live="polite">{notesStatus}</span>
          </div>
          <div id="notes" className="out" style={{ whiteSpace: 'pre-wrap' }}>
            {notesText || "Click Generate to create study notes for the current output."}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Page;
