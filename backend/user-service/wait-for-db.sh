#!/bin/sh
# wait-for-db.sh

set -e

# --- Debug biến môi trường ---
echo "DEBUG: DB_HOST=$DB_HOST, DB_PORT=$DB_PORT"

host="$DB_HOST"
port="$DB_PORT"

# --- Kiểm tra host và port có tồn tại ---
if [ -z "$host" ] || [ -z "$port" ]; then
  echo "❌ DB_HOST hoặc DB_PORT chưa được thiết lập"
  exit 1
fi

echo "⏳ Waiting for PostgreSQL at $host:$port..."

# --- Thử kết nối với PostgreSQL ---
while ! nc -z $host $port 2>/dev/null; do
  echo "⏳ PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is up - executing command"

# --- Thực thi lệnh tiếp theo ---
exec "$@"
