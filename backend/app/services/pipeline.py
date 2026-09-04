"""High-level pipeline: take a transaction payload → persist + score + alert."""
from __future__ import annotations

import logging
from datetime import datetime

from ..db import get_session
from ..models import Account, Transaction, Alert
from ..ml.model import score_for_transaction_record, score_transaction, _velocity_for_tx
from .rules import run_rules_from_dict
from .llm import explain

log = logging.getLogger(__name__)


def _parse_dt(s: str) -> datetime:
    if isinstance(s, datetime):
        return s
    return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)


def ingest_transaction(account_id: int, payload: dict) -> dict:
    """Score + persist a transaction; create alert when risk_score > 60."""
    session = get_session()
    try:
        account = session.get(Account, account_id)
        if not account:
            raise ValueError(f"account {account_id} not found")

        timestamp = _parse_dt(payload["timestamp"])
        amount = float(payload["amount"])

        # 1. Rules
        rule_result = run_rules_from_dict(
            {**payload, "timestamp": timestamp}, account_id=account.id
        )

        # 2. ML score
        velocity = _velocity_for_tx(session, _placeholder_tx(account.id, timestamp))
        ml_score, ml_conf = score_transaction(
            amount=amount,
            timestamp=timestamp,
            category=payload.get("category", "other"),
            velocity_count=velocity,
        )

        # 3. Combined final risk (50/50 blend, max 100)
        final = round(min(100.0, 0.5 * rule_result.score + 0.5 * ml_score), 2)
        status = "flagged" if final >= 60 else (
            "cleared" if final < 25 else "pending"
        )

        tx = Transaction(
            account_id=account.id,
            amount=amount,
            merchant=payload["merchant"],
            category=payload.get("category", "other"),
            latitude=payload.get("latitude"),
            longitude=payload.get("longitude"),
            location=payload["location"],
            timestamp=timestamp,
            status=status,
            risk_score=final,
        )
        session.add(tx)
        session.flush()  # populate tx.id

        alert_payload = None
        if final > 60:
            triggered = rule_result.triggered_names()
            explanation = explain(
                amount=amount, merchant=payload["merchant"],
                location=payload["location"], timestamp=timestamp,
                risk_score=final, rules=triggered or ["ml_model"],
            )
            alert = Alert(
                transaction_id=tx.id,
                rule_triggered=",".join(triggered) if triggered else "ml_model",
                ml_confidence=ml_conf,
                explanation=explanation,
                review_status="pending",
            )
            session.add(alert)
            alert_payload = {
                "id": None,  # filled after commit
                "transaction_id": tx.id,
                "rule_triggered": alert.rule_triggered,
                "ml_confidence": float(ml_conf),
                "explanation": explanation,
                "review_status": "pending",
            }

        session.commit()

        # Reload alert id (single-element because we just created it)
        result = {
            "transaction": {
                "id": tx.id,
                "account_id": tx.account_id,
                "amount": float(tx.amount),
                "merchant": tx.merchant,
                "category": tx.category,
                "latitude": float(tx.latitude) if tx.latitude is not None else None,
                "longitude": float(tx.longitude) if tx.longitude is not None else None,
                "location": tx.location,
                "timestamp": tx.timestamp.isoformat(),
                "status": tx.status,
                "risk_score": float(tx.risk_score),
            },
            "rule_hits": [h.to_dict() for h in rule_result.hits],
            "ml_score": ml_score,
            "ml_confidence": ml_conf,
        }
        if alert_payload is not None:
            session.refresh(tx)
            created_alert = session.query(Alert).filter_by(transaction_id=tx.id).first()
            alert_payload["id"] = created_alert.id
            result["alert"] = alert_payload
        return result
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _placeholder_tx(account_id: int, ts: datetime) -> Transaction:
    """A lightweight Transaction used for the velocity count lookup only."""
    class _T:
        pass
    t = _T()
    t.account_id = account_id
    t.timestamp = ts
    return t  # _velocity_for_tx only reads .account_id / .timestamp
