import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { setupChatRoutes } from './routes/chat.routes.js';
import chatHttpRoutes from './routes/chat.http.routes.js';
import { startConsumer } from './kafka/consumer.js';
import './utils/database.js'; // Kết nối Cassandra

// 🔹 Fix __dirname cho ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Debug env
console.log('⚙️ Loaded ENV:');
console.log('PORT:', process.env.PORT);
console.log('CASSANDRA_HOST:', process.env.CASSANDRA_HOST);
console.log('USER_API_URL:', process.env.USER_API_URL);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'Uploads')));
app.use('/chats', chatHttpRoutes); // HTTP routes

// Khởi động WebSocket
setupChatRoutes(io);

// ✅ Khởi động Kafka consumer song song
startConsumer();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`💬 Chat service running on port ${PORT}`);
});
