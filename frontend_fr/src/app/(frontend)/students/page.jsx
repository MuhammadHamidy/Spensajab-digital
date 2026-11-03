'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import { API_BASE_URL } from '@/lib/common/config';

export default function StudentsQRManagementPage() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedCardForModal, setSelectedCardForModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  // Modal Tambah Siswa
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNisn, setNewNisn] = useState('');
  const [newName, setNewName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newGender, setNewGender] = useState('L');
  const [newPhone, setNewPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const accounts = await accountApiAdapter.getStudents();
      if (!Array.isArray(accounts)) {
        setStudents([]);
        return;
      }
      const importedStudents = accounts
        .filter(
          (account) =>
            account.role_name === 'SISWA' ||
            account.roleName === 'SISWA' ||
            account.role_id === 'role-siswa'
        )
        .map((account) => ({
          id: account.id,
          name: account.full_name || account.fullName || account.name || '-',
          nisn: account.nisn || account.nim_nip || '',
          className: account.class_name || account.className || '-',
          gender: account.gender === 'P' ? 'Perempuan' : 'Laki-laki',
          qrToken: account.qr_code_token || account.qrToken || account.id,
        }));
      setStudents(importedStudents);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const classOptions = useMemo(
    () => ['ALL', ...new Set(students.map((student) => student.className).filter((c) => c && c !== '-'))],
    [students]
  );

  const filtered = useMemo(
    () =>
      students.filter((s) => {
        const matchClass = selectedClass === 'ALL' || s.className === selectedClass;
        const matchSearch =
          !search ||
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.nisn.includes(search);
        return matchClass && matchSearch;
      }),
    [students, selectedClass, search]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, search, pageSize]);

  const effectivePageSize = pageSize === 'ALL' ? Math.max(1, filtered.length) : Number(pageSize) || 9;
  const totalPages = Math.max(1, Math.ceil(filtered.length / effectivePageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, filtered.length);
  const paginatedStudents = useMemo(
    () => (pageSize === 'ALL' ? filtered : filtered.slice(startIndex, endIndex)),
    [filtered, pageSize, startIndex, endIndex]
  );

  const visiblePageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }
    const pages = [1];
    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);
    if (start > 2) pages.push('...');
    for (let p = start; p <= end; p += 1) {
      pages.push(p);
    }
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  }, [totalPages, safeCurrentPage]);

  const handlePrint = () => {
    window.print();
  };

  const handleAddStudent = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const cleanNisn = newNisn.trim();
    const cleanName = newName.trim();
    const cleanClass = newClassName.trim().toUpperCase();

    if (!cleanNisn || !cleanName || !cleanClass) {
      setFormError('NISN, nama siswa, dan kode rombel wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      await accountApiAdapter.create({
        username: `siswa_${cleanNisn}`,
        email: `${cleanNisn}@siswa.sekolah.sch.id`,
        full_name: cleanName,
        nim_nip: cleanNisn,
        nisn: cleanNisn,
        class_name: cleanClass,
        gender: newGender,
        phone: newPhone.trim(),
        role_id: 'role-siswa',
      });
      await loadStudents();
      setIsAddModalOpen(false);
      setNewNisn('');
      setNewName('');
      setNewClassName('');
      setNewGender('L');
      setNewPhone('');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`Hapus data siswa ${student.name} (NISN: ${student.nisn})?`)) return;
    try {
      await accountApiAdapter.delete(student.id);
      setSelectedCardForModal(null);
      await loadStudents();
    } catch (err) {
      alert(err.message || 'Gagal menghapus siswa');
    }
  };

  return (
    <div className="students-print-page max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Data Siswa & Cetak Kartu QR
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar peserta didik dan cetak lembar kartu QR presensi resmi SMP Negeri 1 Jabon.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setFormError('');
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Tambah Siswa</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Cetak Lembar Kartu (Print PDF)</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Toolbar */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1">Rombel:</span>
          {classOptions.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedClass(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedClass === c
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {c === 'ALL' ? 'Semua Rombel' : `Kelas ${c}`}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Cari Siswa / NISN
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Cari nama siswa atau NISN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Info Jumlah & Pilihan Per Halaman */}
      {!isLoading && filtered.length > 0 && (
        <div className="bg-white border border-slate-200/90 px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shadow-xs print:hidden">
          <div className="tabular-nums">
            Menampilkan <strong className="text-slate-900">{startIndex + 1}</strong>–
            <strong className="text-slate-900">{endIndex}</strong> dari{' '}
            <strong className="text-slate-900">{filtered.length}</strong> siswa
            {selectedClass !== 'ALL' && (
              <span className="ml-1 text-blue-600 font-semibold">(Kelas {selectedClass})</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="students-page-size" className="font-semibold text-slate-600">
              Tampilkan per halaman:
            </label>
            <select
              id="students-page-size"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value={9}>9 Kartu</option>
              <option value={18}>18 Kartu</option>
              <option value={36}>36 Kartu</option>
              <option value={72}>72 Kartu</option>
              <option value="ALL">Semua ({filtered.length} Kartu)</option>
            </select>
          </div>
        </div>
      )}

      {/* Grid Kartu Siswa (Print Layout Grid A4 / ID Card) */}
      {isLoading ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-500">
          Memuat data siswa...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-800 text-sm">Belum Ada Data Siswa</p>
          <p>Tambahkan siswa melalui tombol &quot;Tambah Siswa&quot; di atas atau unggah Excel pada menu Import Data.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-2 print:gap-4">
            {paginatedStudents.map((student) => (
              <div
                key={student.id}
                className="student-qr-card bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition-all print:border-black print:text-black print:rounded-lg print:shadow-none"
              >
                {/* Header Kartu dengan Logo Resmi */}
                <div className="print-card-header flex items-center justify-between border-b border-slate-100 pb-3 print:border-gray-300">
                  <div className="flex items-center gap-2.5">
                    <div className="student-card-logo w-9 h-9 rounded-lg bg-white border border-slate-200/80 p-0.5 flex items-center justify-center shrink-0">
                      <Image
                        src="/image/logo-jabon.png"
                        alt="Logo SMPN 1 Jabon"
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <span className="student-card-school text-[10px] font-bold text-blue-600 tracking-wider uppercase block print:text-black">
                        SMP NEGERI 1 JABON
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 print:text-black leading-tight truncate max-w-[170px]">
                        {student.name}
                      </h3>
                      <p className="student-card-nisn text-[11px] text-slate-500 tabular-nums print:text-gray-700">
                        NISN: {student.nisn}
                      </p>
                    </div>
                  </div>

                  <span className="student-card-class px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold print:border-black print:bg-white print:text-black">
                    {student.className}
                  </span>
                </div>

                {/* Area QR Code */}
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200/80 rounded-xl print:bg-white print:border-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${API_BASE_URL}/school/qrcode/${encodeURIComponent(student.qrToken)}?size=160`}
                    alt={`QR ${student.name}`}
                    className="w-32 h-32 object-contain rounded-md"
                    onError={(e) => {
                      e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${student.qrToken}`;
                    }}
                  />
                  <span className="student-card-token text-[11px] text-slate-500 font-mono mt-2 tabular-nums print:text-black">
                    Token: {student.qrToken.slice(0, 18)}...
                  </span>
                </div>

                {/* Footer Kartu */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 print:hidden">
                  <span className="text-slate-500 font-medium">{student.gender}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteStudent(student)}
                      className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                    >
                      Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCardForModal(student)}
                      className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      Detail Token →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigasi Halaman (Paging) */}
          {totalPages > 1 && (
            <div className="bg-white border border-slate-200/90 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs print:hidden">
              <span className="text-xs text-slate-600 tabular-nums">
                Halaman <strong className="text-slate-900">{safeCurrentPage}</strong> dari{' '}
                <strong className="text-slate-900">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  ← Sebelumnya
                </button>

                {visiblePageNumbers.map((pageNum, idx) =>
                  pageNum === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-xs text-slate-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[32px] px-2.5 py-1.5 rounded-lg text-xs font-semibold tabular-nums transition-all cursor-pointer ${
                        safeCurrentPage === pageNum
                          ? 'bg-[#1E4DBD] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Tambah Siswa */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Data Siswa Baru"
        footerActions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSubmitting}
              onClick={handleAddStudent}
            >
              Simpan Siswa
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddStudent} className="space-y-3.5 text-xs">
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{formError}</p>}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              NISN Siswa
            </label>
            <input
              type="text"
              required
              value={newNisn}
              onChange={(e) => setNewNisn(e.target.value)}
              placeholder="Contoh: 0081293820"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Nama Lengkap Siswa
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contoh: Muhammad Rizky Pratama"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Rombel / Kelas
              </label>
              <input
                type="text"
                required
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Contoh: 7A"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Jenis Kelamin
              </label>
              <select
                value={newGender}
                onChange={(e) => setNewGender(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
              >
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              No. HP Orang Tua (Opsional)
            </label>
            <input
              type="text"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Contoh: 081298765432"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 tabular-nums"
            />
          </div>
        </form>
      </Modal>

      {/* Modal Detail Token Siswa */}
      <Modal
        isOpen={Boolean(selectedCardForModal)}
        onClose={() => setSelectedCardForModal(null)}
        title="Detail Token Kartu Siswa"
        footerActions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedCardForModal(null)}
          >
            Tutup
          </Button>
        }
      >
        {selectedCardForModal && (
          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Siswa:</span>
                <span className="font-bold text-slate-900">{selectedCardForModal.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NISN:</span>
                <span className="font-semibold text-slate-900 tabular-nums">{selectedCardForModal.nisn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rombel Kelas:</span>
                <span className="font-bold text-blue-600">{selectedCardForModal.className}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jenis Kelamin:</span>
                <span className="text-slate-700">{selectedCardForModal.gender}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block mb-1 font-semibold">Payload String Token QR:</span>
              <div className="bg-slate-50 border border-slate-300 p-3 rounded-xl break-all font-mono tabular-nums text-[11px] text-slate-900 select-all">
                {selectedCardForModal.qrToken}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
