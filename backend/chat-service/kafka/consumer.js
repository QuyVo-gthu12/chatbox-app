// ./kafka/consumer.js
import { Kafka } from 'kafkajs';
import { saveRoomFromEvent } from '../models/room.model.js';
import { FRIENDS_EVENTS_TOPIC } from './topics.js';

// Khởi tạo Kafka client
const kafka = new Kafka({
  clientId: 'chat-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'chat-service-group' });

export const startConsumer = async () => {
  try {
    await consumer.connect();
    console.log('✅ Chat-service Kafka consumer connected');

    await consumer.subscribe({ topic: FRIENDS_EVENTS_TOPIC, fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = message.value.toString();
        let event;

        // Bắt lỗi JSON parse
        try {
          event = JSON.parse(value);
        } catch (err) {
          console.error('❌ Kafka message is not valid JSON, skipped:', value);
          return; // bỏ qua message không hợp lệ
        }

        console.log(`📩 Nhận sự kiện từ Kafka (${topic}):`, event);

        if (event.type === 'FRIEND_ADDED' && event.room_id) {
          try {
            await saveRoomFromEvent(event.room_id, event.participants || []);
            console.log(`💾 Room ${event.room_id} đã được lưu vào Cassandra`);
          } catch (err) {
            console.error('❌ Lỗi lưu room vào Cassandra:', err);
          }
        }
      },
    });
  } catch (err) {
    console.error('❌ Kafka consumer error:', err);
  }
};
