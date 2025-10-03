// src/services/media.service.js
const { Pool } = require('pg');

// --- Kết nối PostgreSQL (dùng DB user-service) ---
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'chatbox',
});

// --- Lưu metadata file vào PostgreSQL ---
const saveFileMeta = async (file) => {
  try {
    if (!file || !file.filename || !file.originalname) {
      throw new Error('Invalid file object');
    }

    const uploadedAt = new Date();

    const query = `
      INSERT INTO media_files(filename, original_name, mimetype, size, uploader_id, type, uploaded_at)
      VALUES($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      file.filename,
      file.originalname,
      file.mimetype,
      file.size,
      file.uploaderId || null,
      file.type || 'file',
      uploadedAt
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error in saveFileMeta:', error);
    throw error;
  }
};

// --- Lấy metadata file từ PostgreSQL ---
const getFileMeta = async (filename) => {
  try {
    if (!filename) throw new Error('Filename is required');

    const query = 'SELECT * FROM media_files WHERE filename = $1';
    const result = await pool.query(query, [filename]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('❌ Error in getFileMeta:', error);
    throw error;
  }
};

module.exports = { saveFileMeta, getFileMeta };
