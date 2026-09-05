"""Safety layer: emergency detection + AI output validation."""
import re

EMERGENCY_PATTERNS = [
    r"suicid", r"self[- ]?harm", r"kill myself", r"end my life",
    r"stroke", r"can't move one side", r"facial droop", r"slurred speech",
    r"chest pain", r"can't breathe", r"difficulty breathing",
    r"seizure", r"blacked out", r"lost consciousness", r"severe head injury",
    r"sudden (worst|severe) headache", r"thoughts of harming",
]
EMERGENCY_RE = re.compile("|".join(EMERGENCY_PATTERNS), re.IGNORECASE)

BANNED_DIAGNOSIS_RE = re.compile(
    r"\byou have (alzheimer|dementia|adhd|parkinson|brain tumor|multiple sclerosis|epilepsy|depression|anxiety disorder)\b",
    re.IGNORECASE,
)
CERTAINTY_RE = re.compile(r"\b(100% certain|definitely (have|diagnos)|confirmed diagnosis)\b", re.IGNORECASE)
MEDICATION_RE = re.compile(r"\b(take|start|stop|increase|decrease).{0,30}(mg|dose|medication|antidepressant|stimulant)\b", re.IGNORECASE)

SAFETY_FALLBACK = {
    "summary": "Your observations show some recurring patterns worth monitoring and discussing with a healthcare professional.",
    "patterns": [],
    "possible_context": ["Sleep disruption", "Stress", "Medications", "Lifestyle factors", "Other health factors"],
    "questions_for_clinician": [
        "What information about these observations would be most useful to track?",
        "Are there everyday factors that could be contributing?",
        "When should I follow up about these patterns?",
    ],
    "monitoring_suggestions": ["Sleep quality", "Focus and concentration", "Daily functioning impact"],
    "uncertainty": "This analysis is based only on self-reported observations and cannot establish a medical diagnosis.",
    "safety_message": None,
}

EMERGENCY_MESSAGE = (
    "Some symptoms can require urgent medical attention. If you believe you may be "
    "experiencing a medical emergency, contact your local emergency service or seek immediate medical care."
)


def detect_emergency(text: str) -> bool:
    return bool(text and EMERGENCY_RE.search(text))


def validate_ai_output(payload: dict) -> tuple[dict, bool]:
    """Returns (safe_payload, was_replaced). Replaces unsafe output with fallback."""
    try:
        blob = " ".join([
            str(payload.get("summary", "")),
            str(payload.get("uncertainty", "")),
            " ".join(str(x) for x in payload.get("patterns", [])),
        ])
        if BANNED_DIAGNOSIS_RE.search(blob) or CERTAINTY_RE.search(blob) or MEDICATION_RE.search(blob):
            fb = dict(SAFETY_FALLBACK)
            fb["patterns"] = payload.get("patterns", [])[:3] if isinstance(payload.get("patterns"), list) else []
            return fb, True
        # ensure required keys
        for k in ["summary", "patterns", "possible_context", "questions_for_clinician",
                  "monitoring_suggestions", "uncertainty"]:
            if k not in payload:
                return {**SAFETY_FALLBACK, **payload}, True
        return payload, False
    except Exception:
        return dict(SAFETY_FALLBACK), True
