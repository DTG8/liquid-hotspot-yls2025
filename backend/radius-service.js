const radius = require('radius');
const dgram = require('dgram');

class RadiusService {
  constructor() {
    this.secret = 'testing123'; // RADIUS secret - change in production
    this.server = dgram.createSocket('udp4');
    this.port = 1812; // Standard RADIUS auth port
  }

  // Start RADIUS server
  start() {
    this.server.on('message', (msg, rinfo) => {
      this.handleRadiusMessage(msg, rinfo);
    });

    this.server.bind(this.port, () => {
      console.log(`🔐 FreeRADIUS server listening on port ${this.port}`);
    });
  }

  // Handle incoming RADIUS messages
  async handleRadiusMessage(msg, rinfo) {
    try {
      const packet = radius.decode({ packet: msg, secret: this.secret });
      
      if (packet.code === 'Access-Request') {
        await this.handleAccessRequest(packet, rinfo);
      } else if (packet.code === 'Accounting-Request') {
        await this.handleAccountingRequest(packet, rinfo);
      }
    } catch (error) {
      console.error('RADIUS decode error:', error);
    }
  }

  // Handle authentication requests
  async handleAccessRequest(packet, rinfo) {
    const username = packet.attributes['User-Name'];
    const password = packet.attributes['User-Password'];
    
    console.log(`🔐 RADIUS Auth Request: ${username} from ${rinfo.address}`);
    
    try {
      // Query PostgreSQL for user
      const { Pool } = require('pg');
      const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'liquid_hotspot',
        password: 'your_password',
        port: 5432,
      });

      const user = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND phone_number = $2',
        [username, password]
      );

      if (user.rows.length > 0) {
        // User authenticated successfully
        const response = radius.encode({
          packet: packet,
          code: 'Access-Accept',
          secret: this.secret,
          attributes: {
            'Session-Timeout': 3600, // 1 hour session
            'Idle-Timeout': 1800,    // 30 minutes idle
            'WISPr-Bandwidth-Max-Down': 1000000, // 1 Mbps
            'WISPr-Bandwidth-Max-Up': 500000     // 500 Kbps
          }
        });

        this.server.send(response, rinfo.port, rinfo.address);
        console.log(`✅ RADIUS Auth Accepted: ${username}`);
      } else {
        // Authentication failed
        const response = radius.encode({
          packet: packet,
          code: 'Access-Reject',
          secret: this.secret,
          attributes: {
            'Reply-Message': 'Invalid credentials'
          }
        });

        this.server.send(response, rinfo.port, rinfo.address);
        console.log(`❌ RADIUS Auth Rejected: ${username}`);
      }

      await pool.end();
    } catch (error) {
      console.error('RADIUS auth error:', error);
      
      // Send reject on error
      const response = radius.encode({
        packet: packet,
        code: 'Access-Reject',
        secret: this.secret,
        attributes: {
          'Reply-Message': 'Authentication error'
        }
      });

      this.server.send(response, rinfo.port, rinfo.address);
    }
  }

  // Handle accounting requests
  async handleAccountingRequest(packet, rinfo) {
    const username = packet.attributes['User-Name'];
    const sessionId = packet.attributes['Acct-Session-Id'];
    const sessionTime = packet.attributes['Acct-Session-Time'];
    const inputOctets = packet.attributes['Acct-Input-Octets'] || 0;
    const outputOctets = packet.attributes['Acct-Output-Octets'] || 0;
    
    console.log(`📊 RADIUS Accounting: ${username} - ${sessionTime}s, ${inputOctets + outputOctets} bytes`);
    
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'liquid_hotspot',
        password: 'your_password',
        port: 5432,
      });

      // Insert or update accounting record
      await pool.query(`
        INSERT INTO radius_acct (
          acctsessionid, username, acctsessiontime, 
          acctinputoctets, acctoutputoctets, acctstarttime
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (acctsessionid) 
        DO UPDATE SET 
          acctsessiontime = $3,
          acctinputoctets = $4,
          acctoutputoctets = $5,
          acctupdatetime = NOW()
      `, [sessionId, username, sessionTime, inputOctets, outputOctets]);

      // Send accounting response
      const response = radius.encode({
        packet: packet,
        code: 'Accounting-Response',
        secret: this.secret
      });

      this.server.send(response, rinfo.port, rinfo.address);
      await pool.end();
    } catch (error) {
      console.error('RADIUS accounting error:', error);
    }
  }

  // Stop RADIUS server
  stop() {
    this.server.close();
    console.log('🔐 FreeRADIUS server stopped');
  }
}

module.exports = RadiusService; 