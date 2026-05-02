# Macro-Match Recipes — Architecture & Build Plan

A recipe platform where Kim uploads/scrapes recipes, and each eater (you, her brother, her) gets recipes ranked against their personal macro targets and cooking ability.

---

## 1. Executive Summary

**Problem.** Two people who can't cook need recipes that hit their specific macro goals. One person who can cook wants to feed them well. Generic recipe sites don't filter by "what does this body need today."

**Solution.** A web app where:

- Each user goes through onboarding that calculates their personal macro targets from age, weight, height, activity, and goal.
- Kim adds recipes — either by pasting a URL (scraped automatically) or filling a form.
- Each eater gets recipes ranked by how well they match their per-meal macro target.
- *(Later)* Claude rewrites recipes to fit a target, suggests substitutions, scales servings.

**Success criteria for v1.** A real-world test: Kim adds 20 recipes. You log in, see them ranked by your goal. Her brother logs in, sees a different ranking. The site is publicly reachable on a real domain (or `*.vercel.app` / `*.onrender.com`). No localhost.

**Non-goals for v1.** Meal planning, grocery lists, social features, mobile app, payment, image generation. We will build none of these. Resist scope creep — it kills student projects.

---

## 2. The Chef's View (What a Recipe Actually Is)

Macros are necessary but not sufficient. A recipe has at least four axes that matter for your users:

1. **Nutrition** — calories, protein, carbs, fat, fiber per serving. This is what you're matching on.
2. **Technique difficulty** — can you (the non-cook) actually make this? "Sear, deglaze, reduce" is different from "throw in pan, set timer." Critical for you and her brother.
3. **Equipment & time** — does it need a sous-vide and 4 hours, or a pan and 20 minutes?
4. **Ingredient accessibility** — fish sauce and dashi are wonderful, but if you don't have them, the recipe is a wall.

**Architectural implication:** the recipe model needs more than macros. Even if v1 only matches on macros, store the rest now so you don't have to migrate later. A schema migration on day 90 because you forgot `prep_time_minutes` is a tax you don't need to pay.

**One more thing the chef wants you to know.** Nutrition values change with cooking — raw chicken is not cooked chicken (water loss concentrates everything), oil absorption in frying is real, and some sites report nutrition for the cooked dish while others report it for ingredients. Trust the scraper's value when it gives you one; only fall back to ingredient-by-ingredient lookup when it doesn't. Don't try to be clever and "verify" the scraper — you'll be wrong more often than it is.

---

## 3. Stack Decisions

| Layer | Choice | Rationale |
|---|---|---|
| Backend language | Python 3.11+ | Mature recipe-scraping libs, painless Claude integration later, easy free hosting |
| Web framework | Flask + Flask-SQLAlchemy + Flask-Migrate | Small enough to understand top-to-bottom in your first year |
| ORM | SQLAlchemy 2.x | Industry standard, portable across SQLite/Postgres |
| DB (dev) | SQLite | Zero setup |
| DB (prod) | Neon Postgres (free tier) | Free, persistent, branch-able. Drop-in via SQLAlchemy |
| Recipe scraping | recipe-scrapers (PyPI) | Handles 100+ recipe sites already |
| Nutrition lookup | USDA FoodData Central API | Free, official, ~400k foods |
| Similarity | NumPy + scikit-learn cosine similarity | Lightweight, you control the math |
| Auth | Flask-JWT-Extended | Simple JWT, no third-party identity provider yet |
| Frontend build | Vite + React + TypeScript | Modern default. Fast HMR |
| UI library | MUI (Material UI) | Has every component you need |
| Styling | Tailwind alongside MUI | MUI for components, Tailwind for layout glue |
| Frontend hosting | Vercel | Free, instant deploys from GitHub |
| Backend hosting | Render free tier | Free Python hosting. Cold starts ~30s after 15 min idle — acceptable for v1 |
| DB hosting | Neon | Free Postgres, doesn't sleep |
| Domain | `*.vercel.app` and `*.onrender.com` for v1 | $0. Buy a real domain later if you want |

