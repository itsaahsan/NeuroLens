from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from . import models  # noqa: F401 — register tables
from .routers import auth, tracking, analysis

Base.metadata.create_all(bind=engine)

app = FastAPI(title="NeuroLens AI", version="1.0.0",
              description="AI-powered early-awareness and health-literacy platform. Educational only — not a diagnosis.")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router)
app.include_router(tracking.router)
app.include_router(analysis.router)

@app.get("/")
def root():
    return {"name": "NeuroLens AI", "status": "ok", "disclaimer": "Educational health insights. Not a medical diagnosis."}

@app.get("/health")
def health():
    return {"ok": True}
