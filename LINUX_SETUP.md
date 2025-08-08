# Linux VM Setup Guide - LIQUID Hotspot

## Prerequisites Installation

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js (v18+)
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install PostgreSQL
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Set up database
sudo -u postgres psql -c "CREATE DATABASE liquid_hotspot;"
sudo -u postgres psql -c "CREATE USER liquid_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE liquid_hotspot TO liquid_user;"
```

### 4. Install Git (if not installed)
```bash
sudo apt install git -y
```

## Application Setup

### 1. Clone/Download Project
```bash
# If you have the project files, copy them to VM
# Or clone from your Git repository
git clone https://github.com/YOUR_USERNAME/liquid-hotspot-yls2025.git
cd liquid-hotspot-yls2025
```

### 2. Setup Database
```bash
# Run the database setup script
sudo -u postgres psql -d liquid_hotspot -f backend/setup-database.sql
```

### 3. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 4. Configure Environment
```bash
# Update database connection in backend/server.js
# Change the PostgreSQL connection details:
const pool = new Pool({
  user: 'liquid_user',
  host: 'localhost',
  database: 'liquid_hotspot',
  password: 'your_password', // Use the password you set
  port: 5432,
});
```

## Running the Application

### Option 1: Manual Start (Development)
```bash
# Terminal 1 - Start Backend
cd backend
npm start

# Terminal 2 - Start Frontend
cd frontend
npm run dev
```

### Option 2: Using PM2 (Production)
```bash
# Install PM2
sudo npm install -g pm2

# Start backend with PM2
cd backend
pm2 start server.js --name "liquid-backend"

# Start frontend with PM2
cd ../frontend
pm2 start npm --name "liquid-frontend" -- run dev

# Save PM2 configuration
pm2 save
pm2 startup
```

### Option 3: Using Systemd Services
```bash
# Create systemd service files
sudo nano /etc/systemd/system/liquid-backend.service
```

**Backend Service:**
```ini
[Unit]
Description=LIQUID Hotspot Backend
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/liquid-hotspot-yls2025/backend
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Frontend Service:**
```bash
sudo nano /etc/systemd/system/liquid-frontend.service
```

```ini
[Unit]
Description=LIQUID Hotspot Frontend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/liquid-hotspot-yls2025/frontend
ExecStart=/usr/bin/npm run dev
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Enable and Start Services:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable liquid-backend
sudo systemctl enable liquid-frontend
sudo systemctl start liquid-backend
sudo systemctl start liquid-frontend
```

## Firewall Configuration

### 1. Configure UFW Firewall
```bash
# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow application ports
sudo ufw allow 3001  # Backend
sudo ufw allow 5173  # Frontend (Vite dev server)
sudo ufw allow 1812  # RADIUS authentication
sudo ufw allow 1813  # RADIUS accounting

# Enable firewall
sudo ufw enable
```

### 2. Configure PostgreSQL for Remote Access (Optional)
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/*/main/postgresql.conf
# Uncomment and change: listen_addresses = '*'

sudo nano /etc/postgresql/*/main/pg_hba.conf
# Add: host liquid_hotspot liquid_user 0.0.0.0/0 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Nginx Reverse Proxy (Production)

### 1. Install Nginx
```bash
sudo apt install nginx -y
```

### 2. Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/liquid-hotspot
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/liquid-hotspot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL Certificate (Let's Encrypt)

### 1. Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Get SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com
```

## Monitoring and Logs

### 1. Check Application Status
```bash
# If using PM2
pm2 status
pm2 logs

# If using systemd
sudo systemctl status liquid-backend
sudo systemctl status liquid-frontend
sudo journalctl -u liquid-backend -f
sudo journalctl -u liquid-frontend -f
```

### 2. Check PostgreSQL
```bash
sudo systemctl status postgresql
sudo -u postgres psql -d liquid_hotspot -c "SELECT COUNT(*) FROM users;"
```

## Troubleshooting

### 1. Port Issues
```bash
# Check what's using ports
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :5173
```

### 2. Database Connection Issues
```bash
# Test PostgreSQL connection
sudo -u postgres psql -d liquid_hotspot -c "\dt"
```

### 3. Permission Issues
```bash
# Fix file permissions
sudo chown -R ubuntu:ubuntu /home/ubuntu/liquid-hotspot-yls2025
chmod +x /home/ubuntu/liquid-hotspot-yls2025/start.sh
```

## Access URLs

- **Frontend**: http://your-vm-ip:5173
- **Backend API**: http://your-vm-ip:3001
- **Admin Panel**: http://your-vm-ip:5173?admin=true
- **Health Check**: http://your-vm-ip:3001/health

## Security Notes

1. **Change default passwords** in production
2. **Use strong JWT secrets**
3. **Enable firewall** (UFW)
4. **Use SSL certificates** for HTTPS
5. **Regular security updates**
6. **Database backups**

## Backup Script

```bash
#!/bin/bash
# Create backup script
sudo nano /home/ubuntu/backup-liquid.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump liquid_hotspot > $BACKUP_DIR/liquid_db_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/liquid_app_$DATE.tar.gz /home/ubuntu/liquid-hotspot-yls2025

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x /home/ubuntu/backup-liquid.sh
# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-liquid.sh
``` 