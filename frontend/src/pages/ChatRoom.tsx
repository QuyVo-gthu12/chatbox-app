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
  sender?: string;  // ✅ Thêm optional cho sender (fallback senderId)
  senderId?: string;  // ✅ Thêm senderId để match server payload
  senderName?: string;
  content: string;
  timestamp: string;
  type: "text" | "image" | "file" | "sticker";
  roomId?: string;
  self?: boolean;
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

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Kiểm tra roomId hợp lệ
  useEffect(() => {
    if (!roomId || !uuidRegex.test(roomId)) {
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
      if (roomId && uuidRegex.test(roomId)) {
        try {
          console.log(`Fetching messages for room: ${roomId}`);
          console.log("Current user.user_id:", user.user_id);  // ✅ Debug: Log user_id
          const response = await getMessages(roomId);
          
          // ✅ Debug: Log một message sample để check structure
          if (response.data.messages.length > 0) {
            console.log("Sample message structure:", response.data.messages[0]);
          }

          setMessages(
            response.data.messages
              .map((msg: any) => {
                // ✅ Fix: Ưu tiên sender_id (từ DB), fallback sender
                let sender = msg.sender_id || 
                             (typeof msg.sender === "object" 
                               ? msg.sender.user_id || msg.sender.id || msg.sender._id 
                               : msg.sender) ||
                             msg.senderId;  // Fallback thêm senderId nếu API có

                // ✅ Ensure sender is string và lowercase cho so sánh an toàn (UUID case-insensitive)
                sender = sender ? sender.toString().toLowerCase() : null;
                const currentUserId = user.user_id ? user.user_id.toString().toLowerCase() : null;

                // ✅ Debug: Log cho mỗi message (comment out sau khi fix)
                console.log(`Message ID ${msg.id}: sender = "${sender}", currentUserId = "${currentUserId}", self = ${sender === currentUserId}`);

                return {
                  id: msg.id,
                  sender,  // ✅ Set sender as normalized string
                  senderId: sender,  // ✅ Duplicate cho consistent với server
                  senderName: msg.senderName || (msg.sender ? msg.sender.name : 'Unknown'),
                  content: msg.content,
                  timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  type: msg.type,
                  roomId,
                  self: sender === currentUserId,  // ✅ Fix: So sánh normalized, giờ chính xác hơn
                };
              })
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
        if (roomId && uuidRegex.test(roomId)) {
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
          // ✅ Fix duplicate: Kiểm tra nếu ID trùng thì skip
          if (prev.some((msg) => msg.id === data.id)) return prev;

          // ✅ Fix duplicate optimistic: Nếu là tin của mình và match content/type/temp ID, replace
          const senderId = (data.sender || data.senderId || '').toString().toLowerCase();
          const currentUserId = user.user_id.toString().toLowerCase();
          const isOwnMessage = senderId === currentUserId;

          if (isOwnMessage && prev.length > 0) {
            const lastMessage = prev[prev.length - 1];
            const isOptimisticMatch = lastMessage.self &&
              lastMessage.content === data.content &&
              lastMessage.type === data.type &&
              !uuidRegex.test(lastMessage.id);  // Temp ID không phải UUID

            if (isOptimisticMatch) {
              // Replace optimistic với real data
              const updatedMessages = [...prev];
              updatedMessages[updatedMessages.length - 1] = {
                ...data,
                sender: data.sender || data.senderId,
                senderId: senderId,
                senderName: data.senderName || user.name,
                self: true,  // Giữ self=true cho own
                timestamp: new Date(data.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              };
              return updatedMessages;
            }
          }

          // ✅ Nếu không match, thêm mới (cho tin từ người khác)
          const computedSelf = data.self !== undefined 
            ? data.self 
            : isOwnMessage;
          return [
            ...prev,
            {
              ...data,
              sender: data.sender || data.senderId,  // ✅ Normalize sender
              senderId: senderId,  // ✅ Consistent
              senderName: data.senderName || data.sender,
              self: computedSelf,  // ✅ Set self đúng
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

  // Gửi tin nhắn text/sticker (giữ nguyên từ sửa trước)
  const handleSendMessage = (
    content: string,
    type: "text" | "image" | "file" | "sticker"
  ) => {
    if (!roomId || !uuidRegex.test(roomId)) {
      setError("Phòng không hợp lệ");
      return;
    }

    // ✅ Optional: Optimistic update (thêm ngay với self=true, server sẽ confirm)
    const tempId = Date.now().toString();
    const optimisticMessage: MessageType = {
      id: tempId,
      sender: user.user_id,
      senderId: user.user_id,
      senderName: user.name,
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type,
      roomId,
      self: true,  // ✅ Set self=true cho optimistic
    };
    setMessages((prev) => [...prev, optimisticMessage]);  // Thêm tạm

    const newMessage: MessageType = {
      id: tempId,  // Temp ID, server sẽ override
      sender: user.user_id,
      senderId: user.user_id,
      senderName: user.name,
      content,
      timestamp: new Date().toISOString(),  // Gửi ISO cho server
      type,
      roomId,
    };
    sendMessage(newMessage);
  };

  // ✅ Gửi file/ảnh (tương tự, thêm optimistic)
  const handleSendFile = async (file: File, type: "image" | "file") => {
    if (!roomId || !uuidRegex.test(roomId)) return;

    // ✅ Optimistic cho file (hiển thị placeholder để match content sau upload)
    const tempId = Date.now().toString();
    const optimisticMessage: MessageType = {
      id: tempId,
      sender: user.user_id,
      senderId: user.user_id,
      senderName: user.name,
      content: `${type === "image" ? "🖼️" : "📎"} Đang tải lên...`,  // Placeholder text để match
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type,
      roomId,
      self: true,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

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

      // ✅ Update content optimistic với real URL trước khi send (để match replace)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, content: data.fileUrl } : msg
        )
      );

      // ✅ Gửi message với URL thật (server sẽ emit lại, frontend sẽ update qua onMessage)
      const newMessage: MessageType = {
        id: tempId,
        sender: user.user_id,
        senderId: user.user_id,
        senderName: user.name,
        content: data.fileUrl,  // link ảnh/file
        timestamp: new Date().toISOString(),
        type,
        roomId,
      };
      sendMessage(newMessage);

    } catch (err) {
      console.error("Upload error:", err);
      setError("Không thể gửi file");
      // ✅ Remove optimistic nếu fail
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  // Emit typing
  const handleTyping = (typing: boolean) => {
    if (roomId && uuidRegex.test(roomId)) {
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