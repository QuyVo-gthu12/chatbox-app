const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'chat-service',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

const connectProducer = async () => {
  await producer.connect();
};

const sendMessageEvent = async (messageData) => {
  await producer.send({
    topic: 'chat-events',
    messages: [{ value: JSON.stringify(messageData) }],
  });
};

module.exports = { connectProducer, sendMessageEvent };
