// ./kafka/producer.js
import { Kafka, logLevel } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'chat-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.ERROR, // Giảm spam log
});

let producer;
let isConnected = false;

/**
 * Kết nối Kafka Producer (chỉ kết nối 1 lần)
 */
export const connectProducer = async () => {
  if (isConnected && producer) return producer;

  try {
    producer = kafka.producer({
      allowAutoTopicCreation: true,
      retry: {
        retries: 5,
        initialRetryTime: 300,
      },
    });

    await producer.connect();
    isConnected = true;
    console.log('✅ Kafka producer connected');
    return producer;
  } catch (err) {
    console.error('❌ Kafka producer connection failed:', err);
    isConnected = false;
  }
};

/**
 * Gửi event đến Kafka topic
 * @param {string} topic - tên topic
 * @param {object} event - dữ liệu event
 */
export const sendKafkaEvent = async (topic, event) => {
  try {
    // Đảm bảo producer luôn được kết nối trước khi gửi
    if (!producer || !isConnected) {
      console.warn('⚠️ Producer chưa kết nối, đang reconnect...');
      await connectProducer();
    }

    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(event) }],
    });

    console.log(`📤 Gửi event đến Kafka topic [${topic}]`);
  } catch (err) {
    console.error('❌ Kafka send error:', err);

    // Nếu lỗi do mất kết nối, thử reconnect 1 lần
    if (err.message?.includes('disconnected')) {
      isConnected = false;
      await connectProducer();
    }
  }
};
