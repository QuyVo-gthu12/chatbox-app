const client = require('../utils/database'); // Cassandra client

// Thêm user vào phòng
const addUserToRoom = async (roomId, userId) => {
  await client.execute(
    `INSERT INTO chatbox.room_participants (room_id, user_id) VALUES (?, ?)`,
    [roomId, userId],
    { prepare: true }
  );
};

// Kiểm tra user có trong phòng không
const checkUserInRoom = async (roomId, userId) => {
  const result = await client.execute(
    `SELECT * FROM chatbox.room_participants WHERE room_id = ? AND user_id = ?`,
    [roomId, userId],
    { prepare: true }
  );
  return result.rowLength > 0;
};

module.exports = { addUserToRoom, checkUserInRoom };
