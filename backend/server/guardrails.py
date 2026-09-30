"""
Lightweight guardrail layer for the local server.

Bedrock Guardrails aren't available without AWS, so this reproduces the intent
of `backend/agent/guardrails-config.json` as a pre/post filter around the LLM:
detect denied-topic requests (diagnosis, medication, dosing, treatment change)
and prompt-injection attempts, so the agent can refuse safely and consistently
even before/around the model call.
"""
import json
import os
import re
from functools import lru_cache
from typing import Dict, Optional

_HERE = os.path.dirname(os.path.abspath(__file__))
_CONFIG = os.path.normpath(os.path.join(_HERE, "..", "agent", "guardrails-config.json"))

# Intent → canonical refusal key the frontend already knows how to render.
_DENY_PATTERNS = {
    "dose": re.compile(
        r"(dose|dosage|how much .*(take|mg)|how many (tablets|pills)|mg\b|milligram|"
        r"double .*(dose|medication)|increase .*dose|جرعة|ملغ)",
        re.IGNORECASE,
    ),
    "prescribe": re.compile(
        r"(what (medication|medicine|drug) should i (take|use)|which (medication|medicine)|"
        r"prescribe|recommend .*(medication|medicine|drug|antibiotic)|should i take \w+|"
        r"أي دواء|ما الدواء|وصف)",
        re.IGNORECASE,
    ),
    "dx": re.compile(
        r"(diagnos|what('?s| is) wrong with me|do i have|is (this|it) (a |an )?"
        r"(migraine|stroke|diabetes|cancer|tumou?r|infection)|what('?s| is) causing|"
        r"تشخيص|هل (أعاني|لدي)|سكتة|صداع نصفي)",
        re.IGNORECASE,
    ),
    "treatment": re.compile(
        r"(should i (get|have) (surgery|an? (mri|ct|scan))|start (physical )?therapy|"
        r"stop (taking )?my (medication|medicine)|what treatment)",
        re.IGNORECASE,
    ),
}

_PROMPT_ATTACK = re.compile(
    r"(ignore (all |your )?(previous|prior) instructions|disregard the (system|rules)|"
    r"you are now|pretend to be|reveal your (system )?prompt|jailbreak)",
    re.IGNORECASE,
)

SAFETY_LINE = (
    "This is not medical advice. If symptoms suddenly get worse, call 998 or go to the "
    "nearest emergency department."
)


@lru_cache(maxsize=1)
def config() -> Dict:
    try:
        with open(_CONFIG, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except OSError:
        return {}


def screen_input(text: str) -> Optional[Dict[str, str]]:
    """
    Return a guardrail hit for a user message, or None if it's allowed.

    A hit is {"type": <deny|refused|attack>, "reason": <intent>} where `reason`
    is one of: dose, prescribe, dx, treatment, attack. `dose`/`prescribe`/
    `treatment` collapse to the frontend's "dose" refusal copy; `dx` to "dx".
    """
    if not text:
        return None
    if _PROMPT_ATTACK.search(text):
        return {"type": "attack", "reason": "attack"}
    for intent, pattern in _DENY_PATTERNS.items():
        if pattern.search(text):
            return {"type": "deny", "reason": intent}
    return None


def refusal_key(reason: str) -> str:
    """Map a guardrail reason to the dashboard's refusal copy key."""
    return "dx" if reason == "dx" else "dose"
