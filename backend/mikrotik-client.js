require('dotenv').config();
const { RouterOSAPI } = require('node-routeros');

class MikroTikClient {
  constructor() {
    this.host = process.env.MIKROTIK_HOST || '192.168.1.1';
    this.username = process.env.MIKROTIK_USERNAME || 'admin';
    this.password = process.env.MIKROTIK_PASSWORD || '';
    this.port = parseInt(process.env.MIKROTIK_PORT) || 8728;
  }

  async authorizeUser(username, sessionId, userIP = null) {
    try {
      const conn = new RouterOSAPI({
        host: this.host,
        user: this.username,
        password: this.password,
        port: this.port,
      });

      await conn.connect();

      console.log(`🔓 Authorizing user ${username} on MikroTik hotspot`);

      // Add user to hotspot users (this allows internet access)
      const result = await conn.write('/ip/hotspot/user/add', {
        name: username,
        profile: 'default',
        comment: `LIQUID-${sessionId}`,
        disabled: 'no'
      });

      await conn.close();

      console.log(`✅ User ${username} authorized for internet access`);
      
      return {
        success: true,
        message: 'User authorized for internet access',
        mikrotikId: result
      };

    } catch (error) {
      console.error('❌ MikroTik authorization failed:', error.message);
      return {
        success: false,
        message: 'Failed to authorize user on MikroTik',
        error: error.message
      };
    }
  }

  async deauthorizeUser(username) {
    try {
      const conn = new RouterOSAPI({
        host: this.host,
        user: this.username,
        password: this.password,
        port: this.port,
      });

      await conn.connect();

      console.log(`🔒 Deauthorizing user ${username} on MikroTik hotspot`);

      // Remove user from hotspot users
      const users = await conn.write('/ip/hotspot/user/print', {
        '?name': username
      });

      if (users.length > 0) {
        await conn.write('/ip/hotspot/user/remove', {
          '.id': users[0]['.id']
        });
      }

      await conn.close();

      console.log(`✅ User ${username} deauthorized`);
      
      return {
        success: true,
        message: 'User deauthorized'
      };

    } catch (error) {
      console.error('❌ MikroTik deauthorization failed:', error.message);
      return {
        success: false,
        message: 'Failed to deauthorize user',
        error: error.message
      };
    }
  }

  async getActiveUsers() {
    try {
      const conn = new RouterOSAPI({
        host: this.host,
        user: this.username,
        password: this.password,
        port: this.port,
      });

      await conn.connect();

      const activeUsers = await conn.write('/ip/hotspot/active/print');
      
      await conn.close();

      return {
        success: true,
        users: activeUsers
      };

    } catch (error) {
      console.error('❌ Failed to get active users:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testConnection() {
    try {
      const conn = new RouterOSAPI({
        host: this.host,
        user: this.username,
        password: this.password,
        port: this.port,
      });

      await conn.connect();
      
      // Test by getting system identity
      const identity = await conn.write('/system/identity/print');
      
      await conn.close();

      console.log('✅ MikroTik connection test successful');
      console.log(`📡 Connected to: ${identity[0].name || 'MikroTik Router'}`);
      
      return true;
    } catch (error) {
      console.error('❌ MikroTik connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = MikroTikClient; 