import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { ThemeContext } from '../context/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../utils/api';

const Login: React.FC = () => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const response = await login({ email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/chat/room1');
    } catch (error) {
      setError(error.response?.data?.message || 'Đăng nhập thất bại');
    }
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
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <Input
          label="Email"
          type="email"
          placeholder="Nhập email của bạn"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Mật khẩu"
          type="password"
          placeholder="Nhập mật khẩu của bạn"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button variant="primary" className="w-full mt-4" onClick={handleLogin}>
          Đăng nhập
        </Button>
        <Link to="/register" className="mt-4 text-sm text-primary hover:underline transition-colors duration-200 w-full text-center block">
          Chưa có tài khoản? Đăng ký
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

export default Login;