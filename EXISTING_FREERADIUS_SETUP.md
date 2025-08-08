# Connecting to Your Existing FreeRADIUS Server

## 🎯 Overview

This guide shows how to configure LIQUID Hotspot to work with your **existing FreeRADIUS server** with automatic user creation.

## 📋 Required Setup

### 1. **Configure FreeRADIUS to Use PostgreSQL**

Your FreeRADIUS server must be configured to use the same PostgreSQL database as LIQUID for user authentication.

Edit your FreeRADIUS SQL configuration (`/etc/freeradius/3.0/mods-available/sql`):

```sql
sql {
    driver = "rlm_sql_postgresql"
    dialect = "postgresql"
    
    # Connection info
    server = "localhost"
    port = 5432
    login = "postgres"
    password = "your_password"
    radius_db = "liquid_hotspot"
    
    # Query configuration
    read_clients = yes
    
    # User authentication query
    authorize_check_query = "SELECT id, username, attribute, value, op FROM radius_users WHERE username = '%{SQL-User-Name}' ORDER BY id"
}
```

Enable the SQL module:
```bash
sudo ln -s /etc/freeradius/3.0/mods-available/sql /etc/freeradius/3.0/mods-enabled/sql
```

### 2. **Environment Variables**

Create `backend/.env` with:

```bash
# Database Configuration (shared with FreeRADIUS)
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

# RADIUS Configuration - POINT TO YOUR EXISTING FREERADIUS
RADIUS_HOST=192.168.1.100         # IP of your FreeRADIUS server
RADIUS_PORT=1812                  # Standard RADIUS port
RADIUS_SECRET=your-radius-secret-here  # From your clients.conf
RADIUS_TIMEOUT=5000
RADIUS_RETRIES=3

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

## 🔧 How It Works Now

### **Complete Authentication Flow:**

```
1. User registers on LIQUID captive portal
   ↓ (stores user details in PostgreSQL users table)
   ↓ (automatically creates user in radius_users table)
   
2. User attempts login
   ↓ (LIQUID sends RADIUS request to YOUR FreeRADIUS)
   
3. YOUR FreeRADIUS checks PostgreSQL radius_users table
   ↓ (Access-Accept or Access-Reject)
   
4. If accepted, user gets access
   ↓ (LIQUID sends accounting to YOUR FreeRADIUS)
   ↓ (FreeRADIUS stores accounting in radius_acct table)
```

### **Database Tables:**

- **`users`**: User registration details (name, company, etc.)
- **`radius_users`**: RADIUS authentication data (email as username, phone as password)
- **`radius_acct`**: Session accounting data from FreeRADIUS

## 🛠️ FreeRADIUS Configuration Steps

### **1. Add LIQUID as a RADIUS Client**

Edit your FreeRADIUS `clients.conf`:

```bash
sudo nano /etc/freeradius/3.0/clients.conf
```

Add:
```bash
# LIQUID Hotspot Client
client liquid_hotspot {
    ipaddr = 173.212.222.124  # IP of your LIQUID server
    secret = your-radius-secret-here
    shortname = liquid
    nas_type = other
}
```

### **2. Configure SQL Authorization**

Edit `/etc/freeradius/3.0/sites-available/default`:

Find the `authorize` section and ensure `sql` is included:
```bash
authorize {
    # ... other modules ...
    sql
    # ... other modules ...
}
```

### **3. Restart FreeRADIUS**
```bash
sudo systemctl restart freeradius
sudo systemctl status freeradius
```

## ✅ Testing Steps

### **1. Test Database Setup**
```bash
# Check if tables exist
sudo -u postgres psql -d liquid_hotspot -c "\dt"

# Check sample data
sudo -u postgres psql -d liquid_hotspot -c "SELECT * FROM radius_users;"
```

### **2. Test RADIUS Authentication**
```bash
# Test with existing sample user
radtest john@example.com 1234567890 192.168.1.100 1812 your-radius-secret

# Expected output:
# Sent Access-Request...
# Received Access-Accept...
```

### **3. Test Full Registration Flow**
1. Register a new user on LIQUID captive portal
2. Check that user appears in both tables:
   ```sql
   SELECT * FROM users WHERE email = 'newuser@example.com';
   SELECT * FROM radius_users WHERE username = 'newuser@example.com';
   ```
3. Try to login with the new user
4. Check FreeRADIUS logs: `sudo tail -f /var/log/freeradius/radius.log`

## 🔍 Troubleshooting

### **Issue: "User not found in system" after successful RADIUS auth**
- User exists in `radius_users` but not in `users` table
- Check registration process completed fully

### **Issue: "Access-Reject" from FreeRADIUS**
- Check FreeRADIUS SQL configuration
- Verify database connection from FreeRADIUS
- Check logs: `sudo freeradius -X`

### **Issue: SQL connection errors in FreeRADIUS**
- Verify PostgreSQL credentials in FreeRADIUS config
- Check PostgreSQL `pg_hba.conf` allows FreeRADIUS connections
- Test: `psql -h localhost -U postgres -d liquid_hotspot`

### **Check FreeRADIUS Logs:**
```bash
# Enable debug mode
sudo systemctl stop freeradius
sudo freeradius -X

# Or check logs
sudo tail -f /var/log/freeradius/radius.log
```

## 📊 What LIQUID Does Now

### **Registration:**
✅ Stores user details in PostgreSQL `users` table  
✅ **Automatically creates user in `radius_users` table**  
✅ User can login immediately after registration  

### **Login:**
✅ Sends RADIUS Access-Request to your FreeRADIUS  
✅ FreeRADIUS checks `radius_users` table  
✅ Creates JWT token for portal access  

### **Accounting:**
✅ Sends RADIUS accounting Start/Stop to your FreeRADIUS  
✅ FreeRADIUS stores data in `radius_acct` table  

### **User Management:**
✅ Admin panel shows users from PostgreSQL  
✅ Usage data from `radius_acct` table  
✅ Export functionality included  

## 🔄 Integration Summary

**LIQUID Captive Portal** ← manages users → **PostgreSQL Database** ← reads from → **Your FreeRADIUS**

- **LIQUID**: Web interface, user registration, automatic RADIUS user creation
- **PostgreSQL**: Shared database for user data and RADIUS authentication
- **FreeRADIUS**: Authentication server reading from PostgreSQL
- **MikroTik**: Points to your FreeRADIUS for authentication

**Key Advantage**: Users register once and can login immediately - no manual setup required! 