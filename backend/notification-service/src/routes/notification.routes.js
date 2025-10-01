const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

// Route test gửi notification
router.post('/send', (req, res) => notificationController.send(req, res));

module.exports = router;
