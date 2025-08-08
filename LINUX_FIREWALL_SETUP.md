# Linux VM Firewall Setup - LIQUID Hotspot

## 🔥 **Quick Firewall Configuration**

### **1. Configure UFW Firewall**
```bash
# Allow SSH (if not already allowed)
sudo ufw allow ssh

# Allow application ports
sudo ufw allow 3001  # Backend API
sudo ufw allow 5173  # Frontend (Vite dev server)
sudo ufw allow 1812  # RADIUS authentication
sudo ufw allow 1813  # RADIUS accounting

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### **2. Alternative: Using iptables**
```bash
# Allow incoming connections on port 5173
sudo iptables -A INPUT -p tcp --dport 5173 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 1812 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 1813 -j ACCEPT

# Save rules (Ubuntu/Debian)
sudo iptables-save > /etc/iptables/rules.v4
```

### **3. Check Cloud Provider Firewall**

**If using AWS EC2:**
- Go to EC2 Dashboard → Security Groups
- Edit inbound rules
- Add rule: Type: Custom TCP, Port: 5173, Source: 0.0.0.0/0

**If using DigitalOcean:**
- Go to Networking → Firewalls
- Add inbound rule: Type: TCP, Port: 5173

**If using Azure:**
- Go to Network Security Groups
- Add inbound security rule: Port: 5173

### **4. Test Connection**
```bash
# From your local machine
curl http://173.212.222.124:5173

# Or open in browser
http://173.212.222.124:5173
```

### **5. Restart Frontend with New Config**
```bash
# Stop current frontend
# Then restart with new Vite config
cd frontend
npm run dev
```

**You should now see:**
```
Local:   http://localhost:5173/
Network: http://173.212.222.124:5173/
```

## 🚨 **Security Note**
For production, consider:
- Using a reverse proxy (Nginx)
- SSL certificates
- Restricting IP ranges
- Using a domain name 