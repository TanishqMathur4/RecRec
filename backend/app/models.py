import uuid
from datetime import datetime, timezone, date
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
    sex = db.Column(db.String(10), nullable=False)
    height_cm = db.Column(db.Float, nullable=False)
    weight_kg = db.Column(db.Float, nullable=False)
    activity_level = db.Column(db.String(20), nullable=False)
    goal = db.Column(db.String(20), nullable=False)
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


class Ingredient(db.Model):
    """Normalized ingredient — 'chicken breast' appears once regardless of how many recipes use it."""
    __tablename__ = "ingredients"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False, index=True)
    usda_fdc_id = db.Column(db.Integer, nullable=True)
    kcal_per_100g = db.Column(db.Float, nullable=True)
    protein_g_per_100g = db.Column(db.Float, nullable=True)
    carbs_g_per_100g = db.Column(db.Float, nullable=True)
    fat_g_per_100g = db.Column(db.Float, nullable=True)
    fiber_g_per_100g = db.Column(db.Float, nullable=True)

    recipe_ingredients = db.relationship("RecipeIngredient", back_populates="ingredient")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "usda_fdc_id": self.usda_fdc_id,
            "kcal_per_100g": self.kcal_per_100g,
            "protein_g_per_100g": self.protein_g_per_100g,
            "carbs_g_per_100g": self.carbs_g_per_100g,
            "fat_g_per_100g": self.fat_g_per_100g,
            "fiber_g_per_100g": self.fiber_g_per_100g,
        }


class Recipe(db.Model):
    __tablename__ = "recipes"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(255), nullable=False)
    source_url = db.Column(db.String(2048), nullable=True)
    # 'scraped' or 'manual'
    source_type = db.Column(db.String(10), nullable=False, default="manual")
    description = db.Column(db.Text, nullable=True)
    instructions_md = db.Column(db.Text, nullable=True)
    prep_minutes = db.Column(db.Integer, nullable=True)
    cook_minutes = db.Column(db.Integer, nullable=True)
    servings = db.Column(db.Integer, nullable=False, default=1)
    # 1-5
    difficulty = db.Column(db.Integer, nullable=True)
    equipment = db.Column(db.JSON, nullable=True, default=list)
    cuisine = db.Column(db.String(100), nullable=True)
    tags = db.Column(db.JSON, nullable=True, default=list)
    image_url = db.Column(db.String(2048), nullable=True)
    created_by_user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    recipe_ingredients = db.relationship("RecipeIngredient", back_populates="recipe",
                                         cascade="all, delete-orphan")
    nutrition_fact = db.relationship("NutritionFact", back_populates="recipe",
                                     uselist=False, cascade="all, delete-orphan")

    def to_dict(self, include_ingredients=False):
        d = {
            "id": self.id,
            "title": self.title,
            "source_url": self.source_url,
            "source_type": self.source_type,
            "description": self.description,
            "instructions_md": self.instructions_md,
            "prep_minutes": self.prep_minutes,
            "cook_minutes": self.cook_minutes,
            "servings": self.servings,
            "difficulty": self.difficulty,
            "equipment": self.equipment or [],
            "cuisine": self.cuisine,
            "tags": self.tags or [],
            "image_url": self.image_url,
            "created_by_user_id": self.created_by_user_id,
            "created_at": self.created_at.isoformat(),
            "nutrition": self.nutrition_fact.to_dict() if self.nutrition_fact else None,
        }
        if include_ingredients:
            d["ingredients"] = [ri.to_dict() for ri in self.recipe_ingredients]
        return d


