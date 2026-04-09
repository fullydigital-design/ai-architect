import { tokens } from '@/styles/tokens';

interface GradientTextProps {
  children: React.ReactNode;
  gradient?: keyof typeof tokens.gradients;
  className?: string;
}

export function GradientText({ 
  children, 
  gradient = 'textPrimary',
  className = '' 
}: GradientTextProps) {
  return (
    <span className={`bg-gradient-to-r ${tokens.gradients[gradient]} bg-clip-text text-transparent ${className}`}>
      {children}
    </span>
  );
}
