const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "chat-app",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

const producer = kafka.producer();

const createConsumer = (groupId) => kafka.consumer({ groupId });

module.exports = {
  producer,
  createConsumer,
};
