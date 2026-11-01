// Direktori Master Data Siswa & Kartu QR Resmi SMP Negeri 1 Jabon
// Digunakan sebagai single source of truth untuk halaman cetak kartu dan verifikasi offline scan

export const MASTER_STUDENTS = [
  {
    id: 'user-siswa-1',
    nisn: '0081293812',
    name: 'Andi Saputra',
    className: '7A',
    gender: 'Laki-laki',
    qrToken: 'SMPN1JABON-0081293812-7A-X92F1',
    phone: '085712345001',
    status: 'ACTIVE',
  },
  {
    id: 'user-siswa-2',
    nisn: '0081293813',
    name: 'Budi Kurniawan',
    className: '8A',
    gender: 'Laki-laki',
    qrToken: 'SMPN1JABON-0081293813-8A-A41B2',
    phone: '085712345002',
    status: 'ACTIVE',
  },
  {
    id: 'user-siswa-3',
    nisn: '0081293814',
    name: 'Citra Dewi',
    className: '9A',
    gender: 'Perempuan',
    qrToken: 'SMPN1JABON-0081293814-9A-C88D3',
    phone: '085712345003',
    status: 'ACTIVE',
  },
  {
    id: 'user-siswa-4',
    nisn: '0081293815',
    name: 'Dimas Arya Pratama',
    className: '7B',
    gender: 'Laki-laki',
    qrToken: 'SMPN1JABON-0081293815-7B-D11E4',
    phone: '085712345004',
    status: 'ACTIVE',
  },
  {
    id: 'user-siswa-5',
    nisn: '0081293816',
    name: 'Aisyah Putri Azzahra',
    className: '8B',
    gender: 'Perempuan',
    qrToken: 'SMPN1JABON-0081293816-8B-E22F5',
    phone: '085712345005',
    status: 'ACTIVE',
  },
  {
    id: 'user-siswa-6',
    nisn: '0081293817',
    name: 'Fajar Ramadhan',
    className: '9B',
    gender: 'Laki-laki',
    qrToken: 'SMPN1JABON-0081293817-9B-F33G6',
    phone: '085712345006',
    status: 'ACTIVE',
  },
  // Data dari seeder backend
  {
    id: 'user-siswa-01',
    nisn: '0081293801',
    name: 'Ahmad Rizky Pratama',
    className: '7A',
    gender: 'Laki-laki',
    qrToken: 'SCH-VIIA-001-AHP',
    phone: '085700000001',
    status: 'ACTIVE',
  },
  {
    id: 'user-siswa-02',
    nisn: '0081293802',
    name: 'Aisyah Zahra Khairunnisa',
    className: '7A',
    gender: 'Perempuan',
    qrToken: 'SCH-VIIA-002-AZK',
    phone: '085700000002',
    status: 'ACTIVE',
  },
  {
    id: 'user-siswa-03',
    nisn: '0081293803',
    name: 'Bima Aditya Nugraha',
    className: '7A',
    gender: 'Laki-laki',
    qrToken: 'SCH-VIIA-003-BAN',
    phone: '085700000003',
    status: 'ACTIVE',
  },
  {
    id: 'user-siswa-04',
    nisn: '0081293804',
    name: 'Citra Kirana Paramita',
    className: '7A',
    gender: 'Perempuan',
    qrToken: 'SCH-VIIA-004-CKP',
    phone: '085700000004',
    status: 'ACTIVE',
  },
];

/**
 * Mencari siswa berdasarkan QR token atau NISN
 * @param {string} token - Barcode token atau string raw dari scanner
 * @returns {object|null} Data siswa atau null jika tidak ditemukan
 */
export function findStudentByTokenOrNisn(token) {
  if (!token) return null;
  const clean = token.trim();

  // 1. Exact match qrToken
  let match = MASTER_STUDENTS.find((s) => s.qrToken === clean);
  if (match) return match;

  // 2. Match jika token mengandung NISN siswa
  match = MASTER_STUDENTS.find((s) => clean.includes(s.nisn));
  if (match) return match;

  // 3. Match jika token mengandung ID atau nama token
  match = MASTER_STUDENTS.find((s) => s.qrToken.toLowerCase().includes(clean.toLowerCase()));
  if (match) return match;

  return null;
}
