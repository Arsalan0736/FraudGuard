"""Analytics endpoint powering the dashboard charts."""
from datetime import datetime, timedelta

from flask import Blueprint, jsonify
from sqlalchemy import func, select

from ..auth import auth_required
from ..db import get_session
from ..models import Transaction, Alert

bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


@bp.get("/summary")
@auth_required
def summary():
    session = get_session()
    try:
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)

        total_tx = session.scalar(select(func.count(Transaction.id))) or 0
        flagged_total = session.scalar(
            select(func.count(Transaction.id)).where(Transaction.status == "flagged")
        ) or 0
        flagged_today = session.scalar(
            select(func.count(Transaction.id))
            .where(Transaction.status == "flagged")
            .where(Transaction.timestamp >= today_start)
        ) or 0
        avg_risk = session.scalar(select(func.avg(Transaction.risk_score)))
        pending_alerts = session.scalar(
            select(func.count(Alert.id)).where(Alert.review_status == "pending")
        ) or 0

        # 30-day series for line chart
        thirty_days_ago = today_start - timedelta(days=29)
        flagged = (session.query(Transaction.timestamp, Transaction.status)
                          .filter(Transaction.timestamp >= thirty_days_ago).all())
        per_day = {}
        for ts, st in flagged:
            d = ts.date().isoformat()
            slot = per_day.setdefault(d, {"flagged": 0, "cleared": 0, "pending": 0})
            slot[st] = slot.get(st, 0) + 1

        series = []
        for i in range(30):
            d = (thirty_days_ago + timedelta(days=i)).date().isoformat()
            entry = per_day.get(d, {"flagged": 0, "cleared": 0, "pending": 0})
            series.append({"date": d, "flagged": entry["flagged"],
                           "cleared": entry["cleared"], "pending": entry["pending"]})

        fraud_rate = (flagged_total / total_tx * 100.0) if total_tx else 0.0

        return jsonify({
            "total_transactions": total_tx,
            "flagged_total": flagged_total,
            "flagged_today": flagged_today,
            "avg_risk_score": round(float(avg_risk), 2) if avg_risk is not None else 0.0,
            "fraud_rate_pct": round(fraud_rate, 2),
            "pending_alerts": pending_alerts,
            "daily_series": series,
        })
    finally:
        session.close()
