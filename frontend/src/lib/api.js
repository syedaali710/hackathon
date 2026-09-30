/**
 * Backend client for the CareBridge UAE local server.
 * Requests go to `/api/*`, which Vite proxies to the FastAPI server (port 8000),
 * so there's no CORS to manage in dev.
 */
const BASE = import.meta.env.VITE_API_BASE || "";

export async function health() {
  const res = await fetch(`${BASE}/api/health`);
  if (!res.ok) throw new Error(`health ${res.status}`);
  return res.json();
}

/** Call one backend tool directly. Returns the parsed tool result. */
export async function callTool(name, args = {}) {
  const res = await fetch(`${BASE}/api/tools/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ args }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data && data.detail ? data.detail : { error: `tool ${res.status}` };
    return { ok: false, status: res.status, ...detail };
  }
  return data;
}

/** Send a free-text turn to the live LLM agent (with guardrails). */
export async function chat(message, history = [], lang = "en") {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, lang }),
  });
  if (!res.ok) throw new Error(`chat ${res.status}`);
  return res.json();
}
