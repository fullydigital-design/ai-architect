import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface GradientBadgeProps {
  children: ReactNode;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'pink' | 'purple' | 'blue';
}

export function GradientBadge({ children, icon, variant = 'primary' }: GradientBadgeProps) {
  const gradients = {
    primary: 'from-fuchsia-500 to-purple-600',
    secondary: 'from-blue-500 to-purple-600',
    accent: 'from-purple-500 to-indigo-600',
    pink: 'from-pink-500 to-rose-500',
    purple: 'from-purple-500 to-indigo-500',
    blue: 'from-blue-500 to-cyan-500'
  };

  const shadows = {
    primary: 'shadow-purple-500/20',
    secondary: 'shadow-blue-500/20',
    accent: 'shadow-purple-500/20',
    pink: 'shadow-pink-500/20',
    purple: 'shadow-purple-500/20',
    blue: 'shadow-blue-500/20'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        inline-flex items-center gap-2
        px-5 py-2.5
        rounded-full
        bg-gradient-to-r ${gradients[variant]}
        shadow-lg ${shadows[variant]}
      `}
    >
      {icon}
      <span className="text-sm text-white font-bold uppercase tracking-wider">
        {children}
      </span>
    </motion.div>
  );
}
