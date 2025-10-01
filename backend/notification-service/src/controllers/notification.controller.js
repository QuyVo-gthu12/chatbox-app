const notificationService = require('../services/notification.service');
const sendNotificationSchema = require('../dto/send-notification.dto');

class NotificationController {
  async send(req, res) {
    try {
      const { error, value } = sendNotificationSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const result = await notificationService.sendNotification(value);
      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new NotificationController();
