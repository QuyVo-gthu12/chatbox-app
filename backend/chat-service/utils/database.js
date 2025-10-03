import dotenv from 'dotenv';
import cassandra from 'cassandra-driver';

dotenv.config();

const client = new cassandra.Client({
  contactPoints: [process.env.CASSANDRA_HOST || 'cassandra'], // default 'cassandra'
  localDataCenter: process.env.CASSANDRA_DATACENTER || 'datacenter1',
  keyspace: process.env.CASSANDRA_KEYSPACE || 'chatbox',
  protocolOptions: { port: parseInt(process.env.CASSANDRA_PORT || '9042', 10) },
});

client.connect()
  .then(() => console.log('✅ Connected to Cassandra'))
  .catch(err => console.error('❌ Error connecting to Cassandra:', err));

// ✅ default export
export default client;
