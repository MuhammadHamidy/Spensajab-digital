export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  DOSEN: 'DOSEN',
  MAHASISWA: 'MAHASISWA',
};

export const ATTENDANCE_STATUS = {
  HADIR: 'HADIR',
  IZIN: 'IZIN',
  SAKIT: 'SAKIT',
  ALPA: 'ALPA',
};

export const ATTENDANCE_METHOD = {
  FACE_RECOGNITION: 'FACE_RECOGNITION',
  MANUAL: 'MANUAL',
  QR_CODE: 'QR_CODE',
};

export const SESSION_STATUS = {
  UPCOMING: 'UPCOMING',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
};
