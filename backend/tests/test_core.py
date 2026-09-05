from app.services.pattern_engine import analyze_observations
from app.services.safety import detect_emergency, validate_ai_output
from app.schemas import ObservationIn

def _obs(sig="Focus difficulty", cat="cognitive", sev="moderate", imp=2, days_ago=0):
    from datetime import datetime, timedelta, timezone
    return {"signal": sig, "category": cat, "severity": sev, "impact": imp,
            "observed_at": datetime.now(timezone.utc) - timedelta(days=days_ago)}

def test_pattern_strength_rises_with_frequency():
    one = analyze_observations([_obs(days_ago=1)])
    many = analyze_observations([_obs(days_ago=d) for d in range(6)])
    assert many["pattern_strength"] >= one["pattern_strength"]
    assert many["features"][0]["frequency"] == 6

def test_trend_detection():
    obs = [_obs(sev="mild", days_ago=5), _obs(sev="mild", days_ago=4),
           _obs(sev="strong", days_ago=1), _obs(sev="strong", days_ago=0)]
    a = analyze_observations(obs)
    assert a["features"][0]["trend"] == "rising"

def test_observation_validation():
    try:
        ObservationIn(signal="x", category="nope", severity="mild")
        assert False, "should raise"
    except Exception:
        assert True

def test_emergency_detection():
    assert detect_emergency("I have slurred speech and facial droop") is True
    assert detect_emergency("mild headache yesterday") is False

def test_ai_output_validation_rejects_diagnosis():
    bad = {"summary": "You have Alzheimer's.", "patterns": [], "possible_context": [],
           "questions_for_clinician": [], "monitoring_suggestions": [], "uncertainty": "none"}
    safe, replaced = validate_ai_output(bad)
    assert replaced is True
    assert "alzheimer" not in safe["summary"].lower()
