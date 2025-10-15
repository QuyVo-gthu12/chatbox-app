import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { setupChatRoutes } from './routes/chat.routes.js';
import { createChatHttpRoutes } from './routes/chat.http.routes.js';
import { startConsumer } from './kafka/consumer.js';
import { connectProducer } from './kafka/producer.js'; // ✅ Thêm dòng này
import './utils/database.js'; // Kết nối Cassandra

// 🔹 Redis adapter (Socket.IO v4)
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

// ✅ Fix __dirname cho ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ================================
// 🔹 Debug environment
// ================================
console.log('⚙️ Loaded ENV:');
console.log({
  PORT: process.env.PORT,
  CASSANDRA_HOST: process.env.CASSANDRA_HOST,
  USER_API_URL: process.env.USER_API_URL,
  REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ================================
// 🔹 Kết nối Redis & Socket.IO adapter
// ================================
const pubClient = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
});
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.IO Redis adapter connected successfully');
  })
  .catch((err) => {
    console.error('❌ Redis connection failed:', err);
    process.exit(1);
  });

// ================================
// 🔹 Middleware & Routes
// ================================
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'Uploads')));
app.use('/chats', createChatHttpRoutes(io));

// ================================
// 🔹 Thiết lập WebSocket (realtime chat)
// ================================
setupChatRoutes(io);

// ================================
// 🔹 Kafka setup (Producer + Consumer)
// ================================
await connectProducer(); // ✅ Đảm bảo producer được connect trước
await startConsumer(io); // Consumer lắng nghe tin nhắn từ Kafka và emit qua Socket.IO

// ================================
// 🚀 Start server
// ================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`💬 Chat service running on port ${PORT}`);
});
