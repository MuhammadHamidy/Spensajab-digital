'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import GuruMobilePortal from '@/components/GuruMobilePortal';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { attendanceApi } from '@/lib/attendanceApi';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';

export default function MainPage() {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const [adminViewMode, setAdminViewMode] = useState('admin'); // 'admin' | 'guru_preview'

  // Admin Dashboard state
  const [liveSessions, setLiveSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [currentTime, setCurrentTime] = useState('');

  // Live time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load admin dashboard data if user is admin
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const role = (user.roleName || '').toUpperCase();
    if (!role.includes('ADMIN')) return;

    async function loadData() {
      const [liveRes, sessionsRes] = await Promise.all([
        attendanceApi.getLiveMonitoring(),
        attendanceApi.getSessions(),
      ]);
      const [students, teachers] = await Promise.all([
        accountApiAdapter.getStudents(),
        accountApiAdapter.getTeachers(),
      ]);
      setStudentCount(Array.isArray(students) ? students.length : 0);
      setTeacherCount(Array.isArray(teachers) ? teachers.length : 0);

      if (liveRes.success && liveRes.data) {
        setLiveSessions(liveRes.data);
      } else {
        setLiveSessions([]);
      }

      if (sessionsRes.success && sessionsRes.data) {
        setRecentSessions(sessionsRes.data.slice(0, 5));
      } else {
        setRecentSessions([]);
      }
    }
    loadData();
  }, [isAuthenticated, user]);

  // 1. Loading state
  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-[#1E4DBD] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  // 2. Periksa Peran Pengguna
  const role = (user.roleName || '').toUpperCase();
  const isAdmin = role.includes('ADMIN');
  const isGuru = !isAdmin && (role.includes('GURU') || role.includes('DOSEN') || role.includes('TEACHER'));

  // GURU: LANGSUNG PORTAL MOBILE (STANDALONE)
  if (isGuru) {
    return <GuruMobilePortal user={user} onLogout={logout} />;
  }

  // ADMIN: JIKA MEMILIH PREVIEW PORTAL GURU
  if (isAdmin && adminViewMode === 'guru_preview') {
    return (
      <div className="min-h-screen bg-slate-100 py-4 -m-6 sm:-m-8">
        <div className="max-w-md mx-auto mb-3 bg-white border border-[#BFD3FB] rounded-xl p-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#193D9B]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1E4DBD] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#193D9B]"></span>
            </span>
            <span>Mode Pratinjau Tampilan Guru</span>
          </div>
          <button
            type="button"
            onClick={() => setAdminViewMode('admin')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 border border-slate-300 transition-colors cursor-pointer"
          >
            ← Kembali ke Panel Admin
          </button>
        </div>
        <GuruMobilePortal user={user} onLogout={logout} />
      </div>
    );
  }

  // ADMIN: DASHBOARD ADMIN SEKOLAH (DILENGKAPI SIDEBAR & NAVBAR OLEH APPLAYOUTWRAPPER)
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Hero Header Banner Berpalet Resmi */}
      <div className="bg-gradient-to-r from-[#193D9B] via-[#1E4DBD] to-[#15327B] rounded-2xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden border border-[#193D9B]/50">
        {/* Dekorasi Aksen Emas & Biru Laut */}
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-[#EAB308]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-28 bottom-0 translate-y-12 w-48 h-48 bg-[#193D9B]/30 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 text-xs font-medium text-blue-50">
              <span className="w-2 h-2 rounded-full bg-[#EAB308]" />
              <span>Tahun Ajaran 2026/2027 • Semester Ganjil</span>
              {currentTime && (
                <>
                  <span className="text-white/40">•</span>
                  <span className="tabular-nums font-semibold text-white">{currentTime} WIB</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Selamat Datang, {user?.fullName || user?.name || 'Administrator'}</span>
            </h1>
            <p className="text-sm text-blue-100/90 max-w-2xl">
              Panel Pengendali Presensi QR SMP Negeri 1 Jabon. Pantau sesi kelas harian, kelola data siswa & guru, serta unduh rekapitulasi presensi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setAdminViewMode('guru_preview')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-semibold text-white backdrop-blur-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>📱 Pratinjau Guru</span>
            </button>
            <Link href="/attendance">
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-[#EAB308] hover:bg-[#CA8A04] text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Buka Presensi Baru</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Quick Action Toolbar (Aksi Cepat Harian) */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Aksi Cepat Menu Utama
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link
            href="/attendance"
            className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 hover:border-blue-300 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#EFF4FE] text-[#1E4DBD] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#193D9B] truncate">
                Presensi Kelas
              </h4>
              <p className="text-[10px] text-slate-500 truncate">Buka sesi scan</p>
            </div>
          </Link>

          <Link
            href="/attendance/monitoring"
            className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-300 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#15803D] truncate">
                Monitoring Presensi
              </h4>
              <p className="text-[10px] text-slate-500 truncate">Pantau kelas aktif</p>
            </div>
          </Link>

          <Link
            href="/students"
            className="p-3 rounded-xl bg-slate-50 hover:bg-violet-50/70 border border-slate-200/80 hover:border-violet-300 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-violet-700 truncate">
                Kartu QR Siswa
              </h4>
              <p className="text-[10px] text-slate-500 truncate">Cetak kartu fisik</p>
            </div>
          </Link>

          <Link
            href="/admin/rekap"
            className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200/80 hover:border-amber-300 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#FEF9C3] text-[#CA8A04] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#CA8A04] truncate">
                Rekap Kehadiran
              </h4>
              <p className="text-[10px] text-slate-500 truncate">Laporan kehadiran</p>
            </div>
          </Link>

          <Link
            href="/admin/import"
            className="p-3 rounded-xl bg-slate-50 hover:bg-sky-50/70 border border-slate-200/80 hover:border-sky-300 transition-all flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-sky-700 truncate">
                Import Data
              </h4>
              <p className="text-[10px] text-slate-500 truncate">Data siswa & guru</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. 4 KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs hover:border-[#1E4DBD] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Siswa Terdaftar</span>
            <span className="p-2 rounded-lg bg-[#EFF4FE] text-[#1E4DBD]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-2">{studentCount.toLocaleString('id-ID')}</p>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
            <span className="text-[#1E4DBD] font-semibold">Data siswa aktif</span>
            <span>• Terhubung ke backend</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs hover:border-[#CA8A04] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Guru Pengajar</span>
            <span className="p-2 rounded-lg bg-[#FEF9C3] text-[#CA8A04]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-bold text-[#CA8A04] tabular-nums mt-2">{teacherCount} Guru</p>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
            <span className="text-[#15803D] font-semibold">{teacherCount} Terdaftar</span>
            <span>• Guru Pengajar</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs hover:border-[#15803D] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Kelas Sedang Berjalan</span>
            <span className="p-2 rounded-lg bg-[#DCFCE7] text-[#15803D]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold text-[#15803D] tabular-nums">
              {liveSessions.length} Kelas
            </p>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">Sesi presensi aktif di kelas</p>
        </div>

        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs hover:border-[#EAB308] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tingkat Kehadiran</span>
            <span className="p-2 rounded-lg bg-[#FEF9C3] text-[#CA8A04]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-2">-</p>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
            <span className="text-slate-500 font-semibold">Belum ada data</span>
            <span>• Rata-rata semester</span>
          </div>
        </div>
      </div>

      {/* 4. Sesi Kelas yang Sedang Berjalan */}
      {liveSessions.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white border border-emerald-300 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                SESI KELAS AKTIF
              </span>
              <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 tabular-nums">
                Kelas {liveSessions[0].class_name}
              </span>
              <span className="text-xs font-medium text-slate-600">
                {liveSessions[0].topic}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span>
                Guru Pengampu: <strong className="text-slate-900">{liveSessions[0].teacher_name}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Status Kehadiran:{' '}
                <strong className="text-[#15803D] tabular-nums">
                  {liveSessions[0].total_present ?? 0} / {liveSessions[0].total_students ?? 0} Siswa Hadir
                </strong>{' '}
                ({liveSessions[0].total_students
                  ? Math.round(((liveSessions[0].total_present ?? 0) / liveSessions[0].total_students) * 100)
                  : 0}%)
              </span>
            </div>

            {/* Attendance Progress bar */}
            <div className="w-full max-w-md bg-slate-200 rounded-full h-2 overflow-hidden mt-1">
              <div
                className="bg-[#15803D] h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${liveSessions[0].total_students
                    ? Math.round(((liveSessions[0].total_present ?? 0) / liveSessions[0].total_students) * 100)
                    : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link href={`/attendance/session/${liveSessions[0].id}`}>
              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span>Buka Scanner Meja Guru</span>
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* 5. Modul Operasional Lengkap Sekolah */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            Kelola Modul Presensi & Administrasi
          </h2>
          <span className="text-xs text-slate-500">Pilih menu operasional yang diinginkan</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/attendance"
            className="bg-white border border-slate-200/90 hover:border-[#1E4DBD] p-5 rounded-2xl transition-all shadow-xs hover:shadow-md block group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EFF4FE] text-[#1E4DBD] flex items-center justify-center mb-3 group-hover:bg-[#1E4DBD] group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#193D9B] transition-colors">
              Presensi QR Kelas
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Buka sesi pertemuan baru, tentukan mata pelajaran, dan jalankan scanner QR di meja kelas.
            </p>
          </Link>

          <Link
            href="/attendance/monitoring"
            className="bg-white border border-slate-200/90 hover:border-emerald-400 p-5 rounded-2xl transition-all shadow-xs hover:shadow-md block group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center mb-3 group-hover:bg-[#15803D] group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#15803D] transition-colors">
              Monitoring Kelas
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Pantau seluruh ruang kelas yang sedang berlangsung secara real-time dengan batas 15 menit.
            </p>
          </Link>

          <Link
            href="/students"
            className="bg-white border border-slate-200/90 hover:border-violet-400 p-5 rounded-2xl transition-all shadow-xs hover:shadow-md block group"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-3 group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-violet-600 transition-colors">
              Data Siswa & Cetak Kartu QR
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Kelola data peserta didik per rombel dan cetak kartu identitas QR resmi siswa SMPN 1 Jabon.
            </p>
          </Link>

          <Link
            href="/admin/teachers"
            className="bg-white border border-slate-200/90 hover:border-[#193D9B] p-5 rounded-2xl transition-all shadow-xs hover:shadow-md block group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EFF4FE] text-[#193D9B] flex items-center justify-center mb-3 group-hover:bg-[#193D9B] group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#193D9B] transition-colors">
              Data Guru Pengajar
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Daftar guru aktif, pembagian rombel ajar, NIP, serta pengelolaan akun pengajar.
            </p>
          </Link>

          <Link
            href="/admin/rekap"
            className="bg-white border border-slate-200/90 hover:border-[#CA8A04] p-5 rounded-2xl transition-all shadow-xs hover:shadow-md block group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FEF9C3] text-[#CA8A04] flex items-center justify-center mb-3 group-hover:bg-[#CA8A04] group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#CA8A04] transition-colors">
              Rekapitulasi Presensi
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Laporan akumulasi kehadiran siswa dan unduh hasil rekap.
            </p>
          </Link>

          <Link
            href="/admin/import"
            className="bg-white border border-slate-200/90 hover:border-sky-400 p-5 rounded-2xl transition-all shadow-xs hover:shadow-md block group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
              Import Data
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Unggah data siswa dan guru secara sekaligus.
            </p>
          </Link>
        </div>
      </div>

      {/* 6. Riwayat Sesi Kelas Terbaru */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Riwayat Sesi Kelas Terbaru
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar kelas yang baru saja selesai atau sedang berlangsung
            </p>
          </div>
          <Link
            href="/attendance"
            className="text-xs font-semibold text-[#1E4DBD] hover:underline"
          >
            Lihat Semua Sesi →
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {recentSessions.map((item) => (
            <div
              key={item.id}
              className="py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 -mx-2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EFF4FE] border border-[#BFD3FB] text-[#193D9B] font-bold text-xs flex items-center justify-center shrink-0 tabular-nums">
                  {item.class_name}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{item.topic}</span>
                    {item.status === 'OPEN' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Sedang Berlangsung
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                        Selesai
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    Guru: <strong className="text-slate-700">{item.teacher_name || '-'}</strong> • Tanggal: {item.date || '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs font-bold text-[#15803D] tabular-nums block">
                    {item.total_present ?? 0} Siswa Hadir
                  </span>
                  <span className="text-[10px] text-slate-400">
                    dari {item.total_students ?? 0} siswa
                  </span>
                </div>
                <Link
                  href={`/attendance/session/${item.id}`}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-[#EFF4FE] hover:text-[#193D9B] hover:border-[#BFD3FB] text-slate-700 text-xs font-semibold transition-all border border-slate-200"
                >
                  Detail Sesi
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
