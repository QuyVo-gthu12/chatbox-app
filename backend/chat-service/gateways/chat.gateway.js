const jwt = require('jsonwebtoken');

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id, 'User ID:', socket.user.id);

    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.user.id} joined room ${roomId}`);
    });

    socket.on('sendMessage', async (data) => {
      try {
        const { roomId, sender, content, type } = data;
        await require('../models/message.model').saveMessage(roomId, sender, content, type);
        io.to(roomId).emit('message', { ...data, timestamp: new Date().toISOString() });
      } catch (error) {
        console.error('Error saving message:', error);
      }
    });

    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      socket.to(roomId).emit('typing', { roomId, isTyping, userId: socket.user.id });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};