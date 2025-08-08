# RADIUS Production Setup Guide

## 🎯 Overview

Your LIQUID Hotspot uses a **built-in RADIUS server** that replaces FreeRADIUS. This guide helps you configure it properly on your Linux production server (IP: 173.212.222.124).

## 📋 Required Components

### 1. **Environment Variables** (`.env` file)
```bash
# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=liquid_hotspot
DB_USER=postgres
DB_PASSWORD=your_actual_db_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3001
NODE_ENV=production

# RADIUS Configuration
RADIUS_HOST=0.0.0.0
RADIUS_PORT=1812
RADIUS_SECRET=your-radius-secret-key
RADIUS_TIMEOUT=5000
RADIUS_RETRIES=3

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 2. **MikroTik Router Configuration**
```bash
# Add RADIUS server to MikroTik
/radius add service=hotspot address=173.212.222.124 secret=your-radius-secret-key

# Configure hotspot to use RADIUS
/ip hotspot profile set hsprof1 use-radius=yes
```

### 3. **Firewall Configuration**
```bash
# Open RADIUS ports
sudo ufw allow 1812/udp  # RADIUS Authentication
sudo ufw allow 1813/udp  # RADIUS Accounting (optional)
sudo ufw allow 3001/tcp  # Backend API
sudo ufw allow 5173/tcp  # Frontend (development)
```

## 🔧 Step-by-Step Setup

### Step 1: Update Environment Variables
```bash
# On your Linux server
cd /path/to/liquid
cp backend/env.example backend/.env
nano backend/.env
```

### Step 2: Configure Database
```bash
# Make sure PostgreSQL is running
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and tables
sudo -u postgres psql -d liquid_hotspot -f backend/setup-database.sql
```

### Step 3: Update and Restart Services
```bash
# Pull latest changes
git pull origin main

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start services
cd ..
npm run start  # or use PM2 for production
```

### Step 4: Test RADIUS Connection
```bash
# Check if RADIUS server is listening
sudo netstat -ulnp | grep 1812

# Test with radtest (if available)
radtest test@example.com phone123 173.212.222.124 1812 your-radius-secret-key
```

## 🌐 Network Configuration

### **Important IP Settings:**

1. **RADIUS_HOST=0.0.0.0** - Binds to all interfaces (allows external connections)
2. **MikroTik points to**: `173.212.222.124:1812`
3. **Secret must match** between MikroTik and LIQUID server

### **Port Requirements:**
- `1812/udp` - RADIUS Authentication
- `1813/udp` - RADIUS Accounting (optional)
- `3001/tcp` - Backend API
- `5432/tcp` - PostgreSQL (local only)

## 🔒 Security Considerations

### **RADIUS Secret:**
- Use a strong, unique secret (32+ characters)
- Same secret on MikroTik and LIQUID server
- Example: `Liq2025_YLS_R4d1us_S3cr3t_K3y_Ch4ng3_M3`

### **Database Security:**
- Strong PostgreSQL password
- Local connections only (don't expose 5432 externally)
- Regular backups

## 🧪 Testing Checklist

### **1. Backend Health Check:**
```bash
curl http://173.212.222.124:3001/health
```

### **2. RADIUS Service Check:**
```bash
# Check if port is open
nc -u 173.212.222.124 1812

# Check logs
tail -f /var/log/liquid/backend.log
```

### **3. Database Connection:**
```bash
# Test database connectivity
psql -h localhost -U postgres -d liquid_hotspot -c "SELECT COUNT(*) FROM users;"
```

### **4. End-to-End Test:**
1. Register a user on the captive portal
2. Check if user appears in database
3. Try to authenticate with MikroTik hotspot
4. Verify session appears in `radius_acct` table

## 🚨 Common Issues

### **Issue: RADIUS not responding**
```bash
# Check if service is running
sudo netstat -ulnp | grep 1812

# Check firewall
sudo ufw status
```

### **Issue: MikroTik can't connect**
- Verify secret matches exactly
- Check firewall allows UDP 1812
- Ensure RADIUS_HOST=0.0.0.0 (not localhost)

### **Issue: Database connection fails**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U postgres -d liquid_hotspot
```

## 📊 Monitoring

### **Log Files:**
- Backend: `backend/logs/`
- RADIUS: Console output or PM2 logs
- PostgreSQL: `/var/log/postgresql/`

### **Health Monitoring:**
```bash
# Check all services
curl http://173.212.222.124:3001/health
systemctl status postgresql
sudo netstat -tulnp | grep -E '(1812|3001|5432)'
```

## 🔄 Production Deployment

### **Using PM2:**
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start backend/server.js --name liquid-backend
pm2 startup
pm2 save
```

### **Using systemd:**
```bash
# Create service file
sudo nano /etc/systemd/system/liquid-backend.service

# Start and enable
sudo systemctl start liquid-backend
sudo systemctl enable liquid-backend
```

---

## ✅ Quick Verification Commands

```bash
# 1. Check all required ports
sudo netstat -tulnp | grep -E '(1812|1813|3001|5432)'

# 2. Test backend
curl http://173.212.222.124:3001/health

# 3. Check database
sudo -u postgres psql -d liquid_hotspot -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"

# 4. Verify environment
cd backend && node -e "require('dotenv').config(); console.log('RADIUS_PORT:', process.env.RADIUS_PORT, 'RADIUS_SECRET:', process.env.RADIUS_SECRET ? 'SET' : 'NOT SET')"
```

**Your RADIUS server will be accessible at: `173.212.222.124:1812`** 