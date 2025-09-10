const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  createUser,
  findUserByEmail,
  getUserById,
  addFriend,
  getFriends
} = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

// Helper format dữ liệu user trả về client
const formatUserResponse = (user) => ({
  id: user.id || null,
  name: user.name,
  email: user.email,
  user_id: user.user_id,
  avatar: user.avatar || null,
  room_id: user.room_id || null
});

// ---------------- REGISTER ----------------
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Thiếu thông tin' });
  }
  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    const user = await createUser(name, email, password);
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('❌ Error registering user:', error.message);
    res.status(500).json({ message: 'Lỗi đăng ký' });
  }
});

// ---------------- LOGIN ----------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Thiếu thông tin' });
  }
  try {
    const user = await findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('❌ Error logging in:', error.message);
    res.status(500).json({ message: 'Lỗi đăng nhập' });
  }
});

// ---------------- ADD FRIEND ----------------
router.post('/friends/add', async (req, res) => {
  const { userId, friendUserId } = req.body;
  if (!userId || !friendUserId) {
    return res.status(400).json({ message: 'Thiếu user_id hoặc friend_user_id' });
  }
  if (userId === friendUserId) {
    return res.status(400).json({ message: 'Không thể thêm chính mình làm bạn bè' });
  }
  try {
    const roomId = await addFriend(userId, friendUserId);
    if (!roomId) {
      return res.status(400).json({ message: 'Không thể thêm bạn bè (user_id không hợp lệ hoặc đã tồn tại)' });
    }
    res.status(200).json({ roomId });
  } catch (error) {
    console.error('❌ Error adding friend:', error.message);
    res.status(500).json({ message: 'Lỗi thêm bạn bè' });
  }
});

// ---------------- GET FRIENDS ----------------
router.get('/friends/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const friends = await getFriends(userId);
    res.status(200).json({ friends: friends.map(formatUserResponse) });
  } catch (error) {
    console.error('❌ Error fetching friends:', error.message);
    res.status(500).json({ message: 'Lỗi lấy danh sách bạn bè' });
  }
});

// ---------------- SEARCH USER ----------------
router.get('/search/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    // Query trực tiếp theo user_id (6 số)
    const result = await pool.query(
      'SELECT user_id, name, email, avatar FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Trả về user (không lộ mật khẩu)
    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('❌ Error searching user:', error.message);
    res.status(500).json({ message: 'Lỗi tìm kiếm người dùng' });
  }
});



module.exports = router;