"""Rule-based fraud detection engine.

Each rule is a callable returning (triggered: bool, weighted_score: float, reason: str).
The combined score is the sum of weighted scores (clamped to 100).
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Iterable

from sqlalchemy import select, func

from ..db import get_session
from ..models import Transaction


# ----- rule metadata --------------------------------------------------------

@dataclass
class RuleHit:
    name: str
    triggered: bool
    weight: float
    reason: str

    def to_dict(self) -> dict:
        return {"name": self.name, "triggered": self.triggered,
                "weight": self.weight, "reason": self.reason}


@dataclass
class RuleResult:
    hits: list[RuleHit] = field(default_factory=list)
    score: float = 0.0
    any_triggered: bool = False

    def add(self, hit: RuleHit) -> None:
        self.hits.append(hit)
        if hit.triggered:
            self.any_triggered = True
            self.score += hit.weight
        self.score = min(self.score, 100.0)

    def triggered_names(self) -> list[str]:
        return [h.name for h in self.hits if h.triggered]


# ----- haversine ------------------------------------------------------------

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two (lat, lon) points in km."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


# ----- individual rules -----------------------------------------------------

def velocity_check(account_id: int, when: datetime,
                   window_minutes: int = 5, threshold: int = 3,
                   weight: float = 35.0) -> RuleHit:
    """> N transactions from the same account in the last `window_minutes`."""
    session = get_session()
    try:
        start = when - timedelta(minutes=window_minutes)
        count = session.scalar(
            select(func.count(Transaction.id))
            .where(Transaction.account_id == account_id)
            .where(Transaction.timestamp >= start)
            .where(Transaction.timestamp <= when)
        ) or 0
        triggered = count > threshold
        reason = (f"{count} transactions in the last {window_minutes} min "
                  f"(threshold {threshold}).") if triggered else "velocity normal"
        return RuleHit("velocity", triggered, weight if triggered else 0.0, reason)
    finally:
        session.close()


def amount_check(account_id: int, amount: float, when: datetime,
                 window_days: int = 30, multiplier: float = 5.0,
                 weight: float = 30.0) -> RuleHit:
    """Amount > multiplier × account rolling avg over window_days."""
    session = get_session()
    try:
        start = when - timedelta(days=window_days)
        avg = session.scalar(
            select(func.avg(Transaction.amount))
            .where(Transaction.account_id == account_id)
            .where(Transaction.timestamp >= start)
            .where(Transaction.timestamp < when)
        )
        baseline = float(avg) if avg is not None else 0.0
        triggered = baseline > 0 and amount > multiplier * baseline
        if triggered:
            reason = (f"Amount {amount:.2f} is {amount/baseline:.1f}x the "
                      f"{window_days}-day average of {baseline:.2f}.")
        else:
            reason = f"amount within {multiplier}x of {window_days}-day avg"
        return RuleHit("amount_spike", triggered, weight if triggered else 0.0, reason)
    finally:
        session.close()


def location_check(account_id: int, lat: float | None, lon: float | None,
                   when: datetime, window_minutes: int = 60,
                   max_km: float = 500.0, weight: float = 40.0) -> RuleHit:
    """Distance from previous transaction > max_km within window_minutes."""
    if lat is None or lon is None:
        return RuleHit("location_jump", False, 0.0, "no coordinates supplied")
    session = get_session()
    try:
        start = when - timedelta(minutes=window_minutes)
        prev = session.execute(
            select(Transaction)
            .where(Transaction.account_id == account_id)
            .where(Transaction.timestamp >= start)
            .where(Transaction.timestamp < when)
            .where(Transaction.latitude.is_not(None))
            .where(Transaction.longitude.is_not(None))
            .order_by(Transaction.timestamp.desc())
            .limit(1)
        ).scalar_one_or_none()

        if not prev:
            return RuleHit("location_jump", False, 0.0, "no prior txn with coords")

        dist = haversine_km(float(prev.latitude), float(prev.longitude), lat, lon)
        triggered = dist > max_km
        reason = (f"{dist:.0f} km from previous txn at {prev.location} "
                  f"({when - prev.timestamp} earlier).") if triggered else \
                 f"distance {dist:.0f} km within {max_km} km threshold"
        return RuleHit("location_jump", triggered, weight if triggered else 0.0, reason)
    finally:
        session.close()


# ----- public API -----------------------------------------------------------

def run_rules(account_id: int, amount: float, merchant: str,
              latitude: float | None, longitude: float | None,
              location: str, timestamp: datetime) -> RuleResult:
    """Run all rules and return a combined RuleResult."""
    result = RuleResult()
    result.add(velocity_check(account_id, timestamp))
    result.add(amount_check(account_id, amount, timestamp))
    result.add(location_check(account_id, latitude, longitude, timestamp))
    return result


def run_rules_from_dict(payload: dict, account_id: int) -> RuleResult:
    ts = payload["timestamp"]
    if isinstance(ts, str):
        ts = datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)
    return run_rules(
        account_id=account_id,
        amount=float(payload["amount"]),
        merchant=payload["merchant"],
        latitude=payload.get("latitude"),
        longitude=payload.get("longitude"),
        location=payload["location"],
        timestamp=ts,
    )
