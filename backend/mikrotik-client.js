require('dotenv').config();
const MikroNode = require('mikronode');

class MikroTikClient {
  constructor() {
    this.host = process.env.MIKROTIK_HOST || '192.168.1.1';
    this.username = process.env.MIKROTIK_USERNAME || 'admin';
    this.password = process.env.MIKROTIK_PASSWORD || '';
    this.port = parseInt(process.env.MIKROTIK_PORT) || 8728;
    
    console.log(`🔧 MikroTik Client Config: ${this.username}@${this.host}:${this.port}`);
  }

  async authorizeUser(username, sessionId, userIP = null) {
    try {
      const device = new MikroNode(this.host, this.port);
      
      console.log(`🔓 Connecting to MikroTik at ${this.host}:${this.port} to authorize user ${username}`);

      const conn = await device.connect().then(([login]) => login(this.username, this.password));

      console.log(`🔓 Authorizing user ${username} on MikroTik hotspot`);

      // Add user to hotspot users (this allows internet access)
      const chan = conn.openChannel('add-user');
      
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
            reject(new Error(error.message || 'Failed to add user'));
          });
        });
      });

      console.log(`✅ User ${username} authorized for internet access`);
      
      return {
        success: true,
        message: 'User authorized for internet access'
      };

    } catch (error) {
      console.error('❌ MikroTik authorization failed:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port
      });
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
      const findChan = conn.openChannel('find-user');
      
      const userList = await new Promise((resolve, reject) => {
        findChan.write(['/ip/hotspot/user/print', `?name=${username}`], (ch) => {
          ch.on('done', (data) => {
            findChan.close();
            resolve(data);
          });
          ch.on('trap', (error) => {
            findChan.close();
            reject(new Error(error.message || 'Failed to find user'));
          });
        });
      });

      if (userList.length > 0 && userList[0].data) {
        const userId = userList[0].data['.id'];
        
        // Remove the user
        const removeChan = conn.openChannel('remove-user');
        await new Promise((resolve, reject) => {
          removeChan.write(['/ip/hotspot/user/remove', `=.id=${userId}`], (ch) => {
            ch.on('done', () => {
              removeChan.close();
              conn.close();
              resolve();
            });
            ch.on('trap', (error) => {
              removeChan.close();
              conn.close();
              reject(new Error(error.message || 'Failed to remove user'));
            });
          });
        });
      } else {
        conn.close();
        console.log(`ℹ️  User ${username} not found in hotspot users (already removed)`);
      }

      console.log(`✅ User ${username} deauthorized`);
      
      return {
        success: true,
        message: 'User deauthorized'
      };

    } catch (error) {
      console.error('❌ MikroTik deauthorization failed:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port
      });
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

      const chan = conn.openChannel('active-users');
      
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
            reject(new Error(error.message || 'Failed to get active users'));
          });
        });
      });

      return {
        success: true,
        users: activeUsers
      };

    } catch (error) {
      console.error('❌ Failed to get active users:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testConnection() {
    try {
      console.log(`🔍 Testing MikroTik connection to ${this.username}@${this.host}:${this.port}`);
      
      const device = new MikroNode(this.host, this.port);
      
      console.log('🔗 Attempting to connect...');
      const conn = await device.connect().then(([login]) => {
        console.log('🔑 Connected, attempting login...');
        return login(this.username, this.password);
      });
      
      console.log('✅ Login successful, testing API call...');
      
      // Test by getting system identity
      const chan = conn.openChannel('test-connection');
      
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
            reject(new Error(error.message || 'Connection test failed'));
          });
        });
      });

      console.log('✅ MikroTik connection test successful');
      console.log(`📡 Connected to: ${identity[0]?.data?.name || 'MikroTik Router'}`);
      
      return true;
    } catch (error) {
      console.error('❌ MikroTik connection test failed:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port,
        stack: error.stack
      });
      
      // Provide helpful troubleshooting info
      if (error.code === 'ECONNREFUSED') {
        console.log('💡 Troubleshooting: Connection refused. Check:');
        console.log('   - MikroTik API service is enabled (/ip service enable api)');
        console.log('   - Firewall allows connections to port 8728');
        console.log('   - Router is accessible from this server');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('💡 Troubleshooting: Connection timeout. Check:');
        console.log('   - Network connectivity to MikroTik router');
        console.log('   - Firewall rules blocking the connection');
      } else if (error.code === 'ENOTFOUND') {
        console.log('💡 Troubleshooting: Host not found. Check:');
        console.log('   - MikroTik IP address is correct');
        console.log('   - DNS resolution (if using hostname)');
      }
      
      return false;
    }
  }
}

module.exports = MikroTikClient; 