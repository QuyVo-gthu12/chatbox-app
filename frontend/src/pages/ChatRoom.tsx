import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import {
  connectWebSocket,
  disconnectWebSocket,
  joinRoom,
  sendMessage,
  onMessage,
  sendTyping,
  onTyping,
} from "../utils/websocket";
import { getMessages } from "../utils/api";
import Message from "../components/chat/Message";
import MessageInput from "../components/chat/MessageInput";

interface MessageType {
  id: string;
  sender: string;
  senderName?: string;
  content: string;
  timestamp: string;
  type: "text" | "image" | "file" | "sticker";
  roomId?: string;
}

interface TypingEvent {
  roomId: string;
  isTyping: boolean;
  userId: string;
  userName?: string;
}

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  unreadCount: number;
  isOnline: boolean;
  lastActive?: string;
}

interface ChatRoomProps {
  chats: Chat[];
}

const ChatRoom: React.FC<ChatRoomProps> = ({ chats }) => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Kiểm tra roomId hợp lệ
  useEffect(() => {
    if (!roomId || !roomId.startsWith("room_")) {
      console.error("Invalid roomId:", roomId);
      setError("Phòng không hợp lệ");
      navigate("/home");
    }
  }, [roomId, navigate]);

  // Kết nối socket + load tin nhắn
  useEffect(() => {
    if (!localStorage.getItem("token") || !user.user_id) {
      setError("Vui lòng đăng nhập lại");
      navigate("/login");
      return;
    }

    const fetchMessages = async () => {
      if (roomId?.startsWith("room_")) {
        try {
          console.log(`Fetching messages for room: ${roomId}`);
          const response = await getMessages(roomId);
          setMessages(
            response.data.messages
              .map((msg: any) => ({
                id: msg.id,
                sender: msg.sender,
                senderName: msg.senderName || msg.sender,
                content: msg.content,
                timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                type: msg.type,
                roomId,
              }))
              .reverse()
          );
          setError(null);
        } catch (error: any) {
          console.error("Lỗi khi lấy tin nhắn:", error);
          if (error.response?.status === 404) {
            setError("Phòng không tồn tại hoặc bạn không có quyền truy cập");
          } else if (error.response?.status === 401) {
            setError("Phiên đăng nhập hết hạn");
            localStorage.removeItem("token");
            navigate("/login");
          } else {
            setError(
              `Không thể tải tin nhắn: ${
                error.response?.data?.error || error.message
              }`
            );
          }
        }
      }
    };

    fetchMessages();

    // Kết nối WebSocket và tham gia phòng
    connectWebSocket()
      .then(() => {
        if (roomId?.startsWith("room_")) {
          return joinRoom(roomId);
        }
      })
      .then(() => {
        console.log(`✅ Successfully joined room: ${roomId}`);
        setError(null);
      })
      .catch((error) => {
        console.error("Failed to connect WebSocket or join room:", error);
        if (
          error.message.includes("No token found") ||
          error.message.includes("Authentication error")
        ) {
          setError("Phiên đăng nhập hết hạn");
          localStorage.removeItem("token");
          navigate("/login");
        } else {
          setError("Không thể kết nối đến server, vui lòng thử lại");
        }
      });

    // Lắng nghe tin nhắn mới
    onMessage((data: MessageType) => {
      if (data.roomId === roomId) {
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === data.id)) return prev;
          return [
            ...prev,
            {
              ...data,
              senderName: data.senderName || data.sender,
              timestamp: new Date(data.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ];
        });
      }
    });

    // Lắng nghe typing
    onTyping((event: TypingEvent) => {
      if (event.roomId === roomId && event.userId !== user.user_id) {
        setTypingUser(event.isTyping ? event.userName || event.userId : null);
      }
    });

    return () => {
      disconnectWebSocket();
    };
  }, [roomId, navigate, user.user_id]);

  // Auto scroll khi có tin nhắn
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Gửi tin nhắn text/sticker
  const handleSendMessage = (
    content: string,
    type: "text" | "image" | "file" | "sticker"
  ) => {
    if (!roomId?.startsWith("room_")) {
      setError("Phòng không hợp lệ");
      return;
    }

    const newMessage: MessageType = {
      id: Date.now().toString(),
      sender: user.user_id,
      senderName: user.name,
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type,
      roomId,
    };
    sendMessage(newMessage);
  };

  // ✅ Gửi file/ảnh
  const handleSendFile = async (file: File, type: "image" | "file") => {
    if (!roomId?.startsWith("room_")) return;

    const formData = new FormData();
    formData.append("roomId", roomId);
    formData.append("type", type);
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3002/media/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      console.log("Uploaded file:", data);

      const newMessage: MessageType = {
        id: Date.now().toString(),
        sender: user.user_id,
        senderName: user.name,
        content: data.fileUrl, // link ảnh/file
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type,
        roomId,
    };

    sendMessage(newMessage);

    } catch (err) {
      console.error("Upload error:", err);
      setError("Không thể gửi file");
    }
  };

  // Emit typing
  const handleTyping = (typing: boolean) => {
    if (roomId?.startsWith("room_")) {
      sendTyping(roomId, typing);
    }
  };

  return (
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
            src={
              chats.find((c) => c.id === roomId)?.avatar || "/default-avatar.png"
            }
            alt={chats.find((c) => c.id === roomId)?.name || "Chat"}
            className="w-10 h-10 rounded-full"
            onError={(e) => {
              e.currentTarget.src = "/default-avatar.png";
            }}
          />
          <div className="ml-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {chats.find((c) => c.id === roomId)?.name || "Chat"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {typingUser ? (
                <span className="ml-2 text-primary">{typingUser} đang gõ...</span>
              ) : (
                chats.find((c) => c.id === roomId)?.lastActive || "Offline"
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {messages.length === 0 && !error ? (
          <p className="text-gray-500 dark:text-gray-400 text-center">
            Chưa có tin nhắn nào
          </p>
        ) : (
          messages.map((message) => (
            <Message key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        onTyping={handleTyping}
        onSendFile={handleSendFile}   // ✅ truyền xuống cho MessageInput
      />

    </div>
  );
};

export default ChatRoom;
