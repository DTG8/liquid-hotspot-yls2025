# MikroTik Router Configuration for LIQUID Hotspot

## Prerequisites
- MikroTik router with RouterOS
- Your LIQUID server IP address
- RADIUS secret: `testing123`

## Step 1: Configure RADIUS Server

```bash
# Add RADIUS server
/radius add name=liquid-radius address=YOUR_SERVER_IP secret=testing123 service=hotspot

# Enable RADIUS
/radius set [find name=liquid-radius] use-radius=yes
```

## Step 2: Configure Hotspot

```bash
# Create hotspot server
/ip hotspot server add name=YLS2025 interface=ether1 address-pool=hotspot-pool profile=default

# Configure hotspot profile
/ip hotspot profile add name=YLS2025 hotspot-address=192.168.1.1/24 dns-name=YLS2025.local rate-limit=1M/500k

# Set RADIUS authentication
/ip hotspot profile set [find name=YLS2025] use-radius=yes radius=liquid-radius

# Configure captive portal
/ip hotspot profile set [find name=YLS2025] html-directory=flash:YLS2025
```

## Step 3: Configure Captive Portal

```bash
# Upload your frontend files to router
# Set captive portal URL to your frontend
/ip hotspot profile set [find name=YLS2025] login-by=mac,http-pap
```

## Step 4: Configure Address Pool

```bash
# Create address pool for hotspot users
/ip pool add name=hotspot-pool ranges=192.168.1.100-192.168.1.200
```

## Step 5: Configure Firewall

```bash
# Allow RADIUS traffic
/ip firewall filter add chain=input protocol=udp dst-port=1812 action=accept comment="RADIUS Auth"
/ip firewall filter add chain=input protocol=udp dst-port=1813 action=accept comment="RADIUS Accounting"

# Allow HTTP/HTTPS to captive portal
/ip firewall filter add chain=input protocol=tcp dst-port=80 action=accept comment="HTTP"
/ip firewall filter add chain=input protocol=tcp dst-port=443 action=accept comment="HTTPS"
```

## Step 6: Test Configuration

1. Connect to WiFi network
2. Should redirect to captive portal
3. Register/login with your credentials
4. Should get internet access after authentication

## Troubleshooting

```bash
# Check RADIUS server status
/radius print

# Check hotspot users
/ip hotspot active print

# Check hotspot server status
/ip hotspot server print

# View logs
/log print where topics~"hotspot"
```

## Production Settings

For production, change these settings:
- RADIUS secret (use strong password)
- SSL certificates for HTTPS
- Custom DNS settings
- Bandwidth limits per user
- Session timeouts 