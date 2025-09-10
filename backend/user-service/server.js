require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors()); // Bật CORS cho tất cả domain
app.use(express.json());

// ----------------- Kết nối PostgreSQL -----------------
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// ----------------- Tạo bảng -----------------
async function initTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar VARCHAR(255),
        user_id VARCHAR(6) UNIQUE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        user_id_1 VARCHAR(6) NOT NULL,
        user_id_2 VARCHAR(6) NOT NULL,
        room_id VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_friendship UNIQUE(user_id_1, user_id_2)
      );
    `);

    console.log('✅ Tables ready (users, friends)');
  } catch (err) {
    console.error('❌ Error creating tables:', err);
  }
}
initTables();

// ----------------- Hàm sinh user_id 6 số -----------------
function generateUserId() {
  return String(Math.floor(100000 + Math.random() * 900000)); // luôn đủ 6 số
}

// ----------------- API Đăng ký -----------------
app.post('/users/register', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Thiếu thông tin đăng ký' });
    }

    // Kiểm tra email tồn tại
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length > 0) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    // Mã hóa password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Sinh user_id duy nhất
    let userId;
    let isUnique = false;
    while (!isUnique) {
      userId = generateUserId();
      const check = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
      if (check.rows.length === 0) isUnique = true;
    }

    // Lưu user
    const result = await pool.query(
      `INSERT INTO users (email, password, name, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, user_id`,
      [email, hashedPassword, name, userId]
    );

    console.log('✅ User registered:', result.rows[0]);
    res.status(201).json({
      message: 'Đăng ký thành công',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Error in register:', error);
    res.status(500).json({ message: error.message || 'Lỗi server' });
  }
});

// ----------------- API Đăng nhập -----------------
app.post('/users/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Thiếu thông tin đăng nhập' });
    }

    // Tìm user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu sai' });
    }

    // Kiểm tra password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu sai' });
    }

    // Tạo JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('✅ User login:', user.email);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        user_id: user.user_id,
      },
    });
  } catch (error) {
    console.error('❌ Error in login:', error);
    res.status(500).json({ message: error.message || 'Lỗi server' });
  }
});

// ----------------- Server listen -----------------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 User service running on port ${PORT}`);
});
