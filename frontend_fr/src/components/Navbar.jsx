'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';

export default function Navbar({ onToggleSidebar }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [currentDateStr, setCurrentDateStr] = useState('');

  useEffect(() => {
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    setCurrentDateStr(now.toLocaleDateString('id-ID', options));
  }, []);

  const getBreadcrumb = () => {
    if (pathname === '/') return { section: 'Dashboard', sub: 'Ringkasan Utama' };
    if (pathname.includes('/attendance/session/')) return { section: 'Presensi', sub: 'Detail Sesi & Roster Kelas' };
    if (pathname.startsWith('/attendance/monitoring')) return { section: 'Presensi', sub: 'Monitoring Presensi' };
    if (pathname.startsWith('/attendance')) return { section: 'Presensi', sub: 'Daftar Sesi Kelas' };
    if (pathname.startsWith('/admin/import')) return { section: 'Administrasi', sub: 'Import Data' };
    if (pathname.startsWith('/admin/teachers')) return { section: 'Data Master', sub: 'Kelola Akun Guru' };
    if (pathname.startsWith('/admin/subjects')) return { section: 'Data Master', sub: 'Mata Pelajaran' };
    if (pathname.startsWith('/admin/schedule')) return { section: 'Data Master', sub: 'Pemetaan Jadwal' };
    if (pathname.startsWith('/admin/rekap')) return { section: 'Laporan', sub: 'Rekapitulasi Presensi' };
    if (pathname.startsWith('/students')) return { section: 'Data Master', sub: 'Data Siswa & Kartu QR' };
    if (pathname.startsWith('/profile')) return { section: 'Pengaturan', sub: 'Profil Akun' };
    return { section: 'Presensi Sekolah', sub: 'SMP Negeri 1 Jabon' };
  };

  const breadcrumb = getBreadcrumb();

  const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-3.5 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs print:hidden">
      {/* Left: Hamburger Button (Mobile) & Breadcrumbs */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Buka menu navigasi"
          className="lg:hidden p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 shrink-0 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-500 min-w-0 truncate">
          <Link href="/" className="hover:text-blue-600 transition-colors font-medium hidden sm:inline">
            {breadcrumb.section}
          </Link>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="text-slate-900 font-semibold truncate">{breadcrumb.sub}</span>
        </div>
      </div>

      {/* Right: Date, Quick Links, User Avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Date Chip */}
        {currentDateStr && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{currentDateStr}</span>
          </div>
        )}

        {/* Quick Link to Session */}
        <Link
          href="/attendance"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFF4FE] text-[#193D9B] hover:bg-[#DBE6FD] border border-[#BFD3FB] text-xs font-semibold transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-[#1E4DBD]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Sesi Presensi</span>
        </Link>

        {/* User Profile Info */}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#193D9B] to-[#1E4DBD] text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {getInitials(user?.fullName || user?.name || 'Admin')}
          </div>
          <div className="hidden md:block text-left text-xs">
            <p className="font-semibold text-slate-800 leading-tight">
              {user?.fullName || user?.name || 'Administrator'}
            </p>
            <p className="text-[11px] text-slate-500">
              {user?.roleName || 'Admin SMPN 1 Jabon'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
