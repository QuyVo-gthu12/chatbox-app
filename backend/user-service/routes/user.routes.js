const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

// ---------------- VALIDATE TOKEN ----------------
router.get('/validate', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await global.pool.query(
      'SELECT id, name, email, user_id, avatar FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    const user = result.rows[0];
    res.json({ user: formatUserResponse(user) });
  } catch (error) {
    console.error('❌ Error validating token:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// ---------------- REGISTER ----------------
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Thiếu thông tin' });
  }
  try {
    const existingUser = await global.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let userId;
    let isUnique = false;
    while (!isUnique) {
      userId = String(Math.floor(100000 + Math.random() * 900000));
      const check = await global.pool.query(
        'SELECT * FROM users WHERE user_id = $1',
        [userId]
      );
      if (check.rows.length === 0) isUnique = true;
    }

    const result = await global.pool.query(
      `INSERT INTO users (name, email, password, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, user_id, avatar`,
      [name, email, hashedPassword, userId]
    );
    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, user_id: user.user_id },
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
    const result = await global.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, user_id: user.user_id },
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
    const existing = await global.pool.query(
      `SELECT * FROM friends 
       WHERE (user_id_1 = $1 AND user_id_2 = $2) 
          OR (user_id_1 = $2 AND user_id_2 = $1)`,
      [userId, friendUserId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Đã là bạn bè' });
    }

    const roomId = `room_${Date.now()}`;
    await global.pool.query(
      'INSERT INTO friends (user_id_1, user_id_2, room_id, created_at) VALUES ($1, $2, $3, NOW())',
      [userId, friendUserId, roomId]
    );

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
    const result = await global.pool.query(
      `SELECT u.name, u.user_id, f.room_id
       FROM friends f
       JOIN users u ON u.user_id = CASE 
                                    WHEN f.user_id_1 = $1 THEN f.user_id_2 
                                    ELSE f.user_id_1 
                                  END
       WHERE f.user_id_1 = $1 OR f.user_id_2 = $1`,
      [userId]
    );
    res.status(200).json({ friends: result.rows });
  } catch (error) {
    console.error('❌ Error fetching friends:', error.message);
    res.status(500).json({ message: 'Lỗi lấy danh sách bạn bè' });
  }
});

// ---------------- SEARCH USER ----------------
router.get('/search/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await global.pool.query(
      'SELECT user_id, name, email, avatar FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error('❌ Error searching user:', error.message);
    res.status(500).json({ message: 'Lỗi tìm kiếm người dùng' });
  }
});

module.exports = router;