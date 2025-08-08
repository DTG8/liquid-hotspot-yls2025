require('dotenv').config();
const radius = require('radius');
const dgram = require('dgram');

class RadiusClient {
  constructor() {
    this.host = process.env.RADIUS_HOST || 'localhost';
    this.port = parseInt(process.env.RADIUS_PORT) || 1812;
    this.secret = process.env.RADIUS_SECRET || 'testing123';
    this.timeout = parseInt(process.env.RADIUS_TIMEOUT) || 5000;
    this.retries = parseInt(process.env.RADIUS_RETRIES) || 3;
  }

  // Authenticate user against existing FreeRADIUS server
  async authenticate(username, password) {
    return new Promise((resolve, reject) => {
      const client = dgram.createSocket('udp4');
      let attempts = 0;

      const sendRequest = () => {
        attempts++;
        
        // Create RADIUS Access-Request packet
        const packet = radius.encode({
          code: 'Access-Request',
          secret: this.secret,
          attributes: {
            'User-Name': username,
            'User-Password': password,
            'NAS-IP-Address': '127.0.0.1',
            'NAS-Port': 0,
            'Service-Type': 'Login-User',
            'Framed-Protocol': 'PPP'
          }
        });

        console.log(`🔐 RADIUS Auth Request: ${username} to ${this.host}:${this.port} (attempt ${attempts})`);

        // Send packet to FreeRADIUS server
        client.send(packet, this.port, this.host, (err) => {
          if (err) {
            console.error('RADIUS send error:', err);
            if (attempts < this.retries) {
              setTimeout(sendRequest, 1000);
            } else {
              client.close();
              reject(new Error('Failed to send RADIUS request'));
            }
            return;
          }
        });
      };

      // Handle response from FreeRADIUS server
      client.on('message', (msg, rinfo) => {
        try {
          const response = radius.decode({ packet: msg, secret: this.secret });
          
          console.log(`📨 RADIUS Response: ${response.code} for ${username}`);
          
          client.close();
          
          if (response.code === 'Access-Accept') {
            resolve({
              success: true,
              message: 'Authentication successful',
              attributes: response.attributes
            });
          } else if (response.code === 'Access-Reject') {
            resolve({
              success: false,
              message: 'Invalid credentials'
            });
          } else {
            resolve({
              success: false,
              message: 'Authentication failed'
            });
          }
        } catch (error) {
          console.error('RADIUS decode error:', error);
          client.close();
          reject(new Error('Failed to decode RADIUS response'));
        }
      });

      // Handle timeout
      const timeoutId = setTimeout(() => {
        if (attempts < this.retries) {
          sendRequest();
        } else {
          client.close();
          reject(new Error('RADIUS request timeout'));
        }
      }, this.timeout);

      client.on('close', () => {
        clearTimeout(timeoutId);
      });

      // Start the first request
      sendRequest();
    });
  }

  // Send accounting data to existing FreeRADIUS server
  async sendAccounting(username, sessionId, acctStatusType, sessionTime = 0, inputOctets = 0, outputOctets = 0) {
    return new Promise((resolve, reject) => {
      const client = dgram.createSocket('udp4');

      // Create RADIUS Accounting-Request packet
      const packet = radius.encode({
        code: 'Accounting-Request',
        secret: this.secret,
        attributes: {
          'User-Name': username,
          'Acct-Session-Id': sessionId,
          'Acct-Status-Type': acctStatusType,
          'Acct-Session-Time': sessionTime,
          'Acct-Input-Octets': inputOctets,
          'Acct-Output-Octets': outputOctets,
          'NAS-IP-Address': '127.0.0.1',
          'NAS-Port': 0
        }
      });

      console.log(`📊 RADIUS Accounting: ${username} - ${acctStatusType}`);

      // Send packet to FreeRADIUS server
      client.send(packet, this.port, this.host, (err) => {
        if (err) {
          console.error('RADIUS accounting send error:', err);
          client.close();
          reject(new Error('Failed to send RADIUS accounting'));
          return;
        }
      });

      // Handle response
      client.on('message', (msg, rinfo) => {
        try {
          const response = radius.decode({ packet: msg, secret: this.secret });
          
          console.log(`📨 RADIUS Accounting Response: ${response.code}`);
          
          client.close();
          
          if (response.code === 'Accounting-Response') {
            resolve({
              success: true,
              message: 'Accounting successful'
            });
          } else {
            resolve({
              success: false,
              message: 'Accounting failed'
            });
          }
        } catch (error) {
          console.error('RADIUS accounting decode error:', error);
          client.close();
          reject(new Error('Failed to decode RADIUS accounting response'));
        }
      });

      // Handle timeout
      setTimeout(() => {
        client.close();
        reject(new Error('RADIUS accounting timeout'));
      }, this.timeout);
    });
  }

  // Test connection to FreeRADIUS server
  async testConnection() {
    try {
      // Test with a dummy authentication request
      const result = await this.authenticate('test-user', 'test-password');
      console.log('✅ RADIUS server connection test completed');
      return true;
    } catch (error) {
      console.error('❌ RADIUS server connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = RadiusClient; 