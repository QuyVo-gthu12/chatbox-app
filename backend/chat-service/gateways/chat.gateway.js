const axios = require('axios');
const { saveMessage, getMessages } = require('../models/message.model');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const USER_API_URL = process.env.USER_API_URL || 'http://localhost:3001';
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

module.exports = (io) => {
  // ===================== 🔗 KẾT NỐI REDIS ADAPTER =====================
  (async () => {
    try {
      const pubClient = createClient({ url: REDIS_URL });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Redis adapter for Socket.IO connected');
    } catch (err) {
      console.error('❌ Failed to connect Redis adapter:', err.message);
    }
  })();

  // ===================== 🔒 XÁC THỰC SOCKET.IO =====================
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.error('❌ No token provided for socket:', socket.id);
      return next(new Error('Authentication error'));
    }

    try {
      const response = await axios.get(`${USER_API_URL}/users/validate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      socket.user = response.data.user;
      next();
    } catch (err) {
      console.error('❌ Authentication error:', err.message);
      return next(new Error('Authentication error'));
    }
  });

  // ===================== ⚡ SỰ KIỆN KHI KẾT NỐI =====================
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}, User ID: ${socket.user.id}`);

    // --- Tham gia phòng ---
    socket.on('joinRoom', async (roomId) => {
      if (!roomId || !roomId.startsWith('room_')) {
        console.error(`❌ Invalid roomId: ${roomId}`);
        socket.emit('error', { message: 'Invalid room ID' });
        return;
      }

      try {
        const messages = await getMessages(roomId, socket.user.id);
        socket.join(roomId);
        console.log(`✅ User ${socket.user.id} joined room ${roomId}`);
        socket.emit('roomJoined', { roomId, messages });
      } catch (error) {
        console.error('❌ Error joining room:', error.message);
        socket.emit('error', { message: 'Cannot join room' });
      }
    });

    // --- Gửi tin nhắn ---
    socket.on('sendMessage', async (data) => {
      try {
        const { roomId, content, type } = data;
        if (!roomId || !roomId.startsWith('room_') || !content || !type) {
          console.error('❌ Invalid message data:', data);
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        // Lưu tin nhắn vào database
        const message = await saveMessage({
          roomId,
          sender: socket.user.id,
          content,
          type,
        });

        const messageData = {
          id: message.id,
          roomId,
          sender: socket.user.id,
          content,
          type,
          timestamp: new Date().toISOString(),
        };

        // 🔥 Gửi realtime tới tất cả người trong phòng
        io.to(roomId).emit('message', messageData);

        console.log(`✅ Message emitted to ${roomId}:`, messageData);
      } catch (error) {
        console.error('❌ Error sending message:', error.message);
        socket.emit('error', { message: 'Cannot send message' });
      }
    });

    // --- Trạng thái đang gõ ---
    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      if (roomId && roomId.startsWith('room_')) {
        socket.to(roomId).emit('typing', { roomId, isTyping, userId: socket.user.id });
      }
    });

    // --- Ngắt kết nối ---
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });
};
