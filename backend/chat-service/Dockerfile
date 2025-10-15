FROM node:18

# ✅ Cài netcat để wait-for-cassandra.sh có thể dùng nc
RUN apt-get update && apt-get install -y netcat-openbsd

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Copy script wait-for-cassandra
COPY wait-for-cassandra.sh .
RUN chmod +x wait-for-cassandra.sh

EXPOSE 3000

CMD ["sh", "wait-for-cassandra.sh", "node", "server.js"]
