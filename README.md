# FraudGuard

A full-stack fraud-detection dashboard with rule-based + ML scoring, LLM-generated
explanations, and an analyst review queue. Built as a portfolio project that wires
together Flask, MySQL, scikit-learn, Gemini, and React + Recharts.

```
              ┌───────────────────────────────────────────────────────────────┐
              │                       React Frontend (5173)                   │
              │  Login/Register · Dashboard · Transactions · Alerts · Detail │
              └───────────────────────────┬───────────────────────────────────┘
                                          │  axios + JWT (Bearer)
                                          ▼
              ┌───────────────────────────────────────────────────────────────┐
              │                    Flask API (5000)                          │
              │  /auth  /transactions  /alerts  /analytics/summary           │
              └─────────┬─────────────────────────────┬─────────────────────┘
                        │                             │
                        ▼                             ▼
       ┌────────────────────────────┐   ┌──────────────────────────────────┐
       │  Rules Engine (services/)  │   │   ML Layer (app/ml/model.py)     │
       │  · velocity (>3 in 5 min)  │   │  scikit-learn LogisticRegression │
       │  · amount spike (>5x avg)  │   │  features: amount, hour, category│
       │  · location jump (>500 km) │   │  velocity, ML confidence 0-100   │
       └─────────────┬──────────────┘   └────────────────┬─────────────────┘
                     │                                   │
                     └────────────┐         ┌────────────┘
                                  ▼         ▼
                       ┌─────────────────────────────┐
                       │   Combined risk + pipeline  │
                       │   50% rules + 50% ML        │
                       └────────────┬────────────────┘
                                    │  if risk > 60
                                    ▼
                       ┌─────────────────────────────┐
                       │   LLM (Gemini) explanation  │
                       │   fallback if no key/error  │
                       └────────────┬────────────────┘
                                    ▼
                       ┌─────────────────────────────┐
                       │   MySQL: users / accounts   │
                       │   transactions / alerts     │
                       └─────────────────────────────┘
```

---

## Tech stack

| Layer        | Choice                                                        |
| ------------ | ------------------------------------------------------------- |
| Frontend     | React 18 + Vite + Tailwind CSS + Recharts + React Router      |
| Backend      | Python 3.11+, Flask 3, Flask-CORS, SQLAlchemy 2, PyMySQL      |
| Database     | MySQL 8 (primary) · MongoDB (optional raw event log)          |
| ML           | scikit-learn (LogisticRegression / IsolationForest) + joblib  |
| LLM          | Google Gemini (`gemini-1.5-flash`) via REST, with template fallback |
| Auth         | JWT (PyJWT) + Werkzeug password hashing                       |
| Tests        | Postman collection (success + failure cases per endpoint)     |

---

## Project layout

```
fraudguard/
├── backend/
│   ├── app/
│   │   ├── __init__.py            # Flask app factory
│   │   ├── auth.py                # JWT helpers + decorators
│   │   ├── config.py              # env-driven Config
│   │   ├── db.py                  # SQLAlchemy engine/session
│   │   ├── models/__init__.py     # ORM models
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── transactions.py
│   │   │   ├── alerts.py
│   │   │   └── analytics.py
│   │   ├── services/
│   │   │   ├── rules.py           # fraud rules engine
│   │   │   ├── llm.py             # Gemini explanation + fallback
│   │   │   └── pipeline.py        # orchestrates rules + ML + LLM
│   │   └── ml/
│   │       └── model.py           # train/save/score scikit-learn
│   ├── sql/schema.sql             # MySQL DDL
│   ├── scripts/
│   │   ├── seed.py                # 500+ fake transactions + train ML
│   │   └── smoke_test.py          # local SQLite-backed smoke test
│   ├── artifacts/                 # trained model artifact lives here
│   ├── requirements.txt
│   ├── .env.example
│   └── run.py                     # `python run.py`
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # router
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── components/            # Layout, ProtectedRoute, SummaryCard
│   │   ├── lib/                   # api.js (axios), format.js
│   │   └── pages/                 # Login, Register, Dashboard, ...
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── .env.example
├── postman/
│   └── fraudguard.postman_collection.json
├── README.md
└── .gitignore
```

---

## Setup

### 1. Prerequisites

- Python 3.11+ (tested with 3.13)
- Node 18+
- MySQL 8 (or run with a cloud DB; connection string is configurable)

### 2. Database

```bash
mysql -u root -p < backend/sql/schema.sql
```

### 3. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env       # then edit DB creds + JWT secret + Gemini key
python scripts/seed.py     # creates 8 users + 10 accounts + ~550 transactions
                           # and trains the ML model into artifacts/
python run.py              # serves on http://localhost:5000
```

Seeded credentials (all use password `password123`):

| Email                     | Role    |
| ------------------------- | ------- |
| user1@fraudguard.dev      | admin   |
| user2@fraudguard.dev … user10@fraudguard.dev | analyst |

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:5000`, so CORS just works.

---

## API documentation

Base URL: `http://localhost:5000`. All authenticated routes require `Authorization: Bearer <token>`.

