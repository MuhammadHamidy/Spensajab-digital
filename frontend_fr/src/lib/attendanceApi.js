import { tokenStorage } from '@/lib/common/tokenStorage';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '/api' : 'http://spensajab-backend:8080/api');

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const user = tokenStorage.getUser();
  const headers = {
    'Content-Type': 'application/json',
    ...(user?.id ? { 'X-User-Id': user.id } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const json = await res.json();
    return json;
  } catch (err) {
    console.warn(`[API] Endpoint ${url} offline / unreachable:`, err.message);
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: err.message },
    };
  }
}

const LATE_MINUTES_STORAGE_KEY = 'spensajab_default_late_minutes';

export function getSavedLateMinutes(fallback = 30) {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(LATE_MINUTES_STORAGE_KEY);
  if (raw === null || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function saveDefaultLateMinutes(minutes) {
  if (typeof window === 'undefined') return;
  const parsed = Number(minutes);
  if (Number.isFinite(parsed) && parsed >= 0) {
    window.localStorage.setItem(LATE_MINUTES_STORAGE_KEY, String(Math.round(parsed)));
  }
}

export function resolveSessionLateMinutes(session) {
  if (!session) return getSavedLateMinutes(30);
  if (!session.late_cutoff_at) return 0; // 0 = Tanpa Batas Keterlambatan
  if (typeof session.late_threshold_minutes === 'number' && session.late_threshold_minutes > 0) {
    return session.late_threshold_minutes;
  }
  if (session.opened_at && session.late_cutoff_at) {
    const diffMins = Math.round(
      (new Date(session.late_cutoff_at).getTime() - new Date(session.opened_at).getTime()) / 60000
    );
    return diffMins > 0 ? diffMins : 1;
  }
  return getSavedLateMinutes(30);
}

export const attendanceApi = {
  getDefaultLateMinutes: getSavedLateMinutes,
  setDefaultLateMinutes: saveDefaultLateMinutes,
  resolveSessionLateMinutes,

  // Sesi Kelas
  openSession: async (classId, topic, sessionNumber, teacherId = '', lateThresholdMinutes = undefined) => {
    const resolvedLateMinutes =
      lateThresholdMinutes !== undefined && lateThresholdMinutes !== null && lateThresholdMinutes !== ''
        ? Number(lateThresholdMinutes)
        : getSavedLateMinutes(30);
    saveDefaultLateMinutes(resolvedLateMinutes);

    return fetchJson('/school/sessions/open', {
      method: 'POST',
      headers: teacherId ? { 'X-User-Id': teacherId } : undefined,
      body: JSON.stringify({
        class_id: classId,
        topic: topic || 'Pembelajaran Tatap Muka',
        session_number: Number(sessionNumber) || 1,
        late_threshold_minutes: resolvedLateMinutes,
      }),
    });
  },

  closeSession: async (sessionId, teacherId = '') => {
    return fetchJson(`/school/sessions/${sessionId}/close`, {
      method: 'POST',
      headers: teacherId ? { 'X-User-Id': teacherId } : undefined,
    });
  },

  editSession: async (sessionId, payload = {}) => {
    return fetchJson(`/school/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteSession: async (sessionId) => {
    return fetchJson(`/school/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  getSessionDetail: async (sessionId) => {
    return fetchJson(`/school/sessions/${sessionId}`);
  },

  getSessions: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/school/sessions${query ? `?${query}` : ''}`);
  },

  // Scan QR Code
  scanQRCode: async (sessionId, qrCodeToken) => {
    return fetchJson(`/school/sessions/${sessionId}/scan`, {
      method: 'POST',
      body: JSON.stringify({ qr_code_token: qrCodeToken }),
    });
  },

  // Manual Override
  manualOverride: async (sessionId, studentId, status, notes = '') => {
    return fetchJson(`/school/sessions/${sessionId}/attendances/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  // Live Monitoring (10 Admin)
  getLiveMonitoring: async () => {
    return fetchJson('/school/monitoring/live');
  },

  getAttendanceReport: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/school/reports/attendance${query ? `?${query}` : ''}`);
  },

  // Import Excel
  importStudents: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${BASE_URL}/school/import/students`, {
        method: 'POST',
        headers: { 'X-User-Id': 'user-admin-1' },
        body: formData,
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: { message: err.message } };
    }
  },

  importTeachers: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${BASE_URL}/school/import/teachers`, {
        method: 'POST',
        headers: { 'X-User-Id': 'user-admin-1' },
        body: formData,
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: { message: err.message } };
    }
  },
};