**On Tailwind + MUI together:** use MUI's `sx` prop or `styled` for component-level styling, and Tailwind for layout (`flex`, `grid`, `spacing`) on plain divs. If it gets messy, drop Tailwind — MUI alone is fine. Don't fight the framework.

---

## 4. Domain Model

```
User
  id, email, password_hash, display_name, created_at

HealthProfile           (1:1 with User)
  user_id, age, sex, height_cm, weight_kg,
  activity_level (sedentary|light|moderate|active|very_active),
  goal (cut|maintain|bulk|recomp|gut_health|leaner),
  health_flags (JSON: e.g. {"diabetic": false, "high_bp": true}),
  meals_per_day (default 3),
  updated_at

MacroTarget             (1:1 with HealthProfile, recomputed on profile change)
  user_id, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg,
  computed_at

Recipe
  id, title, source_url (nullable), source_type (scraped|manual),
  description, instructions_md,
  prep_minutes, cook_minutes, servings,
  difficulty (1-5),
  equipment (JSON list),
  cuisine, tags (JSON list),
  image_url, created_by_user_id, created_at

Ingredient                  (normalized — "chicken breast" appears once)
  id, name, usda_fdc_id (nullable),
  kcal_per_100g, protein_g_per_100g, carbs_g_per_100g,
  fat_g_per_100g, fiber_g_per_100g

RecipeIngredient            (join)
  recipe_id, ingredient_id, quantity_grams, original_text

NutritionFact               (per-serving snapshot, computed once at ingest)
  recipe_id, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg,
  source (scraped|computed_from_ingredients),
  nutrition_confidence (high|low),
  computed_at
```

**Why split Recipe from NutritionFact?** Because the source of truth differs. Sometimes the scraped site already gives nutrition (use it). Sometimes you have to compute it from ingredients (use USDA). Keeping it in a separate table makes it obvious where the numbers came from and lets you recompute if your USDA matching improves.

**Why store MacroTarget separately from HealthProfile?** So you can recompute targets without touching the user-supplied profile, and so you can show "your target was X on this date" if you ever want history.

---

## 5. Macro Target Calculation

Use the standard formulas — this is research, not invention.

**Step 1: BMR (Mifflin–St Jeor)**
```
Male:   BMR = 10*weight_kg + 6.25*height_cm - 5*age + 5
Female: BMR = 10*weight_kg + 6.25*height_cm - 5*age - 161
```

**Step 2: TDEE = BMR × activity multiplier**

| Activity | Multiplier |
|---|---|
| Sedentary | 1.2 |
| Light (1–3 days/week) | 1.375 |
| Moderate (3–5) | 1.55 |
| Active (6–7) | 1.725 |
| Very active (2x/day) | 1.9 |

**Step 3: Apply goal modifier**

| Goal | Calorie adjust | Protein g/kg | Fat % cal | Fiber g | Notes |
|---|---|---|---|---|---|
| Cut (lose fat) | TDEE − 500 | 2.0 | 25% | 30 | High protein preserves muscle |
| Maintain | TDEE | 1.6 | 30% | 30 | |
| Bulk (gain) | TDEE + 350 | 1.8 | 25% | 35 | Slow bulk |
| Recomp / leaner | TDEE − 200 | 2.2 | 25% | 30 | Slight deficit, very high protein |
| Bodybuilding | TDEE + 200 | 2.2 | 20% | 35 | High protein, lower fat |
| Gut health | TDEE | 1.6 | 30% | 40 | Fiber-forward |

**Step 4: Carbs = remainder**
```
calories_from_protein = protein_g * 4
calories_from_fat     = total_kcal * fat_pct
calories_from_carbs   = total_kcal - calories_from_protein - calories_from_fat
carbs_g               = calories_from_carbs / 4
```

Per-meal target = daily target / `meals_per_day`. This is what the matcher compares each recipe against.

