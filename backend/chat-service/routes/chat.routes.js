import axios from 'axios';
import { saveMessage, getMessages } from '../models/message.model.js';
import { addUserToRoom, checkUserInRoom } from '../models/roomParticipants.model.js';
import { v4 as uuidv4, validate as isUuid } from 'uuid';

const USER_API_URL = process.env.USER_API_URL || 'http://localhost:3001';

export const setupChatRoutes = (io) => {
  // Middleware xác thực token khi kết nối socket
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
    console.log('✅ User connected:', socket.id, 'User ID:', socket.user.user_id);

    // Join room
    socket.on('joinRoom', async (roomId) => {
      if (!roomId || !isUuid(roomId)) {
        console.error(`Invalid roomId: ${roomId}`);
        socket.emit('errorMessage', { message: 'Invalid room ID' });
        return;
      }
      try {
        await addUserToRoom(roomId, socket.user.user_id);
        const messages = await getMessages(roomId);
        socket.join(roomId);

        console.log(`✅ User ${socket.user.user_id} joined room ${roomId}`);
        socket.emit('roomJoined', { roomId, messages });
      } catch (error) {
        console.error('Error joining room:', error.message);
        socket.emit('errorMessage', { message: 'Cannot join room' });
      }
    });

    // Gửi tin nhắn
    socket.on('sendMessage', async (data) => {
      try {
        const { roomId, content, type } = data;
        if (!roomId || !isUuid(roomId) || !content || !type) {
          console.error('Invalid message data:', data);
          socket.emit('errorMessage', { message: 'Invalid message data' });
          return;
        }

        const hasAccess = await checkUserInRoom(roomId, socket.user.user_id);
        if (!hasAccess) {
          console.error(`Access denied for room: ${roomId}, user: ${socket.user.user_id}`);
          socket.emit('errorMessage', { message: 'You do not have access to this room' });
          return;
        }

        const message = await saveMessage(roomId, socket.user.user_id, content, type);

        io.to(roomId).emit('message', {
          ...message,
          senderName: socket.user.name,
        });

        console.log(`✅ Message sent to room ${roomId}:`, message);
      } catch (error) {
        console.error('Error sending message:', error.message);
        socket.emit('errorMessage', { message: 'Cannot send message' });
      }
    });

    // Trạng thái typing
    socket.on('typing', (data) => {
      const { roomId, isTyping } = data;
      if (roomId && isUuid(roomId)) {
        socket.to(roomId).emit('typing', {
          roomId,
          isTyping,
          userId: socket.user.user_id,
          userName: socket.user.name,
        });
        console.log(
          `✅ User ${socket.user.user_id} (${socket.user.name}) is ${isTyping ? 'typing' : 'not typing'} in room ${roomId}`
        );
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id, 'User ID:', socket.user.user_id);
    });
  });
};
