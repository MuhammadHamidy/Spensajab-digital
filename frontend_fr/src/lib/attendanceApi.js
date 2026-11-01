const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '/api' : 'http://spensajab-backend:8080/api');

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': 'user-guru-1',
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

export const attendanceApi = {
  // Sesi Kelas
  openSession: async (classId, topic, sessionNumber, teacherId = '') => {
    return fetchJson('/school/sessions/open', {
      method: 'POST',
      headers: teacherId ? { 'X-User-Id': teacherId } : undefined,
      body: JSON.stringify({
        class_id: classId,
        topic: topic || 'Pembelajaran Tatap Muka',
        session_number: Number(sessionNumber) || 1,
      }),
    });
  },

  closeSession: async (sessionId, teacherId = '') => {
    return fetchJson(`/school/sessions/${sessionId}/close`, {
      method: 'POST',
      headers: teacherId ? { 'X-User-Id': teacherId } : undefined,
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
