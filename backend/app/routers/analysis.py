from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from .auth import current_user
from ..services.pattern_engine import analyze_observations, weekly_delta
from ..services.ai_provider import generate_insight, ai_configured
from ..services.safety import detect_emergency, EMERGENCY_MESSAGE, validate_ai_output
from ..services.learn_data import LEARN_TOPICS

router = APIRouter(tags=["analysis"])

def _obs_dicts(user_id: int, db: Session):
    rows = db.query(models.Observation).filter(models.Observation.user_id == user_id).order_by(models.Observation.observed_at.asc()).all()
    return [{"signal": r.signal, "category": r.category, "severity": r.severity,
             "impact": r.impact, "note": r.note, "observed_at": r.observed_at} for r in rows]

@router.post("/analysis")
async def run_analysis(db: Session = Depends(get_db), user=Depends(current_user)):
    obs = _obs_dicts(user.id, db)
    analysis = analyze_observations(obs)
    analysis["week"] = weekly_delta(obs)
    emergency = any(detect_emergency((o.get("signal") or "") + " " + (o.get("note") or "")) for o in obs)
    payload, mode = await generate_insight(analysis, emergency)
    payload, _ = validate_ai_output(payload)
    if emergency and not payload.get("safety_message"):
        payload["safety_message"] = EMERGENCY_MESSAGE
    rec = models.Insight(user_id=user.id, payload={**payload, "_analysis": analysis}, pattern_strength=analysis["pattern_strength"], demo_mode=mode)
    db.add(rec); db.commit(); db.refresh(rec)
    return {"id": rec.id, "payload": payload, "analysis": analysis, "demo_mode": mode,
            "ai_configured": ai_configured(), "created_at": rec.created_at}

@router.get("/insights")
def list_insights(db: Session = Depends(get_db), user=Depends(current_user)):
    rows = db.query(models.Insight).filter(models.Insight.user_id == user.id).order_by(models.Insight.created_at.desc()).limit(10).all()
    return [{"id": r.id, "payload": r.payload, "pattern_strength": r.pattern_strength, "demo_mode": r.demo_mode, "created_at": r.created_at} for r in rows]

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user=Depends(current_user)):
    obs = _obs_dicts(user.id, db)
    analysis = analyze_observations(obs)
    checks = db.query(models.CheckIn).filter(models.CheckIn.user_id == user.id).count()
    days = len({str(o.get("observed_at"))[:10] for o in obs})
    latest = db.query(models.Insight).filter(models.Insight.user_id == user.id).order_by(models.Insight.created_at.desc()).first()
    return {"pattern_strength": analysis["pattern_strength"],
            "observations": len(obs), "days_tracked": days, "check_ins": checks,
            "emerging_patterns": len([f for f in analysis["features"] if f["pattern_strength"] >= 40]),
            "top_signals": analysis["features"][:5], "correlations": analysis["correlations"][:5],
            "week": weekly_delta(obs), "latest_insight": latest.payload if latest else None,
            "demo_mode": latest.demo_mode if latest else ("live" if ai_configured() else "fallback")}

@router.get("/learn")
def learn():
    return LEARN_TOPICS

@router.post("/reports")
def create_report(db: Session = Depends(get_db), user=Depends(current_user)):
    obs = _obs_dicts(user.id, db)
    analysis = analyze_observations(obs)
    latest = db.query(models.Insight).filter(models.Insight.user_id == user.id).order_by(models.Insight.created_at.desc()).first()
    payload = (latest.payload if latest else {})
    lines = ["# NeuroLens — Health Summary (Educational, Not a Diagnosis)", "",
             "AI-generated educational summary — not a medical diagnosis.", "",
             f"Observations: {len(obs)} | Pattern strength: {analysis['pattern_strength']}/100", "",
             "## Observation timeline"]
    for o in obs[-20:]:
        lines.append(f"- {str(o.get('observed_at'))[:10]} · {o.get('signal')} ({o.get('category')}, {o.get('severity')}, impact {o.get('impact')}/3)")
    lines += ["", "## Key patterns"]
    for f in analysis["features"][:3]:
        lines.append(f"- {f['signal']}: {f['frequency']}x over {f['persistence_days']}d, trend {f['trend']}")
    lines += ["", "## Questions to discuss with a clinician"]
    for q in payload.get("questions_for_clinician", [])[:5]:
        lines.append(f"- {q}")
    md = "\n".join(lines)
    r = models.Report(user_id=user.id, title="Health Summary", content_markdown=md)
    db.add(r); db.commit(); db.refresh(r)
    return {"id": r.id, "content_markdown": md, "created_at": r.created_at}

@router.get("/reports")
def list_reports(db: Session = Depends(get_db), user=Depends(current_user)):
    rows = db.query(models.Report).filter(models.Report.user_id == user.id).order_by(models.Report.created_at.desc()).limit(10).all()
    return [{"id": r.id, "title": r.title, "content_markdown": r.content_markdown, "created_at": r.created_at} for r in rows]

@router.delete("/user/data")
def delete_data(db: Session = Depends(get_db), user=Depends(current_user)):
    for m in [models.Observation, models.CheckIn, models.ExerciseResult, models.Insight, models.Report]:
        db.query(m).filter(m.user_id == user.id).delete()
    db.commit()
    return {"deleted": True}

@router.get("/user/export")
def export_data(db: Session = Depends(get_db), user=Depends(current_user)):
    return {"observations": _obs_dicts(user.id, db),
            "check_ins": [{"focus": c.focus, "sleep": c.sleep, "difficulty": c.difficulty, "day_impact": c.day_impact, "created_at": str(c.created_at)} for c in db.query(models.CheckIn).filter(models.CheckIn.user_id == user.id).all()],
            "notice": "Educational data export — not a medical record."}
