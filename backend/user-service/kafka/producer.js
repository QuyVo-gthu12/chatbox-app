// D:\RePhantan\chatbox-app\backend\user-service\kafka\producer.js
const { Kafka } = require('kafkajs');
const { FRIENDS_EVENTS_TOPIC } = require('./topics');

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});

const producer = kafka.producer();

/**
 * Kết nối producer
 */
async function connectProducer() {
  try {
    await producer.connect();
    console.log("✅ Kafka Producer connected (user-service)");
  } catch (err) {
    console.error("❌ Kafka Producer connection failed:", err.message);
  }
}

/**
 * Gửi sự kiện tạo room mới
 * @param {string} roomId - UUID của room
 * @param {Array<number>} participants - danh sách user_id tham gia
 * @param {number} createdBy - user_id người tạo
 */
async function publishRoomEvent(roomId, participants, createdBy) {
  try {
    const event = {
      type: 'FRIEND_ADDED',       // thêm type để consumer nhận biết
      room_id: roomId,
      participants,
      createdBy,
      timestamp: new Date().toISOString()
    };

    await producer.send({
      topic: FRIENDS_EVENTS_TOPIC,
      messages: [{ value: JSON.stringify(event) }]
    });

    console.log(`📤 Sent event to ${FRIENDS_EVENTS_TOPIC}:`, event);
  } catch (err) {
    console.error("❌ Error publishing room event:", err.message);
  }
}

module.exports = {
  connectProducer,
  publishRoomEvent
};
