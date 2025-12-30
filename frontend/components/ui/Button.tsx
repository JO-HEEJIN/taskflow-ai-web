'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      loading = false,
      fullWidth = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles (always applied)
    const baseStyles = [
      'inline-flex',
      'items-center',
      'justify-center',
      'gap-2',
      'font-medium',
      'rounded-lg',
      'transition-all',
      'duration-300',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'focus:ring-purple-500',
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
      'disabled:transform-none',
    ].join(' ');

    // Variant styles
    const variantStyles = {
      primary: [
        'bg-purple-600',
        'hover:bg-purple-700',
        'active:bg-purple-800',
        'text-white',
        'shadow-md',
        'hover:shadow-lg',
        'hover:scale-105',
        'active:scale-95',
      ].join(' '),
      secondary: [
        'bg-white',
        'hover:bg-gray-50',
        'active:bg-gray-100',
        'text-purple-600',
        'border',
        'border-purple-300',
        'hover:border-purple-400',
        'shadow-sm',
        'hover:shadow-md',
        'hover:scale-105',
        'active:scale-95',
      ].join(' '),
      ghost: [
        'bg-transparent',
        'hover:bg-purple-50',
        'active:bg-purple-100',
        'text-purple-600',
        'hover:scale-105',
        'active:scale-95',
      ].join(' '),
      danger: [
        'bg-red-600',
        'hover:bg-red-700',
        'active:bg-red-800',
        'text-white',
        'shadow-md',
        'hover:shadow-lg',
        'hover:scale-105',
        'active:scale-95',
      ].join(' '),
    };

    // Size styles (ensuring 48px minimum touch target for accessibility)
    const sizeStyles = {
      sm: 'px-4 py-2 text-sm min-h-[40px]',
      md: 'px-6 py-3 text-base min-h-[48px]',
      lg: 'px-8 py-4 text-lg min-h-[56px]',
    };

    // Full width style
    const widthStyle = fullWidth ? 'w-full' : '';

    // Combine all styles
    const combinedStyles = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      widthStyle,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={combinedStyles}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {children}
          </>
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
