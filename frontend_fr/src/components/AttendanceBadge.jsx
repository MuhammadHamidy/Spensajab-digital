'use client';

import React from 'react';

const STATUS_CONFIG = {
  HADIR: {
    label: 'Hadir',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    fg: '#047857',
  },
  TERLAMBAT: {
    label: 'Terlambat',
    bg: '#FFFBEB',
    border: '#FDE68A',
    fg: '#B45309',
  },
  ALPHA: {
    label: 'Alpha',
    bg: '#FFF1F2',
    border: '#FECDD3',
    fg: '#BE123C',
  },
  SAKIT: {
    label: 'Sakit',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    fg: '#0369A1',
  },
  IZIN: {
    label: 'Izin',
    bg: '#EEF2FF',
    border: '#C7D2FE',
    fg: '#4338CA',
  },
  PENDING: {
    label: 'Belum Scan',
    bg: '#F1F5F9',
    border: '#CBD5E1',
    fg: '#64748B',
  },
};

export default function AttendanceBadge({ status, size = 'md' }) {
  const normStatus = (status || 'PENDING').toUpperCase();
  const conf = STATUS_CONFIG[normStatus] || STATUS_CONFIG.PENDING;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3 py-1.5 font-bold',
  }[size] || 'text-xs px-2.5 py-1 font-semibold';

  return (
    <span
      style={{
        backgroundColor: conf.bg,
        borderColor: conf.border,
        color: conf.fg,
      }}
      className={`inline-flex items-center rounded-[6px] border select-none tracking-normal ${sizeClasses}`}
    >
      {conf.label}
    </span>
  );
}
