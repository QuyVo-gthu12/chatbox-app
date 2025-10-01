const { Kafka } = require('kafkajs');
const notificationService = require('../services/notification.service');

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'chat-events', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        if (event.type === 'new_message') {
          console.log('Received new_message event:', event);
          await notificationService.sendNotification({
            userId: event.toUserId,        // device token hoặc user id
            title: `New message from ${event.fromUserName}`,
            body: event.text,
            data: event.data || {}
          });
        }
      } catch (err) {
        console.error('Error handling Kafka message:', err);
      }
    }
  });
}

module.exports = startConsumer;
