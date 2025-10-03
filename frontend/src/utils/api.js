import axios from "axios";

// URL động theo môi trường
const USER_API_URL = import.meta.env.VITE_USER_API_URL || "http://localhost:3001";
const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || "http://localhost:3000";

// API cho user-service (3001)
const userApi = axios.create({
  baseURL: USER_API_URL,
});

// API cho chat-service (3000)
const chatApi = axios.create({
  baseURL: CHAT_API_URL,
});

// Thêm token vào headers cho cả 2
const authInterceptor = (config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

userApi.interceptors.request.use(authInterceptor);
chatApi.interceptors.request.use(authInterceptor);

// ---- API Users ----
export const register = (data) => userApi.post("/users/register", data);
export const login = (data) => userApi.post("/users/login", data);
export const addFriend = (data) => userApi.post("/users/friends/add", data);
export const getFriends = (userId) => userApi.get(`/users/friends/${userId}`);
export const searchUser = (userId) => userApi.get(`/users/search/${userId}`);

// ---- API Chats ----

// Lấy danh sách phòng
export const getRooms = () => chatApi.get("/chats/rooms");

// Tạo phòng chat mới hoặc lấy phòng cũ (giữa 2 user trở lên)
export const createRoom = (participants) =>
  chatApi.post("/chats/room", { participants });


// Lấy tin nhắn trong phòng
export const getMessages = (roomId, limit = 50, before = null) => {
  const params = { limit };

  // ✅ Chỉ thêm "before" nếu hợp lệ
  if (before) {
    const parsedDate = new Date(before);
    if (!isNaN(parsedDate.getTime())) {
      params.before = parsedDate.toISOString();
    } else {
      console.warn(`⚠️ before không hợp lệ: ${before}, sẽ bị bỏ qua`);
    }
  }

  return chatApi.get(`/chats/${roomId}`, { params });
};


// Gửi tin nhắn
export const sendMessage = (data) => chatApi.post("/chats/send", data);

// Upload file
export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return chatApi.post("/chats/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};