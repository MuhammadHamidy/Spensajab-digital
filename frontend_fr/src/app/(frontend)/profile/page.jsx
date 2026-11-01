'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import Button from '@/components/Button';
import Card from '@/components/Card';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    id: '',
    fullName: '',
    nip: '',
    username: '',
    email: '',
    phone: '',
    photoUrl: '',
    courseNames: [],
    classCodes: [],
    roleName: '',
  });

  const [form, setForm] = useState({
    username: '',
    fullName: '',
    phone: '',
    photoUrl: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    const currentUser = tokenStorage.getUser() || user;
    if (!currentUser) return;

    const courseList = currentUser.course_names || currentUser.courseNames || [];
    const classList = currentUser.class_codes || currentUser.classCodes || [];

    setProfile({
      id: currentUser.id || '',
      fullName: currentUser.fullName || currentUser.full_name || '',
      nip: currentUser.nimNip || currentUser.nim_nip || currentUser.nip || '-',
      username: currentUser.username || '',
      email: currentUser.email || '',
      phone: currentUser.phone || '',
      photoUrl: currentUser.photoUrl || currentUser.photo_url || '',
      courseNames: courseList,
      classCodes: classList,
      roleName: currentUser.roleName || currentUser.role_name || 'Guru',
    });

    setForm({
      username: currentUser.username || '',
      fullName: currentUser.fullName || currentUser.full_name || '',
      phone: currentUser.phone || '',
      photoUrl: currentUser.photoUrl || currentUser.photo_url || '',
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (form.newPassword) {
      if (form.newPassword.length < 6) {
        setStatusMessage({ type: 'error', text: 'Password baru minimal harus 6 karakter.' });
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        setStatusMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        username: form.username,
        full_name: form.fullName,
        phone: form.phone,
        photo_url: form.photoUrl,
        old_password: form.oldPassword,
        new_password: form.newPassword,
      };

      await accountApiAdapter.updateProfile(profile.id, payload);

      const currentUser = tokenStorage.getUser() || {};
      const newUserData = {
        ...currentUser,
        username: form.username,
        fullName: form.fullName,
        full_name: form.fullName,
        phone: form.phone,
        photoUrl: form.photoUrl,
        photo_url: form.photoUrl,
      };
      tokenStorage.setUser(newUserData);

      setProfile((prev) => ({
        ...prev,
        username: form.username,
        fullName: form.fullName,
        phone: form.phone,
        photoUrl: form.photoUrl,
      }));

      setForm((prev) => ({
        ...prev,
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      setStatusMessage({
        type: 'success',
        text: 'Profil dan kata sandi akun berhasil diperbarui.',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal menyimpan perubahan profil.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6 bg-[#F8FAFC] text-[#0F172A]">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4">
        <h1 className="text-xl font-semibold text-[#0F172A]">
          Profil Akun & Pengaturan Sandi
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Informasi identitas pengguna, penugasan mata pelajaran, dan pengaturan kata sandi.
        </p>
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-[6px] text-xs border ${
            statusMessage.type === 'success'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
              : 'bg-[#FFF1F2] border-[#FECDD3] text-[#BE123C]'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left Column: Identitas */}
        <div className="space-y-4">
          <Card className="text-center p-5 space-y-3">
            <div className="w-16 h-16 rounded-[6px] bg-[#2563EB] text-white font-bold text-xl flex items-center justify-center mx-auto">
              {profile.fullName?.charAt(0) || 'G'}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[#0F172A]">
                {profile.fullName || 'Nama Guru'}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5 tabular-nums">
                NIP: {profile.nip}
              </p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-[4px] bg-[#EEF2FF] border border-[#C7D2FE] text-xs font-semibold text-[#2563EB]">
                {profile.roleName || 'Guru'}
              </span>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Username:</span>
                <span className="font-semibold text-[#0F172A]">@{profile.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">No. Telepon:</span>
                <span className="font-semibold text-[#0F172A] tabular-nums">{profile.phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Email:</span>
                <span className="font-semibold text-[#0F172A]">{profile.email || '-'}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Edit Profile & Password Form */}
        <div className="md:col-span-2">
          <Card className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Ubah Informasi Profil & Kata Sandi
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Kosongkan bagian kata sandi jika Anda hanya ingin memperbarui informasi kontak.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="08123456789"
                    className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Username Akun
                </label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      username: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                    })
                  }
                  className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] space-y-3">
                <h4 className="text-xs font-semibold text-[#0F172A]">
                  Ganti Kata Sandi (Opsional)
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1">
                    Kata Sandi Lama
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.oldPassword}
                    onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
                    placeholder="Masukkan kata sandi saat ini"
                    className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] mb-1">
                      Kata Sandi Baru
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.newPassword}
                      onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                      placeholder="Minimal 6 karakter"
                      className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#64748B] mb-1">
                      Ulangi Kata Sandi Baru
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="Konfirmasi kata sandi"
                      className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showPass"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="rounded-[4px] border-[#CBD5E1] text-[#2563EB]"
                  />
                  <label htmlFor="showPass" className="text-xs text-[#64748B] cursor-pointer">
                    Tampilkan karakter kata sandi
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={saving}
                >
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
