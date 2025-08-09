require('dotenv').config();
const dgram = require('dgram');
const radius = require('radius');
const { Pool } = require('pg');

class RadiusClient {
  constructor() {
    this.host = process.env.RADIUS_HOST || 'localhost';
    this.port = parseInt(process.env.RADIUS_PORT) || 1812;
    this.secret = process.env.RADIUS_SECRET || 'testing123';
    this.timeout = parseInt(process.env.RADIUS_TIMEOUT) || 5000;
    this.retries = parseInt(process.env.RADIUS_RETRIES) || 3;
    
    // PostgreSQL connection for direct authentication
    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'liquid_hotspot',
      password: process.env.DB_PASSWORD || 'your_password',
      port: process.env.DB_PORT || 5432,
    });
  }

  async authenticate(username, password) {
    console.log(`🔐 Direct PostgreSQL Auth: ${username}`);
    
    try {
      // Authenticate directly against PostgreSQL radius_users table
      const result = await this.pool.query(
        'SELECT * FROM radius_users WHERE username = $1 AND value = $2 AND attribute = $3',
        [username, password, 'Cleartext-Password']
      );

      if (result.rows.length > 0) {
        console.log(`✅ Authentication successful for ${username}`);
        return {
          success: true,
          message: 'Authentication successful'
        };
      } else {
        console.log(`❌ Authentication failed for ${username}`);
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }
    } catch (error) {
      console.error('❌ Database authentication error:', error.message);
      return {
        success: false,
        message: 'Authentication error'
      };
    }
  }

  async sendAccounting(username, sessionId, acctType) {
    console.log(`📊 Accounting ${acctType} for ${username} (session: ${sessionId})`);
    
    try {
      if (acctType === 'Start') {
        // Insert accounting start record
        await this.pool.query(
          'INSERT INTO radius_acct (acctsessionid, username, acctstarttime, acctuniqueid) VALUES ($1, $2, NOW(), $3)',
          [sessionId, username, `${sessionId}-${Date.now()}`]
        );
      } else if (acctType === 'Stop') {
        // Update accounting stop record
        await this.pool.query(
          'UPDATE radius_acct SET acctstoptime = NOW(), acctsessiontime = EXTRACT(EPOCH FROM (NOW() - acctstarttime))::INTEGER WHERE acctsessionid = $1 AND username = $2 AND acctstoptime IS NULL',
          [sessionId, username]
        );
      }
      
      console.log(`✅ Accounting ${acctType} recorded for ${username}`);
      return true;
    } catch (error) {
      console.error(`❌ Accounting ${acctType} failed:`, error.message);
      return false;
    }
  }

  async testConnection() {
    console.log('🔍 Testing direct PostgreSQL authentication...');
    
    try {
      const result = await this.pool.query('SELECT COUNT(*) FROM radius_users');
      const userCount = parseInt(result.rows[0].count);
      console.log(`✅ Direct auth ready - ${userCount} users in database`);
      return true;
    } catch (error) {
      console.error('❌ Direct auth test failed:', error.message);
      return false;
    }
  }
}

module.exports = RadiusClient; 