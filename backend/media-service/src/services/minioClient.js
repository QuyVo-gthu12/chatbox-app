// src/services/minioClient.js
const Minio = require('minio');
require('dotenv').config();

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

async function initMinio() {
  try {
    console.log(`🔗 Connecting to MinIO: ${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`);
    const bucketName = process.env.MINIO_BUCKET_NAME;
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`🪣 Created bucket: ${bucketName}`);
    } else {
      console.log(`✅ Bucket ready: ${bucketName}`);
    }
  } catch (err) {
    console.error('⚠️ MinIO bucket init error:', err.message);
  }
}

module.exports = { minioClient, initMinio };
