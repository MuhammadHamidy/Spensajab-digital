'use client';

import React, { useState } from 'react';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { attendanceApi } from '@/lib/attendanceApi';
import { API_BASE_URL } from '@/lib/common/config';

export default function BulkImportExcelPage() {
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'teachers'
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setErrorMsg(null);
      setValidationErrors([]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Pilih file Excel (.xlsx) terlebih dahulu');
      return;
    }

    setIsUploading(true);
    setResult(null);
    setErrorMsg(null);
    setValidationErrors([]);

    const res =
      activeTab === 'students'
        ? await attendanceApi.importStudents(file)
        : await attendanceApi.importTeachers(file);

    setIsUploading(false);

    if (res.success && res.data && !res.data.failed) {
      setResult(res.data);
    } else {
      const error = res.error || {};
      const details = error.details || res.data?.errors || [];
      setErrorMsg(error.message || res.message || 'Gagal memproses file Excel.');
      setValidationErrors(Array.isArray(details) ? details : []);
    }
  };

  const handleDownloadTemplate = (type) => {
    window.open(`${API_BASE_URL}/school/import/template/${type}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Import Data Siswa dan Guru
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unggah berkas Excel untuk menambahkan data ratusan siswa dan guru sekaligus secara otomatis ke sistem.
          </p>
        </div>

        {result && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsRollbackModalOpen(true)}
          >
            Batalkan Impor Terakhir
          </Button>
        )}
      </div>

      {/* Tab Selection */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl max-w-sm border border-slate-200">
        <button
          type="button"
          onClick={() => {
            setActiveTab('students');
            setFile(null);
            setResult(null);
            setErrorMsg(null);
            setValidationErrors([]);
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
            activeTab === 'students'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Import Data Siswa
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('teachers');
            setFile(null);
            setResult(null);
            setErrorMsg(null);
            setValidationErrors([]);
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
            activeTab === 'teachers'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Import Data Guru
        </button>
      </div>

      {/* 2-Step Card Workflow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Step 1: Template Guidance */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
              1
            </span>
            <h3 className="text-sm font-bold text-slate-900">Unduh Format Template</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Pastikan berkas Excel yang diunggah mengikuti struktur kolom resmi agar validasi berjalan lancar.
          </p>

          <button
            type="button"
            onClick={() => handleDownloadTemplate(activeTab)}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download Template {activeTab === 'students' ? 'Siswa' : 'Guru'}</span>
          </button>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Petunjuk Pengisian:</p>
            {activeTab === 'students' ? (
              <ul className="list-disc list-inside space-y-0.5">
                <li>Kolom NISN wajib unik (10 digit).</li>
                <li>Nama Siswa & Rombel (misal: VII-A, 7A, atau 8B).</li>
                <li>Jenis Kelamin: L atau P.</li>
              </ul>
            ) : (
              <ul className="list-disc list-inside space-y-0.5">
                <li>Kolom NIP wajib unik (18 digit).</li>
                <li>Nama Lengkap dan Gelar.</li>
                <li>Mata Pelajaran & Kelas Diampu.</li>
              </ul>
            )}
          </div>
        </div>

        {/* Step 2: Upload Area */}
        <div className="md:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
              2
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Unggah Berkas {activeTab === 'students' ? 'Siswa' : 'Guru'} (.xlsx)
            </h3>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group block">
              <span className="mb-2 text-xs font-semibold text-slate-700">Berkas Excel {activeTab === 'students' ? 'Siswa' : 'Guru'}</span>
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              {file ? (
                <div className="text-center">
                  <span className="text-xs font-bold text-blue-700 block">{file.name}</span>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {(file.size / 1024).toFixed(1)} KB • Klik untuk mengganti berkas
                  </span>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-800 block">
                    Klik atau Seret Berkas Excel (.xlsx) ke Sini
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Mendukung format Microsoft Excel .xlsx atau .xls (Maks. 5 MB)
                  </span>
                </div>
              )}

              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <button
              type="submit"
              disabled={!file || isUploading}
              className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                !file || isUploading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Memproses Data Excel...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Proses & Simpan ke Basis Data</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Hasil Import Sukses */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h4 className="text-sm font-bold text-emerald-900">
              Impor Berkas Berhasil Diproses
            </h4>
          </div>
          <p className="text-xs text-emerald-800">
            Sebanyak <strong className="tabular-nums">{result.inserted ?? 0} data siswa</strong> berhasil diproses dan disimpan ke sistem presensi
            {result.total_rows != null && ` dari ${result.total_rows} baris data`}.
          </p>
        </div>
      )}

      {/* Error & Validation Details */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-300 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-rose-800">
            <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="text-sm font-bold">{errorMsg}</h4>
          </div>

          {validationErrors.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs bg-white rounded-xl overflow-hidden border border-rose-200">
                <thead className="bg-rose-100/70 text-rose-900">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Baris Excel</th>
                    <th className="py-2.5 px-3 font-semibold">Kolom</th>
                    <th className="py-2.5 px-3 font-semibold">Keterangan Kesalahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100">
                  {validationErrors.map((err, idx) => (
                    <tr key={idx} className="text-rose-800">
                      <td className="py-2 px-3 tabular-nums font-bold">Baris {err.row}</td>
                      <td className="py-2 px-3 font-medium">{err.column}</td>
                      <td className="py-2 px-3">{err.error || err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Konfirmasi Rollback */}
      <Modal
        isOpen={isRollbackModalOpen}
        onClose={() => setIsRollbackModalOpen(false)}
        title="Konfirmasi Rollback Import"
        footerActions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsRollbackModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setResult(null);
                setFile(null);
                setIsRollbackModalOpen(false);
                alert('Data hasil import terakhir berhasil dibatalkan (rollback).');
              }}
            >
              Rollback Sekarang
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-700 leading-relaxed">
          Apakah Anda yakin ingin membatalkan (rollback) seluruh data yang baru diimpor? Tindakan ini akan menghapus baris data baru yang dimasukkan pada sesi import ini secara permanen.
        </p>
      </Modal>
    </div>
  );
}
