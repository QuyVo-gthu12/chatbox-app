import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatRoom from './pages/ChatRoom';
import './styles/tailwind.css';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-background dark:bg-dark-background transition-colors duration-300 ease-in-out">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/chat/:roomId" element={<ChatRoom />} />
            <Route path="/" element={<Login />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;