import { motion } from 'motion/react';
import { tokens } from '@/styles/tokens';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient?: string;
  variant?: 'default' | 'bordered' | 'glass';
  delay?: number;
  className?: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient = tokens.gradients.primary,
  variant = 'default',
  delay = 0,
  className = '',
}: FeatureCardProps) {
  const variantStyles = {
    default: `${tokens.backgrounds.card} ${tokens.borders.card} hover:${tokens.borders.cardHover} hover:${tokens.shadows.cardHover}`,
    bordered: `${tokens.backgrounds.cardHover} ${tokens.borders.card} hover:border-transparent hover:${tokens.shadows.cardHover}`,
    glass: `${tokens.backgrounds.glass} border-2 border-white/20 hover:${tokens.backgrounds.glassStrong}`,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="relative group"
    >
      <div className={`h-full ${tokens.card.padding} ${tokens.radius.medium} ${variantStyles[variant]} ${tokens.transitions.default} ${className}`}>
        {/* Gradient hover effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 ${tokens.radius.medium} ${tokens.transitions.default}`} />
        
        {/* Icon */}
        <div className={`w-12 h-12 ${tokens.radius.small} bg-gradient-to-br ${gradient} p-3 mb-4 shadow-md relative z-10`}>
          <Icon className="w-full h-full text-white" strokeWidth={2.5} />
        </div>

        {/* Content */}
        <h3 className={`${tokens.typography.h5} ${tokens.colors.text.primary} mb-3 relative z-10`}>
          {title}
        </h3>
        <p className={`${tokens.colors.text.muted} text-sm leading-relaxed relative z-10`}>
          {description}
        </p>
      </div>
    </motion.div>
  );
}
