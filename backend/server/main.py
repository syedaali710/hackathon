"""
CareBridge UAE — local FastAPI server.

Runs the CareBridge tools and a real LLM agent locally (no AWS required) so the
React dashboard can talk to a live backend.

Run:
    cd backend/server
    pip install -r requirements.txt
    cp .env.example .env   # add your ANTHROPIC_API_KEY (or OPENAI_API_KEY)
    uvicorn main:app --reload --port 8000
"""
import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()  # read backend/server/.env before anything else

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel  # noqa: E402

import tools as T  # noqa: E402
from agent import detect_provider, default_model, run_agent  # noqa: E402
from guardrails import screen_input, refusal_key  # noqa: E402

app = FastAPI(title="CareBridge UAE — Local API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # local dev only
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
# Health
# --------------------------------------------------------------------------
@app.get("/api/health")
def health() -> Dict[str, Any]:
    provider = detect_provider()
    return {
        "status": "ok",
        "service": "carebridge-uae-local",
        "llm_configured": provider is not None,
        "llm_provider": provider,
        "llm_model": default_model(provider) if provider else None,
    }


# --------------------------------------------------------------------------
# Direct tool endpoints (used by the dashboard's scripted flows)
# --------------------------------------------------------------------------
class ToolRequest(BaseModel):
    args: Dict[str, Any] = {}


_TOOLS = {
    "retrieve_guidance": T.retrieve_guidance,
    "get_patient_profile": T.get_patient_profile,
    "check_medication_interactions": T.check_medication_interactions,
    "search_providers": T.search_providers,
    "book_appointment": T.book_appointment,
    "generate_visit_summary": T.generate_visit_summary,
}


@app.post("/api/tools/{tool_name}")
def call_tool(tool_name: str, req: ToolRequest) -> Dict[str, Any]:
    fn = _TOOLS.get(tool_name)
    if not fn:
        raise HTTPException(status_code=404, detail=f"Unknown tool: {tool_name}")
    try:
        return fn(**req.args)
    except T.ToolError as exc:
        raise HTTPException(status_code=exc.status, detail={"error": str(exc), **exc.extra})
    except TypeError as exc:
        raise HTTPException(status_code=400, detail={"error": f"Bad arguments: {exc}"})


# --------------------------------------------------------------------------
# Chat (real LLM agent + guardrails)
# --------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    lang: str = "en"


@app.post("/api/chat")
def chat(req: ChatRequest) -> Dict[str, Any]:
    # Guardrail pre-screen: refuse denied topics before hitting the model.
    hit = screen_input(req.message)
    if hit and hit["type"] in ("deny", "attack"):
        reason = hit["reason"]
        return {
            "reply": None,
            "guardrail": True,
            "route": "refused",
            "refusal_key": refusal_key(reason) if hit["type"] == "deny" else "dx",
            "reason": reason,
            "events": {},
            "trace": [{"fn": "guardrail / policy", "args": f"denied topic: {reason} → refused", "ms": 0, "cls": "block"}],
        }

    history = [m.model_dump() for m in req.history]
    result = run_agent(req.message, history=history, lang=req.lang)
    return result


# --------------------------------------------------------------------------
# Serve the built frontend (production / Docker). In local dev this directory
# doesn't exist and Vite serves the UI instead, proxying /api here.
# Mounted last so the /api routes above always take precedence.
# --------------------------------------------------------------------------
_STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.isdir(_STATIC_DIR):
    from fastapi.staticfiles import StaticFiles

    app.mount("/", StaticFiles(directory=_STATIC_DIR, html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)
