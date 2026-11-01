import { httpClient } from '@/lib/common/httpClient';

export const courseApiAdapter = {
  getAll: async (search = '') => {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await httpClient.get(`/school/courses${query}`);
      return Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.courses) ? res.data.courses : []);
    } catch (err) {
      console.warn('Backend /school/courses tidak dapat diakses:', err.message);
      return [];
    }
  },

  getById: async (id) => {
    try {
      const res = await httpClient.get(`/school/courses/${id}`);
      return res.data;
    } catch {
      return null;
    }
  },

  create: async (courseData) => {
    try {
      const res = await httpClient.post('/school/courses', courseData);
      return res.data?.course || res.data;
    } catch (err) {
      throw err;
    }
  },

  update: async (id, courseData) => {
    try {
      const res = await httpClient.put(`/school/courses/${id}`, courseData);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  delete: async (id) => {
    try {
      const res = await httpClient.delete(`/school/courses/${id}`);
      return res.data;
    } catch (err) {
      throw err;
    }
  },
};
