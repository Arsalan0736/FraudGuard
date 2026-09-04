"""Auth routes: register + login."""
from flask import Blueprint, request, jsonify

from ..auth import hash_password, verify_password, issue_token
from ..db import get_session
from ..models import User

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = data.get("role", "analyst")

    if not name or not email or not password:
        return jsonify({"error": "name, email and password are required"}), 400
    if role not in ("admin", "analyst"):
        return jsonify({"error": "role must be admin or analyst"}), 400
    if len(password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400

    session = get_session()
    try:
        if session.query(User).filter_by(email=email).first():
            return jsonify({"error": "email already registered"}), 409
        user = User(name=name, email=email,
                    password_hash=hash_password(password), role=role)
        session.add(user)
        session.commit()
        token = issue_token(user)
        return jsonify({
            "user": {"id": user.id, "name": user.name, "email": user.email,
                     "role": user.role},
            "token": token,
        }), 201
    finally:
        session.close()


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    session = get_session()
    try:
        user = session.query(User).filter_by(email=email).first()
        if not user or not verify_password(password, user.password_hash):
            return jsonify({"error": "invalid credentials"}), 401
        token = issue_token(user)
        return jsonify({
            "user": {"id": user.id, "name": user.name, "email": user.email,
                     "role": user.role},
            "token": token,
        }), 200
    finally:
        session.close()
