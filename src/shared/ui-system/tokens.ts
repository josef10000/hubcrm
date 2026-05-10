/**
 * HubCRM Design Tokens — Padrão Dark Absolute
 * Estes tokens definem a identidade visual central do ecossistema.
 */

export const HUB_TOKENS = {
  colors: {
    background: '#030712', // Black Absolute
    surface: 'rgba(17, 24, 39, 0.7)', // Glassmorphism surface
    border: 'rgba(255, 255, 255, 0.1)',
    primary: {
      DEFAULT: '#3b82f6',
      hover: '#2563eb',
      glow: 'rgba(59, 130, 246, 0.5)',
    },
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  
  blur: {
    sm: 'blur(4px)',
    md: 'blur(8px)',
    lg: 'blur(12px)',
    xl: 'blur(20px)',
  },

  transitions: {
    default: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: 'all 0.5s ease-in-out',
    spring: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },

  shadows: {
    glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    glow: '0 0 15px rgba(59, 130, 246, 0.3)',
  },

  spacing: {
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    card: 'p-6 rounded-2xl',
  }
} as const;

export const GLASS_STYLES = {
  base: {
    backgroundColor: HUB_TOKENS.colors.surface,
    backdropFilter: HUB_TOKENS.blur.xl,
    WebkitBackdropFilter: HUB_TOKENS.blur.xl,
    border: `1px solid ${HUB_TOKENS.colors.border}`,
    boxShadow: HUB_TOKENS.shadows.glass,
  },
  hover: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  }
};
