FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY . .

# Cấp quyền cho wait-for-db.sh
RUN chmod +x wait-for-db.sh

EXPOSE 3001

# Command sẽ được override trong docker-compose.yml
CMD ["node", "server.js"]
