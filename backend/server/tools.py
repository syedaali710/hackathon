"""
CareBridge UAE tools (local port of the 5 Lambda handlers).

Each function mirrors the behaviour of its Lambda counterpart in
`backend/lambda/*/handler.py`, but reads from local JSON instead of DynamoDB /
Bedrock so the stack runs with no AWS dependency. Return values are the parsed
tool result (i.e. what the Lambda put in `body`), never an HTTP envelope.

The same functions back both the direct `/api/tools/*` endpoints and the
Claude tool-use loop in `agent.py`.
"""
import random
import string
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from data_store import base_providers, get_patient, ui_providers


class ToolError(Exception):
    """Raised for invalid tool input; carries an HTTP-ish status code."""

    def __init__(self, message: str, status: int = 400, extra: Dict[str, Any] | None = None):
        super().__init__(message)
        self.status = status
        self.extra = extra or {}


# --------------------------------------------------------------------------
# 1. Patient context  (lambda/patient-context)
# --------------------------------------------------------------------------
def get_patient_profile(patient_id: str, context_type: str = "relevant") -> Dict[str, Any]:
    if not patient_id:
        raise ToolError("patient_id is required")

    patient = get_patient(patient_id)
    if not patient:
        raise ToolError("Patient not found", status=404)

    if context_type == "medications":
        result = {"patient_id": patient_id, "current_medications": patient.get("current_medications", [])}
    elif context_type == "allergies":
        result = {"patient_id": patient_id, "allergies": patient.get("allergies", [])}
    elif context_type == "history":
        result = {"patient_id": patient_id, "medical_history": patient.get("medical_history", [])}
    elif context_type in ("relevant", "all"):
        result = {
            "patient_id": patient_id,
            "age": patient.get("age"),
            "language_preference": patient.get("language_preference"),
            "current_medications": patient.get("current_medications", []),
            "allergies": patient.get("allergies", []),
            "relevant_history": [
                h for h in patient.get("medical_history", []) if h.get("status") == "ongoing"
            ],
        }
    else:
        raise ToolError("Invalid context_type")

    return {
        "patient_context": result,
        "data_minimization": "Only minimum necessary information returned",
        "consent_required": True,
    }


# --------------------------------------------------------------------------
# 2. Medication reference check  (lambda/medication-interaction)
#    KB is unavailable locally, so we use a small curated reference table that
#    reproduces the demo's NSAID + antihypertensive flag.
# --------------------------------------------------------------------------
_MED_REFERENCE = [
    {
        "pair": {"ibuprofen", "amlodipine"},
        "reference_information": (
            "NSAIDs such as ibuprofen may reduce the blood-pressure-lowering effect of "
            "antihypertensives including amlodipine. Reference note for clinician / pharmacist "
            "review only."
        ),
        "relevance_score": 0.88,
    },
    {
        "pair": {"ibuprofen", "lisinopril"},
        "reference_information": (
            "NSAIDs such as ibuprofen may reduce the effect of ACE inhibitors such as lisinopril "
            "and affect kidney function. Reference note for clinician / pharmacist review only."
        ),
        "relevance_score": 0.86,
    },
]


def _med_name(m: Any) -> str:
    return (m.get("name") if isinstance(m, dict) else str(m)).strip().lower()


def check_medication_interactions(medications: List[Any]) -> Dict[str, Any]:
    if not medications:
        raise ToolError("medications list is required")

    names = {_med_name(m) for m in medications}
    interactions = [
        {"reference_information": ref["reference_information"], "relevance_score": ref["relevance_score"]}
        for ref in _MED_REFERENCE
        if ref["pair"].issubset(names)
    ]
    has_issues = len(interactions) > 0

    return {
        "checked_medications_count": len(medications),
        "has_potential_issues": has_issues,
        "clinical_review_recommended": has_issues,
        "reference_information": interactions[:3],
        "disclaimer": "This is reference information only. Discuss with clinician or pharmacist.",
        "safety_note": "Do not change medications without professional guidance",
    }


