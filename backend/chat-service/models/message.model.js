import client from '../utils/database.js';
import cassandra from 'cassandra-driver';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

/**
 * ✅ Lưu tin nhắn
 * Nếu type = image/file → upload qua media-service trước
 */
export const saveMessage = async (roomId, sender, content, type, filePath = null) => {
  const id = cassandra.types.TimeUuid.now();
  const timestamp = new Date();
  let finalContent = content;

  // 👉 Nếu có file (image/file) thì upload sang media-service
  if ((type === 'image' || type === 'file') && filePath) {
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));
      form.append('uploader_id', sender);

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
    INSERT INTO chatbox.messages (room_id, timestamp, id, content, sender, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const roomUuid = cassandra.types.Uuid.fromString(roomId);
  const params = [roomUuid, timestamp, id, finalContent, sender, type];

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
export const getMessages = async (roomId, limit = 50, beforeTimestamp = null) => {
  let query = `
    SELECT id, room_id, content, sender, type, timestamp
    FROM chatbox.messages
    WHERE room_id = ?
  `;

  const roomUuid = cassandra.types.Uuid.fromString(roomId);
  const params = [roomUuid];

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
      roomId: row.room_id.toString(),
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
export const checkRoomAccess = async (roomId, userId) => {
  console.log(`checkRoomAccess: user=${userId}, room=${roomId}`);
  return true; // TODO: sau này check từ room_participants
};
