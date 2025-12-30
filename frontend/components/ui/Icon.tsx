'use client';

import * as LucideIcons from 'lucide-react';

export type IconName = keyof typeof LucideIcons;

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/**
 * Centralized Icon component using lucide-react
 * Replaces emoji icons throughout the app for professional appearance
 *
 * Usage:
 *   <Icon name="Edit2" size={20} />
 *   <Icon name="Trash2" className="text-red-500" />
 */
export function Icon({ name, size = 20, className = '', strokeWidth = 2 }: IconProps) {
  const LucideIcon = LucideIcons[name] as React.ComponentType<LucideIcons.LucideProps>;

  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }

  return (
    <LucideIcon
      size={size}
      className={className}
      strokeWidth={strokeWidth}
    />
  );
}

/**
 * Common icon presets for consistency
 */
export const IconPresets = {
  // Actions
  Edit: (props?: Partial<IconProps>) => <Icon name="Edit2" {...props} />,
  Delete: (props?: Partial<IconProps>) => <Icon name="Trash2" {...props} />,
  Archive: (props?: Partial<IconProps>) => <Icon name="Archive" {...props} />,
  Add: (props?: Partial<IconProps>) => <Icon name="Plus" {...props} />,
  Close: (props?: Partial<IconProps>) => <Icon name="X" {...props} />,

  // Navigation
  ChevronLeft: (props?: Partial<IconProps>) => <Icon name="ChevronLeft" {...props} />,
  ChevronRight: (props?: Partial<IconProps>) => <Icon name="ChevronRight" {...props} />,
  ChevronUp: (props?: Partial<IconProps>) => <Icon name="ChevronUp" {...props} />,
  ChevronDown: (props?: Partial<IconProps>) => <Icon name="ChevronDown" {...props} />,

  // Status
  Check: (props?: Partial<IconProps>) => <Icon name="Check" {...props} />,
  CheckCircle: (props?: Partial<IconProps>) => <Icon name="CheckCircle" {...props} />,
  AlertCircle: (props?: Partial<IconProps>) => <Icon name="AlertCircle" {...props} />,
  Info: (props?: Partial<IconProps>) => <Icon name="Info" {...props} />,

  // Features
  Sparkles: (props?: Partial<IconProps>) => <Icon name="Sparkles" {...props} />,
  Map: (props?: Partial<IconProps>) => <Icon name="Map" {...props} />,
  Filter: (props?: Partial<IconProps>) => <Icon name="Filter" {...props} />,
  Search: (props?: Partial<IconProps>) => <Icon name="Search" {...props} />,
  MoreVertical: (props?: Partial<IconProps>) => <Icon name="MoreVertical" {...props} />,
  Home: (props?: Partial<IconProps>) => <Icon name="Home" {...props} />,

  // Communication
  MessageCircle: (props?: Partial<IconProps>) => <Icon name="MessageCircle" {...props} />,
  Send: (props?: Partial<IconProps>) => <Icon name="Send" {...props} />,

  // Media
  Play: (props?: Partial<IconProps>) => <Icon name="Play" {...props} />,
  Pause: (props?: Partial<IconProps>) => <Icon name="Pause" {...props} />,
  SkipForward: (props?: Partial<IconProps>) => <Icon name="SkipForward" {...props} />,

  // Loading
  Loader: (props?: Partial<IconProps>) => (
    <Icon name="Loader2" className="animate-spin" {...props} />
  ),
};