**Guardrails.** If `health_flags.diabetic` is true, cap carbs%. If `high_bp`, surface low-sodium recipes (sodium is tracked in `NutritionFact.sodium_mg` for this reason).

---

## 6. Matching Algorithm

### v1 — Weighted cosine similarity on normalized macro vector

For each recipe, build a 5-vector of macros per serving:
```
r = [protein_g, carbs_g, fat_g, fiber_g, calories_kcal]
```

For the user, build the per-meal target the same way:
```
t = [protein_target/meals, carbs_target/meals, fat_target/meals,
     fiber_target/meals, calories_target/meals]
```

Normalize each vector by the target (so each dimension becomes "fraction of target hit"):
```
r_norm = r / t        # element-wise
t_norm = [1, 1, 1, 1, 1]
```

Cosine similarity between `r_norm` and `t_norm` measures shape match. But cosine alone misses magnitude — so combine:
```python
shape_score      = cosine(r_norm, t_norm)            # 0 to 1
magnitude_score  = 1 - min(1, abs(sum(r) - sum(t)) / sum(t))
final_score      = 0.7 * shape_score + 0.3 * magnitude_score
```

### v1.1 — Goal-weighted cosine (do this in v1.1)

Weight the dimensions by goal — protein matters more for cut, fiber matters more for gut health:
```python
goal_weights = {
    'cut':        [3.0, 1.0, 1.0, 1.5, 2.0],   # protein + cal-control heavy
    'bulk':       [2.0, 1.5, 1.0, 1.0, 2.0],
    'gut_health': [1.0, 1.0, 1.0, 4.0, 1.0],   # fiber-dominant
    # ... etc
}
```

### v2 — Claude semantic layer (future)

Keep the macro score but add a semantic component — embed the recipe's name + tags + ingredients, embed the user's preferences, take dot product, blend with macro score. Claude can also propose modifications to push a recipe closer to a target.

---

## 7. Recipe Ingestion Pipeline

**Path A — URL paste (scrape):**
```
URL → recipe-scrapers → normalized Recipe + Ingredients
                     → if scraper returned nutrition: store directly
                     → else: USDA lookup per ingredient → compute → store
```

**Path B — manual form:**
```
Form → Recipe + RecipeIngredients with quantity_grams
     → USDA lookup per ingredient → compute NutritionFact → store
```

**USDA lookup gotcha.** `recipe-scrapers` gives you ingredient strings like "1 ½ cups diced chicken breast." You need to: (a) parse quantity + unit + name, (b) convert unit to grams, (c) match name to USDA. Use `ingredient-parser-nlp` for parsing. For unit→gram conversion, ship a small lookup table for the 50 most common ingredients (covers 80% of cases). For unknown ingredients, fall back to a sensible density default and flag `nutrition_confidence='low'`.

Don't try to be perfect here. `nutrition_confidence` lets the UI show a warning rather than blocking ingestion.

---

## 8. API Surface (Flask Blueprints)

```
POST   /api/auth/register          {email, password, display_name}
POST   /api/auth/login             {email, password} → JWT
GET    /api/auth/me                → current user

GET    /api/profile                → HealthProfile + MacroTarget
PUT    /api/profile                {age, weight_kg, ...} → recomputes target

POST   /api/recipes                {title, ingredients, instructions, ...} (manual)
POST   /api/recipes/scrape         {url} → scrapes, returns recipe id
GET    /api/recipes/:id
GET    /api/recipes                ?ranked_for=me&limit=20 → ranked list

POST   /api/match                  {recipe_id} → score + breakdown (debug)
```

REST + JSON. No GraphQL. No WebSockets.

---

## 9. Frontend Structure

```
src/
  api/                    # one file per resource — typed fetch wrappers
    client.ts
    auth.ts
    profile.ts
    recipes.ts
  components/
    onboarding/           # multi-step wizard (MUI Stepper)
    recipes/
      RecipeCard.tsx
      RecipeDetail.tsx
      RecipeUploadForm.tsx
      RecipeFromUrl.tsx
    common/
      MacroBar.tsx        # the visual centrepiece — see below
  pages/
    Login.tsx
    Onboarding.tsx
    Home.tsx              # ranked recipe feed
    RecipeDetailPage.tsx
    AddRecipe.tsx
    Profile.tsx
  context/
    AuthContext.tsx
  App.tsx
  main.tsx
```

