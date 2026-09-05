# NeuroLens AI — Understand your signals. Notice patterns earlier.

AI-powered early-awareness & health-literacy platform for neurological/cognitive wellbeing. **Educational only — never diagnoses, never replaces doctors.**

> "AI-powered longitudinal health pattern awareness rather than a generic symptom chatbot."

## Problem
People notice scattered changes (focus, forgetfulness, sleep, mood, headaches…) but can't tell what matters, whether it's changing, or what to bring to a clinician.

## Solution
NeuroLens turns scattered observations into a **structured, explainable timeline**:
`Input → Validation → Observation store → Deterministic Pattern Engine → AI Explanation → Safety validation → Structured JSON → Visual UI`

## Why it's different
- Deterministic pattern math FIRST (frequency, trend, persistence, severity, impact, 48h co-occurrence), explainable Pattern Strength Score (0–100 = "pattern worth monitoring", NOT disease probability).
- LLM only explains; outputs schema-validated + safety-filtered. Unsafe output → safe fallback.
- Works with **no API key**: Demo Intelligence Mode with seeded fictional data. Never a broken screen.

## Architecture
```
neurolens-ai/
  backend/  FastAPI + SQLAlchemy (Postgres via DATABASE_URL, SQLite fallback)
    app/main.py, models.py, schemas.py, database.py
    app/routers/{auth,tracking,analysis}.py
    app/services/{pattern_engine,ai_provider,safety,learn_data}.py
    app/seed_demo.py   tests/
  frontend/ React+TS+Vite+Tailwind+Recharts+Lucide (Vercel-ready)
```

## Pattern engine
Score per signal ≈ `(min(freq,6)*12 + min(days,14)*2 + sevAvg*6 + impactAvg*8 + rising?10) / 1.4`, capped 0–100. Trend = first-half vs second-half severity. Correlations = ≥2 co-occurrences within 48h.

## Safety design
- Emergency regex (self-harm, stroke signs, chest pain, seizure…) → banner + urgent-care message, no diagnosis attempt.
- Output validation blocks disease claims ("you have X"), certainty claims, medication instructions.
- Plain-language uncertainty + "discuss with a healthcare professional" on every insight.

## Privacy
Minimal data, Privacy Center with export/delete, transparent AI-processing note.

## Screenshots
Run the demo and capture: landing → dashboard → timeline → insights report. (No placeholders in-app.)

## Demo instructions (3–4 min judge flow)
1. `Try Demo` → onboarding → dashboard shows **Alex, 22 — Demo Profile, 14 days, Pattern Strength ~72**.
2. Timeline → filter by cognitive/sleep; add an observation.
3. `Analyze` → AI Insight ("reduced focus alongside poor sleep…").
4. Check-in → timeline updates.
5. Exercises → memory pairs + reaction task.
6. Insights → Print/Save PDF shareable summary (includes "not a medical diagnosis").
7. Privacy → export/delete.

Demo login (after seeding): `demo@neurolens.ai` / `demo1234`.

## Environment variables
Backend (`backend/.env`): `DATABASE_URL, JWT_SECRET, AI_API_KEY, AI_BASE_URL, AI_MODEL`.
Frontend (`frontend/.env`): `VITE_API_URL`.

## Local setup
```powershell
# backend
cd backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m app.seed_demo        # seeds Alex demo profile
uvicorn app.main:app --reload  # http://localhost:8000

# frontend (new terminal)
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

## Testing
```powershell
cd backend
pytest -q
```
Covers pattern math, trend, validation, safety rules, API flow.

## Deployment
- **Frontend → Vercel**: root `frontend/`, build `npm run build`, output `dist`, env `VITE_API_URL=<backend URL>`.
- **Backend → Render/Railway**: root `backend/`, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set `DATABASE_URL` (Supabase Postgres), `JWT_SECRET`, optional `AI_*`.
- DB: any hosted Postgres; models auto-create on boot.

## Future roadmap
- Reminder nudges, clinician PDF styling, multi-language plain-language summaries, wearable sleep import (opt-in), longitudinal cohort analytics (aggregated, consented).
# NeuroLens
