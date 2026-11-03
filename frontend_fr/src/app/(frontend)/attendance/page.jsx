'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { attendanceApi } from '@/lib/attendanceApi';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';

const DAYS_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function formatScheduleTime(item) {
  if (!item) return '';
  if (item.schedule_start_time || item.schedule_end_time) {
    return [item.schedule_start_time, item.schedule_end_time].filter(Boolean).join(' - ');
  }
  return item.schedule_time || '';
}

function getTodayIndonesianDay() {
  const dayName = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
  return DAYS_ORDER.includes(dayName) ? dayName : '';
}

export default function AttendanceDashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter Pemetaan Jadwal
  const todayDay = useMemo(() => getTodayIndonesianDay(), []);
  const [selectedDayFilter, setSelectedDayFilter] = useState('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [scheduleSearch, setScheduleSearch] = useState('');

  // Modal Edit Sesi
  const [editingSession, setEditingSession] = useState(null);
  const [editTopic, setEditTopic] = useState('');
  const [editSessionNumber, setEditSessionNumber] = useState(1);
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState('OPEN');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
    if (res.success && Array.isArray(res.data)) {
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
      const rawList = Array.isArray(classList) ? classList : [];

      // Utamakan kelas yang sudah memiliki pemetaan jadwal jika ada duplikat tanpa jadwal
      const hasScheduledSibling = new Set(
        rawList
          .filter((c) => c.schedule_day || c.schedule_time || c.schedule_start_time)
          .map((c) => `${c.course_id || ''}__${(c.class_code || '').toUpperCase()}`)
      );

      const cleanedList = rawList.filter((c) => {
        const isScheduled = Boolean(c.schedule_day || c.schedule_time || c.schedule_start_time);
        if (isScheduled) return true;
        const key = `${c.course_id || ''}__${(c.class_code || '').toUpperCase()}`;
        return !hasScheduledSibling.has(key);
      });

      // Urutkan berdasarkan hari (Senin-Sabtu) lalu jam mulai lalu rombel
      cleanedList.sort((a, b) => {
        const dayA = DAYS_ORDER.indexOf(a.schedule_day);
        const dayB = DAYS_ORDER.indexOf(b.schedule_day);
        const normDayA = dayA === -1 ? 99 : dayA;
        const normDayB = dayB === -1 ? 99 : dayB;
        if (normDayA !== normDayB) return normDayA - normDayB;
        const timeA = formatScheduleTime(a) || '99:99';
        const timeB = formatScheduleTime(b) || '99:99';
        if (timeA !== timeB) return timeA.localeCompare(timeB);
        return (a.class_code || '').localeCompare(b.class_code || '');
      });

      setClasses(cleanedList);
      setSelectedClassId((current) => current || cleanedList[0]?.id || '');
    } catch (error) {
      setClasses([]);
      setClassesError(error.message || 'Daftar jadwal kelas gagal dimuat');
    } finally {
      setIsClassesLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchClasses();
  }, []);

  const selectedClassObj = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const openModalForSchedule = (classItem) => {
    const target = classItem || classes[0] || null;
    setClassesError('');
    if (target) {
      const existingCount = sessions.filter((s) => s.class_id === target.id).length;
      const nextNum = existingCount + 1;
      setSelectedClassId(target.id);
      setSessionNumber(nextNum);
      setTopic(`${target.course_name || target.course_code || 'Materi Pembelajaran'} — Pertemuan #${nextNum}`);
    } else {
      setSessionNumber(1);
      setTopic('');
    }
    setIsOpenModalActive(true);
  };

  const handleSelectClassInModal = (newId) => {
    setSelectedClassId(newId);
    const target = classes.find((c) => c.id === newId);
    if (target) {
      const existingCount = sessions.filter((s) => s.class_id === target.id).length;
      const nextNum = existingCount + 1;
      setSessionNumber(nextNum);
      setTopic(`${target.course_name || target.course_code || 'Materi Pembelajaran'} — Pertemuan #${nextNum}`);
    }
  };

  const handleOpenClass = async (e) => {
    if (e) e.preventDefault();
    if (!selectedClassId) {
      setClassesError('Pilih jadwal kelas yang akan dibuka terlebih dahulu');
      return;
    }
    setIsSubmitting(true);
    setClassesError('');

    const target = classes.find((c) => c.id === selectedClassId);
    const finalTopic =
      topic.trim() ||
      `${target?.course_name || target?.course_code || 'Materi Pembelajaran'} — Pertemuan #${sessionNumber}`;
    const mappedTeacherId = target?.teacher_id || target?.dosen_id || undefined;

    const res = await attendanceApi.openSession(
      selectedClassId,
      finalTopic,
      sessionNumber,
      mappedTeacherId
    );
    setIsSubmitting(false);

    if (res.success && res.data) {
      setIsOpenModalActive(false);
      router.push(`/attendance/session/${res.data.id || res.data.session_id}`);
    } else {
      setClassesError(res.error?.message || res.message || 'Gagal membuka sesi presensi kelas');
    }
  };

  const activeSessions = sessions.filter((s) => s.status === 'OPEN');
  const closedSessions = sessions.filter((s) => s.status === 'CLOSED');

  const openEditSessionModal = (sess) => {
    setEditingSession(sess);
    setEditTopic(sess.topic || '');
    setEditSessionNumber(sess.session_number || 1);
    setEditDate(String(sess.date || '').slice(0, 10));
    setEditStatus(sess.status || 'OPEN');
  };

  const handleSaveEditSession = async (e) => {
    if (e) e.preventDefault();
    if (!editingSession) return;
    setIsSavingEdit(true);
    const res = await attendanceApi.editSession(editingSession.id, {
      class_id: editingSession.class_id,
      topic: editTopic,
      session_number: Number(editSessionNumber) || 1,
      date: editDate,
      status: editStatus,
    });
    setIsSavingEdit(false);
    if (res.success) {
      setEditingSession(null);
      fetchSessions();
    } else {
      alert(res.error?.message || 'Gagal memperbarui sesi kelas');
    }
  };

  const handleDeleteSession = async (sess) => {
    if (
      !window.confirm(
        `Hapus sesi Kelas ${sess.class_name} (${sess.topic}) beserta seluruh data presensinya?`
      )
    ) {
      return;
    }
    const res = await attendanceApi.deleteSession(sess.id);
    if (res.success) {
      fetchSessions();
    } else {
      alert(res.error?.message || 'Gagal menghapus sesi kelas');
    }
  };

  const availableClassCodes = useMemo(() => {
    const set = new Set();
    for (const c of classes) {
      if (c.class_code) set.add(String(c.class_code).trim().toUpperCase());
    }
    for (const s of sessions) {
      if (s.class_name) set.add(String(s.class_name).trim().toUpperCase());
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'id-ID', { numeric: true, sensitivity: 'base' })
    );
  }, [classes, sessions]);

  const activeSessionByClassId = useMemo(() => {
    const map = new Map();
    for (const s of activeSessions) {
      if (s.class_id) map.set(s.class_id, s);
    }
    return map;
  }, [activeSessions]);

  const filteredSchedules = useMemo(() => {
    return classes.filter((item) => {
      const matchDay =
        selectedDayFilter === 'ALL'
          ? true
          : selectedDayFilter === 'TODAY'
          ? item.schedule_day === todayDay
          : item.schedule_day === selectedDayFilter;

      const matchClass =
        selectedClassFilter === 'ALL' ||
        String(item.class_code || '').trim().toUpperCase() === selectedClassFilter;

      const q = scheduleSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        (item.class_code || '').toLowerCase().includes(q) ||
        (item.course_name || '').toLowerCase().includes(q) ||
        (item.course_code || '').toLowerCase().includes(q) ||
        (item.teacher_name || '').toLowerCase().includes(q) ||
        (item.room || '').toLowerCase().includes(q);

      return matchDay && matchClass && matchSearch;
    });
  }, [classes, selectedDayFilter, selectedClassFilter, todayDay, scheduleSearch]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#0F172A]">
            Presensi QR Kelas & Jadwal Terpetakan
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Buka sesi pemindaian QR siswa langsung berdasarkan pemetaan jadwal mata pelajaran dan guru pengampu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/admin/schedule">
            <Button variant="secondary" size="md">
              Atur Pemetaan Jadwal
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            onClick={() => openModalForSchedule(classes[0])}
          >
            + Buka Sesi Presensi
          </Button>
        </div>
      </div>

      {/* Section 1: Sesi Sedang Berlangsung */}
      {activeSessions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#047857]">
              Sesi Kelas Sedang Terbuka ({activeSessions.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((s) => (
              <div
                key={s.id}
                className="bg-white border-2 border-[#A7F3D0] rounded-xl p-5 space-y-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#047857] animate-ping" />
                        Sesi Terbuka
                      </span>
                      {(s.schedule_day || s.schedule_time) && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium tabular-nums">
                          {[s.schedule_day, s.schedule_time].filter(Boolean).join(' • ')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#0F172A] mt-2">
                      Kelas {s.class_name} — {s.course_name || s.topic}
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Topik: <strong className="text-slate-700">{s.topic}</strong> (Sesi #{s.session_number})
                    </p>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Guru Pengampu: <strong className="text-slate-800">{s.teacher_name || '-'}</strong>
                      {s.room ? ` • Ruang ${s.room}` : ''}
                    </p>
                  </div>

                  <span className="text-xs text-[#64748B] tabular-nums shrink-0">
                    Mulai {s.start_time || '-'} WIB
                  </span>
                </div>

                {/* Ringkasan Kehadiran */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg text-xs space-y-1.5 tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Kehadiran Siswa Terkini:</span>
                    <span className="font-semibold text-[#047857]">
                      {s.total_present ?? 0} / {s.total_students ?? 0} Siswa Hadir
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#047857] h-full transition-all"
                      style={{
                        width: `${
                          s.total_students
                            ? Math.min(100, ((s.total_present ?? 0) / s.total_students) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    className="flex-1"
                    onClick={() => router.push(`/attendance/session/${s.id}`)}
                  >
                    Kelola Roster & Kehadiran Kelas →
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => openEditSessionModal(s)}
                  >
                    Edit Sesi
                  </Button>
                  <Button
                    variant="danger"
                    size="md"
                    onClick={() => handleDeleteSession(s)}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 2: Daftar Jadwal Kelas Terpetakan (Sesuai Pemetaan Jadwal) */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">
              Jadwal Kelas Terpetakan ({filteredSchedules.length})
            </h2>
            <p className="text-xs text-[#64748B]">
              Pilih jadwal di bawah ini untuk langsung membuka sesi pemindaian QR sesuai pemetaan jadwal.
            </p>
          </div>
        </div>

        {/* Filter Hari & Pencarian */}
        <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedDayFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedDayFilter === 'ALL'
                  ? 'bg-[#1E4DBD] text-white shadow-xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua Hari
            </button>
            {todayDay && (
              <button
                type="button"
                onClick={() => setSelectedDayFilter('TODAY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedDayFilter === 'TODAY'
                    ? 'bg-[#047857] text-white shadow-xs'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Hari Ini ({todayDay})
              </button>
            )}
            {DAYS_ORDER.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDayFilter(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedDayFilter === day
                    ? 'bg-[#1E4DBD] text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E4DBD]/20 focus:border-[#1E4DBD]"
            >
              <option value="ALL">Semua Kelas ({availableClassCodes.length})</option>
              {availableClassCodes.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Cari kelas, mapel, atau nama guru..."
              value={scheduleSearch}
              onChange={(e) => setScheduleSearch(e.target.value)}
              className="w-full sm:w-64 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E4DBD]/20 focus:border-[#1E4DBD]"
            />
          </div>
        </div>

        {/* Kartu Jadwal */}
        {isClassesLoading ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center text-xs text-[#64748B]">
            Memuat pemetaan jadwal kelas...
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center text-xs text-[#64748B] space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#0F172A]">
                Belum Ada Jadwal Kelas pada Filter Ini
              </p>
              <p>
                Pastikan mata pelajaran, guru pengampu, rombel, hari, dan jam sudah diatur pada menu Pemetaan Jadwal.
              </p>
            </div>
            <div>
              <Link href="/admin/schedule">
                <Button variant="primary" size="sm">
                  Buka Menu Pemetaan Jadwal →
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchedules.map((item) => {
              const openSess = activeSessionByClassId.get(item.id);
              const timeStr = formatScheduleTime(item);
              const isToday = Boolean(todayDay && item.schedule_day === todayDay);

              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-xl p-4 flex flex-col justify-between gap-4 transition-all shadow-xs ${
                    openSess
                      ? 'border-[#A7F3D0] ring-1 ring-[#A7F3D0]'
                      : isToday
                      ? 'border-blue-300'
                      : 'border-[#E2E8F0] hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-md bg-[#EFF4FE] text-[#193D9B] border border-[#BFD3FB] text-xs font-bold">
                        Kelas {item.class_code}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isToday && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            Hari Ini
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold tabular-nums">
                          {item.schedule_day || 'Hari belum diatur'}
                          {timeStr ? ` • ${timeStr}` : ''}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A] leading-snug">
                        {item.course_name || item.course_code || 'Mata Pelajaran'}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-1">
                        Guru: <strong className="text-slate-800">{item.teacher_name || 'Belum ditentukan'}</strong>
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        {item.room ? `Ruang: ${item.room}` : 'Ruangan mengikuti rombel'}
                        {item.academic_year ? ` • TA ${item.academic_year}` : ''}
                      </p>
                    </div>
                  </div>

                  {openSess ? (
                    <Button
                      variant="success"
                      size="sm"
                      className="w-full"
                      onClick={() => router.push(`/attendance/session/${openSess.id}`)}
                    >
                      Sesi Aktif — Kelola Roster Kelas →
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => openModalForSchedule(item)}
                    >
                      Buka Sesi Presensi Kelas
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 3: Riwayat Sesi Kelas Lampau */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-[#0F172A]">
          Riwayat Sesi Kelas Sebelumnya ({closedSessions.length})
        </h2>

        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
          <div className="divide-y divide-[#E2E8F0]">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-[#64748B]">
                Memuat riwayat sesi presensi...
              </div>
            ) : closedSessions.length > 0 ? (
              closedSessions.map((cs) => (
                <div
                  key={cs.id}
                  className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] border border-[#CBD5E1] text-xs font-bold text-[#0F172A]">
                        Kelas {cs.class_name}
                      </span>
                      {cs.course_name && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800">
                          {cs.course_name}
                        </span>
                      )}
                      <h4 className="text-xs font-semibold text-[#0F172A] truncate">
                        {cs.topic}
                      </h4>
                    </div>
                    <p className="text-xs text-[#64748B] tabular-nums">
                      Guru: <strong className="text-slate-700">{cs.teacher_name || '-'}</strong> | Tanggal: {cs.date} | Sesi #{cs.session_number}
                      {cs.schedule_day ? ` | Jadwal: ${cs.schedule_day} ${cs.schedule_time || ''}` : ''}
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

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/attendance/session/${cs.id}`)}
                      >
                        Lihat Roster
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditSessionModal(cs)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteSession(cs)}
                      >
                        Hapus
                      </Button>
                    </div>
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
        title="Buka Sesi Presensi sesuai Pemetaan Jadwal"
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
              Pilih Jadwal Kelas & Mata Pelajaran
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => handleSelectClassInModal(e.target.value)}
              disabled={isClassesLoading || classes.length === 0}
              className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            >
              {isClassesLoading && <option value="">Memuat pemetaan jadwal...</option>}
              {!isClassesLoading && classes.length === 0 && (
                <option value="">Belum ada jadwal kelas yang dipetakan</option>
              )}
              {classes.map((classItem) => {
                const timeInfo = formatScheduleTime(classItem);
                const scheduleLabel = classItem.schedule_day
                  ? `[${classItem.schedule_day}${timeInfo ? ` ${timeInfo}` : ''}] `
                  : '';
                return (
                  <option key={classItem.id} value={classItem.id}>
                    {scheduleLabel}Kelas {classItem.class_code} — {classItem.course_name || classItem.course_code || 'Mata pelajaran'} ({classItem.teacher_name || 'Guru belum ditentukan'})
                  </option>
                );
              })}
            </select>
            {classesError && (
              <p className="mt-1 text-xs text-[#BE123C]" role="alert">
                {classesError}
              </p>
            )}
          </div>

          {selectedClassObj && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Rombel / Kelas:</span>
                <span className="font-bold text-slate-900">
                  Kelas {selectedClassObj.class_code}
                  {selectedClassObj.room ? ` (${selectedClassObj.room})` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mata Pelajaran:</span>
                <span className="font-semibold text-blue-800">
                  {selectedClassObj.course_name || selectedClassObj.course_code || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Guru Pengampu:</span>
                <span className="font-semibold text-slate-800">
                  {selectedClassObj.teacher_name || 'Belum ditentukan'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jadwal Terpetakan:</span>
                <span className="font-semibold text-slate-800 tabular-nums">
                  {selectedClassObj.schedule_day || 'Hari belum diatur'}
                  {formatScheduleTime(selectedClassObj) ? ` • ${formatScheduleTime(selectedClassObj)} WIB` : ''}
                </span>
              </div>
            </div>
          )}

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
              className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] tabular-nums"
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
              className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              required
            />
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 rounded-lg text-xs text-[#64748B]">
            Toleransi waktu hadir tepat waktu adalah 15 menit dari sesi dibuka. Siswa yang memindai kartu setelah 15 menit akan ditandai sebagai Terlambat.
          </div>
        </form>
      </Modal>

      {/* Modal Edit Sesi Kelas */}
      <Modal
        isOpen={Boolean(editingSession)}
        onClose={() => setEditingSession(null)}
        title={`Edit Sesi Kelas ${editingSession?.class_name || ''}`}
        footerActions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditingSession(null)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSavingEdit}
              onClick={handleSaveEditSession}
            >
              Simpan Perubahan
            </Button>
          </>
        }
      >
        {editingSession && (
          <form onSubmit={handleSaveEditSession} className="space-y-3 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Topik / Materi Pembelajaran
              </label>
              <input
                type="text"
                value={editTopic}
                onChange={(e) => setEditTopic(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Pertemuan Ke-
                </label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={editSessionNumber}
                  onChange={(e) => setEditSessionNumber(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 tabular-nums"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Tanggal Sesi
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 tabular-nums"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Status Sesi Kelas
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
              >
                <option value="OPEN">OPEN (Sesi Terbuka / Aktifkan Kembali)</option>
                <option value="CLOSED">CLOSED (Sesi Ditutup)</option>
              </select>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
