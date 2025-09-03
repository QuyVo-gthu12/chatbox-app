import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', ...props }) => {
  const baseStyles = 'px-4 py-2 rounded-xl font-medium transition-all duration-200 ease-in-out shadow-neon hover:shadow-lg hover:scale-105';
  const variantStyles =
    variant === 'primary'
      ? 'bg-gradient-to-r from-primary to-secondary text-white hover:from-indigo-600 hover:to-pink-600'
      : 'bg-secondary text-white hover:bg-pink-600';

  return (
    <button className={`${baseStyles} ${variantStyles}`} {...props}>
      {children}
    </button>
  );
};

export default Button;