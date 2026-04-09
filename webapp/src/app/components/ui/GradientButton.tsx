import { ReactNode, ButtonHTMLAttributes } from 'react';
import { motion } from 'motion/react';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function GradientButton({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon,
  fullWidth = false,
  className = '',
  ...props 
}: GradientButtonProps) {
  const gradients = {
    primary: 'from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-700 hover:via-purple-700 hover:to-pink-700',
    secondary: 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600',
    accent: 'from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl'
  };

  const shadowColors = {
    primary: 'shadow-purple-500/30 hover:shadow-purple-500/40',
    secondary: 'shadow-blue-500/30 hover:shadow-blue-500/40',
    accent: 'shadow-purple-500/30 hover:shadow-purple-500/40'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        ${fullWidth ? 'w-full' : ''}
        ${sizes[size]}
        bg-gradient-to-r ${gradients[variant]}
        text-white font-bold
        rounded-2xl
        shadow-xl ${shadowColors[variant]}
        transition-all duration-300
        border-0
        flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  );
}
