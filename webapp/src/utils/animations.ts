/**
 * Animation Utilities
 * Reusable animation configurations for Motion components
 */

export const animations = {
  // Fade in from bottom
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  },

  // Fade in (no movement)
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.6 },
  },

  // Scale on hover
  scaleOnHover: {
    whileHover: { scale: 1.05 },
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },

  // Subtle scale on hover (for active elements)
  scaleOnHoverSubtle: {
    whileHover: { scale: 1.02 },
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },

  // Slide in from right
  slideInRight: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    transition: { type: 'spring', damping: 30, stiffness: 300 },
  },

  // Slide in from left
  slideInLeft: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
    transition: { type: 'spring', damping: 30, stiffness: 300 },
  },

  // Fade backdrop
  fadeBackdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 },
  },

  // Spring underline
  springUnderline: {
    initial: { scaleX: 0 },
    animate: { scaleX: 1 },
    exit: { scaleX: 0 },
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },

  // Stagger children delay calculator
  staggerDelay: (index: number, baseDelay = 0.1) => ({
    delay: index * baseDelay,
  }),

  // View-based animation (for sections)
  viewBased: {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 },
  },

  // View-based with delay
  viewBasedWithDelay: (delay: number) => ({
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, delay },
  }),
};

// CSS class generators for performance
export const getCSSAnimation = (name: string, delay = 0) => ({
  className: `animate-${name} will-change-transform`,
  style: {
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards' as const,
  },
});
