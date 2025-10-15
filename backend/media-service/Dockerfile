# ==========================
# Dockerfile cho media-service
# ==========================
FROM node:18-alpine

# Tạo thư mục làm việc trong container
WORKDIR /usr/src/app

# Copy file package.json và package-lock.json trước
COPY package*.json ./

# Cài đặt các dependencies
RUN npm install

# Copy toàn bộ mã nguồn vào container
COPY . .

# Mở cổng
EXPOSE 3002

# Lệnh khởi chạy server
CMD ["node", "src/server.js"]
