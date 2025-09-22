const client = require('../utils/database');
const cassandra = require('cassandra-driver');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

/**
 * ✅ Lưu tin nhắn
 * Nếu type = image/file → upload qua media-service trước
 */
const saveMessage = async (roomId, sender, content, type, filePath = null) => {
  const id = cassandra.types.TimeUuid.now();
  const timestamp = new Date();
  let finalContent = content;

  // 👉 Nếu có file (image/file) thì upload sang media-service
  if ((type === 'image' || type === 'file') && filePath) {
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));

      const response = await axios.post(
        'http://localhost:3002/media/upload',
        form,
        { headers: form.getHeaders() }
      );

      finalContent = response.data.url; // URL file được lưu từ media-service
    } catch (err) {
      console.error('❌ Upload media failed:', err.message);
      throw new Error('Upload media failed');
    }
  }

  const query = `
    INSERT INTO chatbox.messages (room_id, timestamp, id, sender, content, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const params = [roomId, timestamp, id, sender, finalContent, type];

  try {
    console.log(`Saving message: room=${roomId}, sender=${sender}, type=${type}`);
    await client.execute(query, params, { prepare: true });
    console.log(`Message saved: ${id}`);

    return {
      id: id.toString(),
      roomId,
      sender,
      content: finalContent,
      type,
      timestamp: timestamp.toISOString()
    };
  } catch (error) {
    console.error('Error saving message:', error.message, error.stack);
    throw new Error(`Cannot save message: ${error.message}`);
  }
};

/**
 * ✅ Lấy danh sách tin nhắn
 */
const getMessages = async (roomId, limit = 50, beforeTimestamp = null) => {
  let query = `
    SELECT id, room_id, sender, content, type, timestamp
    FROM chatbox.messages
    WHERE room_id = ?
  `;
  const params = [roomId];

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
 */
const checkRoomAccess = async (roomId, userId) => {
  console.log(`checkRoomAccess: user=${userId}, room=${roomId}`);
  return true; // TODO: sau này check từ room_participants
};

module.exports = { saveMessage, getMessages, checkRoomAccess };
