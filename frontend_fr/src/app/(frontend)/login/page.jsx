'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errParam = params.get('error');
      if (errParam === 'backend_offline') {
        setError(
          'Tidak dapat terhubung ke server presensi. Silakan periksa koneksi backend.'
        );
      } else if (errParam === 'session_invalid') {
        setError('Sesi login telah kedaluwarsa. Silakan masuk kembali.');
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password, 'GURU');
      router.push('/');
    } catch (err) {
      setError(
        err.message || 'Login gagal. Periksa kembali NIP/Username dan kata sandi Anda.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 space-y-6">
        {/* Header Instansi dengan Logo Resmi */}
        <div className="text-center space-y-2 border-b border-slate-100 pb-6">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-white border border-slate-200/80 p-2 shadow-sm flex items-center justify-center mb-3">
            <Image
              src="/image/logo-jabon.png"
              alt="Logo SMP Negeri 1 Jabon"
              width={72}
              height={72}
              className="object-contain w-full h-full"
              priority
            />
          </div>
          <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 border border-blue-200 px-3 py-0.5 rounded-full">
            SMP Negeri 1 Jabon
          </span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Sistem Presensi QR
          </h1>
          <p className="text-xs text-slate-500">
            Masuk dengan NIP/Username dan kata sandi Anda.
          </p>
        </div>

        {/* Notifikasi Error */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Username atau NIP Guru / Staf
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: 197503122000031001"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi akun"
                className="w-full pl-9 pr-16 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-medium text-slate-500 hover:text-blue-600 cursor-pointer"
              >
                {showPassword ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="w-full py-2.5 rounded-lg shadow-sm font-semibold"
          >
            Masuk ke Aplikasi
          </Button>
        </form>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end text-[11px] text-slate-500">
          <span>Tahun Ajaran 2026/2027</span>
        </div>
      </div>
    </div>
  );
}
