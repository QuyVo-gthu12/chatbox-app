// ./kafka/consumer.js
import { Kafka } from 'kafkajs';
import { saveRoomFromEvent } from '../models/room.model.js';
import { FRIENDS_EVENTS_TOPIC, CHAT_MESSAGES_TOPIC } from './topics.js';

/**
 * Khởi động Kafka consumer và xử lý event chat
 * @param {import("socket.io").Server} io - Socket.IO server instance
 */
export const startConsumer = async (io) => {
  const kafka = new Kafka({
    clientId: 'chat-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  });

  const consumer = kafka.consumer({ groupId: 'chat-service-group' });

  try {
    await consumer.connect();
    console.log('✅ Kafka consumer (chat-service) connected successfully');

    // Chỉ đọc các message mới
    await consumer.subscribe({ topic: FRIENDS_EVENTS_TOPIC, fromBeginning: false });
    await consumer.subscribe({ topic: CHAT_MESSAGES_TOPIC, fromBeginning: false });

    // Chạy consumer lắng nghe sự kiện mới
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const rawValue = message.value?.toString();
        if (!rawValue) return;

        let event;
        try {
          event = JSON.parse(rawValue);
        } catch {
          console.error('❌ Invalid Kafka message JSON:', rawValue);
          return;
        }

        console.log(`📨 Kafka event received | Topic: ${topic} | Partition: ${partition}`);

        if (topic === FRIENDS_EVENTS_TOPIC) {
          await handleFriendEvent(event);
        } else if (topic === CHAT_MESSAGES_TOPIC) {
          await handleChatMessageEvent(io, event);
        } else {
          console.warn(`⚠️ Unhandled Kafka topic: ${topic}`);
        }
      },
    });
  } catch (err) {
    console.error('❌ Kafka consumer initialization failed:', err);
  }
};

// ============================================================
// 🧩 HANDLE FRIEND EVENTS
// ============================================================
async function handleFriendEvent(event) {
  if (!event?.type) return;

  if (event.type === 'FRIEND_ADDED' && event.room_id) {
    try {
      await saveRoomFromEvent(event.room_id, event.participants || [], event.created_by);
      console.log(`💾 Room saved to Cassandra: ${event.room_id}`);
    } catch (err) {
      console.error('❌ Error saving room to Cassandra:', err);
    }
  }
}

// ============================================================
// 💬 HANDLE CHAT MESSAGE EVENTS
// ============================================================
async function handleChatMessageEvent(io, event) {
  if (event.type !== 'CHAT_MESSAGE_SENT') return;

  try {
    // Không lưu lại DB — message đã được lưu ở producer (route)
    const payload = {
      id: event.message_id,
      roomId: event.room_id,
      senderId: event.sender_id,
      senderName: event.sender_name,
      content: event.content,
      type: event.msg_type,
      timestamp: event.timestamp,
    };

    // 1️⃣ Emit tới tất cả client khác trong room (ngoại trừ người gửi)
    // Socket.IO tự động quản lý thông qua Redis adapter trong multi-instance setup
    io.to(event.room_id).emit('message', payload);

    console.log(`📩 Kafka → Socket.IO emitted message to room ${event.room_id}`);
  } catch (err) {
    console.error('❌ Error processing chat message event:', err);
  }
}
