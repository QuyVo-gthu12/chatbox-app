const app = require('./app');
const startKafkaConsumer = require('./kafka/kafka.consumer');

const PORT = process.env.PORT || 3003;

// Start Express server
app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});

// Start Kafka consumer
startKafkaConsumer().catch(console.error);
