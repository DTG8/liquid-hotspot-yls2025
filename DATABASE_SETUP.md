# Database Setup Guide - LIQUID Hotspot

## 🗄️ **Using Your Existing PostgreSQL Database**

### **✅ What You Need to Do:**

**1. Create Environment File:**
```bash
# Copy the example file
cp backend/env.example backend/.env

# Edit the file with YOUR database details
nano backend/.env
```

**2. Update Your `.env` File:**
```env
# Database Configuration - USE YOUR EXISTING DATABASE DETAILS
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_existing_database_name
DB_USER=your_existing_username
DB_PASSWORD=your_existing_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3001
NODE_ENV=development

# RADIUS Configuration
RADIUS_SECRET=testing123
RADIUS_PORT=1812

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### **🔧 Database Tables Setup:**

**The app will create these tables in your existing database:**

1. **`users`** - User registration data
2. **`radius_users`** - FreeRADIUS authentication
3. **`radius_acct`** - Usage tracking and accounting

**Run this SQL script in your existing database:**
```sql
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
    acctsessionid VARCHAR(64) NOT NULL UNIQUE,
    acctuniqueid VARCHAR(32),
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
```

### **🚀 Quick Setup Commands:**

**Option 1: Using psql (if you have access):**
```bash
# Connect to your database
psql -h localhost -U your_username -d your_database_name

# Run the setup script
\i backend/setup-database.sql
```

**Option 2: Using the provided script:**
```bash
# Update the script with your database details first
nano backend/setup-database.sql

# Then run it
psql -h localhost -U your_username -d your_database_name -f backend/setup-database.sql
```

### **🔍 Verify Your Setup:**

**1. Test Database Connection:**
```bash
# Start the backend
cd backend
npm start
```

**You should see:**
```
✅ Database connected successfully
🚀 LIQUID Backend running on http://localhost:3001
🔐 FreeRADIUS server running on port 1812
```

**2. Check Tables:**
```sql
-- Connect to your database
psql -h localhost -U your_username -d your_database_name

-- List tables
\dt

-- Check users table
SELECT * FROM users;

-- Check radius tables
SELECT * FROM radius_users;
SELECT * FROM radius_acct;
```

### **⚠️ Important Notes:**

**✅ What the App Does:**
- **Creates tables** in your existing database
- **Uses environment variables** for all database connections
- **No database creation** - uses your existing database
- **Secure credentials** - no hardcoded passwords

**🔒 Security:**
- **Change default passwords** in production
- **Use strong JWT secrets**
- **Keep `.env` file secure** (never commit to Git)

**📁 File Structure:**
```
backend/
├── .env                    # Your database credentials (create this)
├── env.example            # Template file
├── server.js              # Uses environment variables
├── radius-service.js      # Uses environment variables
└── setup-database.sql     # SQL to create tables
```

### **🛠️ Troubleshooting:**

**Database Connection Error:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U your_username -d your_database_name

# Check your .env file
cat backend/.env
```

**Permission Errors:**
```bash
# Make sure your user has permissions
psql -h localhost -U your_username -d your_database_name -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;"
```

**Table Already Exists:**
```sql
-- Drop tables if needed (WARNING: This deletes data!)
DROP TABLE IF EXISTS radius_acct CASCADE;
DROP TABLE IF EXISTS radius_users CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

### **🎯 Summary:**

1. **Copy** `env.example` to `.env`
2. **Update** `.env` with your database details
3. **Run** the SQL script to create tables
4. **Start** the application
5. **Verify** everything works

**Your existing PostgreSQL database will be used, and the app will create the necessary tables automatically!** 🎉 