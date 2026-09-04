"""Entry point: `python run.py` starts the Flask dev server."""
from app import create_app
from app.config import Config


if __name__ == "__main__":
    app = create_app()
    app.run(host=Config.__dict__.get("FLASK_HOST", "0.0.0.0") if False else "0.0.0.0",
            port=int(__import__("os").environ.get("FLASK_PORT", "5000")),
            debug=__import__("os").environ.get("FLASK_DEBUG", "true").lower() == "true")
