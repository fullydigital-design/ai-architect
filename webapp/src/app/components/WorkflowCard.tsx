import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { tokens } from '@/styles/tokens';

interface WorkflowCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  isAvailable: boolean;
  onClick?: () => void;
  badge?: string;
  features?: string[];
  isPro?: boolean;
  span?: string;
  isDev?: boolean;
  isDemo?: boolean;
}

export function WorkflowCard({ 
  icon: Icon, 
  title, 
  description, 
  gradient,
  isAvailable,
  onClick,
  badge = "Coming Soon",
  features = [],
  isPro = false,
  span = "",
  isDev = false,
  isDemo = false
}: WorkflowCardProps) {
  // DEV cards are visually available but not clickable
  // DEMO cards are clickable but show demo badge
  const isClickable = isAvailable && !isDev;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={isClickable ? { scale: 1.02, y: -4 } : {}}
      transition={{ duration: 0.3 }}
      onClick={isClickable ? onClick : undefined}
      className={`relative group ${tokens.radius.large} bg-white border-2 ${
        isClickable 
          ? 'border-gray-200 hover:border-transparent cursor-pointer' 
          : isDev
          ? 'border-gray-200 cursor-not-allowed'
          : 'border-gray-100 cursor-not-allowed opacity-75'
      } ${tokens.shadows.card} ${
        isClickable ? `hover:${tokens.shadows.cardHover}` : ''
      } ${tokens.transitions.default} overflow-hidden ${span}`}
    >
      {/* Badge */}
      {!isAvailable && (
        <div className="absolute top-4 right-4 z-20">
          <div className={`px-3 py-1.5 ${tokens.radius.small} bg-gradient-to-r from-gray-400 to-gray-500 shadow-lg`}>
            <span className="text-xs font-black text-white uppercase tracking-wider">{badge}</span>
          </div>
        </div>
      )}

      {/* DEV Badge */}
      {isDev && isAvailable && (
        <div className="absolute top-4 right-4 z-20">
          <div className={`px-3 py-1.5 ${tokens.radius.small} bg-gradient-to-r from-orange-500 to-red-600 shadow-lg`}>
            <span className="text-xs font-black text-white uppercase tracking-wider">🔧 DEV</span>
          </div>
        </div>
      )}

      {/* DEMO Badge */}
      {isDemo && isAvailable && !isDev && (
        <div className="absolute top-4 right-4 z-20">
          <div className={`px-3 py-1.5 ${tokens.radius.small} bg-gradient-to-r from-purple-500 to-fuchsia-600 shadow-lg`}>
            <span className="text-xs font-black text-white uppercase tracking-wider">🎭 DEMO</span>
          </div>
        </div>
      )}

      {/* Available Badge */}
      {isAvailable && !isPro && !isDev && !isDemo && (
        <div className="absolute top-4 right-4 z-20">
          <div className={`px-3 py-1.5 ${tokens.radius.small} bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg`}>
            <span className="text-xs font-black text-white uppercase tracking-wider">Available</span>
          </div>
        </div>
      )}

      {/* PRO Badge */}
      {isPro && !isDev && !isDemo && (
        <div className="absolute top-4 right-4 z-20">
          <div className={`px-3 py-1.5 ${tokens.radius.small} bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg animate-pulse`}>
            <span className="text-xs font-black text-white uppercase tracking-wider">⭐ PRO</span>
          </div>
        </div>
      )}

      {/* Gradient Hover Effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 ${
        isAvailable ? 'group-hover:opacity-5' : ''
      } ${tokens.transitions.default}`} />

      {/* Content */}
      <div className="relative z-10 p-8 flex flex-col h-full min-h-[320px]">
        {/* Icon */}
        <div className={`w-16 h-16 ${tokens.radius.medium} bg-gradient-to-br ${gradient} p-3.5 mb-6 shadow-xl ${
          isAvailable ? 'group-hover:scale-110' : ''
        } ${tokens.transitions.default}`}>
          <Icon className="w-full h-full text-white" strokeWidth={2} />
        </div>

        {/* Title */}
        <h3 className={`text-2xl font-black text-gray-900 mb-3 ${
          isAvailable ? `group-hover:bg-gradient-to-r group-hover:${gradient} group-hover:bg-clip-text group-hover:text-transparent` : ''
        } ${tokens.transitions.default}`}>
          {title}
        </h3>

        {/* Description */}
        <p className="text-base text-content-faint mb-6 leading-relaxed font-medium flex-grow">
          {description}
        </p>

        {/* Features */}
        {features.length > 0 && (
          <ul className="space-y-2 mb-6">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-content-faint font-medium">
                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${gradient} mt-1.5 flex-shrink-0`} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}

        {/* CTA */}
        <div className={`pt-4 border-t-2 ${isAvailable ? 'border-gray-200' : 'border-gray-100'}`}>
          {isClickable ? (
            <div className="flex items-center justify-between">
              <span className={`text-sm font-black bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                Get Started →
              </span>
              <div className={`w-10 h-10 ${tokens.radius.small} bg-gradient-to-br ${gradient} flex items-center justify-center ${tokens.transitions.default} group-hover:scale-110`}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          ) : isDev ? (
            <div className="flex items-center justify-center">
              <span className="text-sm font-bold text-orange-600 uppercase tracking-wider">
                In Development
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span className="text-sm font-bold text-content-secondary uppercase tracking-wider">
                Coming Soon
              </span>
            </div>
          )}
        </div>
      </div>

      {/* DEV Overlay */}
      {isDev && (
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px] z-10 pointer-events-none" />
      )}

      {/* Disabled Overlay */}
      {!isAvailable && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10" />
      )}
    </motion.div>
  );
}
