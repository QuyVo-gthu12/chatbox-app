import React from "react";
import { motion } from "framer-motion";

interface MessageType {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  type: "text" | "image" | "file" | "sticker";
}

interface MessageProps {
  message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isOwnMessage = message.sender === user.user_id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl shadow-neon ${
          isOwnMessage
            ? "bg-primary text-white rounded-br-none"
            : "bg-gray-200 dark:bg-[#374151] text-gray-900 dark:text-white rounded-bl-none"
        }`}
      >
        {/* Text message */}
        {message.type === "text" && (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}

        {/* Sticker */}
        {message.type === "sticker" && (
          <span className="text-3xl" role="img" aria-label="sticker">
            {message.content}
          </span>
        )}

        {/* Image message */}
        {message.type === "image" && (
          <a href={message.content} target="_blank" rel="noopener noreferrer">
            <img
              src={message.content}
              alt="Shared"
              className="max-w-full max-h-60 rounded-lg border border-gray-300 dark:border-gray-600 hover:opacity-90 transition"
            />
          </a>
        )}

        {/* File message */}
        {message.type === "file" && (
          <a
            href={message.content}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            <svg
              className="w-5 h-5 text-primary flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M8 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V8l-6-6H8z" />
            </svg>
            <span className="truncate max-w-[150px]">
              {message.content.split("/").pop()}
            </span>
          </a>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-400 mt-1 text-right">{message.timestamp}</p>
      </div>
    </motion.div>
  );
};

export default Message;
