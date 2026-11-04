'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AttendanceBadge from '@/components/AttendanceBadge';
import QRViewfinder from '@/components/QRViewfinder';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { attendanceApi } from '@/lib/attendanceApi';
import { attendanceAudio } from '@/lib/attendanceAudio';
import { useAuth } from '@/lib/features/auth/presentation/useAuth';

const LATE_PRESETS = [
  { label: '10 Menit', value: 10 },
  { label: '15 Menit', value: 15 },
  { label: '20 Menit', value: 20 },
  { label: '30 Menit', value: 30 },
  { label: '45 Menit', value: 45 },
  { label: '60 Menit', value: 60 },
  { label: 'Tanpa Batas', value: 0 },
];

export default function ClassSessionScannerPage() {
  const params = useParams();
  const sessionId = params.id;
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = (user?.roleName || '').toUpperCase().includes('ADMIN');

  // State Sesi
  const [session, setSession] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [summary, setSummary] = useState({
    total_students: 0,
    total_hadir: 0,
    total_late: 0,
    total_sakit: 0,
    total_izin: 0,
    total_alpha: 0,
    total_pending: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Hasil Scan Terakhir
  const [lastScanResult, setLastScanResult] = useState(null);
  const [feedbackState, setFeedbackState] = useState('idle'); // 'idle' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('');

  // Timer Keterlambatan Dinamis
  const [remainingTime, setRemainingTime] = useState('--:--');
  const [isCutoffPassed, setIsCutoffPassed] = useState(false);

  // Filter & Search Roster
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isScanSuccessModalOpen, setIsScanSuccessModalOpen] = useState(false);
  const [scannedStudentData, setScannedStudentData] = useState(null);
  const scanSuccessTimerRef = useRef(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isEditSessionModalOpen, setIsEditSessionModalOpen] = useState(false);
  const [editTopic, setEditTopic] = useState('');
  const [editSessionNumber, setEditSessionNumber] = useState(1);
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState('OPEN');
  const [editLateMinutes, setEditLateMinutes] = useState(30);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [selectedStudentForOverride, setSelectedStudentForOverride] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('SAKIT');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buffer Keyboard USB Scanner
  const lastScanTimestamp = useRef(0);
  const keyBuffer = useRef('');
  const keyTimer = useRef(null);

  // 1. Fetch Data Sesi
  const fetchSessionData = useCallback(async () => {
    if (!sessionId) return;
    const res = await attendanceApi.getSessionDetail(sessionId);
    if (res.success && res.data) {
      setSession(res.data.session);
      setAttendances(res.data.attendances || []);
      setSummary(res.data.summary || {});
    }
    setIsLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchSessionData();
    const interval = setInterval(fetchSessionData, 10000);
    return () => clearInterval(interval);
  }, [fetchSessionData]);

  // 2. Countdown Timer Keterlambatan Sesi
  useEffect(() => {
    if (!session || session.status !== 'OPEN') return;

    const updateTimer = () => {
      if (!session.late_cutoff_at) {
        setRemainingTime('Tanpa Batas');
        setIsCutoffPassed(false);
        return;
      }

      const now = new Date().getTime();
      const cutoffTime = new Date(session.late_cutoff_at).getTime();
      const diff = cutoffTime - now;

      if (diff <= 0) {
        setRemainingTime('00:00');
        setIsCutoffPassed(true);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setRemainingTime(
          `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        );
        setIsCutoffPassed(false);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [session]);

  // 3. Eksekusi Scan QR (Instant Feedback <150ms)
  const handleScan = useCallback(
    async (qrToken) => {
      const trimmedToken = qrToken.trim();
      if (!trimmedToken) return;

      const now = Date.now();
      if (now - lastScanTimestamp.current < 1000) {
        return;
      }
      lastScanTimestamp.current = now;

      try {
        const res = await attendanceApi.scanQRCode(sessionId, trimmedToken);

        if (res.success && res.data) {
          attendanceAudio.playSuccessBeep();
          setFeedbackState('success');
          setLastScanResult(res.data);
          setScannedStudentData(res.data);
          setIsScanSuccessModalOpen(true);
          setStatusMessage(
            `Presensi berhasil: ${res.data.full_name}, status ${res.data.status}`
          );

          if (scanSuccessTimerRef.current) clearTimeout(scanSuccessTimerRef.current);
          scanSuccessTimerRef.current = setTimeout(() => {
            setIsScanSuccessModalOpen(false);
          }, 3000);

          // Border hijau solid selama ±600ms sesuai Bagian 5
          setTimeout(() => {
            setFeedbackState('idle');
          }, 600);

          fetchSessionData();
        } else {
          attendanceAudio.playErrorBuzzer();
          setFeedbackState('error');
          setStatusMessage(res.error?.message || 'Presensi gagal diproses oleh server');

          setTimeout(() => {
            setFeedbackState('idle');
          }, 1500);
        }
      } catch (err) {
        attendanceAudio.playErrorBuzzer();
        setFeedbackState('error');
        setStatusMessage('Terjadi kesalahan memproses kartu QR');

        setTimeout(() => {
          setFeedbackState('idle');
        }, 600);
      }
    },
    [sessionId, fetchSessionData]
  );

  // 4. Keyboard Listener untuk USB Barcode Scanner (Global - Khusus Guru)
  useEffect(() => {
    if (isAdmin) return undefined;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        return;
      }

      if (e.key === 'Enter') {
        if (keyBuffer.current.length >= 4) {
          handleScan(keyBuffer.current);
        }
        keyBuffer.current = '';
        clearTimeout(keyTimer.current);
        return;
      }

      if (e.key.length === 1) {
        keyBuffer.current += e.key;
        clearTimeout(keyTimer.current);
        keyTimer.current = setTimeout(() => {
          keyBuffer.current = '';
        }, 150);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScan, isAdmin]);

  // 5. Tutup Sesi Kelas
  const handleConfirmCloseSession = async () => {
    setIsSubmitting(true);
    const res = await attendanceApi.closeSession(sessionId);
    setIsSubmitting(false);

    if (res.success) {
      setIsCloseModalOpen(false);
      fetchSessionData();
    } else {
      alert(res.error?.message || 'Gagal menutup sesi kelas');
    }
  };

  const handleOpenEditSessionModal = () => {
    if (!session) return;
    setEditTopic(session.topic || '');
    setEditSessionNumber(session.session_number || 1);
    setEditDate(String(session.date || '').slice(0, 10));
    setEditStatus(session.status || 'OPEN');
    setEditLateMinutes(attendanceApi.resolveSessionLateMinutes(session));
    setIsEditSessionModalOpen(true);
  };

  const handleSaveEditSession = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    const parsedLate = Math.max(0, Number(editLateMinutes) || 0);
    attendanceApi.setDefaultLateMinutes(parsedLate);
    const res = await attendanceApi.editSession(sessionId, {
      class_id: session?.class_id,
      topic: editTopic,
      session_number: Number(editSessionNumber) || 1,
      date: editDate,
      status: editStatus,
      late_threshold_minutes: parsedLate,
    });
    setIsSubmitting(false);
    if (res.success) {
      setIsEditSessionModalOpen(false);
      fetchSessionData();
    } else {
      alert(res.error?.message || 'Gagal memperbarui sesi kelas');
    }
  };

  const handleDeleteCurrentSession = async () => {
    if (
      !window.confirm(
        `Hapus sesi Kelas ${session?.class_name || ''} (${session?.topic || ''}) beserta seluruh data presensi di dalamnya?`
      )
    ) {
      return;
    }
    setIsSubmitting(true);
    const res = await attendanceApi.deleteSession(sessionId);
    setIsSubmitting(false);
    if (res.success) {
      router.push('/attendance');
    } else {
      alert(res.error?.message || 'Gagal menghapus sesi kelas');
    }
  };

  // 6. Manual Attendance Override
  const handleConfirmOverride = async () => {
    if (!selectedStudentForOverride) return;
    setIsSubmitting(true);
    const res = await attendanceApi.manualOverride(
      sessionId,
      selectedStudentForOverride.student_id,
      overrideStatus,
      overrideNotes
    );
    setIsSubmitting(false);

    if (res.success) {
      setIsOverrideModalOpen(false);
      setSelectedStudentForOverride(null);
      setOverrideNotes('');
      fetchSessionData();
    } else {
      alert(res.error?.message || 'Gagal mengubah status');
    }
  };

  // Quick 1-tap Sakit / Izin override when session is open
  const handleQuickStatusOverride = async (studentItem, nextStatus) => {
    if (!studentItem?.student_id) return;
    const defaultNote =
      nextStatus === 'SAKIT'
        ? 'Sakit (Diinput saat sesi kelas)'
        : nextStatus === 'IZIN'
        ? 'Izin (Diinput saat sesi kelas)'
        : '';
    const res = await attendanceApi.manualOverride(
      sessionId,
      studentItem.student_id,
      nextStatus,
      studentItem.notes || defaultNote
    );
    if (res.success) {
      fetchSessionData();
    } else {
      alert(res.error?.message || `Gagal mengubah status ke ${nextStatus}`);
    }
  };

  const filteredAttendances = attendances.filter((item) => {
    const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
    const matchSearch =
      !searchQuery ||
      item.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nisn?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-[#0F172A]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#64748B]">Memuat sesi presensi...</p>
        </div>
      </div>
    );
  }

  const isSessionOpen = session?.status === 'OPEN';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      {/* ===================== HEADER BAR ===================== */}
      <header className="bg-white border-b border-[#E2E8F0] px-3 sm:px-6 py-3.5 sticky top-0 z-20">
        <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/attendance')}
              className="px-2.5 py-1.5 rounded-[6px] border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F172A] cursor-pointer"
            >
              Kembali
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-xs font-semibold text-[#64748B]">SMP NEGERI 1 JABON</span>
                <span className="text-[#CBD5E1] hidden sm:inline">|</span>
                <h1 className="text-sm font-semibold text-[#0F172A]">
                  Kelas: {session?.class_name || '-'}
                </h1>
                <span className="text-[#CBD5E1] hidden sm:inline">|</span>
                <span className="text-xs text-[#64748B]">
                  Mapel: {session?.course_name || session?.topic || '-'}
                </span>
                <span className="text-[#CBD5E1] hidden sm:inline">|</span>
                <span className="text-xs text-[#64748B]">
                  Guru: {session?.teacher_name || '-'}
                </span>
                {(session?.schedule_day || session?.schedule_time) && (
                  <>
                    <span className="text-[#CBD5E1] hidden sm:inline">|</span>
                    <span className="text-xs text-[#64748B] tabular-nums">
                      Jadwal: {[session?.schedule_day, session?.schedule_time].filter(Boolean).join(' • ')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status, Countdown, & Tutup Kelas */}
          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 sm:gap-4">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-xs font-semibold border ${
                isSessionOpen
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
                  : 'bg-[#F1F5F9] border-[#CBD5E1] text-[#64748B]'
              }`}
            >
              {isSessionOpen ? 'Sesi Terbuka' : 'Sesi Ditutup'}
            </span>

            {isSessionOpen && (
              <button
                type="button"
                onClick={handleOpenEditSessionModal}
                title="Klik untuk mengatur batas waktu keterlambatan"
                role="timer"
                className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] px-3 py-1 rounded-[6px] cursor-pointer transition-colors"
              >
                <span className="text-xs text-[#64748B]">Sisa Waktu Hadir:</span>
                <span
                  className={`text-base font-bold tabular-nums ${
                    !session?.late_cutoff_at
                      ? 'text-[#047857]'
                      : isCutoffPassed
                      ? 'text-[#BE123C]'
                      : 'text-[#B45309]'
                  }`}
                >
                  {remainingTime}
                </span>
                <span className="text-[11px] text-[#94A3B8]">
                  {!session?.late_cutoff_at
                    ? '(Atur Batas)'
                    : isCutoffPassed
                    ? `(Lewat ${attendanceApi.resolveSessionLateMinutes(session)} menit)`
                    : `(dari ${attendanceApi.resolveSessionLateMinutes(session)} menit)`}
                </span>
              </button>
            )}

            {isSessionOpen && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsCloseModalOpen(true)}
              >
                Tutup Kelas
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenEditSessionModal}
            >
              Edit Sesi
            </Button>

            <button
              type="button"
              onClick={handleDeleteCurrentSession}
              className="px-2.5 py-1.5 rounded-[6px] border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 cursor-pointer"
            >
              Hapus Sesi
            </button>
          </div>
        </div>
      </header>

      {/* ===================== HERO MAIN LAYOUT ===================== */}
      <main className="flex-1 p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 max-w-[1680px] w-full mx-auto">
        {/* ================= LEFT (45%) — SCANNER (KHUSUS GURU, BUKAN ADMIN) ================= */}
        {!isAdmin && (
          <section className="lg:col-span-5 flex flex-col gap-5">
            {/* 1. Viewfinder Component */}
            <div className="bg-white border border-[#E2E8F0] p-4 rounded-[10px]">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-semibold text-[#0F172A]">Area Pemindai QR</h2>
                <span className="text-xs text-[#64748B]">Status: Menunggu Kartu QR</span>
              </div>

              <QRViewfinder
                onScan={handleScan}
                isScanning={isSessionOpen}
                feedbackState={feedbackState}
                statusMessage={statusMessage}
              />
            </div>

            {/* 2. Hasil Scan Terakhir (Jumbo Box - Keterbacaan Jarak 2 Meter) */}
            <div className="bg-white border border-[#E2E8F0] p-5 rounded-[10px] flex-1 flex flex-col justify-center min-h-[170px]">
              <p className="text-xs text-[#64748B] mb-2 font-medium">Hasil Scan Terakhir</p>

              {lastScanResult ? (
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px]">
                  {/* Avatar Siswa Solid */}
                  <div className="w-16 h-16 rounded-[6px] bg-[#2563EB] text-white font-bold text-xl flex items-center justify-center shrink-0">
                    {lastScanResult.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('') || 'SW'}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Nama Siswa: Besar untuk keterbacaan 2 meter */}
                    <h3 className="text-lg sm:text-[24px] font-bold text-[#0F172A] truncate leading-tight tracking-tight">
                      {lastScanResult.full_name}
                    </h3>
                    <p className="text-xs text-[#64748B] mt-1 tabular-nums">
                      NISN: {lastScanResult.nisn} | Kelas: {lastScanResult.class_name}
                    </p>

                    <div className="mt-2 flex items-center gap-3">
                      <AttendanceBadge status={lastScanResult.status} size="lg" />
                      <span className="text-xs text-[#64748B] tabular-nums">
                        Pukul: {lastScanResult.scan_time} WIB
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-[#CBD5E1] rounded-[6px] p-6 text-center text-[#64748B] text-xs">
                  0 Siswa Hadir. Minta siswa scan kartu.
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================= ROSTER KELAS ================= */}
        <section className={`${isAdmin ? 'lg:col-span-12' : 'lg:col-span-7'} flex flex-col gap-4`}>
          {/* Ringkasan Kehadiran Roster */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
            <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-[6px] text-center">
              <p className="text-[11px] text-[#64748B]">Total</p>
              <p className="text-lg font-bold text-[#0F172A] tabular-nums">
                {summary.total_students || 0}
              </p>
            </div>
            <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-2.5 rounded-[6px] text-center">
              <p className="text-[11px] text-[#047857]">Hadir</p>
              <p className="text-lg font-bold text-[#047857] tabular-nums">
                {summary.total_hadir || 0}
              </p>
            </div>
            <div className="bg-[#FFFBEB] border border-[#FDE68A] p-2.5 rounded-[6px] text-center">
              <p className="text-[11px] text-[#B45309]">Terlambat</p>
              <p className="text-lg font-bold text-[#B45309] tabular-nums">
                {summary.total_late || 0}
              </p>
            </div>
            <div className="bg-[#F0F9FF] border border-[#BAE6FD] p-2.5 rounded-[6px] text-center">
              <p className="text-[11px] text-[#0369A1]">Sakit/Izin</p>
              <p className="text-lg font-bold text-[#0369A1] tabular-nums">
                {(summary.total_sakit || 0) + (summary.total_izin || 0)}
              </p>
            </div>
            <div className="bg-[#FFF1F2] border border-[#FECDD3] p-2.5 rounded-[6px] text-center">
              <p className="text-[11px] text-[#BE123C]">Alpha</p>
              <p className="text-lg font-bold text-[#BE123C] tabular-nums">
                {summary.total_alpha || 0}
              </p>
            </div>
            <div className="bg-[#F1F5F9] border border-[#CBD5E1] p-2.5 rounded-[6px] text-center">
              <p className="text-[11px] text-[#64748B]">Belum Scan</p>
              <p className="text-lg font-bold text-[#64748B] tabular-nums">
                {summary.total_pending || 0}
              </p>
            </div>
          </div>

          {/* Roster Container */}
          <div className="bg-white border border-[#E2E8F0] rounded-[10px] flex-1 flex flex-col overflow-hidden">
            {/* Filter & Search Bar */}
            <div className="p-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2.5 bg-[#F8FAFC]">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'HADIR', 'TERLAMBAT', 'SAKIT', 'IZIN', 'PENDING', 'ALPHA'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-[6px] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      filterStatus === st
                        ? 'bg-[#2563EB] text-white font-semibold'
                        : 'bg-white border border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {st === 'ALL'
                      ? 'Semua'
                      : st === 'PENDING'
                      ? 'Belum Scan'
                      : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-60">
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Cari Siswa / NISN
                </label>
                <input
                  type="text"
                  placeholder="Cari siswa atau NISN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>
            </div>

            {/* List Tabel Kehadiran Roster */}
            <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-[#E2E8F0]">
              {filteredAttendances.length > 0 ? (
                filteredAttendances.map((item, index) => (
                  <div
                    key={item.id || item.student_id || index}
                    className="p-3 px-3 sm:px-4 hover:bg-[#F8FAFC] flex items-start justify-between gap-2 sm:gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-[#64748B] tabular-nums w-5">
                        {index + 1}.
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A] truncate">
                          {item.student_name || 'Nama Siswa'}
                        </p>
                        <p className="text-xs text-[#64748B] tabular-nums">
                          NISN: {item.nisn || '-'}
                          {item.notes && (
                            <span className="text-[#0369A1] ml-1">
                              ({item.notes})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <AttendanceBadge status={item.status} size="sm" />

                      {item.timestamp && (
                        <span className="text-xs text-[#64748B] tabular-nums hidden sm:inline">
                          {new Date(item.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}

                      {/* Tombol Manual Attendance Override (Sakit / Izin / Ubah) */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickStatusOverride(item, 'SAKIT')}
                          className={`px-2 py-1 rounded-[6px] border text-xs font-semibold cursor-pointer transition-colors ${
                            item.status === 'SAKIT'
                              ? 'bg-[#0284C7] border-[#0284C7] text-white'
                              : 'bg-[#F0F9FF] border-[#BAE6FD] text-[#0369A1] hover:bg-[#E0F2FE]'
                          }`}
                        >
                          Sakit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStatusOverride(item, 'IZIN')}
                          className={`px-2 py-1 rounded-[6px] border text-xs font-semibold cursor-pointer transition-colors ${
                            item.status === 'IZIN'
                              ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
                              : 'bg-[#EEF2FF] border-[#C7D2FE] text-[#4338CA] hover:bg-[#E0E7FF]'
                          }`}
                        >
                          Izin
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentForOverride(item);
                            setOverrideStatus(
                              item.status === 'PENDING' ? 'SAKIT' : item.status
                            );
                            setOverrideNotes(item.notes || '');
                            setIsOverrideModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-[6px] border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F172A] cursor-pointer"
                        >
                          Ubah
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-[#64748B] text-xs">
                  Tidak ada data siswa yang cocok dengan filter.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ===================== MODAL EDIT SESI KELAS ===================== */}
      <Modal
        isOpen={isEditSessionModalOpen}
        onClose={() => setIsEditSessionModalOpen(false)}
        title={`Edit Sesi Kelas ${session?.class_name || ''}`}
        footerActions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditSessionModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSubmitting}
              onClick={handleSaveEditSession}
            >
              Simpan Perubahan
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveEditSession} className="space-y-3 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Topik / Materi Pembelajaran
            </label>
            <input
              type="text"
              value={editTopic}
              onChange={(e) => setEditTopic(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Pertemuan Ke-
              </label>
              <input
                type="number"
                min="1"
                max="36"
                value={editSessionNumber}
                onChange={(e) => setEditSessionNumber(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] tabular-nums"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Tanggal Sesi
              </label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] tabular-nums"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0F172A]">
              Batas Waktu Keterlambatan (Menit)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setEditLateMinutes(preset.value)}
                  className={`px-2 py-1 rounded-[6px] text-[11px] font-semibold border cursor-pointer ${
                    Number(editLateMinutes) === preset.value
                      ? 'bg-[#2563EB] border-[#2563EB] text-white'
                      : 'bg-white border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="240"
                value={editLateMinutes}
                onChange={(e) => setEditLateMinutes(Math.max(0, Number(e.target.value) || 0))}
                className="w-24 bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs font-semibold text-[#0F172A] tabular-nums"
              />
              <span className="text-[11px] text-[#64748B]">
                menit (isi <strong>0</strong> untuk Tanpa Batas Terlambat)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Status Sesi Kelas
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A]"
            >
              <option value="OPEN">OPEN (Sesi Terbuka / Aktifkan Kembali)</option>
              <option value="CLOSED">CLOSED (Sesi Ditutup)</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* ===================== MODAL TUTUP SESI KELAS ===================== */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="Konfirmasi Tutup Kelas"
        footerActions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCloseModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isSubmitting}
              onClick={handleConfirmCloseSession}
            >
              Tutup Kelas
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-[#0F172A]">
            Apakah Anda yakin ingin menutup sesi kelas ini? Tindakan ini bersifat permanen.
            Siswa yang masih berstatus <strong>Belum Scan</strong> akan otomatis ditandai sebagai{' '}
            <strong className="text-[#BE123C]">Alpha</strong>.
          </p>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-[6px] text-xs space-y-1.5 tabular-nums">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Total Hadir:</span>
              <span className="font-semibold text-[#047857]">
                {summary.total_hadir || 0} Siswa
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Terlambat:</span>
              <span className="font-semibold text-[#B45309]">
                {summary.total_late || 0} Siswa
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Akan Menjadi Alpha:</span>
              <span className="font-semibold text-[#BE123C]">
                {summary.total_pending || 0} Siswa
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* ===================== SCR-07 MODAL MANUAL ATTENDANCE OVERRIDE ===================== */}
      <Modal
        isOpen={isOverrideModalOpen && Boolean(selectedStudentForOverride)}
        onClose={() => setIsOverrideModalOpen(false)}
        title="Ubah Status Kehadiran Manual"
        footerActions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsOverrideModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSubmitting}
              onClick={handleConfirmOverride}
            >
              Simpan Perubahan
            </Button>
          </>
        }
      >
        {selectedStudentForOverride && (
          <div className="space-y-4">
            <div className="bg-[#F8FAFC] p-3 rounded-[6px] border border-[#E2E8F0] text-xs">
              <p className="font-semibold text-[#0F172A]">
                {selectedStudentForOverride.student_name}
              </p>
              <p className="text-[#64748B] tabular-nums">
                NISN: {selectedStudentForOverride.nisn}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Pilih Status Kehadiran
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {['HADIR', 'TERLAMBAT', 'SAKIT', 'IZIN', 'ALPHA'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOverrideStatus(st)}
                    className={`py-2 px-2.5 rounded-[6px] border text-xs font-medium transition-colors cursor-pointer text-center ${
                      overrideStatus === st
                        ? 'bg-[#2563EB] border-[#2563EB] text-white font-semibold'
                        : 'bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Keterangan / Alasan
              </label>
              <input
                type="text"
                placeholder="Contoh: Surat dokter nomor 12/SKD/IX/2026"
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ===================== POP UP HASIL SCAN BARCODE SISWA ===================== */}
      <Modal
        isOpen={isScanSuccessModalOpen}
        onClose={() => {
          if (scanSuccessTimerRef.current) clearTimeout(scanSuccessTimerRef.current);
          setIsScanSuccessModalOpen(false);
        }}
        title="Hasil Pemindaian Kartu"
        maxWidth="max-w-sm"
        footerActions={
          <button
            type="button"
            onClick={() => {
              if (scanSuccessTimerRef.current) clearTimeout(scanSuccessTimerRef.current);
              setIsScanSuccessModalOpen(false);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Lanjut Scan Siswa Berikutnya →</span>
          </button>
        }
      >
        {scannedStudentData && (
          <div className="text-center py-2 space-y-3.5">
            {/* Animated Success Check Icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#DCFCE7] border-2 border-[#BBF7D0] text-[#15803D] flex items-center justify-center shadow-xs">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="space-y-1">
              <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                ✓ BARCODE BERHASIL TERDETEKSI
              </span>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                {scannedStudentData.full_name || scannedStudentData.student_name}
              </h3>
              <p className="text-xs text-slate-500 tabular-nums">
                NISN: {scannedStudentData.nisn} • Kelas {scannedStudentData.class_name || session?.class_name}
              </p>
            </div>

            {/* Detail Box */}
            <div className="bg-slate-50 border border-slate-200/90 p-3.5 rounded-xl flex items-center justify-between text-xs">
              <div className="text-left">
                <span className="text-[11px] text-slate-500 block">Status Presensi</span>
                <span className={`font-bold ${scannedStudentData.status === 'TERLAMBAT' ? 'text-[#CA8A04]' : 'text-[#15803D]'}`}>
                  {scannedStudentData.status === 'TERLAMBAT' ? 'Terlambat' : 'Hadir Tepat Waktu'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Waktu Tercatat</span>
                <span className="font-semibold text-slate-800 tabular-nums">
                  {scannedStudentData.scan_time || 'Baru Saja'}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400">
              Pop-up otomatis tertutup dalam 3 detik atau klik tombol di atas
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