# --------------------------------------------------------------------------
# 3. Provider search  (lambda/provider-search)
#    Neurology in Dubai returns the bilingual UI seed; everything else falls
#    back to the shared dataset.
# --------------------------------------------------------------------------
def search_providers(
    specialty: str,
    location: str | None = None,
    language: str | None = None,
    availability_date: str | None = None,
) -> Dict[str, Any]:
    if not specialty:
        raise ToolError("specialty is required")

    spec = specialty.strip().lower()
    loc = (location or "").strip().lower()

    # Bilingual seed for the dashboard's primary scenario.
    if spec == "neurology" and (not loc or "dubai" in loc):
        providers = ui_providers()
        return {
            "search_criteria": {"specialty": specialty, "location": location or "Dubai", "language": language},
            "results_count": len(providers),
            "providers": providers,
            "disclaimer": "These are mock providers for prototype demonstration only",
            "next_step": "User must explicitly confirm appointment booking",
        }

    matching = [p for p in base_providers() if p.get("specialty", "").lower() == spec]
    if location:
        matching = [p for p in matching if loc in p.get("location", {}).get("emirate", "").lower()]
    if language:
        lang = language.lower()
        matching = [p for p in matching if lang in [x.lower() for x in p.get("languages", [])]]
    if availability_date:
        matching = [
            p for p in matching
            if any(s.get("date") == availability_date for s in p.get("availability", []))
        ]

    results = []
    for p in matching[:5]:
        results.append({
            "id": p.get("provider_id"),
            "provider_id": p.get("provider_id"),
            "name": p.get("name"),
            "doc": p.get("name"),
            "specialty": p.get("specialty"),
            "qualifications": p.get("qualifications", []),
            "languages": p.get("languages", []),
            "langs": ", ".join(p.get("languages", [])),
            "location": p.get("location", {}),
            "clinic": p.get("location", {}).get("clinic_name"),
            "area": p.get("location", {}).get("emirate"),
            "consultation_fee": p.get("consultation_fee"),
            "accepts_insurance": p.get("accepts_insurance"),
            "availability": p.get("availability", [])[:3],
        })

    return {
        "search_criteria": {"specialty": specialty, "location": location, "language": language},
        "results_count": len(results),
        "providers": results,
        "disclaimer": "These are mock providers for prototype demonstration only",
        "next_step": "User must explicitly confirm appointment booking",
    }


# --------------------------------------------------------------------------
# 4. Mock booking  (lambda/booking)  — requires explicit confirmation
# --------------------------------------------------------------------------
def book_appointment(
    provider_id: str,
    patient_id: str,
    date: str | None = None,
    time: str | None = None,
    user_confirmed: bool = False,
) -> Dict[str, Any]:
    if not all([provider_id, patient_id, date or time]):
        raise ToolError("provider_id, patient_id, and date/time are required")

    if not user_confirmed:
        raise ToolError(
            "Booking requires explicit user confirmation",
            status=403,
            extra={"action_required": "User must confirm appointment booking", "confirmation_needed": True},
        )

    # Short, demo-friendly reference (matches the dashboard's CB-#### style).
    booking_reference = "CB-" + str(4200 + random.randint(0, 699))
    return {
        "booking_confirmed": True,
        "booking_reference": booking_reference,
        "appointment_details": {"date": date, "time": time, "provider_id": provider_id},
        "next_steps": [
            "Review care snapshot and consent",
            "Receive bilingual handoff documents",
            "Attend appointment with handoff",
        ],
        "activity_event": "MOCK_BOOKING_CONFIRMED",
        "booking_timestamp": datetime.now(timezone.utc).isoformat(),
        "is_mock": True,
        "disclaimer": "This is a simulated booking. No real appointment has been scheduled.",
    }


