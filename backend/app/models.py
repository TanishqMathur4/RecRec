import uuid
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from .extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    health_profile = db.relationship("HealthProfile", back_populates="user", uselist=False)
    macro_target = db.relationship("MacroTarget", back_populates="user", uselist=False)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "display_name": self.display_name,
            "created_at": self.created_at.isoformat(),
        }


class HealthProfile(db.Model):
    __tablename__ = "health_profiles"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    age = db.Column(db.Integer, nullable=False)
    # 'male' or 'female'
    sex = db.Column(db.String(10), nullable=False)
    height_cm = db.Column(db.Float, nullable=False)
    weight_kg = db.Column(db.Float, nullable=False)
    # sedentary | light | moderate | active | very_active
    activity_level = db.Column(db.String(20), nullable=False)
    # cut | maintain | bulk | recomp | bodybuilding | gut_health
    goal = db.Column(db.String(20), nullable=False)
    # JSON: {"diabetic": false, "high_bp": false}
    health_flags = db.Column(db.JSON, nullable=False, default=dict)
    meals_per_day = db.Column(db.Integer, nullable=False, default=3)
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship("User", back_populates="health_profile")

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "age": self.age,
            "sex": self.sex,
            "height_cm": self.height_cm,
            "weight_kg": self.weight_kg,
            "activity_level": self.activity_level,
            "goal": self.goal,
            "health_flags": self.health_flags,
            "meals_per_day": self.meals_per_day,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class MacroTarget(db.Model):
    __tablename__ = "macro_targets"

    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), primary_key=True)
    calories_kcal = db.Column(db.Float, nullable=False)
    protein_g = db.Column(db.Float, nullable=False)
    carbs_g = db.Column(db.Float, nullable=False)
    fat_g = db.Column(db.Float, nullable=False)
    fiber_g = db.Column(db.Float, nullable=False)
    sodium_mg = db.Column(db.Float, nullable=True)
    computed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", back_populates="macro_target")

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "calories_kcal": round(self.calories_kcal),
            "protein_g": round(self.protein_g, 1),
            "carbs_g": round(self.carbs_g, 1),
            "fat_g": round(self.fat_g, 1),
            "fiber_g": round(self.fiber_g, 1),
            "sodium_mg": self.sodium_mg,
            "computed_at": self.computed_at.isoformat(),
        }
