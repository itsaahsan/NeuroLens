from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from .auth import current_user
from ..services.safety import detect_emergency, EMERGENCY_MESSAGE

router = APIRouter(tags=["observations"])

@router.post("/observations", response_model=schemas.ObservationOut)
def create_obs(body: schemas.ObservationIn, db: Session = Depends(get_db), user=Depends(current_user)):
    o = models.Observation(user_id=user.id, signal=body.signal.strip(), category=body.category,
                           severity=body.severity, impact=body.impact, note=body.note or "",
                           observed_at=body.observed_at)
    db.add(o); db.commit(); db.refresh(o)
    return o

@router.get("/observations", response_model=list[schemas.ObservationOut])
def list_obs(db: Session = Depends(get_db), user=Depends(current_user)):
    return db.query(models.Observation).filter(models.Observation.user_id == user.id).order_by(models.Observation.observed_at.desc()).limit(200).all()

@router.post("/check-ins", response_model=schemas.CheckInOut)
def create_checkin(body: schemas.CheckInIn, db: Session = Depends(get_db), user=Depends(current_user)):
    c = models.CheckIn(user_id=user.id, **body.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    # mirror check-in into observations for timeline continuity
    mapping = []
    if body.focus == "worse": mapping.append(("Focus difficulty", "cognitive", "moderate"))
    if body.sleep == "poor": mapping.append(("Sleep disruption", "sleep", "moderate"))
    if body.difficulty == "yes": mapping.append(("Difficulty completing familiar tasks", "daily_functioning", "moderate"))
    for sig, cat, sev in mapping:
        db.add(models.Observation(user_id=user.id, signal=sig, category=cat, severity=sev, impact=2, note="From daily check-in"))
    db.commit()
    return c

@router.get("/check-ins", response_model=list[schemas.CheckInOut])
def list_checkins(db: Session = Depends(get_db), user=Depends(current_user)):
    return db.query(models.CheckIn).filter(models.CheckIn.user_id == user.id).order_by(models.CheckIn.created_at.desc()).limit(60).all()

@router.post("/exercises", response_model=schemas.ExerciseOut)
def save_exercise(body: schemas.ExerciseIn, db: Session = Depends(get_db), user=Depends(current_user)):
    e = models.ExerciseResult(user_id=user.id, kind=body.kind, score=body.score, detail=body.detail)
    db.add(e); db.commit(); db.refresh(e)
    return e

@router.get("/exercises")
def list_exercises(db: Session = Depends(get_db), user=Depends(current_user)):
    rows = db.query(models.ExerciseResult).filter(models.ExerciseResult.user_id == user.id).order_by(models.ExerciseResult.created_at.desc()).limit(60).all()
    return [{"id": r.id, "kind": r.kind, "score": r.score, "detail": r.detail, "created_at": r.created_at} for r in rows]

@router.get("/safety-check")
def safety_check(text: str, user=Depends(current_user)):
    if detect_emergency(text):
        return {"emergency": True, "message": EMERGENCY_MESSAGE}
    return {"emergency": False, "message": None}
