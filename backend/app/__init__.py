from flask import Flask
from dotenv import load_dotenv

load_dotenv()

from .config import Config
from .extensions import db, migrate, jwt, cors


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGIN"]}})

    from . import models  # noqa: F401

    from .auth.routes import auth_bp
    from .profile.routes import profile_bp
    from .recipes.routes import recipes_bp
    from .log.routes import log_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(recipes_bp)
    app.register_blueprint(log_bp)

    _register_error_handlers(app)

    return app


def _register_error_handlers(app):
    from flask import jsonify
    from flask_jwt_extended.exceptions import NoAuthorizationError, InvalidHeaderError
    from jwt.exceptions import ExpiredSignatureError, DecodeError

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"error": "Not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(_e):
        return jsonify({"error": "Method not allowed."}), 405

    @app.errorhandler(500)
    def internal_error(_e):
        return jsonify({"error": "An unexpected error occurred."}), 500

    @app.errorhandler(NoAuthorizationError)
    @app.errorhandler(InvalidHeaderError)
    def missing_token(_e):
        return jsonify({"error": "Authentication required."}), 401

    @app.errorhandler(ExpiredSignatureError)
    def expired_token(_e):
        return jsonify({"error": "Session expired. Please log in again."}), 401

    @app.errorhandler(DecodeError)
    def bad_token(_e):
        return jsonify({"error": "Invalid token."}), 401
