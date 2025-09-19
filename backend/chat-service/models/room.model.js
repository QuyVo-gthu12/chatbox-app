const client = require('../utils/database');
const cassandra = require('cassandra-driver');

/**
 * ✅ Tạo phòng mới
 */
const createRoom = async (participants) => {
  const roomId = cassandra.types.Uuid.random().toString();
  const name = `Room_${roomId.slice(0, 8)}`;
  const createdBy = participants[0];

  const query = `
    INSERT INTO chatbox.rooms (room_id, name, participants, created_by, created_at)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [roomId, name, participants, createdBy, new Date()];
  await client.execute(query, params, { prepare: true });

  // Thêm từng participant vào bảng room_participants
  for (const userId of participants) {
    const participantQuery = `
      INSERT INTO chatbox.room_participants (room_id, user_id)
      VALUES (?, ?)
    `;
    await client.execute(participantQuery, [roomId, userId], { prepare: true });
  }

  return { roomId, name, participants, createdBy, createdAt: new Date() };
};

/**
 * ✅ Lấy danh sách phòng của user
 */
const getRooms = async (userId) => {
  // B1: lấy danh sách room_id user tham gia
  const participantQuery = `
    SELECT room_id FROM chatbox.room_participants WHERE user_id = ?
  `;
  const participantResult = await client.execute(participantQuery, [userId], { prepare: true });

  if (participantResult.rows.length === 0) {
    return [];
  }

  const roomIds = participantResult.rows.map(r => r.room_id);

  // B2: lấy thông tin từng room
  const rooms = [];
  for (const roomId of roomIds) {
    const query = `
      SELECT room_id, name, participants, created_by, created_at
      FROM chatbox.rooms WHERE room_id = ?
    `;
    const result = await client.execute(query, [roomId], { prepare: true });
    if (result.rows.length > 0) {
      const row = result.rows[0];
      rooms.push({
        roomId: row.room_id,
        name: row.name,
        participants: row.participants,
        createdBy: row.created_by,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      });
    }
  }

  return rooms;
};

/**
 * ✅ Kiểm tra quyền truy cập phòng
 */
const checkRoomAccess = async (roomId, userId) => {
  const query = `
    SELECT * FROM chatbox.room_participants
    WHERE room_id = ? AND user_id = ?
  `;
  const result = await client.execute(query, [roomId, userId], { prepare: true });
  return result.rows.length > 0;
};

module.exports = { createRoom, getRooms, checkRoomAccess };
