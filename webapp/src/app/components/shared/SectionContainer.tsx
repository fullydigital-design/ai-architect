import { tokens } from '@/styles/tokens';

interface SectionContainerProps {
  children: React.ReactNode;
  bg?: 'white' | 'gray' | 'gradient-light' | 'gradient-purple' | 'gradient-pink';
  spacing?: 'hero' | 'large' | 'medium' | 'small';
  className?: string;
  pattern?: boolean;
}

export function SectionContainer({
  children,
  bg = 'white',
  spacing = 'large',
  className = '',
  pattern = false,
}: SectionContainerProps) {
  const backgrounds = {
    white: 'bg-white',
    gray: 'bg-gradient-to-b from-gray-50 to-white',
    'gradient-light': 'bg-gradient-to-b from-white via-pink-50/20 to-white',
    'gradient-purple': 'bg-gradient-to-b from-white via-purple-50/20 to-white',
    'gradient-pink': 'bg-gradient-to-b from-white via-pink-50/30 to-white',
  };

  const spacingMap = {
    hero: tokens.spacing.section.hero,
    large: tokens.spacing.section.large,
    medium: tokens.spacing.section.medium,
    small: tokens.spacing.section.small,
  };

  return (
    <section className={`relative ${spacingMap[spacing]} ${backgrounds[bg]} overflow-hidden ${className}`}>
      {/* Optional grid pattern */}
      {pattern && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
      )}
      
      {children}
    </section>
  );
}
