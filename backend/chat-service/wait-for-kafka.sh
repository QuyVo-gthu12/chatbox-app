#!/bin/sh
echo "⏳ Waiting for Kafka at $KAFKA_BROKER..."
host=${KAFKA_BROKER%%:*}   # tách hostname từ kafka:9092
port=${KAFKA_BROKER##*:}  # tách port từ kafka:9092

until nc -z $host $port; do
  echo "⏳ Waiting for Kafka..."
  sleep 2
done

echo "✅ Kafka is up!"
exec "$@"
