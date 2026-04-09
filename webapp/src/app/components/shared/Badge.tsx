import { tokens } from '@/styles/tokens';
import { LucideIcon } from 'lucide-react';

interface BadgeProps {
  children: React.ReactNode;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  icon: Icon,
  variant = 'primary',
  size = 'md',
  className = '',
}: BadgeProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-fuchsia-500 to-purple-600',
    secondary: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    success: 'bg-gradient-to-r from-green-500 to-emerald-500',
    warning: 'bg-gradient-to-r from-yellow-500 to-orange-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${sizes[size]} ${tokens.radius.full} ${variants[variant]} shadow-lg shadow-purple-500/20 ${className}`}>
      {Icon && <Icon className="w-4 h-4 text-white" />}
      <span className="text-white font-bold uppercase tracking-wider">{children}</span>
    </div>
  );
}
