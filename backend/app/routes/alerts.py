"""Alert routes: list + patch (review)."""
from flask import Blueprint, request, jsonify, g

from ..auth import auth_required
from ..db import get_session
from ..models import Alert, Transaction, User

bp = Blueprint("alerts", __name__, url_prefix="/api/alerts")


def _serialize(a: Alert, with_tx: bool = False) -> dict:
    base = {
        "id": a.id,
        "transaction_id": a.transaction_id,
        "rule_triggered": a.rule_triggered,
        "ml_confidence": float(a.ml_confidence),
        "explanation": a.explanation,
        "reviewed_by": a.reviewed_by,
        "review_status": a.review_status,
        "created_at": a.created_at.isoformat(),
    }
    if with_tx and a.transaction:
        t = a.transaction
        base["transaction"] = {
            "id": t.id, "amount": float(t.amount), "merchant": t.merchant,
            "category": t.category, "location": t.location,
            "timestamp": t.timestamp.isoformat(),
            "risk_score": float(t.risk_score), "status": t.status,
        }
    return base


@bp.get("")
@auth_required
def list_alerts():
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(max(int(request.args.get("per_page", 25)), 1), 200)
    status = request.args.get("review_status")  # pending|false_positive|confirmed_fraud

    session = get_session()
    try:
        q = session.query(Alert)
        if status in ("pending", "false_positive", "confirmed_fraud"):
            q = q.filter(Alert.review_status == status)
        total = q.count()
        rows = (q.order_by(Alert.created_at.desc(), Alert.id.desc())
                  .offset((page - 1) * per_page).limit(per_page).all())
        return jsonify({
            "page": page, "per_page": per_page, "total": total,
            "items": [_serialize(r, with_tx=True) for r in rows],
        })
    finally:
        session.close()


@bp.patch("/<int:alert_id>")
@auth_required
def update_alert(alert_id: int):
    data = request.get_json(silent=True) or {}
    new_status = data.get("review_status")
    if new_status not in ("pending", "false_positive", "confirmed_fraud"):
        return jsonify({"error": "review_status must be pending|false_positive|confirmed_fraud"}), 400

    session = get_session()
    try:
        alert = session.get(Alert, alert_id)
        if not alert:
            return jsonify({"error": "alert not found"}), 404
        alert.review_status = new_status
        alert.reviewed_by = g.current_user.id
        session.commit()
        return jsonify(_serialize(alert, with_tx=True))
    finally:
        session.close()
