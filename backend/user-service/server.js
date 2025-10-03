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
  port: parseInt(process.env.DB_PORT, 10), // ✅ ép kiểu từ string sang number
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

global.pool = pool;

// ----------------- Hàm chờ DB sẵn sàng -----------------
async function waitForDB(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ PostgreSQL is ready!');
      return;
    } catch (err) {
      console.log(`⏳ Waiting for PostgreSQL... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('❌ PostgreSQL not ready after retries');
}

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
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        user_id_1 VARCHAR(6) NOT NULL,
        user_id_2 VARCHAR(6) NOT NULL,
        room_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_friendship UNIQUE(user_id_1, user_id_2)
      );
    `);

    console.log('✅ Tables ready (users, friends)');
  } catch (err) {
    console.error('❌ Error creating tables:', err);
  }
}

// ----------------- Khởi động server -----------------
async function startServer() {
  try {
    await waitForDB();      // Chờ DB
    await initTables();     // Tạo bảng nếu chưa có

    // Import routes sau khi DB sẵn sàng
    const usersRouter = require('./routes/user.routes');
    app.use('/users', usersRouter);

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`🚀 User service running on port ${PORT}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

startServer();
