"""JWT auth (hackathon-simple, secure defaults)."""
import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from passlib.context import CryptContext
from ..database import get_db
from .. import models
from ..schemas import RegisterIn, LoginIn, TokenOut

SECRET = os.getenv("JWT_SECRET", "neurolens-dev-secret-change-me")
ALGO = "HS256"
EXP_MIN = 60 * 24 * 7
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer()
router = APIRouter(prefix="/auth", tags=["auth"])


def _token(uid: int):
    exp = datetime.now(timezone.utc) + timedelta(minutes=EXP_MIN)
    return jwt.encode({"sub": str(uid), "exp": exp}, SECRET, algorithm=ALGO)


def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)):
    try:
        data = jwt.decode(creds.credentials, SECRET, algorithms=[ALGO])
        u = db.get(models.User, int(data["sub"]))
    except (JWTError, Exception):
        u = None
    if not u:
        raise HTTPException(401, "Invalid or expired token")
    return u


@router.post("/register", response_model=TokenOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == body.email.lower()).first():
        raise HTTPException(400, "Email already registered")
    u = models.User(email=body.email.lower(), hashed_password=pwd.hash(body.password),
                    display_name=body.display_name)
    db.add(u); db.commit(); db.refresh(u)
    return {"access_token": _token(u.id)}


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.email == body.email.lower()).first()
    if not u or not pwd.verify(body.password, u.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    return {"access_token": _token(u.id)}


@router.get("/me")
def me(user: models.User = Depends(current_user)):
    return {"id": user.id, "email": user.email, "display_name": user.display_name}
