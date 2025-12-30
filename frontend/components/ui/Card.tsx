'use client';

import { HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated';
  interactive?: boolean;
}

/**
 * Card component with consistent glassmorphism styling
 * Uses design tokens for colors, spacing, and shadows
 *
 * Variants:
 * - default: Standard white card with shadow
 * - glass: Glassmorphism effect with backdrop blur
 * - elevated: White card with stronger shadow
 *
 * Usage:
 *   <Card>Content</Card>
 *   <Card variant="glass">Glass content</Card>
 *   <Card interactive onClick={...}>Clickable card</Card>
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      interactive = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = [
      'rounded-lg',
      'transition-all',
      'duration-300',
    ].join(' ');

    // Variant styles
    const variantStyles = {
      default: [
        'bg-white',
        'border',
        'border-gray-200',
        'shadow-sm',
      ].join(' '),

      glass: [
        'glass-card', // Uses design-tokens.css utility
        'border',
        'border-purple-300/30',
      ].join(' '),

      elevated: [
        'bg-white',
        'border',
        'border-gray-100',
        'shadow-lg',
      ].join(' '),
    };

    // Interactive styles (for clickable cards)
    const interactiveStyles = interactive
      ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]'
      : '';

    // Combine all styles
    const combinedStyles = [
      baseStyles,
      variantStyles[variant],
      interactiveStyles,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={ref}
        className={combinedStyles}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * Card Header component for consistent card headers
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function CardHeader({
  title,
  description,
  action,
  className = '',
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={`flex items-start justify-between p-6 border-b border-gray-200 ${className}`}
      {...props}
    >
      <div className="flex-1">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        )}
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
        {children}
      </div>
      {action && (
        <div className="ml-4 flex-shrink-0">{action}</div>
      )}
    </div>
  );
}

/**
 * Card Body component for consistent card content
 */
export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

export function CardBody({
  className = '',
  children,
  ...props
}: CardBodyProps) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Footer component for consistent card footers
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export function CardFooter({
  className = '',
  children,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={`flex items-center justify-end gap-3 p-6 border-t border-gray-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
