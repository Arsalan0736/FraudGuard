"""Transaction routes: create, list, detail."""
from datetime import datetime

from flask import Blueprint, request, jsonify, g

from ..auth import auth_required
from ..db import get_session
from ..models import Transaction, Account, Alert
from ..services.pipeline import ingest_transaction

bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")


def _serialize(tx: Transaction, include_alert: bool = False) -> dict:
    base = {
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
    }
    if include_alert and tx.alerts:
        a = tx.alerts[0]
        base["alert"] = {
            "id": a.id,
            "rule_triggered": a.rule_triggered,
            "ml_confidence": float(a.ml_confidence),
            "explanation": a.explanation,
            "review_status": a.review_status,
        }
    return base


@bp.post("")
@auth_required
def create_transaction():
    data = request.get_json(silent=True) or {}
    required = ["account_id", "amount", "merchant", "location", "timestamp"]
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": f"missing fields: {', '.join(missing)}"}), 400

    try:
        result = ingest_transaction(int(data["account_id"]), data)
        return jsonify(result), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404
    except Exception as exc:
        return jsonify({"error": "failed to ingest transaction",
                        "detail": str(exc)}), 500


@bp.get("")
@auth_required
def list_transactions():
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(max(int(request.args.get("per_page", 25)), 1), 200)

    session = get_session()
    try:
        q = session.query(Transaction)
        if (status := request.args.get("status")) in ("pending", "flagged", "cleared"):
            q = q.filter(Transaction.status == status)
        if (min_risk := request.args.get("min_risk_score")):
            q = q.filter(Transaction.risk_score >= float(min_risk))
        if (max_risk := request.args.get("max_risk_score")):
            q = q.filter(Transaction.risk_score <= float(max_risk))
        if (start := request.args.get("start_date")):
            q = q.filter(Transaction.timestamp >= _parse(start))
        if (end := request.args.get("end_date")):
            q = q.filter(Transaction.timestamp <= _parse(end))

        total = q.count()
        rows = (q.order_by(Transaction.timestamp.desc(), Transaction.id.desc())
                  .offset((page - 1) * per_page).limit(per_page).all())
        return jsonify({
            "page": page, "per_page": per_page, "total": total,
            "items": [_serialize(r) for r in rows],
        })
    finally:
        session.close()


@bp.get("/<int:tx_id>")
@auth_required
def get_transaction(tx_id: int):
    session = get_session()
    try:
        tx = session.get(Transaction, tx_id)
        if not tx:
            return jsonify({"error": "transaction not found"}), 404
        return jsonify(_serialize(tx, include_alert=True))
    finally:
        session.close()


def _parse(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
