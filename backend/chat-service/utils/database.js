require('dotenv').config();
const cassandra = require('cassandra-driver');

const client = new cassandra.Client({
  contactPoints: [process.env.CASSANDRA_HOST || 'cassandra'], // ⚡ đổi mặc định từ 'localhost' → 'cassandra'
  localDataCenter: process.env.CASSANDRA_DATACENTER || 'datacenter1',
  keyspace: process.env.CASSANDRA_KEYSPACE || 'chatbox',
  protocolOptions: { port: process.env.CASSANDRA_PORT || 9042 },
});

client.connect()
  .then(() => console.log('✅ Connected to Cassandra'))
  .catch(err => console.error('❌ Error connecting to Cassandra:', err));

module.exports = client;
