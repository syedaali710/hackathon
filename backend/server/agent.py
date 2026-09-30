"""
CareBridge UAE agent runtime (local).

A real LLM tool-use loop that stands in for the Bedrock AgentCore Runtime. It
loads the project's system prompt, exposes the 6 CareBridge tools to the model,
runs the tool loop, and returns the assistant reply plus a structured activity
trace the dashboard renders (events, tool latencies, providers, booking,
summary).

Provider is auto-detected from environment:
  - ANTHROPIC_API_KEY  -> Anthropic Claude   (default for this project)
  - OPENAI_API_KEY     -> OpenAI

Model can be overridden with CAREBRIDGE_MODEL.
"""
import json
import os
import time
from typing import Any, Callable, Dict, List, Tuple

import tools as T
from guardrails import SAFETY_LINE

_HERE = os.path.dirname(os.path.abspath(__file__))
_SYSTEM_PROMPT_FILE = os.path.normpath(os.path.join(_HERE, "..", "agent", "system-prompt.txt"))

DEFAULT_PATIENT_ID = "P001"  # "Gary" in the dashboard

# Tool name -> (callable, dashboard activity event or None)
_TOOL_IMPL: Dict[str, Tuple[Callable[..., Dict[str, Any]], str | None]] = {
    "retrieve_guidance": (T.retrieve_guidance, "TRIAGE_GUIDANCE_RETRIEVED"),
    "get_patient_profile": (T.get_patient_profile, "RELEVANT_CONTEXT_RETRIEVED"),
    "check_medication_interactions": (T.check_medication_interactions, "MEDICATION_REFERENCE_CHECKED"),
    "search_providers": (T.search_providers, "PROVIDER_OPTIONS_FOUND"),
    "book_appointment": (T.book_appointment, "MOCK_BOOKING_CONFIRMED"),
    "generate_visit_summary": (T.generate_visit_summary, "VISIT_SUMMARY_GENERATED"),
}

# JSON-schema tool definitions (shared shape; adapted per provider).
_TOOL_SCHEMAS = [
    {
        "name": "retrieve_guidance",
        "description": "Retrieve approved triage/referral guidance for a described concern. Call this first for any symptom navigation.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "Short description of the concern, no PHI."}},
            "required": ["query"],
        },
    },
    {
        "name": "get_patient_profile",
        "description": "Retrieve the minimum-necessary synthetic patient context (medications, allergies, ongoing history). Requires consent.",
        "input_schema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string", "description": f"Patient id, default {DEFAULT_PATIENT_ID}."},
                "context_type": {"type": "string", "enum": ["relevant", "medications", "allergies", "history", "all"]},
            },
            "required": ["patient_id"],
        },
    },
    {
        "name": "check_medication_interactions",
        "description": "Flag medication-reference notes for a clinician/pharmacist. Never advises changing medication.",
        "input_schema": {
            "type": "object",
            "properties": {"medications": {"type": "array", "items": {"type": "string"}}},
            "required": ["medications"],
        },
    },
    {
        "name": "search_providers",
        "description": "Search mock providers by specialty (e.g. Neurology) and location (e.g. Dubai).",
        "input_schema": {
            "type": "object",
            "properties": {
                "specialty": {"type": "string"},
                "location": {"type": "string"},
                "language": {"type": "string"},
            },
            "required": ["specialty"],
        },
    },
    {
        "name": "book_appointment",
        "description": "Create a MOCK booking. Only call with user_confirmed=true after the user has explicitly confirmed a specific provider.",
        "input_schema": {
            "type": "object",
            "properties": {
                "provider_id": {"type": "string"},
                "patient_id": {"type": "string"},
                "date": {"type": "string"},
                "time": {"type": "string"},
                "user_confirmed": {"type": "boolean"},
            },
            "required": ["provider_id", "patient_id", "user_confirmed"],
        },
    },
    {
        "name": "generate_visit_summary",
        "description": "Generate the bilingual (EN clinician + AR patient) handoff after a booking is confirmed and consent approved.",
        "input_schema": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "string"},
                "symptoms": {"type": "string"},
                "duration": {"type": "string"},
                "language_preference": {"type": "string"},
            },
            "required": ["patient_id", "symptoms"],
        },
    },
]


def load_system_prompt(lang: str = "en") -> str:
    try:
        with open(_SYSTEM_PROMPT_FILE, "r", encoding="utf-8") as fh:
            base = fh.read()
    except OSError:
        base = "You are CareBridge UAE, a safety-first healthcare navigation agent."
    lang_line = (
        "Reply in Arabic (RTL)." if lang == "ar" else "Reply in English."
    )
    return (
        base
        + "\n\nOperating context:\n"
        + f"- The current synthetic patient is '{DEFAULT_PATIENT_ID}' (Gary). Use this patient_id.\n"
        + "- Keep replies concise (2-5 sentences). Use the tools; do not invent provider or booking data.\n"
        + "- Always include a brief 'not medical advice' note when giving navigation guidance.\n"
        + f"- {lang_line}\n"
    )


# --------------------------------------------------------------------------
# Provider detection
# --------------------------------------------------------------------------
def detect_provider() -> str | None:
    if os.getenv("ANTHROPIC_API_KEY"):
        return "anthropic"
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    return None


