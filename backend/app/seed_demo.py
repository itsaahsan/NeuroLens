"""Seed fictional demo profile: Alex, 22 — 14 days of observations. Run: python -m app.seed_demo"""
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from .database import SessionLocal, Base, engine
from . import models

Base.metadata.create_all(bind=engine)
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

DATA = [
    (13, "Focus difficulty", "cognitive", "mild", 1, "Hard to stay with readings."),
    (13, "Sleep disruption", "sleep", "mild", 1, "Woke up twice."),
    (12, "Forgetfulness", "cognitive", "mild", 1, "Forgot keys."),
    (11, "Focus difficulty", "cognitive", "mild", 1, "Drifted in lecture."),
    (10, "Mood change", "mood", "mild", 1, "Irritable afternoon."),
    (9, "Sleep disruption", "sleep", "moderate", 2, "Only ~5h sleep."),
    (8, "Focus difficulty", "cognitive", "moderate", 2, "Reread pages 3x."),
    (7, "Headache", "physical", "mild", 1, "Afternoon, water helped."),
    (6, "Forgetfulness", "cognitive", "mild", 2, "Missed an appointment reminder."),
    (5, "Sleep disruption", "sleep", "moderate", 2, "Late screen time."),
    (4, "Focus difficulty", "cognitive", "moderate", 2, "Meetings felt foggy."),
    (4, "Difficulty completing familiar tasks", "daily_functioning", "mild", 2, "Chores took longer."),
    (3, "Mood change", "mood", "moderate", 1, "Low energy evening."),
    (2, "Focus difficulty", "cognitive", "moderate", 2, "Needed lists for everything."),
    (1, "Sleep disruption", "sleep", "moderate", 2, "Restless night."),
    (1, "Forgetfulness", "cognitive", "moderate", 2, "Lost train of thought mid-call."),
    (0, "Focus difficulty", "cognitive", "moderate", 2, "Today felt scattered."),
    (0, "Headache", "physical", "mild", 1, "Mild, morning."),
]


def main():
    db = SessionLocal()
    email = "demo@neurolens.ai"
    u = db.query(models.User).filter(models.User.email == email).first()
    if not u:
        u = models.User(email=email, hashed_password=pwd.hash("demo1234"), display_name="Alex")
        db.add(u); db.commit(); db.refresh(u)
    db.query(models.Observation).filter(models.Observation.user_id == u.id).delete()
    now = datetime.now(timezone.utc)
    for days_ago, sig, cat, sev, imp, note in DATA:
        db.add(models.Observation(user_id=u.id, signal=sig, category=cat, severity=sev,
                                  impact=imp, note=note,
                                  observed_at=now - timedelta(days=days_ago, hours=3)))
    db.commit()
    print(f"Seeded demo user {email} / demo1234 with {len(DATA)} observations (id={u.id})")


if __name__ == "__main__":
    main()
