import React from 'react';

// Design System Color Palette Tokens - Sesuai Design Brief v2.0
export const THEME_PALETTE = {
  bgApp: '#F8FAFC',
  bgSurface: '#FFFFFF',
  borderSubtle: '#E2E8F0',
  borderStrong: '#CBD5E1',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  primary: '#2563EB',
};

// Reusable Theme Badge Component (Flat, sentence case, no glow)
export function RoleThemeBadge({ role }) {
  const roleUpper = (role || 'GURU').toUpperCase();

  if (roleUpper === 'ADMIN') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-[6px] bg-[#EEF2FF] text-[#2563EB] border border-[#C7D2FE]">
        Admin
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-[6px] bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
      Guru
    </span>
  );
}
