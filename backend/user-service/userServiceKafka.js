const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: ['kafka:9092']
});

const producer = kafka.producer();

async function initProducer() {
  await producer.connect();
}

async function publishFriendEvent(friend) {
  await producer.send({
    topic: 'friends-events',
    messages: [
      {
        key: friend.user_id_1 + '_' + friend.user_id_2,
        value: JSON.stringify(friend),
      },
    ],
  });
}

module.exports = { initProducer, publishFriendEvent };
