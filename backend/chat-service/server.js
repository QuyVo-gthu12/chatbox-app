require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const chatRoutes = require('./routes/chat.routes');
const chatGateway = require('./gateways/chat.gateway');

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
app.use('/chats', chatRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Khởi động WebSocket Gateway
chatGateway(io);

// Kết nối Cassandra
require('./utils/database');

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chat service running on port ${PORT}`);
});