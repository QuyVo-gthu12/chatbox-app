// server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ----------------- Kết nối PostgreSQL -----------------
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Đặt pool vào global để các file routes/models dùng được
global.pool = pool;

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

// ----------------- Import routes -----------------
const usersRouter = require('./routes/user.routes');
app.use('/users', usersRouter);

// ----------------- Server listen -----------------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 User service running on port ${PORT}`);
});
