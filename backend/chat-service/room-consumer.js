const { Kafka } = require('kafkajs');
const cassandra = require('cassandra-driver');
const { v4: uuid, parse: parseUuid } = require('uuid');

const kafka = new Kafka({
  clientId: 'room-sync-service',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092']
});

const consumer = kafka.consumer({ groupId: 'room-sync-group' });

const client = new cassandra.Client({
  contactPoints: [process.env.CASSANDRA_HOST || 'cassandra'],
  localDataCenter: 'datacenter1',
  keyspace: 'chatbox'
});

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'friends-events', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value.toString());
      console.log("📥 Received event:", event);

      await client.execute(
        `INSERT INTO rooms (room_id, created_at, created_by, name, participants)
         VALUES (?, ?, ?, ?, ?)`,
        [
          parseUuid(event.room_id),   // ép string -> uuid
          new Date(event.created_at),
          event.user_id_1,            // ai tạo phòng
          event.name || null,         // tên phòng (nếu có)
          [event.user_id_1, event.user_id_2] // participants
        ],
        { prepare: true }
      );

      console.log("✅ Room saved to Cassandra:", event.room_id);
    }
  });
}

run().catch(console.error);
