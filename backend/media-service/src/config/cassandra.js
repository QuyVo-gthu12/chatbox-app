// src/config/cassandra.js
const cassandra = require('cassandra-driver');

const client = new cassandra.Client({
  contactPoints: ['cassandra-db'], // tên service trong docker-compose
  localDataCenter: 'datacenter1',
  keyspace: 'chatbox',
});

module.exports = client;
