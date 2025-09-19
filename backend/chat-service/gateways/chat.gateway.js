const axios = require('axios');
const { saveMessage, getMessages } = require('../models/message.model');

const USER_API_URL = process.env.USER_API_URL || 'http://localhost:3001';

module.exports = (io) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.error('No token provided for socket:', socket.id);
      return next(new Error('Authentication error'));
    }
    try {
      const response = await axios.get(`${USER_API_URL}/users/validate`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      socket.user = response.data.user;
      next();
    } catch (err) {
      console.error('Authentication error:', err.message);
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id, 'User ID:', socket.user.id);

    socket.on('joinRoom', async (roomId) => {
      if (!roomId || !roomId.startsWith('room_')) {
        console.error(`Invalid roomId: ${roomId}`);
        socket.emit('error', { message: 'Invalid room ID' });
        return;
      }
      try {
        const messages = await getMessages(roomId, socket.user.id);
        socket.join(roomId);
        console.log(`✅ User ${socket.user.id} joined room ${roomId}`);
        socket.emit('roomJoined', { roomId, messages });
      } catch (error) {
        console.error('Error joining room:', error.message);
        socket.emit('error', { message: 'Cannot join room' });
      }
    });

    socket.on('sendMessage', async (data) => {
      try {
        const { roomId, content, type } = data;
        if (!roomId || !roomId.startsWith('room_') || !content || !type) {
          console.error('Invalid message data:', data);
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }
        const message = await saveMessage({
          roomId,
          sender: socket.user.id,
          content,
          type,
        });
        io.to(roomId).emit('message', {
          id: message.id,
          roomId,
          sender: socket.user.id,
          content,
          type,
          timestamp: new Date().toISOString(),
        });
        console.log(`✅ Message sent to room ${roomId}:`, message);
      } catch (error) {
        console.error('Error sending message:', error.message);
        socket.emit('error', { message: 'Cannot send message' });
      }
    });

    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      if (roomId && roomId.startsWith('room_')) {
        socket.to(roomId).emit('typing', { roomId, isTyping, userId: socket.user.id });
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
    });
  });
};