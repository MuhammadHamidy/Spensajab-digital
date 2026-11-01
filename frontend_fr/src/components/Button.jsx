'use client';

import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  startIcon,
  endIcon,
  type = 'button',
  onClick,
  ...props
}) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs',
    lg: 'px-5 py-2.5 text-sm',
  }[size] || 'px-4 py-2 text-xs';

  const variantClasses = {
    primary:
      'bg-[#1E4DBD] text-white hover:bg-[#193D9B] focus:ring-2 focus:ring-[#1E4DBD]/25 border border-[#1E4DBD] shadow-xs',
    gold:
      'bg-[#EAB308] text-slate-900 hover:bg-[#CA8A04] hover:text-white focus:ring-2 focus:ring-[#EAB308]/25 border border-[#CA8A04] shadow-xs',
    success:
      'bg-[#15803D] text-white hover:bg-[#166534] focus:ring-2 focus:ring-[#15803D]/25 border border-[#15803D] shadow-xs',
    danger:
      'bg-[#DC2626] text-white hover:bg-[#B91C1C] focus:ring-2 focus:ring-[#DC2626]/25 border border-[#DC2626] shadow-xs',
    secondary:
      'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 focus:ring-2 focus:ring-[#1E4DBD]/20 shadow-xs',
    ghost:
      'bg-transparent text-slate-800 hover:bg-slate-100 border border-transparent',
  }[variant] || 'bg-[#1E4DBD] text-white hover:bg-[#193D9B] border border-[#1E4DBD]';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 select-none cursor-pointer focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {loading && (
        <CircularProgress size={14} color="inherit" />
      )}
      {!loading && startIcon && <span className="shrink-0">{startIcon}</span>}
      <span>{children}</span>
      {!loading && endIcon && <span className="shrink-0">{endIcon}</span>}
    </button>
  );
}