class RecipeIngredient(db.Model):
    """Join table: which ingredients go in a recipe and how much."""
    __tablename__ = "recipe_ingredients"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipe_id = db.Column(db.String(36), db.ForeignKey("recipes.id"), nullable=False)
    ingredient_id = db.Column(db.String(36), db.ForeignKey("ingredients.id"), nullable=False)
    quantity_grams = db.Column(db.Float, nullable=False)
    original_text = db.Column(db.String(500), nullable=True)

    recipe = db.relationship("Recipe", back_populates="recipe_ingredients")
    ingredient = db.relationship("Ingredient", back_populates="recipe_ingredients")

    def to_dict(self):
        return {
            "id": self.id,
            "ingredient_id": self.ingredient_id,
            "ingredient_name": self.ingredient.name if self.ingredient else None,
            "quantity_grams": self.quantity_grams,
            "original_text": self.original_text,
        }


class NutritionFact(db.Model):
    """Per-serving nutrition snapshot — computed once at ingest time."""
    __tablename__ = "nutrition_facts"

    recipe_id = db.Column(db.String(36), db.ForeignKey("recipes.id"), primary_key=True)
    calories_kcal = db.Column(db.Float, nullable=True)
    protein_g = db.Column(db.Float, nullable=True)
    carbs_g = db.Column(db.Float, nullable=True)
    fat_g = db.Column(db.Float, nullable=True)
    fiber_g = db.Column(db.Float, nullable=True)
    sodium_mg = db.Column(db.Float, nullable=True)
    # 'scraped' or 'computed_from_ingredients'
    source = db.Column(db.String(30), nullable=False, default="computed_from_ingredients")
    # 'high' or 'low'
    nutrition_confidence = db.Column(db.String(5), nullable=False, default="high")
    computed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    recipe = db.relationship("Recipe", back_populates="nutrition_fact")

    def to_dict(self):
        return {
            "calories_kcal": round(self.calories_kcal, 1) if self.calories_kcal is not None else None,
            "protein_g": round(self.protein_g, 1) if self.protein_g is not None else None,
            "carbs_g": round(self.carbs_g, 1) if self.carbs_g is not None else None,
            "fat_g": round(self.fat_g, 1) if self.fat_g is not None else None,
            "fiber_g": round(self.fiber_g, 1) if self.fiber_g is not None else None,
            "sodium_mg": round(self.sodium_mg, 1) if self.sodium_mg is not None else None,
            "source": self.source,
            "nutrition_confidence": self.nutrition_confidence,
            "computed_at": self.computed_at.isoformat(),
        }


class DailyLog(db.Model):
    """One row per user per calendar day — aggregation anchor for meal entries."""
    __tablename__ = "daily_logs"
    __table_args__ = (db.UniqueConstraint("user_id", "date"),)

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    date = db.Column(db.Date, nullable=False, default=lambda: date.today())

    entries = db.relationship("MealEntry", back_populates="daily_log", cascade="all, delete-orphan")


class MealEntry(db.Model):
    """A single recipe logged as eaten within a DailyLog."""
    __tablename__ = "meal_entries"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    daily_log_id = db.Column(db.String(36), db.ForeignKey("daily_logs.id"), nullable=False)
    recipe_id = db.Column(db.String(36), db.ForeignKey("recipes.id"), nullable=False)
    servings = db.Column(db.Float, nullable=False, default=1.0)
    logged_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    daily_log = db.relationship("DailyLog", back_populates="entries")
    recipe = db.relationship("Recipe")

    def to_dict(self):
        n = self.recipe.nutrition_fact
        factor = self.servings
        return {
            "id": self.id,
            "recipe_id": self.recipe_id,
            "recipe_title": self.recipe.title,
            "recipe_image": self.recipe.image_url,
            "servings": self.servings,
            "logged_at": self.logged_at.isoformat(),
            "nutrition": {
                "calories_kcal": round((n.calories_kcal or 0) * factor, 1) if n else None,
                "protein_g":     round((n.protein_g or 0) * factor, 1)     if n else None,
                "carbs_g":       round((n.carbs_g or 0) * factor, 1)       if n else None,
                "fat_g":         round((n.fat_g or 0) * factor, 1)         if n else None,
            },
        }
