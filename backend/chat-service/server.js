require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const setupChatRoutes = require('./routes/chat.routes');
const chatHttpRoutes = require('./routes/chat.http.routes');

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
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));
app.use('/chats', chatHttpRoutes); // Thêm router HTTP

// Khởi động WebSocket
setupChatRoutes(io);

// Kết nối Cassandra
require('./utils/database');

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chat service running on port ${PORT}`);
});