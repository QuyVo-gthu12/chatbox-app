import axios from 'axios';
import { addUserToRoom, checkUserInRoom } from '../models/roomParticipants.model.js';
import { v4 as uuidv4, validate as isUuid } from 'uuid';
import { sendKafkaEvent } from '../kafka/producer.js';
import { CHAT_MESSAGES_TOPIC } from '../kafka/topics.js';
import { saveMessage, getMessages } from '../models/message.model.js';

const USER_API_URL = process.env.USER_API_URL || 'http://user-service:3001';

export const setupChatRoutes = (io) => {
  // ===============================
  // 🔹 Middleware xác thực Socket.IO
  // ===============================
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

  // ===============================
  // 🔹 Socket.IO handlers
  // ===============================
  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id} (user ${socket.user.user_id})`);

    // ===============================
    // 🔹 Join room
    // ===============================
    socket.on('joinRoom', async (roomId) => {
      if (!roomId || !isUuid(roomId)) {
        socket.emit('errorMessage', { message: 'Invalid room ID' });
        return;
      }

      try {
        await addUserToRoom(roomId, socket.user.user_id);
        const messages = await getMessages(roomId);

        socket.join(roomId);
        socket.emit('roomJoined', { roomId, messages });

        console.log(`➡️ User ${socket.user.user_id} joined room ${roomId}`);
      } catch (error) {
        console.error('❌ Error joining room:', error.message);
        socket.emit('errorMessage', { message: 'Cannot join room' });
      }
    });

    // ===============================
    // 🔹 Gửi tin nhắn
    // ===============================
    socket.on('sendMessage', async (data) => {
      try {
        const { roomId, content, type } = data;

        if (!roomId || !isUuid(roomId) || !content || !type) {
          socket.emit('errorMessage', { message: 'Invalid message data' });
          return;
        }

        const hasAccess = await checkUserInRoom(roomId, socket.user.user_id);
        if (!hasAccess) {
          socket.emit('errorMessage', { message: 'You do not have access to this room' });
          return;
        }

        // 1️⃣ Lưu tin nhắn vào database
        const message = await saveMessage(roomId, socket.user.user_id, content, type);

        // 2️⃣ Emit NGAY LẬP TỨC cho chính người gửi (hiển thị tức thời)
        socket.emit('messageSent', {
          roomId,
          message: {
            id: message.id,
            sender_id: socket.user.user_id,
            sender_name: socket.user.name,
            content: message.content,
            msg_type: message.type,
            timestamp: message.timestamp,
            self: true, // cờ để frontend biết là tin của chính mình
          },
        });

        // 3️⃣ Gửi sự kiện Kafka cho consumer lo emit tới các client khác
        const kafkaEvent = {
          type: 'CHAT_MESSAGE_SENT',
          message_id: message.id,
          room_id: roomId,
          sender_id: socket.user.user_id,
          sender_name: socket.user.name,
          content: message.content,
          msg_type: type,
          timestamp: message.timestamp,
        };

        await sendKafkaEvent(CHAT_MESSAGES_TOPIC, kafkaEvent);
        console.log(`📤 Kafka event published: ${CHAT_MESSAGES_TOPIC}`);

      } catch (error) {
        console.error('❌ Error sending message:', error.message);
        socket.emit('errorMessage', { message: 'Cannot send message' });
      }
    });

    // ===============================
    // 🔹 Trạng thái "typing"
    // ===============================
    socket.on('typing', ({ roomId, isTyping }) => {
      if (roomId && isUuid(roomId)) {
        io.to(roomId).emit('typing', {
          roomId,
          isTyping,
          userId: socket.user.user_id,
          userName: socket.user.name,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id} (user ${socket.user.user_id})`);
    });
  });
};
