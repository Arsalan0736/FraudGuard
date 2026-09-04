"""Seed script: create users + accounts + 500+ transactions, ~5-8% anomalous.

Usage:
    python scripts/seed.py            # 550 transactions
    python scripts/seed.py --count 800
"""
from __future__ import annotations

import argparse
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from faker import Faker

from app.auth import hash_password
from app.db import get_session, init_db
from app.models import Account, Transaction, User, Alert
from app.ml.model import train, save_model, featurize
from app.services.pipeline import ingest_transaction  # for alert generation path
from app.services.rules import run_rules_from_dict


fake = Faker()
CITIES = [
    ("New York, US",   40.7128,  -74.0060),
    ("Los Angeles, US",34.0522, -118.2437),
    ("Chicago, US",    41.8781,  -87.6298),
    ("Toronto, CA",    43.6532,  -79.3832),
    ("London, UK",     51.5074,   -0.1278),
    ("Berlin, DE",     52.5200,   13.4050),
    ("Tokyo, JP",      35.6762,  139.6503),
    ("Mumbai, IN",     19.0760,   72.8777),
    ("Sydney, AU",    -33.8688,  151.2093),
    ("Dubai, AE",      25.2048,   55.2708),
    ("Lagos, NG",      6.5244,    3.3792),
    ("São Paulo, BR", -23.5505,  -46.6333),
]

MERCHANTS = {
    "groceries":     [("Whole Foods", 30, 90), ("Trader Joe's", 25, 80),
                      ("Kroger", 20, 110)],
    "restaurants":   [("Starbucks", 4, 25), ("Chipotle", 8, 30),
                      ("Local Diner", 15, 90)],
    "travel":        [("Delta Airlines", 180, 1500), ("Marriott", 120, 800),
                      ("Uber", 6, 60)],
    "electronics":   [("Best Buy", 50, 2200), ("Apple Store", 99, 2500)],
    "entertainment": [("Netflix", 12, 25), ("Spotify", 9, 16),
                      ("AMC Theatres", 10, 60)],
    "gas":           [("Shell", 25, 95), ("BP", 30, 100)],
    "other":         [("Amazon", 5, 350), ("eBay", 8, 220), ("PayPal", 10, 400)],
}


def _amount_for(category: str) -> float:
    opts = MERCHANTS.get(category, MERCHANTS["other"])
    name, lo, hi = random.choice(opts)
    return round(random.uniform(lo, hi), 2), name


def _seed_users_and_accounts(session, n_users: int = 8) -> list[Account]:
    accounts = []
    for i in range(n_users):
        email = f"user{i+1}@fraudguard.dev"
        user = User(
            name=fake.name(),
            email=email,
            password_hash=hash_password("password123"),
            role="admin" if i == 0 else "analyst",
        )
        session.add(user); session.flush()
        acct = Account(
            user_id=user.id,
            account_number=f"FG{user.id:06d}{random.randint(1000, 9999)}",
            balance=round(random.uniform(500, 25000), 2),
        )
        session.add(acct); session.flush()
        accounts.append(acct)
    return accounts


def _make_normal(account: Account, base: datetime) -> Transaction:
    category = random.choices(list(MERCHANTS.keys()),
                              weights=[20, 22, 6, 8, 12, 10, 22])[0]
    amount, merchant = _amount_for(category)
    city, lat, lon = random.choice(CITIES)
    ts = base - timedelta(days=random.randint(0, 29),
                          hours=random.randint(0, 23),
                          minutes=random.randint(0, 59))
    return Transaction(
        account_id=account.id, amount=amount, merchant=merchant,
        category=category, latitude=lat, longitude=lon,
        location=city, timestamp=ts, status="cleared", risk_score=0,
    )


def _make_anomalous(account: Account, base: datetime) -> Transaction:
    """Deliberately fraudulent: big amount, odd hour, far from normal city."""
    amount = round(random.uniform(2500, 12000), 2)
    _, merchant = _amount_for(random.choice(["electronics", "travel", "other"]))
    city, lat, lon = random.choice(CITIES)
    # force off-hours
    ts = base - timedelta(days=random.randint(0, 29), hours=random.randint(1, 4))
    return Transaction(
        account_id=account.id, amount=amount, merchant=merchant,
        category="other", latitude=lat, longitude=lon,
        location=city, timestamp=ts, status="flagged", risk_score=99.99,
    )


