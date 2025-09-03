import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { ThemeContext } from '../context/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleRegister = () => {
    alert('Đăng ký thành công! Chuyển đến chat.');
    navigate('/chat/room1');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background dark:bg-dark-background transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-neon transition-all duration-300 animate-scale-up"
      >
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl font-bold text-center mb-8 text-primary animate-pulse"
        >
          Chào mừng đến với Boxchat-App
        </motion.h2>
        <Input label="Email" type="email" placeholder="Nhập email của bạn" />
        <Input label="Mật khẩu" type="password" placeholder="Nhập mật khẩu của bạn" />
        <Input label="Xác nhận mật khẩu" type="password" placeholder="Xác nhận mật khẩu" />
        <Button variant="primary" className="w-full mt-4" onClick={handleRegister}>
          Đăng ký
        </Button>
        <Link to="/login" className="mt-4 text-sm text-primary hover:underline transition-colors duration-200 w-full text-center block">
          Đã có tài khoản? Đăng nhập
        </Link>
        <button
          onClick={toggleTheme}
          className="mt-4 text-sm text-secondary hover:underline transition-colors duration-200 w-full text-center"
        >
          Chuyển sang chế độ {isDarkMode ? 'Sáng' : 'Tối'}
        </button>
      </motion.div>
    </div>
  );
};

export default Register;