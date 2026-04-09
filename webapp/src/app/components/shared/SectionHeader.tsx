import { motion } from 'motion/react';
import { tokens } from '@/styles/tokens';
import { animations } from '@/utils/animations';

interface SectionHeaderProps {
  badge?: string;
  badgeIcon?: React.ComponentType<{ className?: string }>;
  title: string | React.ReactNode;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeader({ 
  badge, 
  badgeIcon: BadgeIcon,
  title, 
  subtitle, 
  align = 'center',
  className = '' 
}: SectionHeaderProps) {
  return (
    <motion.div
      {...animations.fadeInUp}
      className={`mb-16 ${align === 'center' ? 'text-center' : ''} ${className}`}
    >
      {badge && (
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-lg shadow-purple-500/20 mb-6">
          {BadgeIcon && <BadgeIcon className="w-4 h-4 text-white" />}
          <span className="text-sm text-white font-bold uppercase tracking-wider">{badge}</span>
        </div>
      )}
      
      <h2 className={`${tokens.typography.h2} ${tokens.colors.text.primary} mb-6`}>
        {title}
      </h2>
      
      {subtitle && (
        <p className={`${tokens.typography.bodyLarge} ${tokens.colors.text.muted} ${align === 'center' ? 'max-w-2xl mx-auto' : 'max-w-3xl'} font-medium`}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
