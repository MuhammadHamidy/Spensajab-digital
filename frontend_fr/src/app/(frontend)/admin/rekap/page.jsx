'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { attendanceApi } from '@/lib/attendanceApi';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';

function normalizeClassLabel(val) {
  return String(val || '')
    .trim()
    .replace(/^kelas\s+/i, '')
    .toUpperCase();
}

function extractTingkat(classLabel) {
  const norm = normalizeClassLabel(classLabel);
  if (!norm) return '';
  if (norm.startsWith('VII')) return '7';
  if (norm.startsWith('VIII')) return '8';
  if (norm.startsWith('IX')) return '9';
  const match = norm.match(/^(\d+)/);
  return match ? match[1] : norm.charAt(0);
}

export default function AttendanceRekapPage() {
  const today = new Date();
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = formatDate(today);
  const [filterTingkat, setFilterTingkat] = useState('ALL');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterKategori, setFilterKategori] = useState('ALL'); // 'ALL' | 'TIDAK_HADIR' | 'SAKIT' | 'IZIN' | 'ALPHA'
  const [periodPreset, setPeriodPreset] = useState('TODAY'); // 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [search, setSearch] = useState('');
  const [classes, setClasses] = useState([]);
  const [studentClassNames, setStudentClassNames] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // State Edit Sesi Modal
  const [editingSession, setEditingSession] = useState(null);
  const [editTopic, setEditTopic] = useState('');
  const [editSessionNumber, setEditSessionNumber] = useState(1);
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState('OPEN');
  const [editLateMinutes, setEditLateMinutes] = useState(30);
  const [isSavingSession, setIsSavingSession] = useState(false);

  const applyPeriodPreset = (preset) => {
    const now = new Date();
    setPeriodPreset(preset);
    if (preset === 'TODAY') {
      const d = formatDate(now);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'YESTERDAY') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const d = formatDate(y);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'WEEK') {
      const w = new Date(now);
      w.setDate(now.getDate() - 6);
      setStartDate(formatDate(w));
      setEndDate(formatDate(now));
    } else if (preset === 'MONTH') {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDate(m));
      setEndDate(formatDate(now));
    }
  };

  const loadMasterAndSessions = useCallback(async () => {
    try {
      const [clsList, studentsList, sessRes] = await Promise.all([
        classApiAdapter.getAll({ includeAll: true }),
        accountApiAdapter.getStudents(),
        attendanceApi.getSessions(),
      ]);
      setClasses(Array.isArray(clsList) ? clsList : []);
      if (Array.isArray(studentsList)) {
        const sClasses = studentsList
          .map((s) => normalizeClassLabel(s.class_name || s.className))
          .filter((c) => c && c !== '-');
        setStudentClassNames(Array.from(new Set(sClasses)));
      }
      if (sessRes?.success && Array.isArray(sessRes.data)) {
        setSessions(sessRes.data);
      }
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadMasterAndSessions();
  }, [loadMasterAndSessions]);

  const fetchReport = useCallback(() => {
    let active = true;
    setIsLoading(true);
    setError('');
    attendanceApi
      .getAttendanceReport({
        start_date: startDate,
        end_date: endDate,
        tingkat: filterTingkat,
        class_id: filterKelas,
        search,
      })
      .then((res) => {
        if (!active) return;
        if (res.success) {
          setRows(Array.isArray(res.data) ? res.data : []);
        } else {
          setRows([]);
          setError(res.error?.message || 'Rekap presensi gagal dimuat');
        }
      })
      .catch((err) => {
        if (active) {
          setRows([]);
          setError(err.message || 'Rekap presensi gagal dimuat');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [startDate, endDate, filterTingkat, filterKelas, search]);

  useEffect(() => {
    const cleanup = fetchReport();
    return cleanup;
  }, [fetchReport]);

  // Kumpulan seluruh kelas unik yang diinputkan (dari Data Siswa, Jadwal Kelas, Sesi, dan Rekap)
  const allInputClassCodes = useMemo(() => {
    const set = new Set();
    for (const c of classes) {
      const label = normalizeClassLabel(c.class_code);
      if (label) set.add(label);
    }
    for (const sc of studentClassNames) {
      const label = normalizeClassLabel(sc);
      if (label) set.add(label);
    }
    for (const s of sessions) {
      const label = normalizeClassLabel(s.class_name);
      if (label) set.add(label);
    }
    for (const r of rows) {
      const label = normalizeClassLabel(r.class_name);
      if (label) set.add(label);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'id-ID', { numeric: true, sensitivity: 'base' })
    );
  }, [classes, studentClassNames, sessions, rows]);

  const availableTingkat = useMemo(() => {
    const set = new Set();
    for (const cls of allInputClassCodes) {
      const t = extractTingkat(cls);
      if (t) set.add(t);
    }
    const arr = Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'id-ID', { numeric: true })
    );
    return arr.length > 0 ? arr : ['7', '8', '9'];
  }, [allInputClassCodes]);

  const availableClasses = useMemo(() => {
    return allInputClassCodes.filter(
      (cls) => filterTingkat === 'ALL' || extractTingkat(cls) === filterTingkat
    );
  }, [allInputClassCodes, filterTingkat]);

  const filteredPeriodSessions = useMemo(() => {
    return sessions.filter((s) => {
      const sDate = String(s.date || '').slice(0, 10);
      if (startDate && sDate < startDate) return false;
      if (endDate && sDate > endDate) return false;
      const clsLabel = normalizeClassLabel(s.class_name);
      if (filterTingkat !== 'ALL' && extractTingkat(clsLabel) !== filterTingkat) {
        return false;
      }
      if (filterKelas !== 'ALL' && clsLabel !== normalizeClassLabel(filterKelas)) {
        return false;
      }
      return true;
    });
  }, [sessions, startDate, endDate, filterTingkat, filterKelas]);

  const openEditSessionModal = (sess) => {
    setEditingSession(sess);
    setEditTopic(sess.topic || '');
    setEditSessionNumber(sess.session_number || 1);
    setEditDate(String(sess.date || '').slice(0, 10) || todayStr);
    setEditStatus(sess.status || 'OPEN');
    setEditLateMinutes(attendanceApi.resolveSessionLateMinutes(sess));
  };

  const handleSaveEditSession = async (e) => {
    if (e) e.preventDefault();
    if (!editingSession) return;
    setIsSavingSession(true);
    const parsedLate = Math.max(0, Number(editLateMinutes) || 0);
    attendanceApi.setDefaultLateMinutes(parsedLate);
    const res = await attendanceApi.editSession(editingSession.id, {
      class_id: editingSession.class_id,
      topic: editTopic,
      session_number: Number(editSessionNumber) || 1,
      date: editDate,
      status: editStatus,
      late_threshold_minutes: parsedLate,
    });
    setIsSavingSession(false);
    if (res.success) {
      setEditingSession(null);
      await loadMasterAndSessions();
      fetchReport();
    } else {
      alert(res.error?.message || 'Gagal memperbarui sesi kelas');
    }
  };

  const handleDeleteSession = async (sess) => {
    if (
      !window.confirm(
        `Hapus sesi Kelas ${sess.class_name} (${sess.topic} - ${sess.date}) beserta seluruh data presensi siswa di sesi ini?`
      )
    ) {
      return;
    }
    const res = await attendanceApi.deleteSession(sess.id);
    if (res.success) {
      await loadMasterAndSessions();
      fetchReport();
    } else {
      alert(res.error?.message || 'Gagal menghapus sesi kelas');
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      if (filterKategori === 'TIDAK_HADIR') {
        return (item.sakit_count || 0) + (item.izin_count || 0) + (item.alpha_count || 0) > 0;
      }
      if (filterKategori === 'SAKIT') return (item.sakit_count || 0) > 0;
      if (filterKategori === 'IZIN') return (item.izin_count || 0) > 0;
      if (filterKategori === 'ALPHA') return (item.alpha_count || 0) > 0;
      return true;
    });
  }, [rows, filterKategori]);

  const recapTotals = useMemo(() => {
    return rows.reduce(
      (acc, item) => {
        acc.hadir += Number(item.hadir_count || 0);
        acc.late += Number(item.late_count || 0);
        acc.sakit += Number(item.sakit_count || 0);
        acc.izin += Number(item.izin_count || 0);
        acc.alpha += Number(item.alpha_count || 0);
        return acc;
      },
      { hadir: 0, late: 0, sakit: 0, izin: 0, alpha: 0 }
    );
  }, [rows]);

  const handleExportExcel = () => {
    const header = ['NISN', 'Nama', 'Kelas', 'Total Sesi', 'Hadir', 'Telat', 'Sakit', 'Izin', 'Alpha', 'Persentase'];
    const lines = filteredRows.map((item) => [
      item.nisn,
      item.name,
      item.class_name,
      item.total_meetings,
      item.hadir_count,
      item.late_count,
      item.sakit_count,
      item.izin_count,
      item.alpha_count,
      `${item.percentage}%`,
    ].map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rekap-presensi-${startDate}-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Rekapitulasi Presensi Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan akumulasi kehadiran siswa berdasarkan data session dan presensi dari server.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="w-full sm:w-auto justify-center px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Unduh Rekap (.csv)</span>
        </button>
      </div>

      {/* Mode Periode Cepat (Rekap Harian / Mingguan / Bulanan) */}
      <div className="bg-white border border-slate-200/90 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700 mr-1">Mode Laporan:</span>
          {[
            { id: 'TODAY', label: 'Hari Ini (Rekap Harian)' },
            { id: 'YESTERDAY', label: 'Kemarin' },
            { id: 'WEEK', label: '7 Hari Terakhir' },
            { id: 'MONTH', label: 'Bulan Ini' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPeriodPreset(preset.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                periodPreset === preset.id
                  ? 'bg-[#1E4DBD] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'Semua Siswa' },
            { id: 'TIDAK_HADIR', label: 'Sakit / Izin / Alpha' },
            { id: 'SAKIT', label: 'Sakit' },
            { id: 'IZIN', label: 'Izin' },
            { id: 'ALPHA', label: 'Alpha' },
          ].map((kat) => (
            <button
              key={kat.id}
              type="button"
              onClick={() => setFilterKategori(kat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                filterKategori === kat.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {kat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ringkasan Rekapitulasi Kehadiran (Hadir, Telat, Sakit, Izin, Alpha) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl">
          <span className="text-[11px] font-semibold text-emerald-800 block">Total Hadir</span>
          <span className="text-xl font-bold text-emerald-700 tabular-nums">{recapTotals.hadir}</span>
        </div>
        <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl">
          <span className="text-[11px] font-semibold text-amber-800 block">Total Terlambat</span>
          <span className="text-xl font-bold text-amber-700 tabular-nums">{recapTotals.late}</span>
        </div>
        <div className="bg-sky-50/70 border border-sky-200 p-3.5 rounded-xl">
          <span className="text-[11px] font-semibold text-sky-800 block">Total Sakit</span>
          <span className="text-xl font-bold text-sky-700 tabular-nums">{recapTotals.sakit}</span>
        </div>
        <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 rounded-xl">
          <span className="text-[11px] font-semibold text-indigo-800 block">Total Izin</span>
          <span className="text-xl font-bold text-indigo-700 tabular-nums">{recapTotals.izin}</span>
        </div>
        <div className="bg-rose-50/70 border border-rose-200 p-3.5 rounded-xl col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-rose-800 block">Total Alpha</span>
          <span className="text-xl font-bold text-rose-700 tabular-nums">{recapTotals.alpha}</span>
        </div>
      </div>

      {/* Filter Controls Toolbar */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 shadow-xs">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Filter Tingkat
          </label>
          <select
            value={filterTingkat}
            onChange={(e) => {
              setFilterTingkat(e.target.value);
              setFilterKelas('ALL');
            }}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          >
            <option value="ALL">
              Semua Tingkat ({availableTingkat.join(', ')})
            </option>
            {availableTingkat.map((t) => (
              <option key={t} value={t}>
                Tingkat {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Filter Kelas Spesifik ({availableClasses.length} Kelas)
          </label>
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          >
            <option value="ALL">Semua Kelas</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                Kelas {cls}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tanggal Awal
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setPeriodPreset('CUSTOM');
              setStartDate(e.target.value);
            }}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tanggal Akhir
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setPeriodPreset('CUSTOM');
              setEndDate(e.target.value);
            }}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Cari Siswa / NISN
          </label>
          <input
            type="text"
            placeholder="Ketik nama atau NISN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>
      </div>

      {/* Daftar Sesi Kelas pada Periode & Filter Ini (Bisa Edit / Hapus Sesi Demo) */}
      {filteredPeriodSessions.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Daftar Sesi Kelas pada Filter Ini ({filteredPeriodSessions.length} Sesi)
              </h2>
              <p className="text-[11px] text-slate-500">
                Anda dapat mengedit sesi, mengubah kehadiran siswa, atau menghapus sesi percobaan/demo agar tidak masuk ke rekapitulasi.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[240px] overflow-y-auto">
            {filteredPeriodSessions.map((sess) => (
              <div
                key={sess.id}
                className="py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-slate-50/70 px-2 rounded-lg"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      Kelas {sess.class_name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold text-[10px] border ${
                        sess.status === 'OPEN'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {sess.status === 'OPEN' ? 'Sesi Terbuka' : 'Sesi Ditutup'}
                    </span>
                    <span className="font-bold text-slate-900">
                      {sess.topic} (Sesi #{sess.session_number})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 tabular-nums">
                    Tanggal: {String(sess.date || '').slice(0, 10)} • Guru: {sess.teacher_name || '-'} • Hadir: {sess.total_present ?? 0} / {sess.total_students ?? 0} Siswa
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href={`/attendance/session/${sess.id}`}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
                  >
                    Kelola Absensi
                  </Link>
                  <button
                    type="button"
                    onClick={() => openEditSessionModal(sess)}
                    className="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold cursor-pointer"
                  >
                    Edit Sesi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(sess)}
                    className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold cursor-pointer"
                  >
                    Hapus Sesi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabel Data Rekapitulasi */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">NISN</th>
                <th className="py-3 px-4 font-semibold">Nama Siswa</th>
                <th className="py-3 px-3 font-semibold text-center">Kelas</th>
                <th className="py-3 px-3 font-semibold text-center">Total Sesi</th>
                <th className="py-3 px-3 font-semibold text-center text-emerald-700">Hadir</th>
                <th className="py-3 px-3 font-semibold text-center text-amber-700">Telat</th>
                <th className="py-3 px-3 font-semibold text-center text-blue-700">Sakit</th>
                <th className="py-3 px-3 font-semibold text-center text-indigo-700">Izin</th>
                <th className="py-3 px-3 font-semibold text-center text-rose-700">Alpha</th>
                <th className="py-3 px-4 text-right font-semibold">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan="10" className="py-8 text-center text-slate-500">Memuat rekap presensi...</td></tr>
              ) : error ? (
                <tr><td colSpan="10" className="py-8 text-center text-rose-600" role="alert">{error}</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan="10" className="py-8 text-center text-slate-500">Tidak ada data presensi pada filter ini.</td></tr>
              ) : filteredRows.map((item) => (
                <tr key={item.student_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 tabular-nums font-mono text-slate-500">{item.nisn}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      {item.class_name}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums text-slate-600 font-medium">
                    {item.total_meetings}
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums font-bold text-emerald-700">
                    {item.hadir_count}
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums text-amber-700 font-medium">
                    {item.late_count}
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums text-blue-700 font-medium">
                    {item.sakit_count}
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums text-indigo-700 font-medium">
                    {item.izin_count}
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums font-bold text-rose-700">
                    {item.alpha_count}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        item.percentage >= 90
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.percentage >= 75
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {item.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
              loading={isSavingSession}
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
                Batas Waktu Keterlambatan (Menit)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="240"
                  value={editLateMinutes}
                  onChange={(e) => setEditLateMinutes(Math.max(0, Number(e.target.value) || 0))}
                  className="w-28 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 tabular-nums"
                />
                <span className="text-[11px] text-slate-500">
                  menit (0 = Tanpa Batas Terlambat)
                </span>
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
