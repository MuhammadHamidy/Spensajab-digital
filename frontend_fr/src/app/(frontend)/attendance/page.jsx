'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { attendanceApi } from '@/lib/attendanceApi';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';

export default function AttendanceDashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Buka Kelas Baru
  const [isOpenModalActive, setIsOpenModalActive] = useState(false);
  const [classes, setClasses] = useState([]);
  const [isClassesLoading, setIsClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [topic, setTopic] = useState('');
  const [sessionNumber, setSessionNumber] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSessions = async () => {
    setIsLoading(true);
    const res = await attendanceApi.getSessions();
    if (res.success && res.data) {
      setSessions(res.data);
    } else {
      setSessions([]);
    }
    setIsLoading(false);
  };

  const fetchClasses = async () => {
    setIsClassesLoading(true);
    setClassesError('');
    try {
      const classList = await classApiAdapter.getAll();
      setClasses(classList);
      setSelectedClassId((current) => current || classList[0]?.id || '');
    } catch (error) {
      setClasses([]);
      setClassesError(error.message || 'Daftar kelas gagal dimuat');
    } finally {
      setIsClassesLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchClasses();
  }, []);

  const handleOpenClass = async (e) => {
    e.preventDefault();
    if (!selectedClassId) {
      setClassesError('Pilih kelas yang akan dibuka terlebih dahulu');
      return;
    }
    setIsSubmitting(true);

    const res = await attendanceApi.openSession(selectedClassId, topic, sessionNumber);
    setIsSubmitting(false);

    if (res.success && res.data) {
      setIsOpenModalActive(false);
      router.push(`/attendance/session/${res.data.id || res.data.session_id}`);
    } else {
      setIsSubmitting(false);
    }
  };

  const activeSessions = sessions.filter((s) => s.status === 'OPEN');
  const closedSessions = sessions.filter((s) => s.status === 'CLOSED');

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
        <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[#0F172A]">
              Dashboard Presensi & Jadwal Kelas
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Portal guru untuk mengelola sesi presensi harian di ruang kelas.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
          className="w-full sm:w-auto"
          onClick={() => setIsOpenModalActive(true)}
          >
            Buka Sesi Baru
          </Button>
        </div>

        {/* Section: Sesi Sedang Berlangsung */}
        {activeSessions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-[#0F172A]">
              Sesi Kelas Sedang Terbuka ({activeSessions.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-white border border-[#CBD5E1] rounded-[10px] p-5 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-[4px] bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] text-xs font-semibold">
                        Sesi Terbuka
                      </span>
                      <h3 className="text-base font-semibold text-[#0F172A] mt-1.5">
                        Kelas {s.class_name} — Sesi #{s.session_number}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5">{s.topic}</p>
                    </div>

                    <span className="text-xs text-[#64748B] tabular-nums">
                      {s.start_time || '-'} WIB
                    </span>
                  </div>

                  {/* Ringkasan Kehadiran */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-[6px] text-xs space-y-1.5 tabular-nums">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Kehadiran Terkini:</span>
                      <span className="font-semibold text-[#047857]">
                        {s.total_present ?? 0} / {s.total_students ?? 0} Hadir
                      </span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] rounded-[2px] h-1.5 overflow-hidden">
                      <div
                        className="bg-[#047857] h-full"
                        style={{
                          width: `${s.total_students
                            ? ((s.total_present ?? 0) / s.total_students) * 100
                            : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={() => router.push(`/attendance/session/${s.id}`)}
                  >
                    Masuk ke Layar Pemindai
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section: Riwayat Sesi Kelas Lampau */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-[#0F172A]">
            Riwayat Sesi Kelas Sebelumnya
          </h2>

          <div className="bg-white border border-[#E2E8F0] rounded-[10px] overflow-hidden">
            <div className="divide-y divide-[#E2E8F0]">
              {closedSessions.length > 0 ? (
                closedSessions.map((cs) => (
                  <div
                    key={cs.id}
                    className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-[4px] bg-[#F1F5F9] border border-[#CBD5E1] text-xs font-semibold text-[#0F172A]">
                          Kelas {cs.class_name}
                        </span>
                        <h4 className="text-xs font-semibold text-[#0F172A] truncate">
                          {cs.topic}
                        </h4>
                      </div>
                      <p className="text-xs text-[#64748B] tabular-nums">
                        Tanggal: {cs.date} | Sesi #{cs.session_number}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-xs tabular-nums hidden sm:block">
                        <p className="font-semibold text-[#047857]">
                          Hadir: {cs.total_present || 0} Siswa
                        </p>
                        <p className="text-[#BE123C]">
                          Alpha: {cs.total_alpha || 0} Siswa
                        </p>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/attendance/session/${cs.id}`)}
                      >
                        Lihat Roster
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-[#64748B]">
                  Belum ada riwayat sesi yang ditutup.
                </div>
              )}
            </div>
          </div>
        </section>

      {/* Modal Buka Sesi Baru */}
      <Modal
        isOpen={isOpenModalActive}
        onClose={() => setIsOpenModalActive(false)}
        title="Buka Sesi Presensi Baru"
        footerActions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsOpenModalActive(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSubmitting}
              onClick={handleOpenClass}
            >
              Buka Sesi Sekarang
            </Button>
          </>
        }
      >
        <form onSubmit={handleOpenClass} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Pilih Rombel / Kelas
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={isClassesLoading || classes.length === 0}
              className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            >
              {isClassesLoading && <option value="">Memuat daftar kelas...</option>}
              {!isClassesLoading && classes.length === 0 && (
                <option value="">Belum ada kelas yang diampu</option>
              )}
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.class_code} — {classItem.course_name || 'Mata pelajaran belum ditentukan'}
                </option>
              ))}
            </select>
            {classesError && (
              <p className="mt-1 text-xs text-[#BE123C]" role="alert">
                {classesError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Nomor Pertemuan (Sesi)
            </label>
            <input
              type="number"
              min="1"
              max="36"
              value={sessionNumber}
              onChange={(e) => setSessionNumber(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] tabular-nums"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Topik Materi Pembelajaran
            </label>
            <input
              type="text"
              placeholder="Contoh: Operasi Bilangan Pecahan"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              required
            />
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 rounded-[6px] text-xs text-[#64748B]">
            Toleransi waktu hadir tepat waktu adalah 15 menit dari sesi dibuka. Siswa yang memindai kartu setelah 15 menit akan ditandai sebagai Terlambat.
          </div>
        </form>
      </Modal>
    </div>
  );
}
