from fastapi.testclient import TestClient
from app.main import app

def test_health_and_auth_flow():
    c = TestClient(app)
    assert c.get("/health").json() == {"ok": True}
    import uuid
    email = f"t{uuid.uuid4().hex[:8]}@x.ai"
    r = c.post("/auth/register", json={"email": email, "password": "pass1234", "display_name": "T"})
    assert r.status_code == 200
    tok = r.json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    assert c.post("/observations", json={"signal": "Focus difficulty", "category": "cognitive", "severity": "mild", "impact": 1}, headers=h).status_code == 200
    assert c.post("/check-ins", json={"focus": "same", "sleep": "okay", "difficulty": "no", "day_impact": "not_at_all"}, headers=h).status_code == 200
    a = c.post("/analysis", headers=h)
    assert a.status_code == 200
    assert "pattern_strength" in a.json()["analysis"]
