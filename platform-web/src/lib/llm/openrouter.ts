import "server-only";

/**
 * Minimal OpenRouter client (OpenAI-compatible chat completions).
 *
 * Open-source / free-tier first: defaults to free models, configurable via env,
 * and swappable to paid models later by changing OPENROUTER_MODEL. Keeping this
 * in Next.js means the AI features run on Vercel with no separately-hosted
 * backend (the thing that was breaking screening/interviews in production).
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// Free models on OpenRouter (no spend). First that succeeds wins.
const DEFAULT_MODELS = [
  "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
];

function models(): string[] {
  const env = process.env.OPENROUTER_MODEL?.trim();
  if (env) return [env, ...DEFAULT_MODELS.filter((m) => m !== env)];
  return DEFAULT_MODELS;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class LLMUnavailableError extends Error {}

/** Raw chat completion. Tries each candidate model until one responds. */
export async function chat(
  messages: ChatMessage[],
  opts: { temperature?: number; jsonMode?: boolean; maxTokens?: number } = {}
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new LLMUnavailableError("OPENROUTER_API_KEY is not set");

  let lastErr: unknown = null;
  for (const model of models()) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          // Optional attribution headers (recommended by OpenRouter).
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://recruitai-test.vercel.app",
          "X-Title": "ReCruItAI",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxTokens ?? 2000,
          ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (!res.ok) {
        lastErr = new Error(`OpenRouter ${model} -> ${res.status} ${await res.text().catch(() => "")}`.slice(0, 500));
        continue;
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.trim()) return content;
      lastErr = new Error(`OpenRouter ${model} returned empty content`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new LLMUnavailableError(
    `All OpenRouter models failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
  );
}

/** Extracts the first balanced JSON object/array from a string (handles ```json fences). */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  if (start === -1) return body.trim();
  // Walk to the matching closing bracket.
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return body.slice(start, i + 1);
    }
  }
  return body.slice(start).trim();
}

/** Chat completion that must return JSON; parses defensively. */
export async function chatJSON<T = unknown>(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<T> {
  const raw = await chat(messages, { ...opts, jsonMode: true });
  try {
    return JSON.parse(raw) as T;
  } catch {
    return JSON.parse(extractJson(raw)) as T;
  }
}
