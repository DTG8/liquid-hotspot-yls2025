require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const RadiusClient = require('./radius-client');
const MikroTikClient = require('./mikrotik-client');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL database connection
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'liquid_hotspot',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('💡 Make sure PostgreSQL is running and credentials are correct');
  } else {
    console.log('✅ Database connected successfully');
  }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Initialize RADIUS client
const radiusClient = new RadiusClient();

// Initialize MikroTik client
const mikrotikClient = new MikroTikClient();

// Test connections on startup
radiusClient.testConnection().then(success => {
  if (success) {
    console.log('🔐 RADIUS client connection verified');
  } else {
    console.log('⚠️  RADIUS client connection failed - check configuration');
  }
});

mikrotikClient.testConnection().then(success => {
  if (success) {
    console.log('📡 MikroTik client connection verified');
  } else {
    console.log('⚠️  MikroTik client connection failed - check configuration');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'LIQUID Backend is running' });
});

// User registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { companyName, fullName, email, phoneNumber } = req.body;
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create user in PostgreSQL
    const newUser = await pool.query(
      'INSERT INTO users (company_name, full_name, email, phone_number) VALUES ($1, $2, $3, $4) RETURNING *',
      [companyName, fullName, email, phoneNumber]
    );
    
    // Create RADIUS user in the radius_users table
    await pool.query(
      'INSERT INTO radius_users (username, attribute, op, value) VALUES ($1, $2, $3, $4)',
      [email, 'Cleartext-Password', ':=', phoneNumber]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.rows[0].id, email: newUser.rows[0].email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'User registered successfully',
      user: {
        id: newUser.rows[0].id,
        email: newUser.rows[0].email,
        fullName: newUser.rows[0].full_name
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User login (using RADIUS authentication)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, phoneNumber } = req.body;
    
    // Authenticate against existing FreeRADIUS server
    const radiusResult = await radiusClient.authenticate(email, phoneNumber);
    
    if (!radiusResult.success) {
      return res.status(401).json({ error: radiusResult.message || 'Invalid credentials' });
    }
    
    // Find user in PostgreSQL (for user details)
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'User not found in system' });
    }
    
    // Send accounting start to RADIUS
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
      await radiusClient.sendAccounting(email, sessionId, 'Start');
    } catch (acctError) {
      console.warn('RADIUS accounting failed:', acctError.message);
    }
    
    // 🚀 AUTHORIZE USER ON MIKROTIK FOR INTERNET ACCESS
    try {
      const mikrotikResult = await mikrotikClient.authorizeUser(email, sessionId);
      if (mikrotikResult.success) {
        console.log(`✅ User ${email} authorized for internet access on MikroTik`);
      } else {
        console.warn(`⚠️  MikroTik authorization failed for ${email}:`, mikrotikResult.message);
      }
    } catch (mikrotikError) {
      console.warn('MikroTik authorization failed:', mikrotikError.message);
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.rows[0].id, email: user.rows[0].email, sessionId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.rows[0].id,
        email: user.rows[0].email,
        fullName: user.rows[0].full_name
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// User logout (deauthorize from MikroTik and send RADIUS accounting stop)
app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const userEmail = decoded.email;
    const sessionId = decoded.sessionId;
    
    // Deauthorize user on MikroTik
    try {
      const mikrotikResult = await mikrotikClient.deauthorizeUser(userEmail);
      if (mikrotikResult.success) {
        console.log(`✅ User ${userEmail} deauthorized from MikroTik`);
      } else {
        console.warn(`⚠️  MikroTik deauthorization failed for ${userEmail}:`, mikrotikResult.message);
      }
    } catch (mikrotikError) {
      console.warn('MikroTik deauthorization failed:', mikrotikError.message);
    }
    
    // Send accounting stop to RADIUS
    if (sessionId) {
      try {
        await radiusClient.sendAccounting(userEmail, sessionId, 'Stop');
        console.log(`📊 RADIUS accounting stop sent for ${userEmail}`);
      } catch (acctError) {
        console.warn('RADIUS accounting stop failed:', acctError.message);
      }
    }
    
    res.json({
      message: 'Logout successful',
      success: true
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get user profile
app.get('/api/users/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from PostgreSQL 
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const userEmail = user.email;
    
    res.json({
      user: {
        id: user.id,
        companyName: user.company_name,
        fullName: user.full_name,
        email: user.email,
        phoneNumber: user.phone_number,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get user usage stats
app.get('/api/users/usage', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from PostgreSQL
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const userEmail = user.email;

    // Get usage from radius_acct table
    const usageResult = await pool.query(
      'SELECT * FROM radius_acct WHERE username = $1 ORDER BY acctstarttime DESC',
      [userEmail]
    );

    res.json({
      usage: usageResult.rows.map(acct => ({
        sessionId: acct.acctsessionid,
        startTime: acct.acctstarttime,
        endTime: acct.acctstoptime,
        bytesIn: acct.acctinputoctets,
        bytesOut: acct.acctoutputoctets,
        duration: acct.acctsessiontime
      }))
    });
  } catch (error) {
    console.error('Usage error:', error);
    res.status(500).json({ error: 'Failed to get usage data' });
  }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check admin credentials (hardcoded for simplicity)
    if (username === (process.env.ADMIN_USERNAME || 'admin') && password === (process.env.ADMIN_PASSWORD || 'admin123')) {
      const token = jwt.sign(
        { adminId: 1, username: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        message: 'Admin login successful',
        token
      });
    } else {
      res.status(401).json({ error: 'Invalid admin credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

// Get all users (admin)
app.get('/api/admin/users', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.adminId) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const allUsers = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    
    res.json({
      users: allUsers.rows.map(user => ({
        id: user.id,
        companyName: user.company_name,
        fullName: user.full_name,
        email: user.email,
        phoneNumber: user.phone_number,
        createdAt: user.created_at
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get system stats (admin)
app.get('/api/admin/stats', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.adminId) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Get total users
    const totalUsersResult = await pool.query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(totalUsersResult.rows[0].count);
    
    // Get active sessions
    const activeSessionsResult = await pool.query(
      'SELECT COUNT(*) FROM radius_acct WHERE acctstoptime IS NULL'
    );
    const activeSessions = parseInt(activeSessionsResult.rows[0].count);
    
    res.json({
      totalUsers: totalUsers,
      activeSessions: activeSessions,
      systemStatus: 'Online'
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Export users data (admin)
app.get('/api/admin/export/:format', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const format = req.params.format; // csv, json, pdf
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.adminId) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Get all users with usage data
    const usersResult = await pool.query(`
      SELECT 
        u.id,
        u.company_name,
        u.full_name,
        u.email,
        u.phone_number,
        u.created_at,
        COUNT(ra.acctsessionid) as total_sessions,
        COALESCE(SUM(ra.acctsessiontime), 0) as total_session_time,
        COALESCE(SUM(ra.acctinputoctets + ra.acctoutputoctets), 0) as total_data_used
      FROM users u
      LEFT JOIN radius_acct ra ON u.email = ra.username
      GROUP BY u.id, u.company_name, u.full_name, u.email, u.phone_number, u.created_at
      ORDER BY u.created_at DESC
    `);
    
    const users = usersResult.rows.map(user => ({
      id: user.id,
      companyName: user.company_name,
      fullName: user.full_name,
      email: user.email,
      phoneNumber: user.phone_number,
      createdAt: user.created_at,
      totalSessions: parseInt(user.total_sessions),
      totalSessionTime: parseInt(user.total_session_time),
      totalDataUsed: parseInt(user.total_data_used)
    }));
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="YLS2025_users_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(users);
    } else if (format === 'csv') {
      const csvHeader = 'ID,Company Name,Full Name,Email,Phone Number,Registration Date,Total Sessions,Total Session Time (seconds),Total Data Used (bytes)\n';
      const csvData = users.map(user => 
        `${user.id},"${user.companyName}","${user.fullName}","${user.email}","${user.phoneNumber}","${user.createdAt}",${user.totalSessions},${user.totalSessionTime},${user.totalDataUsed}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="YLS2025_users_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvHeader + csvData);
    } else if (format === 'pdf') {
      // For PDF, we'll return a simple text representation
      // In production, you'd use a library like puppeteer or jsPDF
      const pdfContent = `YLS2025 User Database Export\nGenerated: ${new Date().toLocaleString()}\n\n` +
        users.map(user => 
          `ID: ${user.id}\nCompany: ${user.companyName}\nName: ${user.fullName}\nEmail: ${user.email}\nPhone: ${user.phoneNumber}\nRegistered: ${user.createdAt}\nSessions: ${user.totalSessions}\nSession Time: ${user.totalSessionTime}s\nData Used: ${user.totalDataUsed} bytes\n---`
        ).join('\n\n');
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="YLS2025_users_${new Date().toISOString().split('T')[0]}.txt"`);
      res.send(pdfContent);
    } else {
      res.status(400).json({ error: 'Invalid export format. Use: csv, json, or pdf' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 LIQUID Backend running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`💾 Using PostgreSQL database (liquid_hotspot)`);
  console.log(`🔐 RADIUS client configured for existing FreeRADIUS server`);
});

module.exports = app; 