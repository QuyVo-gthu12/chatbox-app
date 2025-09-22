// server.js
require('dotenv').config(); // Load biến môi trường từ .env
const app = require('./app');

// ✅ Danh sách biến môi trường bắt buộc
const requiredEnvVars = ['PORT', 'MEDIA_URL', 'JWT_SECRET'];

// ✅ Kiểm tra các biến môi trường
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1); // Dừng server nếu thiếu biến quan trọng
}

// ✅ Lấy PORT từ biến môi trường hoặc dùng mặc định
const PORT = process.env.PORT || 3002;

// ✅ Khởi động server
const server = app.listen(PORT, () => {
  console.log(`🚀 Media-service running on port ${PORT}`);

  // In ra các biến môi trường quan trọng để debug
  console.log('Environment variables:', {
    PORT: process.env.PORT,
    MEDIA_URL: process.env.MEDIA_URL,
    JWT_SECRET: process.env.JWT_SECRET ? '[REDACTED]' : undefined // Ẩn key tránh lộ
  });
});

// ✅ Xử lý lỗi khi khởi động server (ví dụ trùng port)
server.on('error', (error) => {
  console.error('❌ Server startup error:', error);

  if (error.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is already in use. Please free the port or use a different one.`);
  }

  process.exit(1);
});

// ✅ Xuất server để dùng trong test (nếu cần)
module.exports = server;
