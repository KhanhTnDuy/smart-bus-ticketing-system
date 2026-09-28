import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  isLoading = false,
  disabled = false,
  icon: Icon = null,
  iconPosition = 'left',
  type = 'button',
  className = '',
  onClick,
  ...props
}) => {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const variantClass = `btn-${variant}`;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="spinner" />
          <span>Đang xử lý...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={16} />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon size={16} />}
        </>
      )}
    </button>
  );
};
