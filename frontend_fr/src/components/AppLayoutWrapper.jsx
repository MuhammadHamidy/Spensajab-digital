'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';

export default function AppLayoutWrapper({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  const isLoginPage = pathname === '/login';
  const isKioskPage = pathname === '/kiosk';
  const shouldRedirectToLogin =
    !loading && !isAuthenticated && !isLoginPage && !isKioskPage;
  const shouldRedirectToDashboard =
    !loading && isAuthenticated && isLoginPage;

  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.replace('/login');
    }
  }, [router, shouldRedirectToLogin]);

  useEffect(() => {
    if (shouldRedirectToDashboard) {
      router.replace('/');
    }
  }, [router, shouldRedirectToDashboard]);

  // 1. Loading state saat inisialisasi sesi otentikasi
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-[#1E4DBD] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Memeriksa sesi pengguna...</p>
        </div>
      </div>
    );
  }

  // 2. Jika belum login dan mencoba mengakses rute selain /login atau /kiosk -> langsung lempar ke /login
  if (shouldRedirectToLogin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-[#1E4DBD] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Mengalihkan ke halaman masuk...</p>
        </div>
      </div>
    );
  }

  // 3. Jika sudah login dan masih di /login -> alihkan ke dashboard utama /
  if (shouldRedirectToDashboard) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-[#1E4DBD] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Membuka dashboard...</p>
        </div>
      </div>
    );
  }

  // 4. Standalone layout untuk /login dan /kiosk
  if (isLoginPage || isKioskPage) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
        <main className="w-full">{children}</main>
      </div>
    );
  }

  // 5. Cek Peran Pengguna:
  // Guru murni (bukan admin) memakai portal mobile mandiri dengan bottom navbar
  const userRole = (user?.roleName || '').toUpperCase();
  const isAdmin = userRole.includes('ADMIN');
  const isGuru = !isAdmin && (userRole.includes('GURU') || userRole.includes('DOSEN') || userRole.includes('TEACHER'));

  if (isGuru) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
        <main className="w-full">{children}</main>
      </div>
    );
  }

  // 6. Layout Utama Admin: LANGSUNG MENAMPILKAN MENU DENGAN SIDEBAR & NAVBAR!
  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar />
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
