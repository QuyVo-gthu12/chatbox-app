// src/routes/media.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const Minio = require('minio');

// Import controller
const { getFile } = require('../controllers/media.controller');

// --- Multer config (lưu tạm file trước khi upload lên MinIO) ---
const tempDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

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
  endPoint: 'minio', // service name trong Docker Compose
  port: 9000,
  useSSL: false,
  accessKey: 'admin',
  secretKey: 'admin123',
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

// --- Route upload file lên MinIO ---
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const bucketName = 'media-files';
    const objectName = file.filename; // tên file trong MinIO
    const filePath = file.path;

    // Upload file lên MinIO
    await minioClient.fPutObject(bucketName, objectName, filePath);

    // Xóa file tạm
    fs.unlinkSync(filePath);

    // Trả về URL file
    const fileUrl = `http://localhost:9000/${bucketName}/${objectName}`;
    res.json({
      message: 'Upload thành công',
      fileUrl
    });
  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

// --- Route lấy file (proxy từ MinIO nếu muốn) ---
router.get('/:filename', authMiddleware, getFile);

module.exports = router;
