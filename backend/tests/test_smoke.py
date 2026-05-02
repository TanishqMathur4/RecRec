from flask import Flask
from app import create_app


def test_create_app_returns_flask_instance():
    app = create_app()
    assert isinstance(app, Flask)


def test_app_has_api_config():
    app = create_app()
    assert app.config["SQLALCHEMY_DATABASE_URI"] is not None
    assert app.config["JWT_SECRET_KEY"] is not None
