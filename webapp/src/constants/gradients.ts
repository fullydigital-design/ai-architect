// Gradient color constants for consistent theming
export const GRADIENTS = {
  primary: 'from-fuchsia-600 via-purple-600 to-pink-600',
  primaryHover: 'from-fuchsia-700 via-purple-700 to-pink-700',
  
  pink: 'from-pink-500 to-rose-500',
  purple: 'from-purple-500 to-indigo-600',
  blue: 'from-blue-500 to-cyan-500',
  red: 'from-red-400 via-pink-400 to-rose-400',
  teal: 'from-teal-400 to-cyan-600',
  
  // Feature-specific gradients
  text: 'from-pink-500 to-rose-500',
  concept: 'from-purple-500 to-indigo-600',
  image: 'from-blue-500 to-cyan-500',
  video: 'from-red-400 via-pink-400 to-rose-400',
  edit: 'from-teal-400 to-cyan-600'
} as const;

// Shadow colors matching gradients
export const SHADOW_COLORS = {
  primary: 'shadow-purple-500/30',
  pink: 'shadow-pink-500/30',
  purple: 'shadow-purple-500/30',
  blue: 'shadow-blue-500/30',
  red: 'shadow-red-500/30',
  teal: 'shadow-teal-500/30'
} as const;
