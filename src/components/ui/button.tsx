import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
const variants = {
  default: 'button-primary',
  secondary: 'button-secondary',
  ghost: 'button-ghost',
  destructive: 'button-destructive'
};
export function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: 'default' | 'small' | 'icon';
}) {
  return <button className={cn('button', variants[variant], size !== 'default' && `button-${size}`, className)} {...props} />;
}
