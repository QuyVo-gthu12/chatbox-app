import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { connectWebSocket, disconnectWebSocket, joinRoom, sendMessage, onMessage, sendTyping, onTyping } from '../utils/websocket';
import { getMessages, getFriends, searchUser, addFriend } from '../utils/api';
import Message from '../components/chat/Message';
import MessageInput from '../components/chat/MessageInput';

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  unreadCount: number;
  isOnline: boolean;
  lastActive?: string;
}

interface MessageType {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'sticker';
  roomId?: string;
}

const ChatRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchError, setSearchError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    } else {
      const fetchFriends = async () => {
        try {
          const response = await getFriends(user.user_id);
          setChats(
            response.data.friends.map((friend: any) => ({
              id: friend.room_id,
              name: friend.name,
              avatar: 'https://via.placeholder.com/40',
              lastMessage: '',
              unreadCount: 0,
              isOnline: false,
              lastActive: 'Offline',
            }))
          );
        } catch (error) {
          console.error('Error fetching friends:', error);
          setChats([]);
        }
      };

      const fetchMessages = async () => {
        if (roomId) {
          try {
            const response = await getMessages(roomId);
            setMessages(
              response.data.messages.map((msg: any) => ({
                id: msg.id,
                sender: msg.sender,
                content: msg.content,
                timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                type: msg.type,
                roomId,
              }))
            );
          } catch (error) {
            console.error('Error fetching messages:', error);
          }
        }
      };

      fetchFriends();
      fetchMessages();
      connectWebSocket();
      if (roomId) {
        joinRoom(roomId);
      }
      onMessage((data: MessageType) => {
        if (data.roomId === roomId) {
          setMessages((prev) => [
            ...prev,
            {
              ...data,
              timestamp: new Date(data.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
          ]);
        }
      });
      onTyping((data) => {
        if (data.roomId === roomId) {
          setIsTyping(data.isTyping);
        }
      });
      return () => {
        disconnectWebSocket();
      };
    }
  }, [roomId, navigate, user.user_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSearch = async () => {
    if (!searchId.match(/^\d{6}$/)) {
      setSearchError('ID phải là 6 số');
      setSearchResult(null);
      return;
    }
    try {
      const response = await searchUser(searchId);
      setSearchResult(response.data.user);
      setSearchError('');
    } catch (err) {
      setSearchError('Không tìm thấy người dùng');
      setSearchResult(null);
    }
  };

  const handleAddFriend = async () => {
    if (searchResult) {
      try {
        const response = await addFriend({ userId: user.user_id, friendUserId: searchResult.user_id });
        if (response.data.roomId) {
          setChats((prev) => [
            ...prev,
            {
              id: response.data.roomId,
              name: searchResult.name,
              avatar: 'https://via.placeholder.com/40',
              lastMessage: '',
              unreadCount: 0,
              isOnline: false,
              lastActive: 'Offline',
            },
          ]);
          navigate(`/chat/${response.data.roomId}`);
          setSearchResult(null);
          setSearchId('');
        }
      } catch (err) {
        setSearchError('Không thể kết bạn');
      }
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (roomId) {
      sendTyping(roomId, isTyping);
    }
  };

  const handleSendMessage = (content: string, type: 'text' | 'image' | 'file' | 'sticker') => {
    const newMessage: MessageType = {
      id: Date.now().toString(),
      sender: user.user_id,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      roomId: roomId || '',
    };
    sendMessage(newMessage);
    setMessages([...messages, newMessage]);
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === roomId ? { ...chat, lastMessage: content, unreadCount: 0 } : chat
      )
    );
  };

  return (
    <div className="flex h-screen bg-gradient-to-r from-[#a5b4fc] to-[#d946ef] dark:from-[#2a1a5e] dark:to-[#6b127c] transition-colors duration-300">
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-1/4 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 shadow-neon"
      >
        <div className="mb-4">
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
            Mã ID của bạn: <span className="font-semibold">{user.user_id || 'Đang tải...'}</span>
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
          {searchError && <p className="text-red-500 text-sm mt-2">{searchError}</p>}
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-xl"
            >
              <p className="text-gray-900 dark:text-gray-100">Tên: {searchResult.name}</p>
              <p className="text-gray-500 dark:text-gray-400">Email: {searchResult.email}</p>
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
            <p className="text-gray-500 dark:text-gray-400 text-center">Chưa có bạn bè nào</p>
          ) : (
            chats.map((chat) => (
              <motion.div
                key={chat.id}
                className={`flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200 ${
                  chat.id === roomId ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate(`/chat/${chat.id}`)}
              >
                <div className="relative">
                  <img src={chat.avatar} alt={chat.name} className="w-10 h-10 rounded-full" />
                  {chat.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{chat.name}</h3>
                    {chat.unreadCount > 0 && (
                      <span className="text-xs bg-red-500 text-white rounded-full px-2 py-1">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{chat.lastMessage}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
      <div className="flex-1 flex flex-col">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-neon"
        >
          <div className="flex items-center">
            <img
              src={chats.find((c) => c.id === roomId)?.avatar || 'https://via.placeholder.com/40'}
              alt="Avatar"
              className="w-10 h-10 rounded-full"
            />
            <div className="ml-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {chats.find((c) => c.id === roomId)?.name || 'Chat'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {chats.find((c) => c.id === roomId)?.isOnline
                  ? 'Đang online'
                  : chats.find((c) => c.id === roomId)?.lastActive || 'Offline'}
                {isTyping && <span className="ml-2 text-primary">Đang nhập...</span>}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.41-1.412a7.933 7.933 0 00-13.087 0z" />
              </svg>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 001.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </motion.button>
          </div>
        </motion.div>
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {roomId ? (
            messages.map((message) => <Message key={message.id} message={message} />)
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center">Chọn bạn bè để bắt đầu nhắn tin</p>
          )}
          <div ref={messagesEndRef} />
        </div>
        {roomId && <MessageInput onSend={handleSendMessage} onTyping={handleTyping} />}
      </div>
    </div>
  );
};

export default ChatRoom;