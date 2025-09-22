const express = require('express');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const { getMessages, saveMessage } = require('../models/message.model');
const { createRoom } = require('../models/room.model');
const { addUserToRoom, checkUserInRoom } = require('../models/roomParticipants.model');
const router = express.Router();

const USER_API_URL = process.env.USER_API_URL || 'http://localhost:3001';
const MEDIA_API_URL = process.env.MEDIA_API_URL || 'http://localhost:3002';

// Multer setup để nhận file upload
const upload = multer({ dest: 'uploads/' });

// Middleware xác thực token
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    console.error('No token provided in request');
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    console.log('Validating token with user-service:', USER_API_URL);
    const response = await axios.get(`${USER_API_URL}/users/validate`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    req.user = response.data.user;
    console.log('User authenticated:', req.user.user_id, req.user.name);
    next();
  } catch (err) {
    console.error('Authentication error:', err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Lấy tin nhắn của phòng
router.get('/:roomId', authenticate, async (req, res) => {
  const { roomId } = req.params;
  const { limit = 50, before } = req.query;
  const userId = req.user.user_id;

  console.log(`Fetching messages for room: ${roomId}, user: ${userId}, limit: ${limit}, before: ${before}`);

  if (!roomId || !roomId.startsWith('room_')) {
    console.error(`Invalid roomId: ${roomId}`);
    return res.status(400).json({ message: 'Invalid room ID' });
  }

  try {
    const hasAccess = await checkUserInRoom(roomId, userId);
    if (!hasAccess) {
      console.error(`Access denied for room: ${roomId}, user: ${userId}`);
      return res.status(404).json({ message: 'Room not found or you do not have access' });
    }

    const messages = await getMessages(roomId, parseInt(limit), before ? new Date(before) : null);
    res.json({ messages });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ message: 'Cannot fetch messages', error: error.message });
  }
});

// Tạo phòng chat mới
router.post('/room', authenticate, async (req, res) => {
  const { participants } = req.body;
  const userId = req.user.user_id;

  if (!participants || !Array.isArray(participants) || !participants.includes(userId)) {
    return res.status(400).json({ message: 'Invalid participants' });
  }

  try {
    const room = await createRoom(participants);

    for (const participant of participants) {
      await addUserToRoom(room.room_id, participant);
    }

    res.status(201).json({ roomId: room.room_id });
  } catch (error) {
    console.error('Error creating room:', error.message);
    res.status(500).json({ message: 'Cannot create room', error: error.message });
  }
});

/**
 * 📌 Gửi tin nhắn (text / image / file)
 * - Nếu text → lưu thẳng DB
 * - Nếu image/file → upload sang media-service rồi mới lưu DB
 */
router.post('/send', authenticate, upload.single('file'), async (req, res) => {
  const { roomId, content, type } = req.body;
  const userId = req.user.user_id;

  if (!roomId || !roomId.startsWith('room_') || !type) {
    return res.status(400).json({ message: 'Invalid message data' });
  }

  try {
    const hasAccess = await checkUserInRoom(roomId, userId);
    if (!hasAccess) {
      return res.status(404).json({ message: 'Room not found or you do not have access' });
    }

    let finalContent = content;

    // 👉 Nếu là file thì upload sang media-service
    if ((type === 'image' || type === 'file') && req.file) {
      console.log(`Uploading file to media-service: ${req.file.originalname}`);

      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', fs.createReadStream(req.file.path));

      const response = await axios.post(`${MEDIA_API_URL}/media/upload`, form, {
        headers: form.getHeaders(),
      });

      finalContent = response.data.url;

      // Xóa file tạm
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
    console.error('Error sending message:', error.message, error.stack);
    res.status(500).json({ message: 'Cannot send message', error: error.message });
  }
});

module.exports = router;
