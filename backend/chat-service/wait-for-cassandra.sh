#!/bin/sh
echo "⏳ Waiting for Cassandra at $CASSANDRA_HOST:9042..."
until nc -z $CASSANDRA_HOST 9042; do
  sleep 2
done
echo "✅ Cassandra is up!"
exec "$@"
