import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-chronos-primary-600 to-chronos-primary-500 text-white hover:from-chronos-primary-500 hover:to-chronos-primary-400 shadow-lg shadow-chronos-primary-500/20',
  secondary:
    'bg-surface-3 text-gray-200 border border-surface-4 hover:bg-surface-4 hover:text-white',
  ghost:
    'bg-transparent text-gray-400 hover:bg-surface-3 hover:text-gray-200',
  danger:
    'bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-600/20 hover:text-red-300',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-lg gap-2.5',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chronos-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0',
          variantStyles[variant],
          sizeStyles[size],
          isDisabled && 'cursor-not-allowed opacity-50',
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
