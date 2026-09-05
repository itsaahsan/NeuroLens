"""Pydantic schemas + AI JSON contract."""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Any
from datetime import datetime

CATEGORIES = {"cognitive", "sleep", "mood", "physical", "daily_functioning"}
SEVERITIES = {"mild": 1, "moderate": 2, "strong": 3}

# ---------- Auth ----------
class RegisterIn(BaseModel):
    email: str
    password: str = Field(min_length=4, max_length=100)
    display_name: str = "Alex"

class LoginIn(BaseModel):
    email: str
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ---------- Observations ----------
class ObservationIn(BaseModel):
    signal: str = Field(min_length=2, max_length=120)
    category: str
    severity: str = "mild"
    impact: int = Field(default=1, ge=0, le=3)
    note: str = ""
    observed_at: Optional[datetime] = None

    @field_validator("category")
    @classmethod
    def _cat(cls, v):
        v = v.lower().strip()
        if v not in CATEGORIES:
            raise ValueError(f"category must be one of {sorted(CATEGORIES)}")
        return v

    @field_validator("severity")
    @classmethod
    def _sev(cls, v):
        v = v.lower().strip()
        if v not in SEVERITIES:
            raise ValueError("severity must be mild|moderate|strong")
        return v

class ObservationOut(ObservationIn):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ---------- Check-ins ----------
class CheckInIn(BaseModel):
    focus: str  # better|same|worse
    sleep: str  # good|okay|poor
    difficulty: str  # no|a_little|yes
    day_impact: str  # not_at_all|a_little|a_lot

class CheckInOut(CheckInIn):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ---------- Exercises ----------
class ExerciseIn(BaseModel):
    kind: str
    score: float
    detail: dict = {}

class ExerciseOut(ExerciseIn):
    id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ---------- AI contract ----------
class PatternFeatures(BaseModel):
    signal: str
    category: str
    frequency: int
    severity_avg: float
    trend: str  # rising|stable|falling
    persistence_days: int
    impact_avg: float
    pattern_strength: int
    correlated_with: List[str] = []

class AnalysisOut(BaseModel):
    pattern_strength: int
    features: List[PatternFeatures]
    correlations: List[dict] = []

class AIInsightPayload(BaseModel):
    summary: str
    patterns: List[dict]
    possible_context: List[str]
    questions_for_clinician: List[str]
    monitoring_suggestions: List[str]
    uncertainty: str
    safety_message: Optional[str] = None

class InsightOut(BaseModel):
    id: int
    payload: dict
    pattern_strength: int
    demo_mode: str
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True
