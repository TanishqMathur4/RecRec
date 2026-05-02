from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from ..extensions import db
from ..models import User
from .schemas import RegisterSchema, LoginSchema

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/register")
def register():
    try:
        data = RegisterSchema.from_dict(request.get_json(silent=True) or {})
    except ValueError as e:
        return jsonify({"errors": e.args[0]}), 422

    if User.query.filter_by(email=data.email).first():
        return jsonify({"errors": {"email": "An account with that email already exists."}}), 409

    user = User(email=data.email, display_name=data.display_name)
    user.set_password(data.password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=user.id)
    return jsonify({"access_token": token, "user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    try:
        data = LoginSchema.from_dict(request.get_json(silent=True) or {})
    except ValueError as e:
        return jsonify({"errors": e.args[0]}), 422

    user = User.query.filter_by(email=data.email).first()
    if not user or not user.check_password(data.password):
        return jsonify({"errors": {"email": "Invalid email or password."}}), 401

    token = create_access_token(identity=user.id)
    return jsonify({"access_token": token, "user": user.to_dict()}), 200


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"user": user.to_dict()}), 200
