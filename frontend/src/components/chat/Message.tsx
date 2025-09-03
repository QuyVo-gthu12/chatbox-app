import React from 'react';
import { motion } from 'framer-motion';

interface MessageType {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'sticker';
}

interface MessageProps {
  message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const isOwnMessage = message.sender === 'me';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-xs p-3 rounded-lg ${
          isOwnMessage
            ? 'bg-messageOwn text-white'
            : 'bg-messageOther dark:bg-messageOtherDark text-gray-900 dark:text-white'
        } shadow-neon`}
      >
        {message.type === 'text' && <p>{message.content}</p>}
        {message.type === 'sticker' && <span className="text-2xl">{message.content}</span>}
        {message.type === 'image' && (
          <img src={message.content} alt="Image" className="max-w-full rounded-lg" />
        )}
        {message.type === 'file' && (
          <a href={message.content} className="text-primary underline">
            File: {message.content.split('/').pop()}
          </a>
        )}
        <p className="text-xs text-gray-400 mt-1">{message.timestamp}</p>
      </div>
    </motion.div>
  );
};

export default Message;