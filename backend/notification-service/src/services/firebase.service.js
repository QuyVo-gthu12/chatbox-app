const admin = require('firebase-admin');
const serviceAccount = require('../../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const sendPushNotification = async ({ userId, title, body }) => {
  try {
    await admin.messaging().send({
      token: userId,
      notification: { title, body },
    });
    console.log(`Notification sent to user ${userId}`);
  } catch (err) {
    console.error('Firebase push error:', err);
  }
};

module.exports = { sendPushNotification };
