import { httpClient } from '@/lib/common/httpClient';

export const attendanceApiAdapter = {
  verifyFace: async ({ sessionId, studentId, faceVector, photoUrl, latitude, longitude, location }) => {
    const res = await httpClient.post('/attendances/verify-face', {
      session_id: sessionId,
      student_id: studentId,
      face_vector: faceVector,
      photo_url: photoUrl,
      latitude,
      longitude,
      location,
    });
    return res.data;
  },

  manualAttendance: async ({ sessionId, studentId, status, notes }) => {
    const res = await httpClient.post('/attendances/manual', {
      session_id: sessionId,
      student_id: studentId,
      status,
      notes,
    });
    return res.data;
  },

  updateAttendance: async (attendanceId, { status, notes }) => {
    const res = await httpClient.put(`/attendances/${attendanceId}`, {
      status,
      notes,
    });
    return res.data;
  },

  getSessionAttendance: async (sessionId) => {
    try {
      const res = await httpClient.get(`/attendances/session/${sessionId}`);
      return Array.isArray(res.data) ? res.data : (res.data?.attendances || []);
    } catch (err) {
      console.warn('Failed to fetch session attendance:', err.message);
      return [];
    }
  },

  getStudentAttendance: async (studentId, classId = '') => {
    const query = classId ? `?class_id=${classId}` : '';
    const res = await httpClient.get(`/attendances/student/${studentId}${query}`);
    return Array.isArray(res.data) ? res.data : (res.data?.attendances || []);
  },

  getClassRekap: async (classId) => {
    try {
      const res = await httpClient.get(`/attendances/rekap/class/${classId}`);
      return res.data || { totalSessions: 0, students: [] };
    } catch (err) {
      console.warn('Failed to fetch class rekap:', err.message);
      return { totalSessions: 0, students: [] };
    }
  },
};
