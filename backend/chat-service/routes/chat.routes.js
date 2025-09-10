const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { saveMessage, getMessages } = require('../models/message.model');
const multer = require('multer');
const path = require('path');

// Cấu hình multer để upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Middleware xác thực JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Thiếu token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

router.post('/send', authenticate, async (req, res) => {
  const { roomId, sender, content, type } = req.body;
  if (!roomId || !sender || !content || !type) {
    return res.status(400).json({ message: 'Thiếu thông tin' });
  }
  try {
    await saveMessage(roomId, sender, content, type);
    res.status(200).json({ message: 'Tin nhắn đã gửi' });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ message: 'Lỗi lưu tin nhắn' });
  }
});

router.get('/:roomId', authenticate, async (req, res) => {
  const { roomId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const beforeTimestamp = req.query.before ? new Date(req.query.before) : null;
  try {
    const messages = await getMessages(roomId, limit, beforeTimestamp);
    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Lỗi lấy tin nhắn' });
  }
});

router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file được tải lên' });
    }
    const fileUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/uploads/${req.file.filename}`;
    res.status(200).json({ fileUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Lỗi tải file' });
  }
});

module.exports = router;