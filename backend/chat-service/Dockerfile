FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Copy script wait-for-cassandra
COPY wait-for-cassandra.sh .
RUN chmod +x wait-for-cassandra.sh

EXPOSE 3000

CMD ["sh", "wait-for-cassandra.sh", "node", "server.js"]