def default_model(provider: str) -> str:
    override = os.getenv("CAREBRIDGE_MODEL")
    if override:
        return override
    return "claude-3-5-sonnet-latest" if provider == "anthropic" else "gpt-4o-mini"


def _run_tool(name: str, args: Dict[str, Any], trace: List[Dict[str, Any]], events: Dict[str, str]) -> Dict[str, Any]:
    impl, event = _TOOL_IMPL[name]
    started = time.perf_counter()
    try:
        result = impl(**args)
        ok = True
    except T.ToolError as exc:
        result = {"error": str(exc), **exc.extra}
        ok = False
    took_ms = round((time.perf_counter() - started) * 1000)
    trace.append({"fn": name, "args": _redact(args), "ms": took_ms, "ok": ok})
    if ok and event:
        events[event] = "done"
    return result


def _redact(args: Dict[str, Any]) -> str:
    """Render tool args for the trace, masking health content."""
    safe = {}
    for k, v in args.items():
        if k in ("symptoms", "medications", "duration", "query"):
            safe[k] = "•••"
        else:
            safe[k] = v
    return ", ".join(f"{k}={json.dumps(v, ensure_ascii=False)}" for k, v in safe.items())


def _harvest(name: str, result: Dict[str, Any], out: Dict[str, Any]) -> None:
    """Pull structured payloads the dashboard renders directly."""
    if name == "search_providers" and result.get("providers"):
        out["providers"] = result["providers"]
    elif name == "book_appointment" and result.get("booking_confirmed"):
        out["booking"] = result
    elif name == "generate_visit_summary" and result.get("care_snapshot"):
        out["summary"] = result


# --------------------------------------------------------------------------
# Anthropic loop
# --------------------------------------------------------------------------
def _run_anthropic(messages: List[Dict[str, Any]], system: str, model: str,
                   trace: List[Dict[str, Any]], events: Dict[str, str], out: Dict[str, Any]) -> str:
    from anthropic import Anthropic

    client = Anthropic()
    convo = list(messages)
    for _ in range(8):  # cap tool-use turns
        resp = client.messages.create(
            model=model, max_tokens=1024, system=system, tools=_TOOL_SCHEMAS, messages=convo,
        )
        if resp.stop_reason != "tool_use":
            return "".join(b.text for b in resp.content if b.type == "text").strip()

        convo.append({"role": "assistant", "content": [b.model_dump() for b in resp.content]})
        tool_results = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            result = _run_tool(block.name, dict(block.input), trace, events)
            _harvest(block.name, result, out)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": json.dumps(result, ensure_ascii=False),
            })
        convo.append({"role": "user", "content": tool_results})
    return "I've gathered what I can. Please review the options above. " + SAFETY_LINE


# --------------------------------------------------------------------------
# OpenAI loop
# --------------------------------------------------------------------------
def _openai_tools() -> List[Dict[str, Any]]:
    return [
        {"type": "function", "function": {"name": t["name"], "description": t["description"],
                                          "parameters": t["input_schema"]}}
        for t in _TOOL_SCHEMAS
    ]


def _run_openai(messages: List[Dict[str, Any]], system: str, model: str,
                trace: List[Dict[str, Any]], events: Dict[str, str], out: Dict[str, Any]) -> str:
    from openai import OpenAI

    client = OpenAI()
    convo = [{"role": "system", "content": system}] + messages
    oa_tools = _openai_tools()
    for _ in range(8):
        resp = client.chat.completions.create(model=model, messages=convo, tools=oa_tools)
        msg = resp.choices[0].message
        if not msg.tool_calls:
            return (msg.content or "").strip()
        convo.append(msg.model_dump(exclude_none=True))
        for call in msg.tool_calls:
            args = json.loads(call.function.arguments or "{}")
            result = _run_tool(call.function.name, args, trace, events)
            _harvest(call.function.name, result, out)
            convo.append({
                "role": "tool", "tool_call_id": call.id,
                "content": json.dumps(result, ensure_ascii=False),
            })
    return "I've gathered what I can. Please review the options above. " + SAFETY_LINE


# --------------------------------------------------------------------------
# Public entry point
# --------------------------------------------------------------------------
def run_agent(user_message: str, history: List[Dict[str, str]] | None = None, lang: str = "en") -> Dict[str, Any]:
    """
    Run one turn. `history` is a list of {"role": "user"|"assistant", "content": str}.
    Returns {reply, provider, model, events, trace, providers?, booking?, summary?}.
    """
    provider = detect_provider()
    trace: List[Dict[str, Any]] = []
    events: Dict[str, str] = {}
    out: Dict[str, Any] = {}

    if not provider:
        return {
            "reply": (
                "The live agent isn't configured yet — add an ANTHROPIC_API_KEY (or OPENAI_API_KEY) "
                "to backend/server/.env and restart the server. The scripted scenarios and tools still work. "
                + SAFETY_LINE
            ),
            "provider": None, "model": None, "events": events, "trace": trace, "no_key": True,
        }

    model = default_model(provider)
    system = load_system_prompt(lang)
    messages = [{"role": m["role"], "content": m["content"]} for m in (history or [])]
    messages.append({"role": "user", "content": user_message})

    if provider == "anthropic":
        reply = _run_anthropic(messages, system, model, trace, events, out)
    else:
        reply = _run_openai(messages, system, model, trace, events, out)

    return {"reply": reply, "provider": provider, "model": model,
            "events": events, "trace": trace, **out}
