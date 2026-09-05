"""Deterministic pattern engine — no LLM here. Explainable scoring.

Pattern Strength Score (0-100) = "How strongly the recorded observations form
a meaningful pattern worth discussing or monitoring." NOT disease probability.
"""
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from ..schemas import SEVERITIES

SEV_NUM = {"mild": 1, "moderate": 2, "strong": 3}
IMPACT_W = 8      # functional impact weight
FREQ_W = 12       # per-occurrence weight (capped)
PERSIST_W = 2     # per-day persistence weight (capped)
TREND_BONUS = 10  # rising trend bonus
SEV_W = 6         # avg severity weight


def _to_dt(v):
    if v is None:
        return datetime.now(timezone.utc)
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


def _trend(first_half: float, second_half: float) -> str:
    if second_half > first_half + 0.25:
        return "rising"
    if second_half < first_half - 0.25:
        return "falling"
    return "stable"


def analyze_observations(observations: list[dict]) -> dict:
    """observations: list of dicts with signal, category, severity, impact, observed_at."""
    if not observations:
        return {"pattern_strength": 0, "features": [], "correlations": []}

    now = datetime.now(timezone.utc)
    groups: dict[str, list[dict]] = defaultdict(list)
    for o in observations:
        groups[o["signal"].strip().lower()].append(o)

    features = []
    for sig_key, items in groups.items():
        items = sorted(items, key=lambda x: _to_dt(x.get("observed_at")))
        freq = len(items)
        sev_avg = sum(SEV_NUM.get(str(i.get("severity", "mild")).lower(), 1) for i in items) / freq
        imp_avg = sum(int(i.get("impact", 1)) for i in items) / freq
        days = (_to_dt(items[-1].get("observed_at")) - _to_dt(items[0].get("observed_at"))).days + 1
        # trend: compare avg severity first half vs second half
        mid = max(1, freq // 2)
        fh = sum(SEV_NUM.get(str(i.get("severity", "mild")).lower(), 1) for i in items[:mid]) / mid
        sh = sum(SEV_NUM.get(str(i.get("severity", "mild")).lower(), 1) for i in items[mid:]) / max(1, freq - mid)
        trend = _trend(fh, sh)
        strength = (
            min(freq, 6) * FREQ_W
            + min(days, 14) * PERSIST_W
            + sev_avg * SEV_W
            + imp_avg * IMPACT_W
            + (TREND_BONUS if trend == "rising" else 0)
        )
        strength = int(max(0, min(100, round(strength / 1.4))))
        display = items[-1].get("signal", sig_key)
        features.append({
            "signal": display,
            "category": items[-1].get("category", "cognitive"),
            "frequency": freq,
            "severity_avg": round(sev_avg, 2),
            "trend": trend,
            "persistence_days": days,
            "impact_avg": round(imp_avg, 2),
            "pattern_strength": strength,
            "correlated_with": [],
            "explanation": (
                f"{freq} observation(s) over {days} day(s), avg severity {round(sev_avg,1)}/3, "
                f"trend {trend}, avg daily impact {round(imp_avg,1)}/3."
            ),
        })

    # correlations: signals co-occurring within 48h window
    sigs = list(groups.keys())
    corr = []
    for i in range(len(sigs)):
        for j in range(i + 1, len(sigs)):
            a = sorted(groups[sigs[i]], key=lambda x: _to_dt(x.get("observed_at")))
            b = sorted(groups[sigs[j]], key=lambda x: _to_dt(x.get("observed_at")))
            hits = 0
            for x in a:
                dx = _to_dt(x.get("observed_at"))
                if any(abs((dx - _to_dt(y.get("observed_at"))).total_seconds()) <= 48 * 3600 for y in b):
                    hits += 1
            if hits >= 2:
                corr.append({"a": a[-1].get("signal"), "b": b[-1].get("signal"), "co_occurrences": hits,
                             "note": f"Observed within 48h of each other {hits} time(s)."})
                # attach labels
                for f in features:
                    if f["signal"] == a[-1].get("signal"):
                        f["correlated_with"].append(b[-1].get("signal"))
                    if f["signal"] == b[-1].get("signal"):
                        f["correlated_with"].append(a[-1].get("signal"))

    features.sort(key=lambda f: f["pattern_strength"], reverse=True)
    overall = features[0]["pattern_strength"] if features else 0
    # small boost if multiple rising patterns
    rising = sum(1 for f in features if f["trend"] == "rising")
    if rising >= 2:
        overall = min(100, overall + 5)
    return {"pattern_strength": overall, "features": features, "correlations": corr}


def weekly_delta(observations: list[dict]) -> dict:
    """Compare last 7 days vs previous 7 days counts."""
    now = datetime.now(timezone.utc)
    recent = sum(1 for o in observations if (now - _to_dt(o.get("observed_at"))).days < 7)
    prev = sum(1 for o in observations if 7 <= (now - _to_dt(o.get("observed_at"))).days < 14)
    return {"last_7_days": recent, "previous_7_days": prev, "delta": recent - prev}
