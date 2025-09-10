import io from 'socket.io-client';

let socket;

export const connectWebSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token found, redirecting to login');
    window.location.href = '/login';
    return;
  }

  socket = io('http://localhost:3000', {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: { token },
  });

  socket.on('connect', () => {
    console.log('WebSocket connected:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
    if (error.message.includes('Authentication error')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  });

  socket.on('reconnect', (attempt) => {
    console.log(`WebSocket reconnected after ${attempt} attempts`);
    // Tham gia lại phòng nếu có roomId hiện tại
    const currentRoom = localStorage.getItem('currentRoom');
    if (currentRoom) {
      socket.emit('joinRoom', currentRoom);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
  });
};

export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinRoom = (roomId) => {
  if (socket && socket.connected) {
    socket.emit('joinRoom', roomId);
    localStorage.setItem('currentRoom', roomId); // Lưu roomId để reconnect
  } else {
    console.error('WebSocket not connected, cannot join room:', roomId);
  }
};

export const sendMessage = (message) => {
  if (socket && socket.connected) {
    socket.emit('sendMessage', message);
  } else {
    console.error('WebSocket not connected, cannot send message:', message);
  }
};

export const onMessage = (callback) => {
  if (socket) {
    socket.on('message', callback);
  }
};

// Tùy chọn: Hỗ trợ typing indicator
export const sendTyping = (roomId, isTyping) => {
  if (socket && socket.connected) {
    socket.emit('typing', { roomId, isTyping });
  }
};

export const onTyping = (callback) => {
  if (socket) {
    socket.on('typing', callback);
  }
};