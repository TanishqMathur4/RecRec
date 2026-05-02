from flask import Flask
from dotenv import load_dotenv

load_dotenv()

from .config import Config
from .extensions import db, migrate, jwt, cors


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGIN"]}})

    # Import models so Flask-Migrate can detect them
    from . import models  # noqa: F401

    from .auth.routes import auth_bp
    from .profile.routes import profile_bp
    from .recipes.routes import recipes_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(recipes_bp)

    return app
