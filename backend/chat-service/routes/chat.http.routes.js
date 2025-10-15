import express from 'express';
import axios from 'axios';
import multer from 'multer';
import fs from 'fs';
import FormData from 'form-data';

import { getMessages, saveMessage } from '../models/message.model.js';
import { checkUserInRoom } from '../models/room.model.js';
import { sendKafkaEvent } from '../kafka/producer.js';
import { CHAT_MESSAGES_TOPIC } from '../kafka/topics.js';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const USER_API_URL = process.env.USER_API_URL || 'http://localhost:3001';
const MEDIA_API_URL = process.env.MEDIA_API_URL || 'http://localhost:3002';
const upload = multer({ dest: 'uploads/' });

// Middleware xác thực token
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const response = await axios.get(`${USER_API_URL}/users/validate`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    req.user = response.data.user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ✅ Route factory nhận io instance
export const createChatHttpRoutes = (io) => {
  const router = express.Router();

  // 📌 Lấy tin nhắn của phòng
  router.get('/:roomId', authenticate, async (req, res) => {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user.user_id;

    if (!roomId || !uuidRegex.test(roomId))
      return res.status(400).json({ message: 'Invalid room ID' });

    try {
      const hasAccess = await checkUserInRoom(roomId, userId);
      if (!hasAccess)
        return res
          .status(404)
          .json({ message: 'Room not found or access denied' });

      const messages = await getMessages(
        roomId,
        parseInt(limit),
        before ? new Date(before) : null
      );

      res.json({ messages });
    } catch (error) {
      res.status(500).json({
        message: 'Cannot fetch messages',
        error: error.message,
      });
    }
  });

  // 📌 Gửi tin nhắn (HTTP API)
  router.post('/send', authenticate, upload.single('file'), async (req, res) => {
    const { roomId, content, type } = req.body;
    const userId = req.user.user_id;

    if (!roomId || !uuidRegex.test(roomId) || !type)
      return res.status(400).json({ message: 'Invalid message data' });

    let finalContent = content;

    try {
      const hasAccess = await checkUserInRoom(roomId, userId);
      if (!hasAccess)
        return res
          .status(404)
          .json({ message: 'Room not found or access denied' });

      // ✅ Upload file/image tới media-service (nếu có)
      if ((type === 'image' || type === 'file') && req.file) {
        const form = new FormData();
        form.append('file', fs.createReadStream(req.file.path));

        const response = await axios.post(`${MEDIA_API_URL}/media/upload`, form, {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${req.headers.authorization?.split('Bearer ')[1]}`,
          },
        });

        finalContent = response.data.url;
      }

      // ✅ 1️⃣ Lưu tin nhắn vào DB
      const message = await saveMessage(roomId, userId, finalContent, type);

      // ✅ 2️⃣ Emit ngay lập tức cho người gửi (đảm bảo UX realtime)
      io.to(roomId).emit('message', {
        id: message.id,
        roomId,
        senderId: userId,
        senderName: req.user.name || req.user.username || 'Unknown',
        content: finalContent,
        type,
        timestamp: message.timestamp,
      });

      // ✅ 3️⃣ Publish Kafka để các instance khác emit
      await sendKafkaEvent(CHAT_MESSAGES_TOPIC, {
        type: 'CHAT_MESSAGE_SENT',
        message_id: message.id,
        room_id: roomId,
        sender_id: userId,
        sender_name: req.user.name || req.user.username || 'Unknown',
        content: finalContent,
        msg_type: type,
        timestamp: message.timestamp,
      });
      console.log(`📤 Kafka event published: ${CHAT_MESSAGES_TOPIC}`);

      // ✅ 4️⃣ Trả phản hồi HTTP
      res.status(201).json({
        id: message.id,
        roomId,
        senderId: userId,
        content: finalContent,
        type,
        timestamp: message.timestamp,
      });
    } catch (error) {
      console.error('❌ Error sending HTTP message:', error.message);
      res.status(500).json({
        message: 'Cannot send message',
        error: error.message,
      });
    } finally {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
  });

  return router;
};
