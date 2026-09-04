-- FraudGuard MySQL schema
-- Run via: mysql -u root -p < sql/schema.sql

CREATE DATABASE IF NOT EXISTS fraudguard
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fraudguard;

-- Drop in reverse dependency order so the script is rerunnable
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(120)  NOT NULL,
    email         VARCHAR(180)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          ENUM('admin','analyst') NOT NULL DEFAULT 'analyst',
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE accounts (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT           NOT NULL,
    account_number VARCHAR(32)  NOT NULL UNIQUE,
    balance       DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_account_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_accounts_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE transactions (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT           NOT NULL,
    amount     DECIMAL(14,2) NOT NULL,
    merchant   VARCHAR(160)  NOT NULL,
    category   VARCHAR(60)   NOT NULL DEFAULT 'other',
    latitude   DECIMAL(9,6)  NULL,
    longitude  DECIMAL(9,6)  NULL,
    location   VARCHAR(120)  NOT NULL,
    timestamp  DATETIME      NOT NULL,
    status     ENUM('pending','flagged','cleared') NOT NULL DEFAULT 'pending',
    risk_score DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tx_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    INDEX idx_tx_account_time (account_id, timestamp),
    INDEX idx_tx_status (status),
    INDEX idx_tx_risk (risk_score)
) ENGINE=InnoDB;

CREATE TABLE alerts (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id  INT           NOT NULL,
    rule_triggered  VARCHAR(255)  NOT NULL,
    ml_confidence   DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
    explanation     TEXT          NULL,
    reviewed_by     INT           NULL,
    review_status   ENUM('pending','false_positive','confirmed_fraud') NOT NULL DEFAULT 'pending',
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alert_tx FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_alert_user FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_alert_status (review_status),
    INDEX idx_alert_tx (transaction_id)
) ENGINE=InnoDB;
