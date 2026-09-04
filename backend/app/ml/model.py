"""ML layer: scikit-learn classifier with persisted artifact.

The trained model is saved to backend/artifacts/fraud_model.joblib.
Features:
    amount, hour_of_day, merchant_category (one-hot via dict), velocity_count
Label: 1 if anomaly label / flagged transaction else 0.
"""
from __future__ import annotations

import os
from datetime import datetime
from typing import Iterable

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from ..config import Config
from ..db import get_session
from ..models import Transaction
from sqlalchemy import select

CATEGORIES = [
    "groceries", "restaurants", "travel", "electronics",
    "entertainment", "gas", "other",
]


def _row(tx: Transaction, velocity_count: int) -> dict:
    return {
        "amount": float(tx.amount),
        "hour_of_day": tx.timestamp.hour,
        "velocity_count": velocity_count,
        "category": (getattr(tx, "category", None) or "other").lower(),
    }


def _velocity_for_tx(session, tx: Transaction, window_minutes: int = 5) -> int:
    from sqlalchemy import func
    start = tx.timestamp - __import__("datetime").timedelta(minutes=window_minutes)
    count = session.scalar(
        select(func.count(Transaction.id))
        .where(Transaction.account_id == tx.account_id)
        .where(Transaction.timestamp >= start)
        .where(Transaction.timestamp <= tx.timestamp)
    ) or 0
    return int(count)


def featurize(rows: Iterable[dict]) -> pd.DataFrame:
    df = pd.DataFrame(list(rows))
    if df.empty:
        df = pd.DataFrame(columns=["amount", "hour_of_day", "velocity_count"] + CATEGORIES)
    for c in CATEGORIES:
        df[c] = (df.get("category") == c).astype(int) if "category" in df.columns else 0
    df = df.drop(columns=["category"], errors="ignore")
    df = df[["amount", "hour_of_day", "velocity_count"] + CATEGORIES].fillna(0)
    return df


def train(rows: list[dict], labels: list[int]) -> Pipeline:
    """Train a small pipeline. `labels`: 1=fraud, 0=normal."""
    df = featurize(rows)
    if not labels or len(set(labels)) < 2:
        # IsolationForest for one-class case (cold start)
        model = IsolationForest(n_estimators=120, contamination=0.1, random_state=42)
        model.fit(df.values)
        pipe = Pipeline([("scaler", StandardScaler()), ("model", model)])
        return pipe
    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("model", LogisticRegression(max_iter=500, random_state=42)),
    ])
    pipe.fit(df.values, labels)
    return pipe


def save_model(model: Pipeline) -> None:
    os.makedirs(os.path.dirname(Config.MODEL_PATH), exist_ok=True)
    joblib.dump({"model": model, "categories": CATEGORIES}, Config.MODEL_PATH)


def load_model() -> Pipeline | None:
    if not os.path.exists(Config.MODEL_PATH):
        return None
    blob = joblib.load(Config.MODEL_PATH)
    return blob["model"] if isinstance(blob, dict) else blob


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + np.exp(-x))


def score_transaction(amount: float, timestamp: datetime,
                      category: str, velocity_count: int) -> tuple[float, float]:
    """Return (risk_score 0-100, confidence 0-100)."""
    model = load_model()
    if model is None:
        # Cold-start fallback heuristic
        base = 0.0
        if amount > 1000:
            base += 25
        if velocity_count >= 4:
            base += 25
        if timestamp.hour in (0, 1, 2, 3, 4):
            base += 15
        if category not in ("groceries", "gas", "restaurants"):
            base += 10
        return min(base, 100.0), min(base, 100.0)

    row = featurize([{
        "amount": amount,
        "hour_of_day": timestamp.hour,
        "velocity_count": velocity_count,
        "category": (category or "other").lower(),
    }])
    try:
        # Logistic regression path
        proba = model.predict_proba(row.values)[0]
        # assume class 1 is fraud
        fraud_proba = float(proba[1]) if len(proba) > 1 else float(proba[0])
        confidence = fraud_proba * 100.0
    except Exception:
        # IsolationForest path
        out = model.predict(row.values)[0]
        score = -model.named_steps["model"].score_samples(row.values)[0]
        confidence = float(_sigmoid(score)) * 100.0
    return float(np.clip(confidence, 0, 100)), float(np.clip(confidence, 0, 100))


def score_for_transaction_record(tx: Transaction) -> tuple[float, float]:
    session = get_session()
    try:
        v = _velocity_for_tx(session, tx)
        return score_transaction(float(tx.amount), tx.timestamp,
                                 getattr(tx, "category", None) or "other", v)
    finally:
        session.close()