def _make_burst(account: Account, base: datetime) -> list[Transaction]:
    """Burst: 5 small charges in the same minute → velocity rule fires."""
    out = []
    city, lat, lon = random.choice(CITIES)
    for i in range(5):
        out.append(Transaction(
            account_id=account.id, amount=round(random.uniform(8, 30), 2),
            merchant=random.choice(["Starbucks", "Chipotle", "Uber"]),
            category="restaurants", latitude=lat, longitude=lon,
            location=city,
            timestamp=base - timedelta(days=random.randint(0, 29),
                                       minutes=random.randint(0, 59)),
            status="flagged", risk_score=99.99,
        ))
    return out


def seed(count: int = 550, anomaly_rate: float = 0.06) -> None:
    init_db()
    session = get_session()
    try:
        # wipe old data for a clean re-seed
        session.query(Alert).delete()
        session.query(Transaction).delete()
        session.query(Account).delete()
        session.query(User).delete()
        session.commit()

        accounts = _seed_users_and_accounts(session, n_users=10)
        base = datetime.utcnow()

        rows_for_ml = []
        labels_for_ml = []
        for acct in accounts:
            # 70% of this account's transactions are "normal", rest split between anomalies
            per_account = max(20, count // len(accounts))
            n_anom = max(2, int(per_account * anomaly_rate))
            for _ in range(per_account - n_anom - 2):
                tx = _make_normal(acct, base)
                session.add(tx); session.flush()
                rows_for_ml.append({"amount": float(tx.amount),
                                    "hour_of_day": tx.timestamp.hour,
                                    "velocity_count": 1,
                                    "category": tx.category})
                labels_for_ml.append(0)

            # anomalous single transactions
            for _ in range(n_anom):
                tx = _make_anomalous(acct, base)
                session.add(tx); session.flush()
                rows_for_ml.append({"amount": float(tx.amount),
                                    "hour_of_day": tx.timestamp.hour,
                                    "velocity_count": 1,
                                    "category": "other"})
                labels_for_ml.append(1)

            # burst transactions
            burst = _make_burst(acct, base)
            for tx in burst:
                session.add(tx); session.flush()
                rows_for_ml.append({"amount": float(tx.amount),
                                    "hour_of_day": tx.timestamp.hour,
                                    "velocity_count": 5,
                                    "category": tx.category})
                labels_for_ml.append(1)

        session.commit()
        total_tx = session.query(Transaction).count()
        flagged_tx = session.query(Transaction).filter_by(status="flagged").count()
        print(f"[seed] inserted {total_tx} transactions, {flagged_tx} flagged "
              f"({flagged_tx/total_tx*100:.1f}%)")

        # --- train the ML model ----------------------------------------------
        model = train(rows_for_ml, labels_for_ml)
        save_model(model)
        print(f"[seed] trained ML model on {len(rows_for_ml)} rows, "
              f"{sum(labels_for_ml)} anomalies; saved to artifacts/fraud_model.joblib")

        # --- generate alerts for flagged transactions ------------------------
        flagged_rows = (session.query(Transaction)
                                .filter(Transaction.status == "flagged").all())
        for tx in flagged_rows:
            rule = run_rules_from_dict(
                {"amount": float(tx.amount), "merchant": tx.merchant,
                 "location": tx.location, "latitude": float(tx.latitude) if tx.latitude else None,
                 "longitude": float(tx.longitude) if tx.longitude else None,
                 "timestamp": tx.timestamp},
                account_id=tx.account_id,
            )
            triggered = rule.triggered_names() or ["ml_model"]
            from app.services.llm import explain
            explanation = explain(
                amount=float(tx.amount), merchant=tx.merchant,
                location=tx.location, timestamp=tx.timestamp,
                risk_score=float(tx.risk_score), rules=triggered,
            )
            session.add(Alert(
                transaction_id=tx.id,
                rule_triggered=",".join(triggered),
                ml_confidence=float(tx.risk_score),
                explanation=explanation,
                review_status="pending",
            ))
        session.commit()
        print(f"[seed] generated {len(flagged_rows)} alerts with LLM explanations")
    finally:
        session.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=550)
    parser.add_argument("--anomaly-rate", type=float, default=0.06)
    args = parser.parse_args()
    seed(args.count, args.anomaly_rate)
