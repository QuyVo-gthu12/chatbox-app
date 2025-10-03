// src/controllers/media.controller.js
const { saveFileMeta, getFileMeta } = require('../services/media.service');
const fs = require('fs');
const Minio = require('minio');

// --- MinIO client ---
const minioClient = new Minio.Client({
  endPoint: 'minio', // Docker Compose service name
  port: 9000,
  useSSL: false,
  accessKey: 'admin',
  secretKey: 'admin123',
});

// Bucket name
const BUCKET_NAME = 'media-files';

// --- Upload file ---
exports.uploadFile = async (req, res) => {
  try {
    console.log('Received upload request:', {
      file: req.file,
      body: req.body,
      headers: req.headers,
    });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const objectName = req.file.filename; // tên file trong MinIO

    // Upload lên MinIO
    await minioClient.fPutObject(BUCKET_NAME, objectName, filePath);

    // Xóa file tạm
    fs.unlinkSync(filePath);

    // Lưu metadata vào DB
    const fileMeta = await saveFileMeta({
      filename: objectName,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploaderId: req.user?.id || null, // nếu có thông tin user
      type: req.body.type || 'file',
    });
    console.log('File meta saved:', fileMeta);

    // URL file
    const fileUrl = `http://localhost:9000/${BUCKET_NAME}/${objectName}`;

    res.status(201).json({
      message: 'File uploaded successfully',
      fileUrl,
      filename: fileMeta.filename,
      type: fileMeta.type,
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

// --- Get file metadata hoặc download file ---
exports.getFile = async (req, res) => {
  try {
    const { filename } = req.params;

    // Lấy metadata từ DB
    const fileMeta = await getFileMeta(filename);
    if (!fileMeta) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Tùy chọn: trả URL trực tiếp
    const fileUrl = `http://localhost:9000/${BUCKET_NAME}/${fileMeta.filename}`;
    res.json({ fileUrl, metadata: fileMeta });
  } catch (error) {
    console.error('❌ Get file error:', error);
    res.status(404).json({ message: 'File not found', error: error.message });
  }
};
