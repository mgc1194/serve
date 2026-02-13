-- ============================================================
-- Budget Tracker - MySQL 8.0 Schema
-- Run once to initialize the database
-- ============================================================

CREATE DATABASE IF NOT EXISTS budget
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE budget;

-- Create the transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id                VARCHAR(32)    NOT NULL PRIMARY KEY,  -- MD5 hex (always 32 chars)
    date              DATE           NOT NULL,
    concept           TEXT           NOT NULL,
    account           VARCHAR(255)   NOT NULL,
    amount            DECIMAL(12, 2) NOT NULL,
    label             VARCHAR(255)   DEFAULT NULL,          -- manually assigned; never overwritten on re-import
    category          VARCHAR(255)   DEFAULT NULL,          -- manually assigned; never overwritten on re-import
    additional_labels TEXT           DEFAULT NULL,          -- comma-separated extra tags; never overwritten on re-import
    imported_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common query patterns
CREATE INDEX idx_transactions_date         ON transactions (date);
CREATE INDEX idx_transactions_category     ON transactions (category);
CREATE INDEX idx_transactions_label        ON transactions (label);
