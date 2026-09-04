"""Flask app factory."""
from flask import Flask, jsonify
from flask_cors import CORS

from .config import Config
from .db import init_db
from .routes.auth import bp as auth_bp
from .routes.transactions import bp as tx_bp
from .routes.alerts import bp as alerts_bp
from .routes.analytics import bp as analytics_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    init_db()  # create tables if missing

    app.register_blueprint(auth_bp)
    app.register_blueprint(tx_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(analytics_bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "fraudguard"})

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "not found"}), 404

    @app.errorhandler(405)
    def not_allowed(_):
        return jsonify({"error": "method not allowed"}), 405

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "internal server error", "detail": str(e)}), 500

    return app
