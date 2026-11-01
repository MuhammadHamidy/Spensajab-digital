'use client';

import React, { useState } from 'react';
import Button from '@/components/Button';

const SAMPLE_REKAP_DATA = [
  {
    studentId: 'user-siswa-1',
    nisn: '0081293812',
    name: 'Andi Saputra',
    tingkat: '7',
    className: '7A',
    hadirCount: 14,
    lateCount: 1,
    sakitCount: 1,
    izinCount: 0,
    alphaCount: 0,
    totalMeetings: 16,
    percentage: 93.7,
  },
  {
    studentId: 'user-siswa-2',
    nisn: '0081293813',
    name: 'Budi Kurniawan',
    tingkat: '8',
    className: '8A',
    hadirCount: 15,
    lateCount: 0,
    sakitCount: 0,
    izinCount: 1,
    alphaCount: 0,
    totalMeetings: 16,
    percentage: 93.7,
  },
  {
    studentId: 'user-siswa-3',
    nisn: '0081293814',
    name: 'Citra Dewi',
    tingkat: '9',
    className: '9A',
    hadirCount: 16,
    lateCount: 0,
    sakitCount: 0,
    izinCount: 0,
    alphaCount: 0,
    totalMeetings: 16,
    percentage: 100.0,
  },
  {
    studentId: 'user-siswa-4',
    nisn: '0081293815',
    name: 'Dimas Arya Pratama',
    tingkat: '7',
    className: '7B',
    hadirCount: 12,
    lateCount: 2,
    sakitCount: 1,
    izinCount: 0,
    alphaCount: 1,
    totalMeetings: 16,
    percentage: 87.5,
  },
  {
    studentId: 'user-siswa-5',
    nisn: '0081293816',
    name: 'Aisyah Putri Azzahra',
    tingkat: '8',
    className: '8B',
    hadirCount: 15,
    lateCount: 1,
    sakitCount: 0,
    izinCount: 0,
    alphaCount: 0,
    totalMeetings: 16,
    percentage: 100.0,
  },
  {
    studentId: 'user-siswa-6',
    nisn: '0081293817',
    name: 'Fajar Ramadhan',
    tingkat: '9',
    className: '9B',
    hadirCount: 13,
    lateCount: 1,
    sakitCount: 0,
    izinCount: 2,
    alphaCount: 0,
    totalMeetings: 16,
    percentage: 87.5,
  },
];

export default function AttendanceRekapPage() {
  const [filterTingkat, setFilterTingkat] = useState('ALL'); // 'ALL' | '7' | '8' | '9'
  const [filterKelas, setFilterKelas] = useState('ALL'); // 'ALL' | '7A' | '7B' | '8A' | '8B' | '9A' | '9B'
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [search, setSearch] = useState('');

  // Saring opsi kelas berdasarkan tingkat yang dipilih
  const availableClasses = {
    ALL: ['7A', '7B', '8A', '8B', '9A', '9B'],
    '7': ['7A', '7B'],
    '8': ['8A', '8B'],
    '9': ['9A', '9B'],
  }[filterTingkat];

  const filtered = SAMPLE_REKAP_DATA.filter((item) => {
    const matchTingkat = filterTingkat === 'ALL' || item.tingkat === filterTingkat;
    const matchKelas = filterKelas === 'ALL' || item.className === filterKelas;
    const matchSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.nisn.includes(search);
    return matchTingkat && matchKelas && matchSearch;
  });

  const handleExportExcel = () => {
    const query = new URLSearchParams({
      tingkat: filterTingkat,
      class_id: filterKelas,
      start_date: startDate,
      end_date: endDate,
    }).toString();
    window.open(`http://localhost:8080/api/admin/reports/attendance/export?${query}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Rekapitulasi Presensi Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan akumulasi kehadiran siswa tingkat 7, 8, dan 9 dengan opsi ekspor ke Microsoft Excel (.xlsx).
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export Rekap ke Excel (.xlsx)</span>
        </button>
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
            onChange={(e) => setStartDate(e.target.value)}
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
            onChange={(e) => setEndDate(e.target.value)}
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
              {filtered.map((item) => (
                <tr key={item.studentId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 tabular-nums font-mono text-slate-500">{item.nisn}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      {item.className}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums text-slate-600 font-medium">
                    {item.totalMeetings}
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums font-bold text-emerald-700">
                    {item.hadirCount}
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums text-amber-700 font-medium">
                    {item.lateCount}
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums text-blue-700 font-medium">
                    {item.sakitCount}
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums text-indigo-700 font-medium">
                    {item.izinCount}
                  </td>
                  <td className="py-3 px-3 text-center tabular-nums font-bold text-rose-700">
                    {item.alphaCount}
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
