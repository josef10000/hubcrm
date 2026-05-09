import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  children, 
  className = '', 
  ...props 
}: ButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  
  const variants = {
    primary: "bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/20",
    secondary: "bg-surface-elevated text-text-main hover:bg-white/10 border border-white/10",
    outline: "bg-transparent border border-primary-500 text-primary-500 hover:bg-primary-500/10",
    ghost: "bg-transparent text-text-muted hover:bg-white/5 hover:text-text-main",
    danger: "bg-accent-error text-white hover:opacity-90 shadow-lg shadow-accent-error/20",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
};

export const Card = ({ children, className = '', glass = false }: { children: React.ReactNode, className?: string, glass?: boolean }) => {
  return (
    <div className={`
      ${glass ? 'bg-surface-glass backdrop-blur-md' : 'bg-surface-elevated'} 
      border border-white/10 rounded-xl overflow-hidden transition-all duration-300
      ${className}
    `}>
      {children}
    </div>
  );
};

export const Badge = ({ children, variant = 'primary', className = '' }: { children: React.ReactNode, variant?: 'primary' | 'success' | 'warning' | 'danger', className?: string }) => {
  const variants = {
    primary: "bg-primary-500/10 text-primary-500 border-primary-500/20",
    success: "bg-accent-success/10 text-accent-success border-accent-success/20",
    warning: "bg-accent-warning/10 text-accent-warning border-accent-warning/20",
    danger: "bg-accent-error/10 text-accent-error border-accent-error/20",
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
