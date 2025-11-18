import os
from flask import Flask, jsonify
from flask_cors import CORS
from db import init_db, create_all_tables
import logging
from logging import StreamHandler
import sys
from routes.realtime import bp as realtime_bp
from routes.search import bp as search_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object("config.Config")

    # CORS for frontend access
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    # Logging
    logger = logging.getLogger()
    logger.setLevel(logging.INFO if not app.config.get("DEBUG") else logging.DEBUG)
    if not any(isinstance(h, StreamHandler) for h in logger.handlers):
        handler = StreamHandler(stream=sys.stdout)
        formatter = logging.Formatter(
            fmt="%(asctime)s %(levelname)s %(name)s - %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    # Initialize DB and create tables in dev (temporary until Alembic)
    init_db(app)
    if app.config.get("DEBUG"):
        create_all_tables(app)

    # Blueprints
    app.register_blueprint(realtime_bp)
    app.register_blueprint(search_bp)

    # Basic health and version endpoints
    @app.get("/")
    def index():
        return (
            """
            <html>
              <head><title>Bus Tracking Backend</title></head>
              <body style="font-family: system-ui; padding: 20px;">
                <h2>Bus Tracking Backend</h2>
                <ul>
                  <li><a href="/healthz">/healthz</a></li>
                  <li><a href="/version">/version</a></li>
                  <li><a href="/api/positions">/api/positions</a></li>
                  <li><a href="/api/stream/positions">/api/stream/positions</a> (SSE)</li>
                </ul>
              </body>
            </html>
            """,
            200,
            {"Content-Type": "text/html"},
        )

    @app.get("/healthz")
    def healthz():
        return jsonify({"status": "ok"}), 200

    @app.get("/version")
    def version():
        return jsonify({"version": os.getenv("APP_VERSION", "0.1.0")}), 200

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5002")), debug=True)


