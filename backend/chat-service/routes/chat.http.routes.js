import express from 'express';
import axios from 'axios';
import multer from 'multer';
import fs from 'fs';
import FormData from 'form-data';

import { getMessages, saveMessage } from '../models/message.model.js';
import { checkUserInRoom } from '../models/room.model.js';

const router = express.Router();

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const USER_API_URL = process.env.USER_API_URL || 'http://localhost:3001';
const MEDIA_API_URL = process.env.MEDIA_API_URL || 'http://localhost:3002';

// Multer setup
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
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// 📌 Lấy tin nhắn của phòng
router.get('/:roomId', authenticate, async (req, res) => {
  const { roomId } = req.params;
  const { limit = 50, before } = req.query;
  const userId = req.user.user_id;

  if (!roomId || !uuidRegex.test(roomId)) {
    return res.status(400).json({ message: 'Invalid room ID' });
  }

  try {
    const hasAccess = await checkUserInRoom(roomId, userId);
    if (!hasAccess) {
      return res
        .status(404)
        .json({ message: 'Room not found or you do not have access' });
    }

    const messages = await getMessages(
      roomId,
      parseInt(limit),
      before ? new Date(before) : null
    );
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Cannot fetch messages', error: error.message });
  }
});

// 📌 Tạo phòng chat mới
router.post('/room', authenticate, async (req, res) => {
  const { participants } = req.body;
  const userId = req.user.user_id;

  if (!participants || !Array.isArray(participants) || !participants.includes(userId)) {
    return res.status(400).json({ message: 'Invalid participants' });
  }

  try {
    const room = await createRoom(participants);
    res.status(201).json({ roomId: room.room_id });
  } catch (error) {
    res.status(500).json({ message: 'Cannot create room', error: error.message });
  }
});

// 📌 Gửi tin nhắn
router.post('/send', authenticate, upload.single('file'), async (req, res) => {
  const { roomId, content, type } = req.body;
  const userId = req.user.user_id;

  if (!roomId || !uuidRegex.test(roomId) || !type) {
    return res.status(400).json({ message: 'Invalid message data' });
  }

  try {
    const hasAccess = await checkUserInRoom(roomId, userId);
    if (!hasAccess) {
      return res
        .status(404)
        .json({ message: 'Room not found or you do not have access' });
    }

    let finalContent = content;

    if ((type === 'image' || type === 'file') && req.file) {
      const form = new FormData();
      form.append('file', fs.createReadStream(req.file.path));

      const response = await axios.post(`${MEDIA_API_URL}/media/upload`, form, {
        headers: form.getHeaders(),
      });

      finalContent = response.data.url;
      fs.unlinkSync(req.file.path);
    }

    const message = await saveMessage(roomId, userId, finalContent, type);
    res.status(201).json({
      id: message.id,
      roomId,
      sender: userId,
      senderName: req.user.name,
      content: message.content,
      type,
      timestamp: message.timestamp,
    });
  } catch (error) {
    res.status(500).json({ message: 'Cannot send message', error: error.message });
  }
});

export default router;
