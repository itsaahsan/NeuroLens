"""SQLAlchemy models. Timestamps on every table. Clean, documented schema."""
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base


def _now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    display_name = Column(String(120), default="Alex")
    created_at = Column(DateTime, default=_now)

    observations = relationship("Observation", back_populates="user", cascade="all, delete-orphan")
    check_ins = relationship("CheckIn", back_populates="user", cascade="all, delete-orphan")
    exercise_results = relationship("ExerciseResult", back_populates="user", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")


class Observation(Base):
    """One structured self-reported observation."""
    __tablename__ = "observations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    signal = Column(String(120), nullable=False)  # e.g. "Focus difficulty"
    category = Column(String(40), nullable=False)  # cognitive|sleep|mood|physical|daily_functioning
    severity = Column(String(20), nullable=False, default="mild")  # mild|moderate|strong
    impact = Column(Integer, default=1)  # 0-3 functional impact
    note = Column(Text, default="")
    observed_at = Column(DateTime, default=_now, index=True)
    created_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="observations")


class CheckIn(Base):
    """Daily 60-second check-in."""
    __tablename__ = "check_ins"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    focus = Column(String(20), nullable=False)  # better|same|worse
    sleep = Column(String(20), nullable=False)  # good|okay|poor
    difficulty = Column(String(20), nullable=False)  # no|a_little|yes
    day_impact = Column(String(20), nullable=False)  # not_at_all|a_little|a_lot
    created_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="check_ins")


class ExerciseResult(Base):
    __tablename__ = "exercise_results"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    kind = Column(String(40), nullable=False)  # memory|reaction|pattern|attention
    score = Column(Float, nullable=False)
    detail = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="exercise_results")


class Insight(Base):
    """Stored structured AI insight (validated JSON)."""
    __tablename__ = "ai_insights"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    payload = Column(JSON, nullable=False)
    pattern_strength = Column(Integer, default=0)
    demo_mode = Column(String(20), default="fallback")
    created_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="insights")


class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String(200), default="Health Summary")
    content_markdown = Column(Text, default="")
    created_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="reports")
