const pool = require('../utils/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');  // 👈 thêm uuid

/**
 * Generate a 6-digit user ID (string).
 */
const generateUserId = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Create a new user with hashed password.
 */
const createUser = async (name, email, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = generateUserId();

  const query = `
    INSERT INTO users (name, email, password, user_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, user_id
  `;
  const values = [name, email, hashedPassword, userId];
  const result = await pool.query(query, values);

  return result.rows[0];
};

/**
 * Find user by email.
 */
const findUserByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

/**
 * Get user by 6-digit user_id (string).
 */
const getUserById = async (userId) => {
  const query = 'SELECT * FROM users WHERE user_id = $1';
  const result = await pool.query(query, [userId.toString()]);
  return result.rows[0];
};

/**
 * Add friend connection between two users by their user_id (6 digits).
 * Always generates a consistent room_id (UUID).
 */
const addFriend = async (userId1, userId2) => {
  const user1 = await getUserById(userId1);
  const user2 = await getUserById(userId2);

  if (!user1 || !user2) return null;

  // đảm bảo roomId luôn nhất quán (sắp xếp theo id trong DB)
  const sorted = [user1.user_id, user2.user_id].sort((a, b) => a - b);
  const roomId = uuidv4(); // 👈 generate room_id UUID tại Node

  const query = `
    INSERT INTO friends (user_id_1, user_id_2, room_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id_1, user_id_2) DO NOTHING
    RETURNING room_id
  `;
  const values = [sorted[0].toString(), sorted[1].toString(), roomId];
  const result = await pool.query(query, values);

  if (result.rows.length > 0) {
    return result.rows[0].room_id;
  } else {
    const existing = await pool.query(
      `SELECT room_id FROM friends WHERE user_id_1 = $1 AND user_id_2 = $2`,
      [sorted[0].toString(), sorted[1].toString()]
    );
    return existing.rows[0].room_id;
  }
};

/**
 * Get friend list of a user (by user_id 6 digits).
 */
const getFriends = async (userId) => {
  const user = await getUserById(userId);
  if (!user) return [];

  const query = `
    SELECT u.user_id, u.name, u.email, f.room_id
    FROM friends f
    JOIN users u ON u.id = f.user_id_2
    WHERE f.user_id_1 = $1
    UNION
    SELECT u.user_id, u.name, u.email, f.room_id
    FROM friends f
    JOIN users u ON u.id = f.user_id_1
    WHERE f.user_id_2 = $1
  `;
  const result = await pool.query(query, [user.user_id]);
  return result.rows;
};

module.exports = {
  createUser,
  findUserByEmail,
  getUserById,
  addFriend,
  getFriends,
};