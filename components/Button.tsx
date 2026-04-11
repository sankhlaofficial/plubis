import Link from 'next/link';
import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  href?: string;
  download?: string | boolean;
  external?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-sun text-outline border-outline shadow-[0_4px_0_0_#0F172A] hover:translate-y-[1px] hover:shadow-[0_3px_0_0_#0F172A]',
  secondary: 'bg-cream text-outline border-outline hover:bg-cream-200',
  ghost: 'bg-transparent text-outline border-transparent hover:bg-cream-200',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

const base =
  'inline-flex items-center justify-center rounded-full font-medium border-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sun disabled:opacity-50 disabled:cursor-not-allowed';

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  href,
  download,
  external,
  onClick,
  disabled,
  type,
  className,
  children,
}: ButtonProps) {
  const classes = [
    base,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  if (href && download !== undefined) {
    return (
      <a
        href={href}
        download={download === true ? '' : download}
        className={classes}
      >
        {children}
      </a>
    );
  }

  if (href && external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {children}
      </a>
    );
  }

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
}
