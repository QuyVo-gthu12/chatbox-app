import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { ThemeContext } from '../context/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../utils/api';

const Register: React.FC = () => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    try {
      await register({ email, password, name });
      navigate('/login');
    } catch (error) {
      setError(error.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background dark:bg-dark-background transition-colors duration-300 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[400px] p-6 bg-dark-frame border-2 border-green-500 rounded-2xl shadow-neon transition-all duration-300 animate-scale-up"
      >
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-4xl font-bold text-center mb-10 text-green-400 animate-pulse font-display"
        >
          Chào mừng đến với Boxchat-App
        </motion.h2>
        {error && <p className="text-red-500 text-sm mb-6 text-center animate-fade-in">{error}</p>}
        <div className="space-y-5">
          <Input
            label="Họ tên"
            type="text"
            placeholder="Nhập họ tên của bạn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-[90%] mx-auto h-10 text-green-400 placeholder-green-600 bg-dark-input border-2 border-green-500 focus:ring-2 focus:ring-green-400 hover:bg-dark-input-hover hover:border-green-300 rounded-lg px-3 py-2 text-l transition-all duration-200 animate-fade-in"
          />
          <Input
            label="Email"
            type="email"
            placeholder="Nhập email của bạn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-[90%] mx-auto h-10 text-green-400 placeholder-green-600 bg-dark-input border-2 border-green-500 focus:ring-2 focus:ring-green-400 hover:bg-dark-input-hover hover:border-green-300 rounded-lg px-3 py-2 text-l transition-all duration-200 animate-fade-in"
          />
          <Input
            label="Mật khẩu"
            type="password"
            placeholder="Nhập mật khẩu của bạn"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-[90%] mx-auto h-10 text-green-400 placeholder-green-600 bg-dark-input border-2 border-green-500 focus:ring-2 focus:ring-green-400 hover:bg-dark-input-hover hover:border-green-300 rounded-lg px-3 py-2 text-l transition-all duration-200 animate-fade-in"
          />
          <Input
            label="Xác nhận mật khẩu"
            type="password"
            placeholder="Xác nhận mật khẩu"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-[90%] mx-auto h-10 text-green-400 placeholder-green-600 bg-dark-input border-2 border-green-500 focus:ring-2 focus:ring-green-400 hover:bg-dark-input-hover hover:border-green-300 rounded-lg px-3 py-2 text-l transition-all duration-200 animate-fade-in"
          />
          <Button
            variant="primary"
            className="w-full mt-6 h-12 bg-green-500 hover:bg-green-600 text-black border-2 border-green-400 hover:border-green-300 px-3 py-2 rounded-lg font-semibold animate-gradient-x transition-all duration-300"
            onClick={handleRegister}
          >
            Đăng ký
          </Button>
        </div>
        <Link
          to="/login"
          className="mt-6 text-sm text-green-400 hover:text-green-300 transition-colors duration-200 w-full text-center block animate-fade-in"
        >
          Đã có tài khoản? Đăng nhập
        </Link>
        <button
          onClick={toggleTheme}
          className="mt-4 text-sm text-green-400 hover:text-green-300 transition-colors duration-200 w-full text-center animate-fade-in"
        >
          Chuyển sang chế độ {isDarkMode ? 'Sáng' : 'Tối'}
        </button>
      </motion.div>
    </div>
  );
};

export default Register;