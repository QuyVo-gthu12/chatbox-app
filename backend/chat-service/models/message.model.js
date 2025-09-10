const client = require('../utils/database');
const cassandra = require('cassandra-driver');

const saveMessage = async (roomId, sender, content, type) => {
  const query = `
    INSERT INTO chatbox.messages (id, room_id, sender, content, timestamp, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const params = [
    cassandra.types.Uuid.random(),
    roomId,
    sender,
    content,
    new Date(),
    type
  ];
  await client.execute(query, params, { prepare: true });
};

const getMessages = async (roomId, limit = 50, beforeTimestamp = null) => {
  let query = `
    SELECT * FROM chatbox.messages
    WHERE room_id = ?
  `;
  const params = [roomId];

  if (beforeTimestamp) {
    query += ' AND timestamp < ?';
    params.push(beforeTimestamp instanceof Date ? beforeTimestamp : new Date(beforeTimestamp));
  }

  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  const result = await client.execute(query, params, { prepare: true });

  return result.rows.map(row => ({
    id: row.id.toString(),
    roomId: row.room_id,
    sender: row.sender,
    content: row.content,
    timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
    type: row.type
  }));
};

module.exports = { saveMessage, getMessages };
