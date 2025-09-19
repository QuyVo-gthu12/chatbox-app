const client = require('../utils/database');
const cassandra = require('cassandra-driver');

const saveMessage = async (roomId, sender, content, type) => {
  const id = cassandra.types.TimeUuid.now(); // timeuuid đúng schema
  const timestamp = new Date();
  const query = `
    INSERT INTO chatbox.messages (room_id, timestamp, id, sender, content, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const params = [roomId, timestamp, id, sender, content, type];

  try {
    console.log(`Saving message to room: ${roomId}, sender: ${sender}, type: ${type}`);
    await client.execute(query, params, { prepare: true });
    console.log(`Message saved: ${id}`);
    return {
      id: id.toString(),
      roomId,
      sender,
      content,
      type,
      timestamp: timestamp.toISOString()
    };
  } catch (error) {
    console.error('Error saving message:', error.message, error.stack);
    throw new Error(`Cannot save message: ${error.message}`);
  }
};

const getMessages = async (roomId, limit = 50, beforeTimestamp = null) => {
  let query = `
    SELECT id, room_id, sender, content, type, timestamp
    FROM chatbox.messages
    WHERE room_id = ?
  `;
  const params = [roomId];

  // ✅ Kiểm tra beforeTimestamp có hợp lệ không
  if (beforeTimestamp) {
    const parsedDate = beforeTimestamp instanceof Date
      ? beforeTimestamp
      : new Date(beforeTimestamp);

    if (!isNaN(parsedDate.getTime())) {
      query += ' AND timestamp < ?';
      params.push(parsedDate);
    } else {
      console.warn(`⚠️ beforeTimestamp không hợp lệ: ${beforeTimestamp}, bỏ qua.`);
    }
  }

  query += ` LIMIT ${limit}`;

  try {
    console.log(`Executing query: ${query}, params: ${JSON.stringify(params)}`);
    const result = await client.execute(query, params, { prepare: true });
    console.log(`Fetched ${result.rows.length} messages for room: ${roomId}`);
    return result.rows.map(row => ({
      id: row.id.toString(),
      roomId: row.room_id,
      sender: row.sender,
      content: row.content,
      type: row.type,
      timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
    }));
  } catch (error) {
    console.error('Error querying messages:', error.message, error.stack);
    throw new Error(`Cannot fetch messages: ${error.message}`);
  }
};


/**
 * ✅ Kiểm tra quyền truy cập phòng chat
 * Tạm thời cho phép tất cả user vào mọi phòng
 * Sau này có thể query từ bảng rooms hoặc bảng users_in_rooms
 */
const checkRoomAccess = async (roomId, userId) => {
  console.log(`checkRoomAccess: user=${userId}, room=${roomId}`);
  // TODO: sau này kiểm tra thật bằng DB
  return true;
};

module.exports = { saveMessage, getMessages, checkRoomAccess };
