// src/routes/media.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const Minio = require('minio');
const cassandraClient = require('../config/cassandra');
const { v4: uuidv4 } = require('uuid');
const { getFile } = require('../controllers/media.controller');

// --- Multer config ---
const tempDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// --- MinIO client ---
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

// --- Middleware xác thực token ---
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mySecretKey17130804!@');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Token verification error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// --- Upload file ---
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const bucketName = process.env.MINIO_BUCKET_NAME || 'media';
    const objectName = file.filename;
    const filePath = file.path;

    const bucketExists = await minioClient.bucketExists(bucketName).catch(() => false);
    if (!bucketExists) await minioClient.makeBucket(bucketName, 'us-east-1');

    await minioClient.fPutObject(bucketName, objectName, filePath);
    fs.unlinkSync(filePath);

    const fileUrl = `http://localhost:9000/${bucketName}/${objectName}`;

    // 👇 Lấy uploader_id từ body hoặc token
    const uploaderId = req.body.uploader_id || req.user?.id || null;

    await cassandraClient.execute(
      `INSERT INTO media_files (id, filename, file_url, uploader_id, uploaded_at)
       VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), file.originalname, fileUrl, uploaderId, new Date()],
      { prepare: true }
    );

    res.json({
      message: '✅ Upload thành công',
      fileUrl,
      filename: file.originalname,
      uploader: uploaderId,
      size: file.size
    });
  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});


// --- Lấy file ---
router.get('/:filename', authMiddleware, getFile);

module.exports = router;
