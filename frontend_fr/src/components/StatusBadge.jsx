'use client';

import React from 'react';

const STATUS_MAP = {
  HADIR: {
    bg: '#ECFDF5',
    color: '#047857',
    border: '#A7F3D0',
    label: 'Hadir',
  },
  TERLAMBAT: {
    bg: '#FFFBEB',
    color: '#B45309',
    border: '#FDE68A',
    label: 'Terlambat',
  },
  IZIN: {
    bg: '#EEF2FF',
    color: '#4338CA',
    border: '#C7D2FE',
    label: 'Izin',
  },
  SAKIT: {
    bg: '#F0F9FF',
    color: '#0369A1',
    border: '#BAE6FD',
    label: 'Sakit',
  },
  ALPHA: {
    bg: '#FFF1F2',
    color: '#BE123C',
    border: '#FECDD3',
    label: 'Alpha',
  },
  ALPA: {
    bg: '#FFF1F2',
    color: '#BE123C',
    border: '#FECDD3',
    label: 'Alpha',
  },
  OPEN: {
    bg: '#ECFDF5',
    color: '#047857',
    border: '#A7F3D0',
    label: 'Sesi Terbuka',
  },
  CLOSED: {
    bg: '#F1F5F9',
    color: '#64748B',
    border: '#CBD5E1',
    label: 'Sesi Ditutup',
  },
  UPCOMING: {
    bg: '#F8FAFC',
    color: '#64748B',
    border: '#CBD5E1',
    label: 'Akan Datang',
  },
};

export default function StatusBadge({ status, label, className = '' }) {
  const normStatus = (status || '').toUpperCase();
  const config = STATUS_MAP[normStatus] || {
    bg: '#F1F5F9',
    color: '#64748B',
    border: '#CBD5E1',
    label: status || 'Belum Scan',
  };

  return (
    <span
      style={{
        backgroundColor: config.bg,
        color: config.color,
        borderColor: config.border,
      }}
      className={`inline-flex items-center px-2 py-0.5 rounded-[6px] border text-xs font-semibold select-none ${className}`}
    >
      {label || config.label}
    </span>
  );
}
