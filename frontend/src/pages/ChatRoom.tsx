import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
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
}

const ChatRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [messages, setMessages] = useState<MessageType[]>([
    { id: '1', sender: 'user1', content: 'Xin chào!', timestamp: '10:30 AM', type: 'text' },
    { id: '2', sender: 'me', content: 'Chào bạn!', timestamp: '10:32 AM', type: 'text' },
    { id: '3', sender: 'user1', content: '😄', timestamp: '10:33 AM', type: 'sticker' },
  ]);
  const [chats, setChats] = useState<Chat[]>([
    {
      id: 'room1',
      name: 'Nguyễn Văn A',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: '😄',
      unreadCount: 2,
      isOnline: true,
    },
    {
      id: 'room2',
      name: 'Nhóm bạn thân',
      avatar: 'https://via.placeholder.com/40',
      lastMessage: 'Hẹn gặp tối nay nhé!',
      unreadCount: 0,
      isOnline: false,
      lastActive: '5 phút trước',
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (content: string, type: 'text' | 'image' | 'file' | 'sticker') => {
    const newMessage: MessageType = {
      id: Date.now().toString(),
      sender: 'me',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
    };
    setMessages([...messages, newMessage]);
  };

  return (
    <div className="flex h-screen bg-background dark:bg-dark-background transition-colors duration-300">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-1/4 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4"
      >
        <input
          type="text"
          placeholder="Tìm kiếm bạn bè, nhóm..."
          className="w-full px-3 py-2 mb-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary shadow-neon"
        />
        <div className="space-y-2">
          {chats.map((chat) => (
            <motion.div
              key={chat.id}
              className={`flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200 ${
                chat.id === roomId ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
              whileHover={{ scale: 1.02 }}
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
          ))}
        </div>
      </motion.div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
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
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.41-1.412a7.933 7.933 0 00-13.087 0z" />
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 001.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </motion.div>

        {/* Message Area */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <MessageInput onSend={handleSendMessage} />
      </div>
    </div>
  );
};

export default ChatRoom;