| Method | Path                              | Auth | Description                                            |
| ------ | --------------------------------- | ---- | ------------------------------------------------------ |
| GET    | `/api/health`                     | —    | Service health check                                   |
| POST   | `/api/auth/register`              | —    | Create a user (admin/analyst), returns JWT             |
| POST   | `/api/auth/login`                 | —    | Returns JWT                                            |
| POST   | `/api/transactions`               | ✅   | Score + persist a transaction                          |
| GET    | `/api/transactions`               | ✅   | Paginated list; filters: `status`, `min_risk_score`, `max_risk_score`, `start_date`, `end_date` |
| GET    | `/api/transactions/:id`           | ✅   | Detail incl. alert + LLM explanation                   |
| GET    | `/api/alerts`                     | ✅   | Paginated; filter: `review_status`                     |
| PATCH  | `/api/alerts/:id`                 | ✅   | Mark `false_positive` or `confirmed_fraud`             |
| GET    | `/api/analytics/summary`          | ✅   | Totals + 30-day flagged/cleared/pending series         |

### Example payloads

**POST /api/auth/register**
```json
{ "name": "Alex", "email": "alex@x.dev", "password": "password123", "role": "analyst" }
```

**POST /api/transactions**
```json
{
  "account_id": 1,
  "amount": 4500.00,
  "merchant": "Best Buy",
  "category": "electronics",
  "latitude": 35.6762,
  "longitude": 139.6503,
  "location": "Tokyo, JP",
  "timestamp": "2026-09-04T03:30:00"
}
```

**Response (201)**
```json
{
  "transaction": {
    "id": 612, "account_id": 1, "amount": 4500.0, "merchant": "Best Buy",
    "category": "electronics", "latitude": 35.6762, "longitude": 139.6503,
    "location": "Tokyo, JP", "timestamp": "2026-09-04T03:30:00",
    "status": "flagged", "risk_score": 87.43
  },
  "rule_hits": [
    { "name": "velocity", "triggered": false, "weight": 0,   "reason": "velocity normal" },
    { "name": "amount_spike", "triggered": true, "weight": 30, "reason": "Amount 4500 is 6.2x the 30-day average of 725.81." },
    { "name": "location_jump", "triggered": true, "weight": 40, "reason": "10347 km from previous txn at São Paulo (5 days earlier)." }
  ],
  "ml_score": 92.4,
  "ml_confidence": 92.4,
  "alert": {
    "id": 87, "transaction_id": 612, "rule_triggered": "amount_spike,location_jump",
    "ml_confidence": 92.4,
    "explanation": "Transaction flagged with risk score 87.43/100. Amount 4500 at Best Buy (Tokyo) at 2026-09-04T03:30 triggered the following rules: amount_spike, location_jump. Recommend an analyst review before approval.",
    "review_status": "pending"
  }
}
```

---

## Fraud detection pipeline

1. **Rules engine** (`app/services/rules.py`) — three weighted rules:
   - `velocity` (>3 txns in 5 min, weight 35)
   - `amount_spike` (>5× 30-day rolling avg, weight 30)
   - `location_jump` (>500 km from prior txn within 1 h, haversine distance, weight 40)
2. **ML layer** (`app/ml/model.py`) — scikit-learn pipeline:
   - Features: `amount`, `hour_of_day`, `velocity_count`, one-hot `category`
   - Cold-start fallback: IsolationForest, otherwise LogisticRegression
   - Output: ML confidence (0–100)
3. **Combination** — `final_score = 0.5 × rule_score + 0.5 × ml_score`, clamped to 100.
   Status thresholds: `flagged` ≥ 60, `pending` 25–59, `cleared` < 25.
4. **LLM explanation** — when `final_score > 60`, call Gemini. On any failure
   (no key, network error, bad response), fall back to a deterministic template
   so the API always returns an explanation.

---

## Postman collection

Import `postman/fraudguard.postman_collection.json` into Postman:

1. **File → Import → Upload Files** → pick `postman/fraudguard.postman_collection.json`
2. The collection registers a test user (`smoke@fraudguard.dev`), logs in to capture
   a token, then exercises every endpoint with both a success and a failure case.
3. Pre-set variables: `baseUrl`, `token`, `transactionId`, `alertId`.

Run the requests top-to-bottom. Tests on each request assert the expected status code.

---

## Smoke test (no MySQL required)

The repo includes `backend/scripts/smoke_test.py`, which boots the rules/ML/LLM
pipeline against an in-memory SQLite database and verifies the wiring end-to-end:

```bash
cd backend
python scripts/smoke_test.py
```

---

## Commit history convention

This repo was built one feature at a time (schema → auth → rules → ML → LLM →
API → frontend). For a real project, you'd typically see commits like:

```
chore: scaffold backend + frontend folders
feat(schema): add MySQL DDL for users, accounts, transactions, alerts
feat(backend): SQLAlchemy ORM models
feat(backend): JWT auth (register/login) + decorators
feat(backend): rule-based fraud detection engine (velocity, amount, location)
feat(backend): scikit-learn ML layer with persisted joblib artifact
feat(backend): Gemini LLM explanation layer + template fallback
feat(backend): REST API (transactions, alerts, analytics)
feat(backend): seed script (550 transactions, 6% anomalies)
test(backend): smoke test for rules/ML/LLM/pipeline
docs(api): Postman collection (success + failure cases)
feat(frontend): Vite + React + Tailwind scaffold
feat(frontend): auth pages (Login/Register)
feat(frontend): dashboard with summary cards + Recharts line chart
feat(frontend): transactions table with filters + color-coded risk rows
feat(frontend): transaction detail view with LLM explanation + review actions
feat(frontend): alerts queue with review workflow
docs: README + .env.example + architecture diagram
```

---

## License

MIT — feel free to fork and adapt for your own portfolio.
