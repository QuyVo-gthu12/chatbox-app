const express = require('express');
const axios = require('axios');
const { getMessages, saveMessage } = require('../models/message.model');
const { createRoom } = require('../models/room.model');
const { addUserToRoom, checkUserInRoom } = require('../models/roomParticipants.model');
const router = express.Router();

const USER_API_URL = process.env.USER_API_URL || 'http://localhost:3001';

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
    console.log(`Checking access for room: ${roomId}, user: ${userId}`);
    const hasAccess = await checkUserInRoom(roomId, userId);
    if (!hasAccess) {
      console.error(`Access denied for room: ${roomId}, user: ${userId}`);
      return res.status(404).json({ message: 'Room not found or you do not have access' });
    }

    console.log(`Fetching messages for room: ${roomId}`);
    const messages = await getMessages(roomId, parseInt(limit), before ? new Date(before) : null);
    console.log(`Fetched ${messages.length} messages for room: ${roomId}`);
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

  console.log(`Creating room with participants: ${participants}, user: ${userId}`);

  if (!participants || !Array.isArray(participants) || !participants.includes(userId)) {
    console.error('Invalid participants:', participants);
    return res.status(400).json({ message: 'Invalid participants' });
  }

  try {
    const room = await createRoom(participants);

    // ✅ Thêm tất cả participants vào bảng room_participants
    for (const participant of participants) {
      await addUserToRoom(room.room_id, participant);
    }

    console.log(`Room created: ${room.room_id}`);
    res.status(201).json({ roomId: room.room_id });
  } catch (error) {
    console.error('Error creating room:', error.message, error.stack);
    res.status(500).json({ message: 'Cannot create room', error: error.message });
  }
});

// Gửi tin nhắn qua HTTP
router.post('/send', authenticate, async (req, res) => {
  const { roomId, content, type } = req.body;
  const userId = req.user.user_id;

  console.log(`Sending message to room: ${roomId}, user: ${userId}, type: ${type}`);

  if (!roomId || !roomId.startsWith('room_') || !content || !type) {
    console.error('Invalid message data:', { roomId, content, type });
    return res.status(400).json({ message: 'Invalid message data' });
  }

  try {
    // ✅ Kiểm tra quyền từ room_participants
    const hasAccess = await checkUserInRoom(roomId, userId);
    if (!hasAccess) {
      console.error(`Access denied for room: ${roomId}, user: ${userId}`);
      return res.status(404).json({ message: 'Room not found or you do not have access' });
    }

    const message = await saveMessage(roomId, userId, content, type);
    console.log(`Message saved: ${message.id}`);
    res.status(201).json({
      id: message.id,
      roomId,
      sender: userId,
      senderName: req.user.name,
      content,
      type,
      timestamp: message.timestamp,
    });
  } catch (error) {
    console.error('Error sending message:', error.message, error.stack);
    res.status(500).json({ message: 'Cannot send message', error: error.message });
  }
});

module.exports = router;
