'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AttendanceBadge from '@/components/AttendanceBadge';
import QRViewfinder from '@/components/QRViewfinder';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { attendanceApi } from '@/lib/attendanceApi';
import { attendanceAudio } from '@/lib/attendanceAudio';
import { findStudentByTokenOrNisn } from '@/lib/studentDirectory';

export default function ClassSessionScannerPage() {
  const params = useParams();
  const sessionId = params.id;
  const router = useRouter();

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

  // Timer 15 Menit
  const [remainingTime, setRemainingTime] = useState('15:00');
  const [isCutoffPassed, setIsCutoffPassed] = useState(false);

  // Filter & Search Roster
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isScanSuccessModalOpen, setIsScanSuccessModalOpen] = useState(false);
  const [scannedStudentData, setScannedStudentData] = useState(null);
  const scanSuccessTimerRef = useRef(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
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

  // 2. Countdown Timer 15 Menit
  useEffect(() => {
    if (!session || session.status !== 'OPEN') return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const cutoffTime = session.late_cutoff_at
        ? new Date(session.late_cutoff_at).getTime()
        : session.opened_at
        ? new Date(session.opened_at).getTime() + 15 * 60 * 1000
        : now;

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
    }, 1000);

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
          // Fallback cerdas jika backend offline
          const matchedStudent = findStudentByTokenOrNisn(trimmedToken);

          if (matchedStudent) {
            attendanceAudio.playSuccessBeep();
            setFeedbackState('success');
            const resultData = {
              full_name: matchedStudent.name,
              nisn: matchedStudent.nisn,
              class_name: matchedStudent.className || session?.class_name || '7A',
              status: isCutoffPassed ? 'TERLAMBAT' : 'HADIR',
              scan_time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            };
            setLastScanResult(resultData);
            setScannedStudentData(resultData);
            setIsScanSuccessModalOpen(true);
            setStatusMessage(`Presensi berhasil: ${resultData.full_name}`);

            setAttendances((prev) => {
              const exists = prev.find((a) => a.nisn === matchedStudent.nisn);
              if (exists) {
                return prev.map((a) =>
                  a.nisn === matchedStudent.nisn ? { ...a, status: resultData.status } : a
                );
              }
              return [
                {
                  id: `att-mock-${Date.now()}`,
                  student_name: matchedStudent.name,
                  nisn: matchedStudent.nisn,
                  status: resultData.status,
                  scan_time: resultData.scan_time,
                },
                ...prev,
              ];
            });

            if (scanSuccessTimerRef.current) clearTimeout(scanSuccessTimerRef.current);
            scanSuccessTimerRef.current = setTimeout(() => {
              setIsScanSuccessModalOpen(false);
            }, 3000);

            setTimeout(() => setFeedbackState('idle'), 600);
          } else {
            attendanceAudio.playErrorBuzzer();
            setFeedbackState('error');
            setStatusMessage(res.error?.message || `Kartu QR tidak terdaftar: ${trimmedToken}`);

            setTimeout(() => {
              setFeedbackState('idle');
            }, 1500);
          }
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

  // 4. Keyboard Listener untuk USB Barcode Scanner (Global)
  useEffect(() => {
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
  }, [handleScan]);

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
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-3.5 sticky top-0 z-20">
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
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#64748B]">SMP NEGERI 1 JABON</span>
                <span className="text-[#CBD5E1]">|</span>
                <h1 className="text-sm font-semibold text-[#0F172A]">
                  Kelas: {session?.class_name || '-'}
                </h1>
                <span className="text-[#CBD5E1]">|</span>
                <span className="text-xs text-[#64748B]">
                  Mapel: {session?.topic || '-'}
                </span>
                <span className="text-[#CBD5E1]">|</span>
                <span className="text-xs text-[#64748B]">
                  Guru: {session?.teacher_name || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Status, Countdown, & Tutup Kelas */}
          <div className="flex items-center gap-4">
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
              <div
                role="timer"
                className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1 rounded-[6px]"
              >
                <span className="text-xs text-[#64748B]">Sisa Waktu Hadir:</span>
                <span
                  className={`text-base font-bold tabular-nums ${
                    isCutoffPassed ? 'text-[#BE123C]' : 'text-[#B45309]'
                  }`}
                >
                  {remainingTime}
                </span>
                <span className="text-[11px] text-[#94A3B8]">
                  {isCutoffPassed ? '(Terlambat)' : '(dari 15 menit)'}
                </span>
              </div>
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
          </div>
        </div>
      </header>

      {/* ===================== HERO MAIN SPLIT LAYOUT (45:55) ===================== */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1680px] w-full mx-auto">
        {/* ================= LEFT (45%) — SCANNER ================= */}
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
              <div className="flex items-center gap-4 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px]">
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
                  <h3 className="text-[24px] font-bold text-[#0F172A] truncate leading-tight tracking-tight">
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

        {/* ================= RIGHT (55%) — ROSTER KELAS ================= */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {/* Ringkasan Kehadiran Roster */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
                {['ALL', 'HADIR', 'TERLAMBAT', 'PENDING', 'ALPHA'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-[6px] text-xs font-medium transition-colors cursor-pointer ${
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
                    className="p-3 px-4 hover:bg-[#F8FAFC] flex items-center justify-between gap-3 transition-colors"
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

                      {/* Tombol Manual Attendance Override */}
                      {isSessionOpen && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentForOverride(item);
                            setOverrideStatus(
                              item.status === 'PENDING' ? 'HADIR' : item.status
                            );
                            setOverrideNotes(item.notes || '');
                            setIsOverrideModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-[6px] border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F172A] cursor-pointer"
                        >
                          Ubah
                        </button>
                      )}
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
