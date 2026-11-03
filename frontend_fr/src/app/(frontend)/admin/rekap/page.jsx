'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { attendanceApi } from '@/lib/attendanceApi';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';

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
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    classApiAdapter.getAll().then(setClasses).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');
    attendanceApi.getAttendanceReport({
      start_date: startDate,
      end_date: endDate,
      tingkat: filterTingkat,
      class_id: filterKelas,
      search,
    }).then((res) => {
      if (!active) return;
      if (res.success) {
        setRows(Array.isArray(res.data) ? res.data : []);
      } else {
        setRows([]);
        setError(res.error?.message || 'Rekap presensi gagal dimuat');
      }
    }).catch((err) => {
      if (active) {
        setRows([]);
        setError(err.message || 'Rekap presensi gagal dimuat');
      }
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [startDate, endDate, filterTingkat, filterKelas, search]);

  const availableClasses = useMemo(() => classes
    .filter((item) => filterTingkat === 'ALL' || String(item.class_code || '').startsWith(filterTingkat))
    .map((item) => item.class_code)
    .filter(Boolean), [classes, filterTingkat]);

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
            <option value="ALL">Semua Tingkat (7, 8, 9)</option>
            <option value="7">Tingkat 7</option>
            <option value="8">Tingkat 8</option>
            <option value="9">Tingkat 9</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Filter Kelas Spesifik
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
    </div>
  );
}
