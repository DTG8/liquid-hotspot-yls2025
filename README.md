# LIQUID Hotspot - YLS2025

A simple MikroTik hotspot solution with FreeRADIUS integration for the 2025 Youth Leadership Summit.

## Features

- ✅ **Captive Portal**: User registration and login
- ✅ **User Dashboard**: Usage statistics and session history
- ✅ **Admin Panel**: User management and system stats
- ✅ **FreeRADIUS Integration**: Authentication and accounting
- ✅ **PostgreSQL Database**: User data and usage tracking
- ✅ **Dark Theme**: Modern UI with green accents

## Quick Setup

### 1. Database Setup

1. Create PostgreSQL database:
```sql
CREATE DATABASE liquid_hotspot;
```

2. Run the setup script:
```bash
psql -d liquid_hotspot -f backend/setup-database.sql
```

### 2. Backend Setup

1. Navigate to backend:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Update database connection in `server.js`:
```javascript
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'liquid_hotspot',
  password: 'your_actual_password', // Change this
  port: 5432,
});
```

4. Start backend:
```bash
npm start
```

### 3. Frontend Setup

1. Navigate to frontend:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start frontend:
```bash
npm run dev
```

## Usage

### User Flow
1. User connects to MikroTik hotspot SSID
2. Gets redirected to captive portal (`http://localhost:5173`)
3. Registers with company name, full name, email, phone number
4. Logs in with email and phone number
5. Accesses internet and views usage dashboard

### Admin Access
- **URL**: `http://localhost:5173` (click "Admin Login")
- **Username**: `admin`
- **Password**: `admin123`

## API Endpoints

### User Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/users/profile` - Get user profile
- `GET /api/users/usage` - Get usage statistics

### Admin Endpoints
- `POST /api/admin/login` - Admin login
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Get system statistics

## Database Tables

- `users` - User registration data
- `radius_users` - FreeRADIUS authentication
- `radius_acct` - Usage accounting data

## MikroTik Configuration

1. Set up hotspot on MikroTik router
2. Configure RADIUS authentication pointing to your server
3. Set captive portal URL to your frontend URL

## Production Deployment

1. Update JWT secret in `server.js`
2. Set up proper SSL certificates
3. Configure Nginx reverse proxy
4. Set up PM2 for process management

## File Structure

```
liquid/
├── backend/
│   ├── server.js          # Main backend server
│   ├── package.json       # Backend dependencies
│   └── setup-database.sql # Database setup script
├── frontend/
│   ├── src/
│   │   ├── App.tsx        # Main React app
│   │   ├── main.tsx       # React entry point
│   │   └── index.css      # Tailwind styles
│   ├── package.json       # Frontend dependencies
│   └── tailwind.config.js # Tailwind configuration
└── README.md              # This file
```

## Support

For issues or questions, check the console logs and ensure:
- PostgreSQL is running and accessible
- Database tables are created correctly
- Backend and frontend are running on correct ports
- Network connectivity between MikroTik and server 