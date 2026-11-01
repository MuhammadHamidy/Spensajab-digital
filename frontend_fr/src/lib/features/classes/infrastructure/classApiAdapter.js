import { httpClient } from '@/lib/common/httpClient';
import { tokenStorage } from '@/lib/common/tokenStorage';

export const classApiAdapter = {
  getAll: async ({ dosenId = '', studentId = '', search = '' } = {}) => {
    try {
      let targetDosenId = dosenId;
      const currentUser = tokenStorage.getUser();

      // If user is a GURU/DOSEN and no specific dosenId filter was passed, filter by this teacher
      if (!targetDosenId && currentUser && (currentUser.roleName === 'GURU' || currentUser.roleName === 'DOSEN')) {
        targetDosenId = currentUser.id;
      }

      const params = new URLSearchParams();
      if (targetDosenId) params.append('dosen_id', targetDosenId);
      if (studentId) params.append('student_id', studentId);
      if (search) params.append('search', search);

      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await httpClient.get(`/school/classes${query}`);
      let list = Array.isArray(res.data) ? res.data : (res.data?.classes || []);

      // Client-side strict filter: If logged-in user is a GURU, ensure they only see their assigned classes!
      if (currentUser && (currentUser.roleName === 'GURU' || currentUser.roleName === 'DOSEN') && !dosenId) {
        const allowedCodes = currentUser.class_codes || currentUser.classCodes || [];
        const allowedIds = currentUser.class_ids || currentUser.classIds || [];
        if (allowedCodes.length > 0 || allowedIds.length > 0) {
          list = list.filter((c) => {
            if (c.dosen_id === currentUser.id) return true;
            if (allowedCodes.includes(c.class_code)) return true;
            if (allowedIds.includes(c.id)) return true;
            return false;
          });
        }
      }

      return list;
    } catch (err) {
      console.warn('Failed to fetch classes:', err.message);
      return [];
    }
  },

  getById: async (id) => {
    try {
      const res = await httpClient.get(`/school/classes/${id}`);
      return res.data || null;
    } catch (err) {
      console.warn('Failed to fetch class by ID:', err.message);
      return null;
    }
  },

  create: async (classData) => {
    const res = await httpClient.post('/school/classes', classData);
    return res.data;
  },

  update: async (id, classData) => {
    const res = await httpClient.put(`/school/classes/${id}`, classData);
    return res.data;
  },

  delete: async (id) => {
    const res = await httpClient.delete(`/school/classes/${id}`);
    return res.data;
  },

  getStudents: async (classId) => {
    try {
      const res = await httpClient.get(`/classes/${classId}/students`);
      return Array.isArray(res.data) ? res.data : (res.data?.students || []);
    } catch (err) {
      console.warn('Failed to fetch class students:', err.message);
      return [];
    }
  },

  enrollStudent: async (classId, studentId) => {
    const res = await httpClient.post(`/classes/${classId}/enroll`, { student_id: studentId });
    return res.data;
  },

  unenrollStudent: async (classId, studentId) => {
    const res = await httpClient.delete(`/classes/${classId}/unenroll/${studentId}`);
    return res.data;
  },
};
