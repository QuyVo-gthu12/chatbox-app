import io from 'socket.io-client';

let socket = null;

// Hàm kết nối WebSocket
export const connectWebSocket = () => {
  return new Promise((resolve, reject) => {
    if (socket && socket.connected) {
      console.log('✅ WebSocket already connected:', socket.id);
      resolve(socket);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No token found, redirecting to login');
      window.location.href = '/login';
      reject(new Error('No token found'));
      return;
    }

    // URL server WebSocket, ưu tiên biến môi trường
    const SOCKET_URL = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:3000';

    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token },
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id, 'Token:', token);
      const currentRoom = localStorage.getItem('currentRoom');
      if (currentRoom && currentRoom.startsWith('room_')) {
        socket.emit('joinRoom', currentRoom);
      }
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      if (error.message.includes('Authentication error')) {
        console.error('❌ Invalid token, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        reject(new Error('Authentication error'));
      } else {
        reject(error);
      }
    });

    socket.on('reconnect', (attempt) => {
      console.log(`🔄 WebSocket reconnected after ${attempt} attempts`);
      const currentRoom = localStorage.getItem('currentRoom');
      if (currentRoom && currentRoom.startsWith('room_')) {
        socket.emit('joinRoom', currentRoom);
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ WebSocket disconnected:', reason);
    });

    socket.on('error', (data) => {
      console.error('❌ Server error:', data.message);
    });
  });
};

// Ngắt kết nối
export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 WebSocket disconnected');
  }
};

// Tham gia phòng chat
export const joinRoom = (roomId) => {
  if (!roomId) {
    console.error('❌ Invalid roomId:', roomId);
    return Promise.reject(new Error('Invalid roomId'));
  }
  return new Promise((resolve, reject) => {
    if (socket && socket.connected) {
      socket.emit('joinRoom', roomId);
      localStorage.setItem('currentRoom', roomId);
      console.log(`✅ Joining room: ${roomId}`);
      resolve();
    } else {
      console.error('❌ WebSocket not connected, attempting to reconnect for room:', roomId);
      connectWebSocket()
        .then(() => {
          socket.emit('joinRoom', roomId);
          localStorage.setItem('currentRoom', roomId);
          console.log(`✅ Joining room after reconnect: ${roomId}`);
          resolve();
        })
        .catch((error) => {
          console.error('❌ Failed to reconnect WebSocket:', error);
          reject(error);
        });
    }
  });
};

// Gửi tin nhắn
export const sendMessage = (message) => {
  if (socket && socket.connected) {
    socket.emit('sendMessage', message);
    console.log('📩 Message sent:', message);
  } else {
    console.error('❌ WebSocket not connected, cannot send message:', message);
  }
};

// Lắng nghe tin nhắn mới
export const onMessage = (callback) => {
  if (socket) {
    socket.off('message'); // Xóa listener cũ để tránh trùng lặp
    socket.on('message', callback);
  }
};

// Gửi trạng thái "đang gõ"
export const sendTyping = (roomId, isTyping) => {
  if (socket && socket.connected && roomId && roomId.startsWith('room_')) {
    socket.emit('typing', { roomId, isTyping });
  }
};

// Lắng nghe trạng thái "đang gõ"
export const onTyping = (callback) => {
  if (socket) {
    socket.off('typing'); // Xóa listener cũ
    socket.on('typing', callback);
  }
};