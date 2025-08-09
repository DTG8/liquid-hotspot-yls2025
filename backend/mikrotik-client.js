require('dotenv').config();
const MikroNode = require('mikronode');

class MikroTikClient {
  constructor() {
    this.host = process.env.MIKROTIK_HOST || '192.168.1.1';
    this.username = process.env.MIKROTIK_USERNAME || 'admin';
    this.password = process.env.MIKROTIK_PASSWORD || '';
    this.port = parseInt(process.env.MIKROTIK_PORT) || 8728;
  }

  async authorizeUser(username, sessionId, userIP = null) {
    try {
      const device = new MikroNode(this.host, this.port);
      
      const conn = await device.connect().then(([login]) => login(this.username, this.password));

      console.log(`🔓 Authorizing user ${username} on MikroTik hotspot`);

      // Add user to hotspot users (this allows internet access)
      const chan = conn.openChannel();
      
      await new Promise((resolve, reject) => {
        chan.write(['/ip/hotspot/user/add', `=name=${username}`, '=profile=default', `=comment=LIQUID-${sessionId}`, '=disabled=no'], (ch) => {
          ch.on('done', (data) => {
            chan.close();
            conn.close();
            resolve(data);
          });
          ch.on('trap', (error) => {
            chan.close();
            conn.close();
            reject(new Error(error));
          });
        });
      });

      console.log(`✅ User ${username} authorized for internet access`);
      
      return {
        success: true,
        message: 'User authorized for internet access'
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
      const device = new MikroNode(this.host, this.port);
      
      const conn = await device.connect().then(([login]) => login(this.username, this.password));

      console.log(`🔒 Deauthorizing user ${username} on MikroTik hotspot`);

      // Find and remove user from hotspot users
      const chan = conn.openChannel();
      
      await new Promise((resolve, reject) => {
        // First, find the user
        chan.write(['/ip/hotspot/user/print', `?name=${username}`], (ch) => {
          ch.on('done', (data) => {
            if (data.length > 0 && data[0].data) {
              const userId = data[0].data['.id'];
              
              // Remove the user
              const removeChan = conn.openChannel();
              removeChan.write(['/ip/hotspot/user/remove', `=.id=${userId}`], (removeCh) => {
                removeCh.on('done', () => {
                  removeChan.close();
                  chan.close();
                  conn.close();
                  resolve();
                });
                removeCh.on('trap', (error) => {
                  removeChan.close();
                  chan.close();
                  conn.close();
                  reject(new Error(error));
                });
              });
            } else {
              chan.close();
              conn.close();
              resolve(); // User not found, consider it successful
            }
          });
          ch.on('trap', (error) => {
            chan.close();
            conn.close();
            reject(new Error(error));
          });
        });
      });

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
      const device = new MikroNode(this.host, this.port);
      
      const conn = await device.connect().then(([login]) => login(this.username, this.password));

      const chan = conn.openChannel();
      
      const activeUsers = await new Promise((resolve, reject) => {
        chan.write(['/ip/hotspot/active/print'], (ch) => {
          ch.on('done', (data) => {
            chan.close();
            conn.close();
            resolve(data);
          });
          ch.on('trap', (error) => {
            chan.close();
            conn.close();
            reject(new Error(error));
          });
        });
      });

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
      const device = new MikroNode(this.host, this.port);
      
      const conn = await device.connect().then(([login]) => login(this.username, this.password));
      
      // Test by getting system identity
      const chan = conn.openChannel();
      
      const identity = await new Promise((resolve, reject) => {
        chan.write(['/system/identity/print'], (ch) => {
          ch.on('done', (data) => {
            chan.close();
            conn.close();
            resolve(data);
          });
          ch.on('trap', (error) => {
            chan.close();
            conn.close();
            reject(new Error(error));
          });
        });
      });

      console.log('✅ MikroTik connection test successful');
      console.log(`📡 Connected to: ${identity[0]?.data?.name || 'MikroTik Router'}`);
      
      return true;
    } catch (error) {
      console.error('❌ MikroTik connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = MikroTikClient; 