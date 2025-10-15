// src/services/media.service.js
const cassandra = require('cassandra-driver');

// --- Kết nối Cassandra ---
const client = new cassandra.Client({
  contactPoints: [process.env.CASSANDRA_HOST || 'cassandra'],
  localDataCenter: process.env.CASSANDRA_DC || 'datacenter1',
  keyspace: process.env.CASSANDRA_KEYSPACE || 'chatbox',
});

// --- Lưu metadata file vào Cassandra ---
const saveFileMeta = async (file) => {
  try {
    if (!file || !file.filename || !file.originalname) {
      throw new Error('Invalid file object');
    }

    const uploadedAt = new Date();

    const query = `
      INSERT INTO media_files (
        id, filename, original_name, mimetype, size, uploader_id, type, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      cassandra.types.Uuid.random(),
      file.filename,
      file.originalname,
      file.mimetype,
      file.size,
      file.uploaderId || null,
      file.type || 'file',
      uploadedAt
    ];

    await client.execute(query, params, { prepare: true });

    return {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      type: file.type,
      uploadedAt
    };
  } catch (error) {
    console.error('❌ Error in saveFileMeta:', error);
    throw error;
  }
};

// --- Lấy metadata file từ Cassandra ---
const getFileMeta = async (filename) => {
  try {
    const query = `SELECT * FROM media_files WHERE filename = ? LIMIT 1`;
    const result = await client.execute(query, [filename], { prepare: true });

    if (result.rowLength === 0) return null;
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error in getFileMeta:', error);
    throw error;
  }
};

module.exports = { saveFileMeta, getFileMeta };
