'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import AttendanceBadge from '@/components/AttendanceBadge';
import QRViewfinder from '@/components/QRViewfinder';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { attendanceApi } from '@/lib/attendanceApi';
import { attendanceAudio } from '@/lib/attendanceAudio';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';

function classScheduleTime(item) {
  if (item.schedule_start_time || item.schedule_end_time) {
    return [item.schedule_start_time, item.schedule_end_time].filter(Boolean).join(' - ');
  }
  return item.schedule_time || 'Jam belum ditentukan';
}

export default function GuruMobilePortal({ user, onLogout }) {
  // Navigation Tabs: 'beranda' | 'scan' | 'absensi'
  const [activeTab, setActiveTab] = useState('beranda');

  // Sesi Data
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
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

  // Timer 15 Menit
  const [remainingTime, setRemainingTime] = useState('15:00');
  const [isCutoffPassed, setIsCutoffPassed] = useState(false);

  // Scan Feedback
  const [lastScanResult, setLastScanResult] = useState(null);
  const [feedbackState, setFeedbackState] = useState('idle'); // 'idle' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const lastScanTimestamp = useRef(0);
  const keyBuffer = useRef('');
  const keyTimer = useRef(null);

  // Modals
  const [isScanSuccessModalOpen, setIsScanSuccessModalOpen] = useState(false);
  const [scannedStudentData, setScannedStudentData] = useState(null);
  const scanSuccessTimerRef = useRef(null);
  const [isOpenClassModalOpen, setIsOpenClassModalOpen] = useState(false);
  const [isCloseClassModalOpen, setIsCloseClassModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [selectedStudentForOverride, setSelectedStudentForOverride] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('SAKIT');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Buka Kelas
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [newClassId, setNewClassId] = useState('');
  const [newSessionNumber, setNewSessionNumber] = useState(1);
  const [newTopic, setNewTopic] = useState('');

  // Filter & Search Absensi
  const [searchRoster, setSearchRoster] = useState('');
  const [filterRosterStatus, setFilterRosterStatus] = useState('ALL');

  const fetchAssignedClasses = useCallback(async () => {
    let rawList = [];
    if (user?.id) {
      rawList = await classApiAdapter.getAll({ dosenId: user.id });
    }
    if (!Array.isArray(rawList) || rawList.length === 0) {
      rawList = await classApiAdapter.getAll();
    }
    const list = Array.isArray(rawList) ? rawList : [];
    const hasScheduledSibling = new Set(
      list
        .filter((c) => c.schedule_day || c.schedule_time || c.schedule_start_time)
        .map((c) => `${c.course_id || ''}__${(c.class_code || '').toUpperCase()}`)
    );
    const cleanedList = list.filter((c) => {
      const isScheduled = Boolean(c.schedule_day || c.schedule_time || c.schedule_start_time);
      if (isScheduled) return true;
      const key = `${c.course_id || ''}__${(c.class_code || '').toUpperCase()}`;
      return !hasScheduledSibling.has(key);
    });
    setAssignedClasses(cleanedList);
    setNewClassId((current) => current || cleanedList[0]?.id || '');
  }, [user?.id]);

  useEffect(() => {
    fetchAssignedClasses().catch(() => setAssignedClasses([]));
  }, [fetchAssignedClasses]);

  // 1. Fetch Daftar Sesi
  const fetchSessionsList = useCallback(async () => {
    const res = await attendanceApi.getSessions({ teacher_id: user?.id || '' });
    const sessionList = res.success && Array.isArray(res.data) ? res.data : [];

    setSessions(sessionList);

    const openSess = sessionList.find((s) => s.status === 'OPEN');
    if (openSess) {
      setActiveSession(openSess);
      if (!selectedSessionId) {
        setSelectedSessionId(openSess.id);
      }
    } else if (sessionList.length > 0) {
      setActiveSession(null);
      setSelectedSessionId((current) => (
        current && sessionList.some((session) => session.id === current)
          ? current
          : sessionList[0].id
      ));
    } else {
      setActiveSession(null);
      setSelectedSessionId(null);
      setSessionDetail(null);
      setAttendances([]);
      setSummary({
        total_students: 0,
        total_hadir: 0,
        total_late: 0,
        total_sakit: 0,
        total_izin: 0,
        total_alpha: 0,
        total_pending: 0,
      });
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSessionsList();
  }, [fetchSessionsList]);

  // 2. Fetch Detail Sesi Terpilih (Roster & Summary)
  const fetchSelectedSessionDetail = useCallback(async (sessId) => {
    if (!sessId) {
      setSessionDetail(null);
      setAttendances([]);
      return;
    }
    const res = await attendanceApi.getSessionDetail(sessId);
    if (res.success && res.data) {
      setSessionDetail(res.data.session);
      setAttendances(res.data.attendances || []);
      setSummary(res.data.summary || {});
    } else {
      setSessionDetail(null);
      setAttendances([]);
      setSummary({
        total_students: 0,
        total_hadir: 0,
        total_late: 0,
        total_sakit: 0,
        total_izin: 0,
        total_alpha: 0,
        total_pending: 0,
      });
    }
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSelectedSessionDetail(selectedSessionId);
    }
  }, [selectedSessionId, fetchSelectedSessionDetail]);

  // 3. Countdown Timer 15 Menit Sesi Aktif
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'OPEN') return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const cutoffTime = activeSession.late_cutoff_at
        ? new Date(activeSession.late_cutoff_at).getTime()
        : activeSession.opened_at
        ? new Date(activeSession.opened_at).getTime() + 15 * 60 * 1000
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
  }, [activeSession]);

  // 4. Scan Handler
  const handleScan = useCallback(
    async (qrToken) => {
      const trimmedToken = qrToken.trim();
      if (!trimmedToken) return;

      const now = Date.now();
      if (now - lastScanTimestamp.current < 1000) return;
      lastScanTimestamp.current = now;

      const currentSessId = activeSession?.id || selectedSessionId;
      if (!currentSessId) {
        alert('Buka sesi kelas terlebih dahulu sebelum memindai kartu QR!');
        return;
      }

      try {
        const res = await attendanceApi.scanQRCode(currentSessId, trimmedToken);

        if (res.success && res.data) {
          attendanceAudio.playSuccessBeep();
          setFeedbackState('success');
          setLastScanResult(res.data);
          setScannedStudentData(res.data);
          setIsScanSuccessModalOpen(true);
          setStatusMessage(`Hadir: ${res.data.full_name}`);

          if (scanSuccessTimerRef.current) clearTimeout(scanSuccessTimerRef.current);
          scanSuccessTimerRef.current = setTimeout(() => {
            setIsScanSuccessModalOpen(false);
          }, 3000);

          setTimeout(() => setFeedbackState('idle'), 600);
          fetchSelectedSessionDetail(currentSessId);
        } else {
          attendanceAudio.playErrorBuzzer();
          setFeedbackState('error');
          setStatusMessage(res.error?.message || 'Presensi gagal diproses oleh server');
          setTimeout(() => setFeedbackState('idle'), 1500);
        }
      } catch (err) {
        attendanceAudio.playErrorBuzzer();
        setFeedbackState('error');
        setStatusMessage('Gagal membaca kartu QR');
        setTimeout(() => setFeedbackState('idle'), 600);
      }
    },
    [activeSession, selectedSessionId, fetchSelectedSessionDetail]
  );

  // 5. Global Keyboard Listener untuk Scanner USB
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

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

  // 6. Buka Kelas Baru
  const handleOpenClassSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const cls = assignedClasses.find((c) => c.id === newClassId);
    if (!cls) {
      setIsSubmitting(false);
      return;
    }
    const res = await attendanceApi.openSession(
      newClassId,
      newTopic || cls.course_name || cls.course_code || 'Materi Pembelajaran',
      newSessionNumber,
      user?.id
    );
    setIsSubmitting(false);

    if (res.success && res.data) {
      setIsOpenClassModalOpen(false);
      setSelectedSessionId(res.data.id || res.data.session_id);
      await fetchSessionsList();
      setActiveTab('scan');
    } else {
      setStatusMessage(res.error?.message || res.message || 'Kelas belum dapat dibuka. Silakan coba lagi.');
    }
  };

  // 7. Tutup Kelas
  const handleCloseClassSubmit = async () => {
    if (!activeSession) return;
    setIsSubmitting(true);
    await attendanceApi.closeSession(activeSession.id, user?.id);
    setIsSubmitting(false);

    setIsCloseClassModalOpen(false);
    setActiveSession(null);
    fetchSessionsList();
    if (selectedSessionId) {
      fetchSelectedSessionDetail(selectedSessionId);
    }
  };

  // 8. Edit Kehadiran Manual (Override & Quick Sakit/Izin)
  const handleQuickStatusChange = async (student, targetStatus) => {
    const targetSessId = activeSession?.id || selectedSessionId;
    if (!student || !targetSessId) return;
    setIsSubmitting(true);
    const res = await attendanceApi.manualOverride(
      targetSessId,
      student.student_id,
      targetStatus,
      student.notes || ''
    );
    setIsSubmitting(false);

    if (res.success !== false) {
      await fetchSelectedSessionDetail(targetSessId);
      await fetchSessionsList();
    } else {
      alert(res.error?.message || res.message || 'Gagal memperbarui status kehadiran siswa');
    }
  };

  const handleSaveOverride = async () => {
    const targetSessId = selectedSessionId || activeSession?.id;
    if (!selectedStudentForOverride || !targetSessId) return;
    setIsSubmitting(true);
    const res = await attendanceApi.manualOverride(
      targetSessId,
      selectedStudentForOverride.student_id,
      overrideStatus,
      overrideNotes
    );
    setIsSubmitting(false);

    if (res.success !== false) {
      await fetchSelectedSessionDetail(targetSessId);
      await fetchSessionsList();
      setIsOverrideModalOpen(false);
      setSelectedStudentForOverride(null);
    } else {
      alert(res.error?.message || res.message || 'Gagal menyimpan perubahan kehadiran');
    }
  };

  // Filter roster list
  const filteredRoster = attendances.filter((st) => {
    const matchStatus = filterRosterStatus === 'ALL' || st.status === filterRosterStatus;
    const matchSearch =
      !searchRoster ||
      st.student_name?.toLowerCase().includes(searchRoster.toLowerCase()) ||
      st.nisn?.includes(searchRoster);
    return matchStatus && matchSearch;
  });

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col relative pb-20 select-none">
      {/* ===================== TOP HEADER MOBILE ===================== */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 shadow-xs shrink-0 flex items-center justify-center">
            <Image
              src="/image/logo-jabon.png"
              alt="Logo SMPN 1 Jabon"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
          <div>
            <span className="text-[10px] font-bold text-blue-600 block uppercase tracking-wider">SMP Negeri 1 Jabon</span>
            <h1 className="text-xs font-bold text-[#0F172A] leading-tight truncate max-w-[160px]">
              {user?.fullName || user?.name || 'Guru'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeSession ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] font-semibold text-[#047857]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
              Kelas {activeSession.class_name} Buka
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#F1F5F9] border border-[#CBD5E1] text-[11px] text-[#64748B]">
              Belum Ada Kelas
            </span>
          )}

          <button
            type="button"
            onClick={onLogout}
            title="Keluar"
            className="w-7 h-7 rounded-[6px] border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] flex items-center justify-center text-xs text-[#BE123C] cursor-pointer"
          >
            ✕
          </button>
        </div>
      </header>

      {/* ===================== TAB CONTENT AREA ===================== */}
      <main className="flex-1 p-4 space-y-4">
        {/* ================= 1. TAB: BERANDA ================= */}
        {activeTab === 'beranda' && (
          <div className="space-y-4">
            {/* Status Sesi Aktif Banner */}
            {activeSession ? (
              <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-[10px] p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-[4px] bg-white border border-[#A7F3D0] text-[11px] font-bold text-[#047857]">
                      Sesi Kelas Sedang Terbuka
                    </span>
                    <h2 className="text-base font-bold text-[#047857] mt-1.5">
                      Kelas {activeSession.class_name} — Sesi #{activeSession.session_number}
                    </h2>
                    <p className="text-xs text-[#065F46] mt-0.5">{activeSession.topic}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[#065F46] block">Sisa Hadir</span>
                    <span
                      className={`text-lg font-bold tabular-nums ${
                        isCutoffPassed ? 'text-[#BE123C]' : 'text-[#B45309]'
                      }`}
                    >
                      {remainingTime}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setActiveTab('scan')}
                  >
                    Buka Scanner
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedSessionId(activeSession.id);
                      setActiveTab('absensi');
                    }}
                  >
                    Kelola Absensi
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#E2E8F0] rounded-[10px] p-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[#0F172A]">
                    Belum Ada Kelas Yang Dibuka
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Buka sesi presensi sebelum memulai jam pelajaran.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsOpenClassModalOpen(true)}
                >
                  Buka Kelas
                </Button>
              </div>
            )}

            {/* Statistik Presensi Siswa Hari Ini */}
            <div>
              <h3 className="text-xs font-semibold text-[#0F172A] mb-2">
                Ringkasan Kehadiran Hari Ini
              </h3>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-[6px] text-center">
                  <span className="text-[11px] text-[#64748B] block">Hadir</span>
                  <span className="text-base font-bold text-[#047857] tabular-nums">
                    {activeSession ? (summary.total_hadir ?? 0) : 0}
                  </span>
                </div>
                <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-[6px] text-center">
                  <span className="text-[11px] text-[#64748B] block">Terlambat</span>
                  <span className="text-base font-bold text-[#B45309] tabular-nums">
                    {activeSession ? (summary.total_late ?? 0) : 0}
                  </span>
                </div>
                <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-[6px] text-center">
                  <span className="text-[11px] text-[#64748B] block">Sakit/Izin</span>
                  <span className="text-base font-bold text-[#0369A1] tabular-nums">
                    {activeSession
                      ? (summary.total_sakit ?? 0) + (summary.total_izin ?? 0)
                      : 0}
                  </span>
                </div>
                <div className="bg-white border border-[#E2E8F0] p-2.5 rounded-[6px] text-center">
                  <span className="text-[11px] text-[#64748B] block">Alpha</span>
                  <span className="text-base font-bold text-[#BE123C] tabular-nums">
                    {activeSession ? (summary.total_alpha ?? 0) : 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Jadwal Mengajar Guru (Sesuai Pemetaan Jadwal) */}
            <div className="bg-white border border-[#E2E8F0] rounded-[10px] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <h3 className="text-xs font-semibold text-[#0F172A]">
                  Jadwal Mengajar Terpetakan
                </h3>
                <span className="text-[11px] text-[#64748B]">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {assignedClasses.map((c) => {
                  const isCurrentActive =
                    activeSession?.class_id === c.id || activeSession?.class_name === c.class_code;
                  const todayName = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
                  const isToday = Boolean(c.schedule_day && c.schedule_day === todayName);

                  return (
                    <div
                      key={c.id}
                      className={`p-2.5 rounded-[6px] border flex items-center justify-between gap-2 ${
                        isToday ? 'bg-blue-50/50 border-blue-200' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[#0F172A]">
                            Kelas {c.class_code} ({c.course_name || c.course_code || 'Mata Pelajaran'})
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Hari Ini
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#64748B] tabular-nums mt-0.5">
                          {c.schedule_day ? `${c.schedule_day}, ` : ''}{classScheduleTime(c)}{c.room ? ` · Ruang ${c.room}` : ''}
                        </p>
                      </div>

                      <Button
                        variant={isCurrentActive ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => {
                          if (isCurrentActive && activeSession) {
                            setActiveTab('scan');
                            return;
                          }
                          const existingCount = sessions.filter((s) => s.class_id === c.id).length;
                          setNewClassId(c.id);
                          setNewSessionNumber(existingCount + 1);
                          setNewTopic(`${c.course_name || c.course_code || 'Materi Pembelajaran'} — Pertemuan #${existingCount + 1}`);
                          setIsOpenClassModalOpen(true);
                        }}
                      >
                        {isCurrentActive ? 'Sedang Dibuka' : 'Buka'}
                      </Button>
                    </div>
                  );
                })}
                {!assignedClasses.length && (
                  <p className="rounded-lg border border-dashed border-[#CBD5E1] p-3 text-[#64748B]">
                    Belum ada jadwal kelas yang dipetakan untuk akun guru ini.
                  </p>
                )}
              </div>
            </div>

            {/* Petunjuk Toleransi 15 Menit */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-[6px] text-xs text-[#64748B] space-y-1">
              <span className="font-semibold text-[#0F172A] block">Ketentuan Presensi:</span>
              <p>
                1. Siswa yang memindai QR dalam 15 menit pertama tercatat sebagai <strong>Hadir</strong>.
              </p>
              <p>
                2. Setelah 15 menit, siswa tercatat sebagai <strong>Terlambat</strong>.
              </p>
              <p>
                3. Saat kelas ditutup, siswa yang belum memindai otomatis menjadi <strong>Alpha</strong>.
              </p>
            </div>
          </div>
        )}

        {/* ================= 2. TAB: SCAN ================= */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            {/* Header Mini Info */}
            <div className="flex items-center justify-between bg-white border border-[#E2E8F0] p-2.5 rounded-[6px] text-xs">
              <div>
                <span className="text-[#64748B]">Kelas Aktif:</span>{' '}
                <strong className="text-[#0F172A]">
                  {activeSession ? `Kelas ${activeSession.class_name}` : 'Belum Ada Sesi'}
                </strong>
              </div>

              {activeSession ? (
                <div className="text-right tabular-nums">
                  <span className="text-[#64748B]">Sisa Waktu: </span>
                  <strong className={isCutoffPassed ? 'text-[#BE123C]' : 'text-[#B45309]'}>
                    {remainingTime}
                  </strong>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsOpenClassModalOpen(true)}
                >
                  + Buka Kelas
                </Button>
              )}
            </div>

            {/* Viewfinder Komponen */}
            <div className="bg-white border border-[#E2E8F0] p-3.5 rounded-[10px]">
              <QRViewfinder
                onScan={handleScan}
                isScanning={Boolean(activeSession)}
                feedbackState={feedbackState}
                statusMessage={statusMessage}
              />
            </div>

            {/* Kotak Hasil Scan Terakhir (Keterbacaan Jarak 2 Meter) */}
            <div className="bg-white border border-[#E2E8F0] p-4 rounded-[10px]">
              <span className="text-[11px] text-[#64748B] block mb-2 font-medium">
                Hasil Scan Terakhir
              </span>

              {lastScanResult ? (
                <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[6px]">
                  <div className="w-14 h-14 rounded-[6px] bg-[#2563EB] text-white font-bold text-lg flex items-center justify-center shrink-0">
                    {lastScanResult.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('') || 'SW'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-[#0F172A] truncate leading-tight">
                      {lastScanResult.full_name}
                    </h4>
                    <p className="text-xs text-[#64748B] tabular-nums mt-0.5">
                      NISN: {lastScanResult.nisn} | {lastScanResult.class_name}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <AttendanceBadge status={lastScanResult.status} size="sm" />
                      <span className="text-[11px] text-[#64748B] tabular-nums">
                        Pukul {lastScanResult.scan_time} WIB
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-[#CBD5E1] rounded-[6px] p-6 text-center text-xs text-[#64748B]">
                  Belum ada siswa memindai pada sesi ini. Arahkan kartu QR siswa ke kamera atau scanner USB.
                </div>
              )}
            </div>

            {/* Daftar Siswa Cepat untuk Set Sakit / Izin saat Sesi Kelas Dibuka */}
            {activeSession && (
              <div className="bg-white border border-[#E2E8F0] rounded-[10px] overflow-hidden">
                <div className="p-3 bg-[#F8FAFC] border-b border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#0F172A]">
                      Edit Cepat Siswa Sakit / Izin (Kelas {activeSession.class_name})
                    </span>
                    <span className="text-[11px] text-[#64748B] tabular-nums">
                      {roster.length} Siswa
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Cari nama siswa yang sakit atau izin..."
                    value={searchRoster}
                    onChange={(e) => setSearchRoster(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>
                <div className="divide-y divide-[#E2E8F0] max-h-[260px] overflow-y-auto">
                  {filteredRoster.length > 0 ? (
                    filteredRoster.map((st, idx) => (
                      <div
                        key={st.id || st.student_id || idx}
                        className="p-2.5 px-3 flex items-center justify-between gap-2 hover:bg-[#F8FAFC]"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#0F172A] truncate">
                            {idx + 1}. {st.student_name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <AttendanceBadge status={st.status} size="sm" />
                            {st.notes && (
                              <span className="text-[10px] text-[#0369A1] truncate">
                                ({st.notes})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(st, 'SAKIT')}
                            className={`px-2 py-1 rounded-[4px] border text-[11px] font-semibold cursor-pointer transition-colors ${
                              st.status === 'SAKIT'
                                ? 'bg-[#0284C7] border-[#0284C7] text-white'
                                : 'bg-[#F0F9FF] border-[#BAE6FD] text-[#0369A1] hover:bg-[#E0F2FE]'
                            }`}
                          >
                            Sakit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(st, 'IZIN')}
                            className={`px-2 py-1 rounded-[4px] border text-[11px] font-semibold cursor-pointer transition-colors ${
                              st.status === 'IZIN'
                                ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
                                : 'bg-[#EEF2FF] border-[#C7D2FE] text-[#4338CA] hover:bg-[#E0E7FF]'
                            }`}
                          >
                            Izin
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentForOverride(st);
                              setOverrideStatus(st.status === 'PENDING' ? 'SAKIT' : st.status);
                              setOverrideNotes(st.notes || '');
                              setIsOverrideModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-[4px] border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[11px] font-semibold text-[#0F172A] cursor-pointer"
                          >
                            Detail
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-[#64748B]">
                      Tidak ada siswa ditemukan.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigasi Cepat ke Kelola Absensi */}
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => {
                if (activeSession) setSelectedSessionId(activeSession.id);
                setActiveTab('absensi');
              }}
            >
              Lihat & Kelola Daftar Absensi Kelas Lengkap
            </Button>
          </div>
        )}

        {/* ================= 3. TAB: ABSENSI (BUKA, TUTUP, EDIT KEHADIRAN) ================= */}
        {activeTab === 'absensi' && (
          <div className="space-y-4">
            {/* Header & Aksi Buka Kelas */}
            <div className="flex items-center justify-between bg-white border border-[#E2E8F0] p-3 rounded-[10px]">
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A]">
                  Manajemen Absensi Kelas
                </h2>
                <p className="text-[11px] text-[#64748B]">
                  Buka, tutup, dan ubah status kehadiran siswa
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsOpenClassModalOpen(true)}
              >
                + Buka Kelas
              </Button>
            </div>

            {/* Status Sesi Terbuka & Tombol Tutup Kelas */}
            {activeSession && (
              <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-[10px] p-3.5 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded-[4px] bg-white border border-[#A7F3D0] text-[11px] font-bold text-[#047857]">
                      Sesi Aktif Saat Ini
                    </span>
                    <h3 className="text-sm font-bold text-[#047857] mt-1">
                      Kelas {activeSession.class_name} — Sesi #{activeSession.session_number}
                    </h3>
                    <p className="text-xs text-[#065F46]">{activeSession.topic}</p>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setIsCloseClassModalOpen(true)}
                  >
                    Tutup Kelas
                  </Button>
                </div>

                <div className="flex items-center justify-between text-xs text-[#065F46] pt-1 border-t border-[#A7F3D0]">
                  <span className="tabular-nums">
                    Hadir: <strong>{summary.total_hadir ?? 0}</strong> / {summary.total_students ?? 0} Siswa
                  </span>
                  <span className="tabular-nums">
                    Sisa Hadir: <strong>{remainingTime}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Pemilih Kelas & Sesi */}
            <div className="bg-white border border-[#E2E8F0] p-3 rounded-[10px] space-y-2">
              <label className="block text-xs font-semibold text-[#0F172A]">
                Pilih Sesi Kelas yang Ingin Dikelola:
              </label>
              <select
                value={selectedSessionId || ''}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              >
                {sessions.length === 0 && (
                  <option value="">Belum ada sesi yang dibuka</option>
                )}
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    Kelas {s.class_name} ({s.date}) — {s.status === 'OPEN' ? '[SEDANG DIBUKA]' : '[DITUTUP]'} — {s.topic}
                  </option>
                ))}
              </select>
            </div>

            {/* Roster & Edit Kehadiran Siswa */}
            <div className="bg-white border border-[#E2E8F0] rounded-[10px] overflow-hidden space-y-2">
              {/* Filter & Search Bar */}
              <div className="p-3 border-b border-[#E2E8F0] space-y-2 bg-[#F8FAFC]">
                <label className="block text-xs font-semibold text-[#0F172A]">
                  Cari Siswa / NISN
                </label>
                <input
                  type="text"
                  placeholder="Cari siswa atau NISN..."
                  value={searchRoster}
                  onChange={(e) => setSearchRoster(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />

                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {['ALL', 'HADIR', 'TERLAMBAT', 'SAKIT', 'IZIN', 'ALPHA', 'PENDING'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFilterRosterStatus(st)}
                      className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                        filterRosterStatus === st
                          ? 'bg-[#2563EB] text-white font-semibold'
                          : 'bg-white border border-[#CBD5E1] text-[#64748B]'
                      }`}
                    >
                      {st === 'ALL' ? 'Semua' : st === 'PENDING' ? 'Belum Scan' : st.charAt(0) + st.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Roster Siswa List */}
              <div className="divide-y divide-[#E2E8F0] max-h-[380px] overflow-y-auto">
                {filteredRoster.length > 0 ? (
                  filteredRoster.map((st, idx) => (
                    <div
                      key={st.id || idx}
                      className="p-3 flex items-center justify-between gap-2 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#0F172A] truncate">
                          {idx + 1}. {st.student_name}
                        </p>
                        <p className="text-[11px] text-[#64748B] tabular-nums">
                          NISN: {st.nisn}
                          {st.notes && <span className="text-[#0369A1] ml-1">({st.notes})</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <AttendanceBadge status={st.status} size="sm" />
                        <button
                          type="button"
                          onClick={() => handleQuickStatusChange(st, 'SAKIT')}
                          className={`px-2 py-1 rounded-[4px] border text-[11px] font-semibold cursor-pointer transition-colors ${
                            st.status === 'SAKIT'
                              ? 'bg-[#0284C7] border-[#0284C7] text-white'
                              : 'bg-[#F0F9FF] border-[#BAE6FD] text-[#0369A1] hover:bg-[#E0F2FE]'
                          }`}
                        >
                          Sakit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStatusChange(st, 'IZIN')}
                          className={`px-2 py-1 rounded-[4px] border text-[11px] font-semibold cursor-pointer transition-colors ${
                            st.status === 'IZIN'
                              ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
                              : 'bg-[#EEF2FF] border-[#C7D2FE] text-[#4338CA] hover:bg-[#E0E7FF]'
                          }`}
                        >
                          Izin
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentForOverride(st);
                            setOverrideStatus(st.status === 'PENDING' ? 'SAKIT' : st.status);
                            setOverrideNotes(st.notes || '');
                            setIsOverrideModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-[4px] border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F172A] cursor-pointer"
                        >
                          Ubah
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-[#64748B]">
                    Tidak ada siswa pada filter ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===================== FIXED BOTTOM NAVIGATION BAR ===================== */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-[#E2E8F0] px-4 py-2 flex items-center justify-around z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {/* 1. Beranda */}
        <button
          type="button"
          onClick={() => setActiveTab('beranda')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-[6px] transition-colors cursor-pointer ${
            activeTab === 'beranda' ? 'text-[#2563EB] font-bold' : 'text-[#64748B]'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px]">Beranda</span>
        </button>

        {/* 2. Scan */}
        <button
          type="button"
          onClick={() => setActiveTab('scan')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-[6px] transition-colors cursor-pointer ${
            activeTab === 'scan' ? 'text-[#2563EB] font-bold' : 'text-[#64748B]'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <span className="text-[10px]">Scan</span>
        </button>

        {/* 3. Absensi */}
        <button
          type="button"
          onClick={() => setActiveTab('absensi')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-[6px] transition-colors cursor-pointer ${
            activeTab === 'absensi' ? 'text-[#2563EB] font-bold' : 'text-[#64748B]'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-[10px]">Absensi</span>
        </button>
      </nav>

      {/* ===================== MODAL BUKA KELAS BARU ===================== */}
      <Modal
        isOpen={isOpenClassModalOpen}
        onClose={() => setIsOpenClassModalOpen(false)}
        title="Buka Sesi Kelas Baru"
        footerActions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsOpenClassModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSubmitting}
              onClick={handleOpenClassSubmit}
            >
              Mulai Sesi Sekarang
            </Button>
          </>
        }
      >
        <form onSubmit={handleOpenClassSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Pilih Kelas
            </label>
            <select
              value={newClassId}
              onChange={(e) => setNewClassId(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            >
              {assignedClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_code} — {c.course_name || c.course_code} ({c.schedule_day || 'Hari belum diatur'} {classScheduleTime(c)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Pertemuan Ke-
            </label>
            <input
              type="number"
              min="1"
              max="36"
              value={newSessionNumber}
              onChange={(e) => setNewSessionNumber(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] tabular-nums"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Materi Pelajaran
            </label>
            <input
              type="text"
              placeholder="Contoh: Operasi Bilangan Bulat"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              required
            />
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 rounded-[6px] text-xs text-[#64748B]">
            Batas waktu presensi tepat waktu adalah 15 menit sejak kelas dibuka.
          </div>
        </form>
      </Modal>

      {/* ===================== MODAL TUTUP KELAS ===================== */}
      <Modal
        isOpen={isCloseClassModalOpen}
        onClose={() => setIsCloseClassModalOpen(false)}
        title="Konfirmasi Tutup Kelas"
        footerActions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCloseClassModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isSubmitting}
              onClick={handleCloseClassSubmit}
            >
              Tutup Kelas Sekarang
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-[#0F172A]">
            Apakah Anda yakin ingin menutup sesi kelas ini? Tindakan ini bersifat permanen.
            Siswa yang masih berstatus <strong>Belum Scan</strong> akan otomatis ditandai sebagai{' '}
            <strong className="text-[#BE123C]">Alpha</strong>.
          </p>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-[6px] space-y-1.5 tabular-nums">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Total Hadir:</span>
              <span className="font-semibold text-[#047857]">
                {summary.total_hadir ?? 0} Siswa
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Terlambat:</span>
              <span className="font-semibold text-[#B45309]">
                {summary.total_late ?? 0} Siswa
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Akan Menjadi Alpha:</span>
              <span className="font-semibold text-[#BE123C]">
                {summary.total_pending ?? 0} Siswa
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* ===================== MODAL EDIT KEHADIRAN MANUAL ===================== */}
      <Modal
        isOpen={isOverrideModalOpen && Boolean(selectedStudentForOverride)}
        onClose={() => setIsOverrideModalOpen(false)}
        title="Ubah Status Kehadiran Siswa"
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
              onClick={handleSaveOverride}
            >
              Simpan Perubahan
            </Button>
          </>
        }
      >
        {selectedStudentForOverride && (
          <div className="space-y-3 text-xs">
            <div className="bg-[#F8FAFC] p-2.5 rounded-[6px] border border-[#E2E8F0]">
              <p className="font-semibold text-[#0F172A]">
                {selectedStudentForOverride.student_name}
              </p>
              <p className="text-[#64748B] tabular-nums">
                NISN: {selectedStudentForOverride.nisn}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Pilih Status Kehadiran
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {['HADIR', 'TERLAMBAT', 'SAKIT', 'IZIN', 'ALPHA'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOverrideStatus(st)}
                    className={`py-1.5 px-2 rounded-[6px] border text-xs font-medium cursor-pointer text-center ${
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
                placeholder="Contoh: Ada surat izin dokter / dispensasi"
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-[6px] px-3 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
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
                NISN: {scannedStudentData.nisn} • Kelas {scannedStudentData.class_name || activeSession?.class_name}
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
              Pop-up otomatis tertutup dalam 3 detik atau klik tombol di bawah
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
