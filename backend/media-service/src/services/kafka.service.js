// src/services/kafka.service.js
const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'media-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'media-group' });

async function initKafka(retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      await producer.connect();
      await consumer.connect();
      console.log('✅ Kafka connected (Media-Service)');
      return;
    } catch (err) {
      console.error(`❌ Kafka connection failed (attempt ${i + 1}/${retries}):`, err.message);
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
  console.error('❌ Kafka connection failed after multiple retries.');
  process.exit(1);
}

async function consumeMediaMessages(handler) {
  await consumer.subscribe({ topic: process.env.KAFKA_TOPIC_IN, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const msg = JSON.parse(message.value.toString());
        console.log(`📥 Received message from ${topic}:`, msg);
        await handler(msg);
      } catch (err) {
        console.error('❌ Kafka message error:', err.message);
      }
    },
  });
}

async function sendProcessedMessage(data) {
  await producer.send({
    topic: process.env.KAFKA_TOPIC_OUT,
    messages: [{ value: JSON.stringify(data) }],
  });
  console.log(`📤 [${new Date().toISOString()}] Sent to ${process.env.KAFKA_TOPIC_OUT}:`, data);
}

module.exports = { initKafka, consumeMediaMessages, sendProcessedMessage };
