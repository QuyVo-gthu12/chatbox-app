require('dotenv').config();
const cassandra = require('cassandra-driver');

const client = new cassandra.Client({
  contactPoints: [process.env.CASSANDRA_HOST || 'localhost'],
  localDataCenter: 'datacenter1',
  keyspace: process.env.CASSANDRA_KEYSPACE || 'chatbox',
  protocolOptions: { port: process.env.CASSANDRA_PORT || 9042 },
});

client.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to Cassandra:', err);
  } else {
    console.log('✅ Connected to Cassandra');
  }
});

module.exports = client;  // ⚡ thêm dòng này
