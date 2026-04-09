/**
 * Design System Tokens
 * Central source of truth for colors, spacing, shadows, etc.
 */

export const tokens = {
  // Brand Gradients
  gradients: {
    primary: 'from-fuchsia-600 via-purple-600 to-pink-600',
    primaryHover: 'from-fuchsia-700 via-purple-700 to-pink-700',
    secondary: 'from-blue-500 to-cyan-500',
    success: 'from-green-500 to-emerald-500',
    warning: 'from-yellow-500 to-orange-500',
    danger: 'from-red-500 to-pink-500',
    purple: 'from-purple-500 to-indigo-500',
    fuchsia: 'from-fuchsia-500 to-pink-500',
    
    // Background gradients
    bgLight: 'from-white via-pink-50/20 to-white',
    bgPurple: 'from-white via-purple-50/20 to-white',
    bgGray: 'from-gray-50 to-white',
    
    // Text gradients
    textPrimary: 'from-fuchsia-600 to-purple-600',
    textSecondary: 'from-blue-600 to-purple-600',
  },

  // Spacing
  spacing: {
    section: {
      hero: 'py-32',
      large: 'py-20',
      medium: 'py-16',
      small: 'py-12',
    },
    container: {
      padding: 'px-6',
      maxWidth: 'max-w-7xl mx-auto',
      maxWidthNarrow: 'max-w-5xl mx-auto',
      maxWidthWide: 'max-w-7xl mx-auto',
    },
    card: {
      padding: 'p-6',
      paddingLarge: 'p-8',
      paddingSmall: 'p-4',
    },
    grid: {
      gap: 'gap-6',
      gapLarge: 'gap-8',
      gapSmall: 'gap-4',
    },
  },

  // Typography
  typography: {
    hero: 'text-6xl md:text-7xl font-black',
    h1: 'text-5xl md:text-6xl font-black',
    h2: 'text-4xl md:text-5xl font-black',
    h3: 'text-3xl md:text-4xl font-black',
    h4: 'text-2xl md:text-3xl font-black',
    h5: 'text-xl md:text-2xl font-black',
    h6: 'text-lg md:text-xl font-black',
    bodyLarge: 'text-lg md:text-xl',
    body: 'text-base',
    bodySmall: 'text-sm',
    caption: 'text-xs',
  },

  // Shadows
  shadows: {
    card: 'shadow-none',
    cardHover: 'shadow-none',
    button: 'shadow-none',
    buttonHover: 'shadow-none',
    strong: 'shadow-none',
    subtle: 'shadow-none',
  },

  // Borders
  borders: {
    card: 'border border-[#2A2A2A]',
    cardHover: 'border-[#7C6AEF]',
    cardActive: 'border-[#7C6AEF]',
    input: 'border border-[#2A2A2A]',
    subtle: 'border border-[#1E1E1E]',
  },

  // Border Radius
  radius: {
    small: 'rounded-sm',
    medium: 'rounded-sm',
    large: 'rounded-sm',
    full: 'rounded-sm',
  },

  // Backgrounds
  backgrounds: {
    card: 'bg-[#111111]',
    cardHover: 'bg-[#1A1A1A]',
    glass: 'bg-black/20 backdrop-blur-sm',
    glassStrong: 'bg-black/40 backdrop-blur-md',
    overlay: 'bg-black/70 backdrop-blur-sm',
  },

  // Transitions
  transitions: {
    default: 'transition-all duration-300',
    fast: 'transition-all duration-200',
    slow: 'transition-all duration-500',
  },

  // Colors (text)
  colors: {
    text: {
      primary: 'text-[#E8E8E8]',
      secondary: 'text-[#888]',
      muted: 'text-[#666]',
      disabled: 'text-[#333]',
      white: 'text-white',
    },
    bg: {
      primary: 'bg-[#0A0A0A]',
      secondary: 'bg-[#111111]',
      purple: 'bg-[#7C6AEF]/10',
      pink: 'bg-[#7C6AEF]/10',
    },
  },
};

// Button variants
export const buttonVariants = {
  primary: 'bg-[#7C6AEF] hover:bg-[#8B7CF0] text-white border-0 transition-all duration-150',
  secondary: 'bg-[#1A1A1A] hover:bg-[#222222] text-[#E8E8E8] border border-[#2A2A2A] transition-all duration-150',
  outline: 'border border-[#2A2A2A] text-[#888] hover:text-[#E8E8E8] hover:border-[#3A3A3A] bg-transparent transition-all duration-150',
  ghost: 'text-[#888] hover:text-[#E8E8E8] hover:bg-[#1A1A1A] transition-all duration-150',
};

// Button sizes
export const buttonSizes = {
  sm: 'px-6 py-3 text-sm',
  md: 'px-8 py-4 text-base',
  lg: 'px-12 py-6 text-lg',
  xl: 'px-12 py-7 text-lg',
};
