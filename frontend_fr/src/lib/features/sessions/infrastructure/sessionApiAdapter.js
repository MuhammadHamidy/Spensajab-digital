import { httpClient } from '@/lib/common/httpClient';

export const sessionApiAdapter = {
  getByClassId: async (classId) => {
    try {
      const res = await httpClient.get(`/sessions/class/${classId}`);
      return Array.isArray(res.data) ? res.data : (res.data?.sessions || []);
    } catch (err) {
      console.warn('Failed to fetch class sessions:', err.message);
      return [];
    }
  },

  getById: async (id) => {
    try {
      const res = await httpClient.get(`/sessions/${id}`);
      return res.data || null;
    } catch (err) {
      console.warn('Failed to fetch session by ID:', err.message);
      return null;
    }
  },

  create: async (sessionData) => {
    const res = await httpClient.post('/sessions', sessionData);
    return res.data;
  },

  update: async (id, sessionData) => {
    const res = await httpClient.put(`/sessions/${id}`, sessionData);
    return res.data;
  },

  delete: async (id) => {
    const res = await httpClient.delete(`/sessions/${id}`);
    return res.data;
  },

  openSession: async (id) => {
    const res = await httpClient.post(`/sessions/${id}/open`);
    return res.data;
  },

  closeSession: async (id) => {
    const res = await httpClient.post(`/sessions/${id}/close`);
    return res.data;
  },
};
