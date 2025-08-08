-- Create database (run this first)
-- CREATE DATABASE liquid_hotspot;

-- Connect to the database and run these commands:

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FreeRADIUS users table (for authentication)
CREATE TABLE IF NOT EXISTS radius_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    attribute VARCHAR(64) NOT NULL,
    op CHAR(2) NOT NULL,
    value VARCHAR(253) NOT NULL
);

-- FreeRADIUS accounting table (for usage tracking)
CREATE TABLE IF NOT EXISTS radius_acct (
    id SERIAL PRIMARY KEY,
    acctsessionid VARCHAR(64) NOT NULL,
    acctuniqueid VARCHAR(32) NOT NULL,
    username VARCHAR(64) NOT NULL,
    groupname VARCHAR(64),
    realm VARCHAR(64),
    nasipaddress INET,
    nasportid VARCHAR(15),
    nasporttype VARCHAR(32),
    acctstarttime TIMESTAMP,
    acctupdatetime TIMESTAMP,
    acctstoptime TIMESTAMP,
    acctinterval INTEGER,
    acctsessiontime INTEGER,
    acctauthentic VARCHAR(32),
    connectinfo_start VARCHAR(50),
    connectinfo_stop VARCHAR(50),
    acctinputoctets BIGINT,
    acctoutputoctets BIGINT,
    calledstationid VARCHAR(50),
    callingstationid VARCHAR(50),
    acctterminatecause VARCHAR(32),
    servicetype VARCHAR(32),
    framedprotocol VARCHAR(32),
    framedipaddress INET
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_radius_users_username ON radius_users(username);
CREATE INDEX IF NOT EXISTS idx_radius_acct_username ON radius_acct(username);
CREATE INDEX IF NOT EXISTS idx_radius_acct_session ON radius_acct(acctsessionid);

-- Insert sample data for testing
INSERT INTO users (company_name, full_name, email, phone_number) VALUES
('Test Company', 'John Doe', 'john@example.com', '1234567890'),
('Another Corp', 'Jane Smith', 'jane@example.com', '0987654321')
ON CONFLICT (email) DO NOTHING;

INSERT INTO radius_users (username, attribute, op, value) VALUES
('john@example.com', 'Cleartext-Password', ':=', '1234567890'),
('jane@example.com', 'Cleartext-Password', ':=', '0987654321')
ON CONFLICT DO NOTHING; 