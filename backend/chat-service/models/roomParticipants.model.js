import client from '../utils/database.js'; // Cassandra client

// ✅ Thêm user vào phòng
export const addUserToRoom = async (roomId, userId) => {
  await client.execute(
    `INSERT INTO chatbox.room_participants (user_id, room_id) VALUES (?, ?)`,
    [parseInt(userId, 10), roomId],
    { prepare: true }
  );
};

// ✅ Kiểm tra user có trong phòng không
export const checkUserInRoom = async (roomId, userId) => {
  const result = await client.execute(
    `SELECT * FROM chatbox.room_participants WHERE user_id = ? AND room_id = ?`,
    [parseInt(userId, 10), roomId],
    { prepare: true }
  );
  return result.rowLength > 0;
};
