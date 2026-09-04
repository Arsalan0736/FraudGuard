"""SQLAlchemy ORM models for FraudGuard."""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DECIMAL, DateTime, Enum, ForeignKey, Text, Index,
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    name          = Column(String(120), nullable=False)
    email         = Column(String(180), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(Enum("admin", "analyst", name="user_role"),
                           nullable=False, default="analyst")
    created_at    = Column(DateTime, nullable=False, default=datetime.utcnow)

    accounts = relationship("Account", back_populates="user", cascade="all, delete")
    reviewed_alerts = relationship("Alert", back_populates="reviewer",
                                   foreign_keys="Alert.reviewed_by")


class Account(Base):
    __tablename__ = "accounts"
    id             = Column(Integer, primary_key=True, autoincrement=True)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                            nullable=False, index=True)
    account_number = Column(String(32), nullable=False, unique=True)
    balance        = Column(DECIMAL(14, 2), nullable=False, default=0)
    created_at     = Column(DateTime, nullable=False, default=datetime.utcnow)

    user         = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account",
                                cascade="all, delete")


class Transaction(Base):
    __tablename__ = "transactions"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"),
                        nullable=False)
    amount     = Column(DECIMAL(14, 2), nullable=False)
    merchant   = Column(String(160), nullable=False)
    category   = Column(String(60), nullable=False, default="other")
    latitude   = Column(DECIMAL(9, 6), nullable=True)
    longitude  = Column(DECIMAL(9, 6), nullable=True)
    location   = Column(String(120), nullable=False)
    timestamp  = Column(DateTime, nullable=False)
    status     = Column(Enum("pending", "flagged", "cleared", name="tx_status"),
                        nullable=False, default="pending")
    risk_score = Column(DECIMAL(5, 2), nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    account = relationship("Account", back_populates="transactions")
    alerts  = relationship("Alert", back_populates="transaction",
                           cascade="all, delete")

    __table_args__ = (
        Index("idx_tx_account_time", "account_id", "timestamp"),
        Index("idx_tx_status", "status"),
        Index("idx_tx_risk", "risk_score"),
    )


class Alert(Base):
    __tablename__ = "alerts"
    id             = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"),
                            nullable=False, index=True)
    rule_triggered = Column(String(255), nullable=False)
    ml_confidence  = Column(DECIMAL(5, 2), nullable=False, default=0)
    explanation    = Column(Text, nullable=True)
    reviewed_by    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"),
                            nullable=True)
    review_status  = Column(Enum("pending", "false_positive", "confirmed_fraud",
                                 name="alert_review"),
                            nullable=False, default="pending")
    created_at     = Column(DateTime, nullable=False, default=datetime.utcnow)

    transaction = relationship("Transaction", back_populates="alerts")
    reviewer    = relationship("User", back_populates="reviewed_alerts",
                               foreign_keys=[reviewed_by])
