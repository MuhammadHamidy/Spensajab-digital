'use client';

import React from 'react';

export default function Card({
  title,
  subtitle,
  icon,
  action,
  children,
  className = '',
  interactive = false,
}) {
  return (
    <div
      className={`bg-white border border-[#E2E8F0] rounded-[10px] overflow-hidden ${
        interactive ? 'hover:bg-[#F8FAFC] transition-colors' : ''
      } ${className}`}
    >
      {(title || icon || action) && (
        <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-1.5 rounded-[6px] bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] shrink-0">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-[16px] font-semibold text-[#0F172A] leading-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
