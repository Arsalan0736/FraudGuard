"""Local smoke test: spin up SQLite, run rules + ML, run pipeline.

This validates the backend modules end-to-end without MySQL.
"""
from __future__ import annotations

import os
import sys
import types
from datetime import datetime, timedelta

# Point Config at SQLite BEFORE importing app.*
import sqlalchemy as sa
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

ROOT = r"C:/Users/Arsalan/OpenWork Chat/fraudguard/backend"
sys.path.insert(0, ROOT)

# Stub MySQL URI in config
import importlib
from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, ForeignKey, Text
spec_cfg = importlib.util.spec_from_file_location("app.config", os.path.join(ROOT, "app/config.py"))
cfg_mod = importlib.util.module_from_spec(spec_cfg)
sys.modules["app.config"] = cfg_mod
spec_cfg.loader.exec_module(cfg_mod)
cfg_mod.Config.db_uri = staticmethod(lambda: "sqlite:///:memory:")
cfg_mod.Config.MODEL_PATH = os.path.join(ROOT, "artifacts", "smoke_model.joblib")

# Build a parallel SQLite-backed models module to avoid ENUM issues
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(120))
    email = Column(String(180))
    password_hash = Column(String(255))
    role = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)

class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    account_number = Column(String(32))
    balance = Column(DECIMAL(14, 2))
    created_at = Column(DateTime, default=datetime.utcnow)

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    amount = Column(DECIMAL(14, 2))
    merchant = Column(String(160))
    category = Column(String(60), default="other")
    latitude = Column(DECIMAL(9, 6))
    longitude = Column(DECIMAL(9, 6))
    location = Column(String(120))
    timestamp = Column(DateTime)
    status = Column(String(20), default="pending")
    risk_score = Column(DECIMAL(5, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"))
    rule_triggered = Column(String(255))
    ml_confidence = Column(DECIMAL(5, 2))
    explanation = Column(Text)
    reviewed_by = Column(Integer)
    review_status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

# Inject our test models into sys.modules
sys.modules["app.models"] = types.SimpleNamespace(
    Base=Base, User=User, Account=Account, Transaction=Transaction, Alert=Alert,
)

# db module using these tables
engine = create_engine(cfg_mod.Config.db_uri(), future=True)
SessLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base.metadata.create_all(engine)

def get_session():
    return SessLocal()

sys.modules["app.db"] = types.SimpleNamespace(
    get_session=get_session, init_db=lambda: Base.metadata.create_all(engine),
    engine=engine,
)

# Now import the actual services
spec_rules = importlib.util.spec_from_file_location("app.services.rules", os.path.join(ROOT, "app/services/rules.py"))
rules_mod = importlib.util.module_from_spec(spec_rules); sys.modules["app.services.rules"] = rules_mod
spec_rules.loader.exec_module(rules_mod)

spec_ml = importlib.util.spec_from_file_location("app.ml.model", os.path.join(ROOT, "app/ml/model.py"))
ml_mod = importlib.util.module_from_spec(spec_ml); sys.modules["app.ml.model"] = ml_mod
spec_ml.loader.exec_module(ml_mod)

spec_llm = importlib.util.spec_from_file_location("app.services.llm", os.path.join(ROOT, "app/services/llm.py"))
llm_mod = importlib.util.module_from_spec(spec_llm); sys.modules["app.services.llm"] = llm_mod
spec_llm.loader.exec_module(llm_mod)

# Inject current models into rules/llm by re-pointing imports
rules_mod.Transaction = Transaction
ml_mod.Transaction = Transaction

# Override velocity helper to use our Transaction
def velocity_for_tx(session, tx, window_minutes=5):
    from sqlalchemy import select, func
    start = tx.timestamp - timedelta(minutes=window_minutes)
    return session.scalar(
        select(func.count(Transaction.id))
        .where(Transaction.account_id == tx.account_id)
        .where(Transaction.timestamp >= start)
        .where(Transaction.timestamp <= tx.timestamp)
    ) or 0
ml_mod._velocity_for_tx = velocity_for_tx

# --- 1. test rules -----------------------------------------------------------
print("== haversine ==")
print(" NYC -> LA :", round(rules_mod.haversine_km(40.7128,-74.0060, 34.0522,-118.2437), 1), "km")
print(" NYC -> Berlin:", round(rules_mod.haversine_km(40.7128,-74.0060, 52.52, 13.405), 1), "km")

print("\n== rules against empty DB ==")
r = rules_mod.run_rules(
    account_id=1, amount=100, merchant="Test", latitude=40.7, longitude=-74.0,
    location="NYC", timestamp=datetime.utcnow(),
)
for h in r.hits:
    print(f"  {h.name:15s} triggered={h.triggered} weight={h.weight} reason={h.reason}")
print(" score:", r.score)

print("\n== LLM fallback (no API key) ==")
cfg_mod.Config.GEMINI_API_KEY = ""
print(" ", llm_mod.explain(amount=5000, merchant="Best Buy", location="Tokyo",
                          timestamp=datetime(2026,1,1,3,0), risk_score=85,
                          rules=["amount_spike", "velocity"]))

# --- 2. seed data + train ML + ingest --------------------------------------
print("\n== ingest pipeline ==")
sess = SessLocal()
u = User(name="Tester", email="t@t.dev", password_hash="x", role="admin")
sess.add(u); sess.commit()
acct = Account(user_id=u.id, account_number="FG000001", balance=1000)
sess.add(acct); sess.commit()

# Train a quick ML model
ml_mod.train(
    rows=[
        {"amount":50,"hour_of_day":13,"velocity_count":1,"category":"groceries"},
        {"amount":30,"hour_of_day":14,"velocity_count":1,"category":"restaurants"},
        {"amount":8000,"hour_of_day":2,"velocity_count":5,"category":"electronics"},
        {"amount":9500,"hour_of_day":3,"velocity_count":2,"category":"travel"},
    ],
    labels=[0,0,1,1],
)
ml_mod.save_model(ml_mod.train(
    rows=[{"amount":50,"hour_of_day":13,"velocity_count":1,"category":"groceries"},
          {"amount":8000,"hour_of_day":2,"velocity_count":5,"category":"electronics"}],
    labels=[0,1]))

# Ingest a clearly anomalous transaction
spec_pipe = importlib.util.spec_from_file_location("app.services.pipeline", os.path.join(ROOT, "app/services/pipeline.py"))
pipe = importlib.util.module_from_spec(spec_pipe); sys.modules["app.services.pipeline"] = pipe
spec_pipe.loader.exec_module(pipe)
pipe.Account = Account
pipe.Transaction = Transaction
pipe.Alert = Alert
pipe.get_session = get_session

result = pipe.ingest_transaction(acct.id, {
    "amount": 5000, "merchant": "Best Buy", "category": "electronics",
    "latitude": 35.6762, "longitude": 139.6503,
    "location": "Tokyo, JP", "timestamp": datetime.utcnow().isoformat(),
})
print(" status:", result["transaction"]["status"], "risk:", result["transaction"]["risk_score"])
if "alert" in result:
    print(" alert id:", result["alert"]["id"], "explanation:", result["alert"]["explanation"][:120], "...")
print("\nALL OK")
