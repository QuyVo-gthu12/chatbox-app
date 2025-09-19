import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { getFriends, searchUser, addFriend } from '../utils/api';
import ChatRoom from './ChatRoom';

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  unreadCount: number;
  isOnline: boolean;
  lastActive?: string;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchError, setSearchError] = useState('');
  const user = localStorage.getItem('user')
    ? JSON.parse(localStorage.getItem('user')!)
    : {};

  // Kiểm tra đăng nhập
  useEffect(() => {
    if (!localStorage.getItem('token') || !user.user_id) {
      navigate('/login');
      return;
    }

    // Lấy danh sách bạn bè
    const fetchFriends = async () => {
      try {
        const response = await getFriends(user.user_id);
        setChats(
          response.data.friends.map((friend: any) => ({
            id: friend.room_id,
            name: friend.name,
            avatar: 'https://placehold.co/40x40', // ✅ sửa lại avatar
            lastMessage: '',
            unreadCount: 0,
            isOnline: false,
            lastActive: 'Offline',
          }))
        );
      } catch (error) {
        console.error('Lỗi khi lấy danh sách bạn bè:', error);
        setSearchError('Không thể tải danh sách bạn bè');
        setChats([]);
      }
    };

    fetchFriends();
  }, [navigate, user.user_id]);

  // Tìm kiếm bạn bè
  const handleSearch = useCallback(async () => {
    if (!searchId.match(/^\d{6}$/)) {
      setSearchError('ID phải là 6 số');
      setSearchResult(null);
      return;
    }
    try {
      const response = await searchUser(searchId);
      if (response.data.user) {
        setSearchResult(response.data.user);
        setSearchError('');
      } else {
        setSearchError('Không tìm thấy người dùng');
        setSearchResult(null);
      }
    } catch {
      setSearchError('Không tìm thấy người dùng');
      setSearchResult(null);
    }
  }, [searchId]);

  // Thêm bạn
  const handleAddFriend = useCallback(async () => {
    if (!searchResult) return;
    try {
      const response = await addFriend({
        userId: user.user_id,
        friendUserId: searchResult.user_id,
      });
      if (response.data.roomId) {
        const newChat = {
          id: response.data.roomId,
          name: searchResult.name,
          avatar: 'https://placehold.co/40x40', // ✅ sửa lại avatar
          lastMessage: '',
          unreadCount: 0,
          isOnline: false,
          lastActive: 'Offline',
        };
        setChats((prev) => [...prev, newChat]);
        setSearchResult(null);
        setSearchId('');
        setSearchError('');
        navigate(`/home/${response.data.roomId}`); // ✅ thêm backtick
      } else {
        setSearchError('Không thể kết bạn');
      }
    } catch {
      setSearchError('Không thể kết bạn');
    }
  }, [searchResult, user.user_id, navigate]);

  return (
    <div className="flex h-screen bg-gradient-to-r from-[#a5b4fc] to-[#d946ef] dark:from-[#2a1a5e] dark:to-[#6b127c] transition-colors duration-300">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-1/4 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 shadow-neon"
      >
        <div className="mb-4">
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
            Mã ID của bạn:{' '}
            <span className="font-semibold">{user.user_id || 'Đang tải...'}</span>
          </p>
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Nhập ID bạn bè (6 số)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary shadow-neon"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSearch}
            className="w-full py-2 mt-2 bg-primary text-white rounded-xl shadow-neon"
          >
            Tìm kiếm
          </motion.button>
          {searchError && (
            <p className="text-red-500 text-sm mt-2">{searchError}</p>
          )}
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-xl"
            >
              <p className="text-gray-900 dark:text-gray-100">
                Tên: {searchResult.name}
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                Email: {searchResult.email}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddFriend}
                className="mt-2 w-full py-2 bg-primary text-white rounded-xl shadow-neon"
              >
                Kết bạn
              </motion.button>
            </motion.div>
          )}
        </div>
        <div className="space-y-2">
          {chats.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center">
              Chưa có bạn bè nào
            </p>
          ) : (
            chats.map((chat) => (
              <motion.div
                key={chat.id}
                className={`flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200 ${
                  window.location.pathname.includes(chat.id)
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : ''
                }`}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate(`/home/${chat.id}`)} // ✅ thêm backtick
              >
                <div className="relative">
                  <img
                    src={chat.avatar}
                    alt={chat.name}
                    className="w-10 h-10 rounded-full"
                  />
                  {chat.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {chat.name}
                    </h3>
                    {chat.unreadCount > 0 && (
                      <span className="text-xs bg-red-500 text-white rounded-full px-2 py-1">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {chat.lastMessage}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Khu vực chính */}
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/:roomId" element={<ChatRoom chats={chats} />} />
          <Route
            path="/"
            element={
              <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  Hãy chọn một bạn bè để bắt đầu nhắn tin 📩
                </p>
              </div>
            }
          />
        </Routes>
      </div>
    </div>
  );
};

export default Home;
