require('dotenv').config();
const MikroTikClient = require('./mikrotik-client.js');

console.log('🔧 Testing MikroTik Connection...');
console.log('Environment variables:');
console.log('MIKROTIK_HOST:', process.env.MIKROTIK_HOST);
console.log('MIKROTIK_USERNAME:', process.env.MIKROTIK_USERNAME);
console.log('MIKROTIK_PASSWORD:', process.env.MIKROTIK_PASSWORD ? '[SET]' : '[NOT SET]');
console.log('MIKROTIK_PORT:', process.env.MIKROTIK_PORT);
console.log('');

const client = new MikroTikClient();

client.testConnection().then(success => {
  console.log('');
  console.log('✅ Final test result:', success);
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.log('');
  console.error('❌ Test threw exception:', err);
  process.exit(1);
}); 