const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Đọc file JSON từ env
const serviceAccountPath = process.env.FIREBASE_KEY_PATH;
const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(serviceAccountPath), 'utf8'));

// Khởi tạo Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

class NotificationService {
  async sendNotification({ userId, title, body, data }) {
    try {
      const message = {
        notification: { title, body },
        data: data || {},
        token: userId
      };

      const response = await admin.messaging().send(message);
      console.log('Notification sent:', response);
      return response;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
