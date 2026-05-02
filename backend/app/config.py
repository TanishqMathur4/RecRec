import os


class Config:
    DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///dev.db")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
    USDA_API_KEY = os.environ.get("USDA_API_KEY", "")
    FLASK_ENV = os.environ.get("FLASK_ENV", "development")
    FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")

    # SQLAlchemy
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