# --------------------------------------------------------------------------
# 5. Visit summary  (lambda/visit-summary)  — bilingual handoff
# --------------------------------------------------------------------------
def generate_visit_summary(
    patient_id: str,
    symptoms: Any,
    duration: str = "",
    patient_context: Dict[str, Any] | None = None,
    medication_issues: List[Any] | None = None,
    appointment_details: Dict[str, Any] | None = None,
    language_preference: str = "english",
) -> Dict[str, Any]:
    if not patient_id or not symptoms:
        raise ToolError("patient_id and symptoms are required")

    patient_context = patient_context or {}
    medication_issues = medication_issues or []
    appointment_details = appointment_details or {}

    english_handoff = {
        "title": "Clinician Handoff — Prototype",
        "sections": {
            "reported_symptoms": {"symptoms": symptoms, "duration": duration},
            "patient_context": {
                "current_medications": patient_context.get("current_medications", []),
                "allergies": patient_context.get("allergies", []),
                "relevant_history": patient_context.get("relevant_history", []),
            },
            "medication_reference_items": medication_issues,
            "appointment_details": appointment_details,
            "patient_questions": [
                "What signs mean I should go to emergency care?",
                "Seeking guidance on symptom progression",
            ],
            "safety_note": (
                "This handoff was prepared by CareBridge UAE navigation support. It does not "
                "constitute a diagnosis or treatment plan. Clinical assessment required."
            ),
        },
    }

    arabic_handoff = {
        "title": "ملخص الزيارة للمريض ومقدم الرعاية",
        "rtl": True,
        "sections": {
            "الأعراض_المبلغ_عنها": {
                "الأعراض": symptoms if isinstance(symptoms, str) else "أعراض متعددة",
                "المدة": duration,
            },
            "موعد_الزيارة": {
                "التاريخ": appointment_details.get("date", "غير محدد"),
                "الوقت": appointment_details.get("time", "غير محدد"),
                "المزود": appointment_details.get("provider_id", "غير محدد"),
            },
            "ملاحظة_السلامة": (
                "كير بريدج الإمارات يدعم التنقل في الرعاية الصحية فقط. لا يقدم تشخيصًا طبيًا أو "
                "وصفات طبية أو توصيات علاجية."
            ),
            "في_حالة_تفاقم_الأعراض": "إذا تفاقمت الأعراض أو شعرت بالحاجة الملحة، اطلب الرعاية الطارئة فورًا.",
        },
    }

    care_snapshot = {
        "shared_information": {
            "symptoms_and_timeline": True,
            "current_medications": bool(patient_context.get("current_medications")),
            "allergies": bool(patient_context.get("allergies")),
            "relevant_history": bool(patient_context.get("relevant_history")),
            "medication_reference_questions": bool(medication_issues),
        },
        "not_shared_by_default": {
            "full_consultation_history": False,
            "full_family_history": False,
            "unrelated_notes": False,
        },
        "purpose": "This appointment only",
        "consent_required": True,
    }

    return {
        "care_snapshot": care_snapshot,
        "english_clinician_handoff": english_handoff,
        "arabic_patient_handoff": arabic_handoff,
        "activity_event": "VISIT_SUMMARY_GENERATED",
        "disclaimer": "Navigation support only; not a diagnosis or treatment plan",
    }


# --------------------------------------------------------------------------
# 6. Approved triage / referral guidance  (stands in for the Knowledge Base)
# --------------------------------------------------------------------------
_GUIDANCE = [
    {
        "topic": "headache_with_visual_change",
        "text": (
            "Headache accompanied by blurred vision lasting more than 24 hours, especially in a "
            "person with high blood pressure, should be assessed by a clinician within 24 hours "
            "(same day or next day). Route: routine urgent referral to Neurology."
        ),
        "red_flags": [
            "sudden severe ('worst ever') headache",
            "rapidly worsening vision",
            "one-sided weakness, numbness, or facial droop",
            "slurred speech or confusion",
            "fainting",
        ],
        "emergency_action": "Direct to emergency care (call 998). Do not offer routine booking.",
    }
]


def retrieve_guidance(query: str, num_results: int = 3) -> Dict[str, Any]:
    if not query:
        raise ToolError("query is required")
    return {
        "query": query,
        "results": _GUIDANCE[:num_results],
        "source": "Approved triage & referral guidance (curated reference)",
        "disclaimer": "Reference guidance only; not a diagnosis.",
    }
