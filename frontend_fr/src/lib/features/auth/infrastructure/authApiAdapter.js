import { httpClient } from '@/lib/common/httpClient';

export const authApiAdapter = {
  login: async (username, password) => {
    const res = await httpClient.post('/auth/login', { username, password });
    return res.data;
  },

  getAccounts: async (roleName = '') => {
    const query = roleName ? `?role=${roleName}` : '';
    const res = await httpClient.get(`/accounts${query}`);
    return res.data;
  },

  createAccount: async (accountData) => {
    const res = await httpClient.post('/accounts', accountData);
    return res.data;
  },

  getRoles: async () => {
    const res = await httpClient.get('/roles');
    return res.data;
  },
};
