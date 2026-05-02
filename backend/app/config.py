import os


def _fix_db_url(url: str) -> str:
    # Render and Heroku still emit postgres:// but SQLAlchemy 2.x requires postgresql://
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


class Config:
    _raw_db_url = os.environ.get("DATABASE_URL", "sqlite:///dev.db")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
    USDA_API_KEY = os.environ.get("USDA_API_KEY", "")
    FLASK_ENV = os.environ.get("FLASK_ENV", "development")
    FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")

    SQLALCHEMY_DATABASE_URI = _fix_db_url(_raw_db_url)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
