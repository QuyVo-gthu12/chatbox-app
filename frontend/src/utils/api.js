import axios from 'axios';

const userApi = axios.create({
  baseURL: 'http://localhost:3001',
});

const chatApi = axios.create({
  baseURL: 'http://localhost:3000',
});

userApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

chatApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const register = (data) => userApi.post('/users/register', data);
export const login = (data) => userApi.post('/users/login', data);
export const addFriend = (data) => userApi.post('/users/friends/add', data);
export const getFriends = (userId) => userApi.get(`/users/friends/${userId}`);
export const searchUser = (userId) => userApi.get(`/users/search/${userId}`);
export const getMessages = (roomId) => chatApi.get(`/chats/${roomId}`);
export const sendMessage = (data) => chatApi.post('/chats/send', data);
export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return chatApi.post('/chats/upload', formData);
};