import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn.js';

export const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-text hover:opacity-90',
        secondary: 'bg-surface text-text hover:bg-surface-alt',
        ghost: 'text-text hover:bg-surface',
        danger: 'bg-danger text-primary-text hover:opacity-90',
        link: 'min-h-0 px-0 text-link underline-offset-4 hover:underline',
      },
      size: { md: '', sm: 'min-h-9 px-3 text-xs', full: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

/** Amal nomi tugmada ("Rad etish", "OK" emas — 11-ux §4.5). `loading` — takroriy bosishdan himoya. */
export function Button({
  className,
  variant,
  size,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
