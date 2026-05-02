# Macro-Match Recipes

A recipe platform where Kim uploads recipes and each eater gets them ranked against their personal macro targets and cooking ability.

## Local Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # fill in your values
flask --app app db upgrade      # initialise DB (after Phase 1)
flask --app app run             # starts on :5000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # set VITE_API_BASE_URL
npm run dev                     # starts on :5173
```

### Tests

```bash
cd backend
source .venv/bin/activate
pytest
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLAlchemy URI — defaults to `sqlite:///dev.db` |
| `JWT_SECRET_KEY` | Secret for signing JWTs — change in production |
| `USDA_API_KEY` | API key from FoodData Central |
| `FLASK_ENV` | `development` or `production` |
| `FRONTEND_ORIGIN` | Vercel URL for CORS (e.g. `https://your-app.vercel.app`) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend URL (e.g. `https://your-backend.onrender.com`) |

## Deployment

See [ARCHITECTURE.md](ARCHITECTURE.md) section 11 for the full Render + Vercel + Neon deployment guide.
