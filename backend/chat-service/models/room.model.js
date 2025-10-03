import client from '../utils/database.js';
import cassandra from 'cassandra-driver';

/**
 * ✅ Lưu room nhận từ Kafka (chỉ nhận room_id từ user-service)
 */
export const saveRoomFromEvent = async (roomId, participants = [], createdBy = null) => {
  const uuid = cassandra.types.Uuid.fromString(roomId);
  const createdAt = new Date();
  const name = `Room_${roomId.slice(0, 8)}`;

  // 1️⃣ Insert vào bảng rooms
  const queryRoom = `
    INSERT INTO chatbox.rooms (room_id, name, participants, created_by, created_at)
    VALUES (?, ?, ?, ?, ?)
  `;
  await client.execute(
    queryRoom,
    [
      uuid,
      name,
      participants.map((u) => parseInt(u, 10)),
      createdBy ? parseInt(createdBy, 10) : null,
      createdAt,
    ],
    { prepare: true }
  );

  // 2️⃣ Insert vào bảng quan hệ participants
  for (const userId of participants) {
    const intUserId = parseInt(userId, 10);

    // room_participants
    const q1 = `INSERT INTO chatbox.room_participants (user_id, room_id) VALUES (?, ?)`;
    await client.execute(q1, [intUserId, uuid], { prepare: true });

    // room_participants_by_user
    const q2 = `INSERT INTO chatbox.room_participants_by_user (user_id, room_id) VALUES (?, ?)`;
    await client.execute(q2, [intUserId, uuid], { prepare: true });

    // room_participants_by_room
    const q3 = `INSERT INTO chatbox.room_participants_by_room (room_id, user_id) VALUES (?, ?)`;
    await client.execute(q3, [uuid, intUserId], { prepare: true });
  }

  console.log(`✅ Room ${roomId} inserted with ${participants.length} participants`);
};

/**
 * ✅ Lấy danh sách phòng của user
 */
export const getRooms = async (userId) => {
  const participantQuery = `
    SELECT room_id FROM chatbox.room_participants WHERE user_id = ?
  `;
  const participantResult = await client.execute(
    participantQuery,
    [parseInt(userId, 10)],
    { prepare: true }
  );

  if (participantResult.rows.length === 0) return [];

  const roomIds = participantResult.rows.map((r) => r.room_id);
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
        roomId: row.room_id.toString(),
        name: row.name,
        participants: row.participants,
        createdBy: row.created_by,
        createdAt:
          row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      });
    }
  }

  return rooms;
};

/**
 * ✅ Kiểm tra quyền truy cập phòng (tên export đồng bộ với các service khác)
 */
export const checkUserInRoom = async (roomId, userId) => {
  const query = `
    SELECT * FROM chatbox.room_participants
    WHERE user_id = ? AND room_id = ?
  `;
  const result = await client.execute(
    query,
    [parseInt(userId, 10), cassandra.types.Uuid.fromString(roomId)],
    { prepare: true }
  );
  return result.rows.length > 0;
};