**The visual centrepiece is the MacroBar.** A four-segment bar (protein/carbs/fat/fiber) that shows the recipe's macros vs. the user's per-meal target. Filled bars when it hits target, hollow with a number when it overshoots, ghost when it's short. This is where the product's value becomes legible at a glance.

---

## 10. Repo Layout

```
RecRec/
  README.md
  ARCHITECTURE.md
  .gitignore
  backend/
    app/
      __init__.py
      models.py
      config.py
      extensions.py
      auth/
      profile/
      recipes/
      matching/
      nutrition/
    migrations/
    tests/
    requirements.txt
    .env.example
    Dockerfile
  frontend/
    package.json
    vite.config.ts
    src/
    .env.example
  .github/
    workflows/
      backend-ci.yml
      frontend-ci.yml
```

---

## 11. Deployment Plan ($0)

1. **GitHub repo.** Public is fine.
2. **Frontend → Vercel.** Connect repo, set root to `frontend/`, env var `VITE_API_BASE_URL=https://your-backend.onrender.com`. Auto-deploys on push to `main`.
3. **Backend → Render.** New "Web Service" → connect repo → root `backend/` → build `pip install -r requirements.txt` → start `gunicorn "app:create_app()"`. Free plan.
4. **DB → Neon.** Sign up, create project, copy connection string into Render env var `DATABASE_URL`.
5. **CORS.** Backend allows the Vercel origin. Use `flask-cors`, configure from env `FRONTEND_ORIGIN`.
6. **Secrets.** `JWT_SECRET_KEY`, `USDA_API_KEY`, `DATABASE_URL` go in Render's env panel — never in git.
7. **Cold-start mitigation (optional).** GitHub Actions cron that pings the backend every 14 min during your demo window.

---

## 12. Phased Build Plan

Build phases in order. Verify locally after each before moving on.

| Phase | Focus |
|---|---|
| 0 | Repo skeleton — Flask app factory, Vite+React scaffold, no business logic |
| 1 | Auth — register/login/me, JWT, User model, frontend Login/Register pages |
| 2 | Health profile + onboarding — HealthProfile, MacroTarget, Mifflin-St Jeor, MUI Stepper |
| 3 | Recipe model + manual upload — Recipe/Ingredient/NutritionFact, USDA client, AddRecipe form |
| 4 | URL scraping — recipe-scrapers integration, ingredient parsing, POST /api/recipes/scrape |
| 5 | Matching engine — cosine similarity, GET /api/recipes?ranked_for=me, MacroBar component |
| 6 | Polish — empty states, loading skeletons, error toasts, form validation, 404/500 handlers |
| 7 | Deployment — Neon + Render + Vercel, end-to-end smoke test from live URLs |
| 8 | Claude integration (future) — recipe modification, natural-language entry, SSE streaming |

---

## 13. Things Explicitly Not in v1

- Email verification
- Password reset (manually reset in DB if needed)
- Image uploads from device (use scraped image URLs)
- Roles / permissions
- Internationalisation
- Caching layer (Redis)
- Background jobs (Celery) — synchronous is fine until ingredient lookup gets slow

If any of these become urgent, they are their own phase, not a smuggled-in side quest.

---

## 14. What to Do Right Now, In Order

1. Read this whole document. Question anything that doesn't make sense.
2. Verify Phase 0 runs locally (`pytest` passes, `flask run` starts, `npm run dev` starts).
3. Work through phases in order. Do not skip verification — bugs caught at phase boundaries are cheap; bugs caught at deployment are expensive.
4. When something feels wrong, stop and ask. Read the diffs.

*The chef says: mise en place matters for code too. Get your foundations clean and the rest cooks itself.*
