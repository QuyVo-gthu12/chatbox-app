// src/controllers/media.controller.js
const { saveFileMeta, getFileMeta } = require('../services/media.service');
const fs = require('fs');
const Minio = require('minio');

const BUCKET_NAME = 'media-files';

// --- MinIO client ---
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

// --- Upload file ---
exports.uploadFile = async (req, res) => {
  try {
    console.log('📥 Received upload request:', {
      file: req.file?.originalname,
      user: req.user?.id,
    });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const objectName = req.file.filename;

    // Kiểm tra & tạo bucket
    const bucketExists = await minioClient.bucketExists(BUCKET_NAME).catch(() => false);
    if (!bucketExists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`✅ Created bucket: ${BUCKET_NAME}`);
    }

    // Upload file lên MinIO
    await minioClient.fPutObject(BUCKET_NAME, objectName, filePath);
    fs.unlinkSync(filePath);

    // Lưu metadata vào Cassandra
    const fileMeta = await saveFileMeta({
      filename: objectName,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploaderId: req.user?.id || null,
      type: req.body.type || 'file',
    });

    // Tạo URL truy cập file
    const fileUrl = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${BUCKET_NAME}/${objectName}`;

    res.status(201).json({
      message: '✅ Upload thành công và lưu metadata vào Cassandra',
      fileUrl,
      metadata: fileMeta,
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

// --- Get file metadata ---
exports.getFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const fileMeta = await getFileMeta(filename);

    if (!fileMeta) {
      return res.status(404).json({ message: 'File not found' });
    }

    const fileUrl = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${BUCKET_NAME}/${fileMeta.filename}`;
    res.json({ fileUrl, metadata: fileMeta });
  } catch (error) {
    console.error('❌ Get file error:', error);
    res.status(500).json({ message: 'File not found', error: error.message });
  }
};
