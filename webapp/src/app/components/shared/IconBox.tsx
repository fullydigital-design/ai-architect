import { tokens } from '@/styles/tokens';
import { LucideIcon } from 'lucide-react';

interface IconBoxProps {
  icon: LucideIcon;
  gradient?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function IconBox({
  icon: Icon,
  gradient = tokens.gradients.primary,
  size = 'md',
  className = '',
}: IconBoxProps) {
  const sizes = {
    sm: 'w-10 h-10 p-2',
    md: 'w-12 h-12 p-3',
    lg: 'w-16 h-16 p-4',
  };

  const iconSizes = {
    sm: 'w-full h-full',
    md: 'w-full h-full',
    lg: 'w-full h-full',
  };

  return (
    <div className={`${sizes[size]} ${tokens.radius.small} bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md ${className}`}>
      <Icon className={`${iconSizes[size]} text-white`} strokeWidth={2.5} />
    </div>
  );
}
