"""AI provider abstraction: OpenAI-compatible API + deterministic fallback.

Env:
  AI_API_KEY, AI_BASE_URL (default https://api.openai.com/v1), AI_MODEL (default gpt-4o-mini)
If no key -> Demo Intelligence Mode (deterministic, realistic).
"""
import os, json
import httpx

SYSTEM_PROMPT = """You are NeuroLens, an educational health-awareness assistant. You NEVER diagnose disease, \
never name a specific disease as applying to the user, never prescribe medication, never claim certainty. \
Use plain friendly language. Always acknowledge uncertainty and encourage discussing patterns with a \
healthcare professional. Respond ONLY with valid JSON matching the requested schema."""

SCHEMA_HINT = """{"summary": str, "patterns": [{"title": str, "why_it_matters": str, "observed": str, "influences": [str]}], \
"possible_context": [str], "questions_for_clinician": [str], "monitoring_suggestions": [str], \
"uncertainty": str, "safety_message": str|null}"""


def ai_configured() -> bool:
    return bool(os.getenv("AI_API_KEY"))


def fallback_insight(analysis: dict, emergency: bool = False) -> dict:
    feats = analysis.get("features", [])[:3]
    top = feats[0] if feats else None
    corr = analysis.get("correlations", [])
    if top:
        corr_txt = f" The strongest pattern is {top['signal'].lower()} occurring alongside " + (
            top["correlated_with"][0].lower() if top.get("correlated_with") else "other observations") + "." \
            if feats else ""
        summary = (
            f"Several observations have appeared repeatedly over the last 14 days.{corr_txt} "
            f"This does not establish a cause — sleep disruption, stress, medications, lifestyle, "
            f"or other health factors can all contribute. The pattern may be useful to monitor and discuss."
        )
    else:
        summary = ("Not enough observations yet to identify a meaningful pattern. "
                   "Continue with daily check-ins and the timeline will update as you record more.")
    patterns = []
    for f in feats:
        patterns.append({
            "title": f"{f['signal']} — {f['trend']} trend",
            "why_it_matters": ("Repeated concentration difficulties can be worth monitoring when they persist "
                                "or interfere with daily activities." if "focus" in f["signal"].lower() or "concentrat" in f["signal"].lower()
                                else f"Repeated {f['signal'].lower()} observations can be worth monitoring when they persist or affect daily life."),
            "observed": f"{f['frequency']} observation(s) over {f['persistence_days']} day(s). Avg severity {f['severity_avg']}/3.",
            "influences": ["Sleep", "Stress", "Medication", "Lifestyle", "Other health factors"],
        })
    from .safety import EMERGENCY_MESSAGE
    return {
        "summary": summary,
        "patterns": patterns,
        "possible_context": ["Sleep disruption", "Stress", "Medications or recent changes in routine",
                             "Lifestyle factors (caffeine, screen time, exercise)", "Other health factors"],
        "questions_for_clinician": [
            "Which of these observations would be most useful for me to keep tracking?",
            "Could everyday factors like sleep or stress be contributing?",
            "What changes should prompt me to follow up sooner?",
        ],
        "monitoring_suggestions": ["Sleep quality and duration", "Focus and concentration", "Impact on daily activities"],
        "uncertainty": ("This analysis is based only on self-reported observations from the last 14 days "
                        "and cannot establish a medical diagnosis. A healthcare professional can help determine the cause."),
        "safety_message": EMERGENCY_MESSAGE if emergency else None,
    }


async def generate_insight(analysis: dict, emergency: bool = False) -> tuple[dict, str]:
    """Returns (payload, mode) where mode is 'live' or 'fallback'."""
    if not ai_configured():
        return fallback_insight(analysis, emergency), "fallback"
    try:
        base = os.getenv("AI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        model = os.getenv("AI_MODEL", "gpt-4o-mini")
        key = os.getenv("AI_API_KEY")
        user_msg = ("Deterministic analysis (Pattern Strength 0-100 = strength of pattern worth monitoring, "
                    f"NOT disease probability):\n{json.dumps(analysis)[:4000]}\n\n"
                    f"Return ONLY JSON with schema: {SCHEMA_HINT}")
        async with httpx.AsyncClient(timeout=25) as c:
            r = await c.post(f"{base}/chat/completions",
                             headers={"Authorization": f"Bearer {key}"},
                             json={"model": model, "temperature": 0.4, "max_tokens": 900,
                                   "messages": [{"role": "system", "content": SYSTEM_PROMPT},
                                                {"role": "user", "content": user_msg}],
                                   "response_format": {"type": "json_object"}})
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"]
            payload = json.loads(content)
            from .safety import validate_ai_output
            safe, _ = validate_ai_output(payload)
            return safe, "live"
    except Exception:
        return fallback_insight(analysis, emergency), "fallback"
