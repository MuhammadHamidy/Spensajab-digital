import { httpClient } from '@/lib/common/httpClient';

export const accountApiAdapter = {
  getAll: async (role = '') => {
    try {
      const query = role ? `?role=${encodeURIComponent(role)}` : '';
      const res = await httpClient.get(`/accounts${query}`);
      return res.data || [];
    } catch (error) {
      throw new Error(error.message || 'Data akun tidak dapat dimuat dari backend');
    }
  },

  getTeachers: async () => {
    try {
      const res = await httpClient.get('/accounts?role=GURU');
      const accounts = Array.isArray(res.data) ? res.data : [];
      return accounts.filter((account) => (
        (account.role_name || account.roleName || '').toUpperCase() === 'GURU'
      ));
    } catch (err) {
      console.warn('Backend akun guru tidak dapat diakses:', err.message);
      throw err;
    }
  },

  getStudents: async () => {
    try {
      const res = await httpClient.get('/accounts?role=SISWA', { cache: 'no-store' });
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
      const resMhs = await httpClient.get('/accounts?role=MAHASISWA', { cache: 'no-store' });
      if (Array.isArray(resMhs.data) && resMhs.data.length > 0) {
        return resMhs.data;
      }
    } catch (err) {
      console.warn('Backend akun siswa tidak dapat diakses:', err.message);
      return [];
    }
    return [];
  },

  create: async (accountData) => {
    const payload = {
      ...accountData,
      id: accountData.id || `acc-${Date.now()}`,
      full_name: accountData.full_name || accountData.fullName,
      nim_nip: accountData.nim_nip || accountData.nip,
      class_name: accountData.class_name || accountData.className || '',
      course_ids: accountData.course_ids || accountData.selectedCourses || [],
      class_ids: accountData.class_ids || accountData.selectedClasses || [],
      course_names: accountData.course_names || [],
      class_codes: accountData.class_codes || [],
      photo_url: accountData.photo_url || accountData.photoUrl || '',
    };

    try {
      const res = await httpClient.post('/accounts', payload);
      return res.data || payload;
    } catch (error) {
      throw new Error(error?.response?.data?.message || 'Akun tidak dapat dibuat di backend');
    }
  },

  update: async (id, accountData) => {
    const payload = {
      ...accountData,
      id,
      full_name: accountData.full_name || accountData.fullName,
      nim_nip: accountData.nim_nip || accountData.nip,
      class_name: accountData.class_name || accountData.className || '',
      course_ids: accountData.course_ids || accountData.selectedCourses || [],
      class_ids: accountData.class_ids || accountData.selectedClasses || [],
    };

    try {
      const res = await httpClient.put(`/accounts/${id}`, payload);
      return res.data || { ...payload, id };
    } catch (error) {
      throw new Error(error?.message || 'Akun tidak dapat diperbarui di backend');
    }
  },

  delete: async (id) => {
    try {
      const res = await httpClient.delete(`/accounts/${id}`);
      return res.data;
    } catch (error) {
      throw new Error(error?.message || 'Akun tidak dapat dihapus dari backend');
    }
  },

  resetPassword: async (teacherOrId, { newPassword = '', sendEmail = true } = {}) => {
    let t = teacherOrId;
    if (typeof teacherOrId === 'string') {
      const teachers = await accountApiAdapter.getTeachers();
      t = teachers.find((item) => item.id === teacherOrId) || {};
    }

    const generated = newPassword || `Guru#${Math.random().toString(36).substring(2, 8)}`;

    // 1. Try Go backend if available
    try {
      const res = await httpClient.post(`/accounts/${t.id || teacherOrId}/reset-password`, {
        new_password: generated,
        send_email: sendEmail,
      });
      if (res?.data) return res.data;
    } catch (e) {
      // Proceed with direct Next.js mailer
    }

    // 2. If sendEmail is true, send via Next.js internal mailer
    let emailSent = false;
    if (sendEmail && t.email) {
      try {
        const resp = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: t.email,
            teacherName: t.full_name || t.fullName,
            username: t.username,
            newPassword: generated,
            type: 'reset_password',
          }),
        });
        const result = await resp.json();
        if (result.success) {
          emailSent = true;
        } else {
          throw new Error(result.error);
        }
      } catch (errMail) {
        console.warn('Next.js reset email error:', errMail);
        throw new Error('Password berhasil direset, namun pengiriman email gagal: ' + errMail.message);
      }
    }

    return {
      new_password: generated,
      email_sent: emailSent,
      message: 'Password berhasil direset',
    };
  },

  sendAccessEmail: async (teacherOrId, password = '') => {
    let t = teacherOrId;
    if (typeof teacherOrId === 'string') {
      const teachers = await accountApiAdapter.getTeachers();
      t = teachers.find((item) => item.id === teacherOrId) || {};
    }

    if (!t || !t.email) {
      throw new Error('Alamat email guru tidak ditemukan.');
    }

    // 1. Try Go backend if available
    try {
      const res = await httpClient.post(`/accounts/${t.id || teacherOrId}/send-access-email`, {
        password,
      });
      if (res?.data) return res.data;
    } catch (e) {
      // Proceed to Next.js mailer
    }

    // 2. Call Next.js internal /api/email/send
    const resp = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: t.email,
        teacherName: t.full_name || t.fullName,
        username: t.username,
        password: password || 'Silakan hubungi Admin atau gunakan fitur lupa password',
        courseNames: t.course_names || t.courseNames || [],
        classCodes: t.class_codes || t.classCodes || [],
      }),
    });

    const result = await resp.json();
    if (!resp.ok || !result.success) {
      throw new Error(result.error || 'Gagal mengirim email melalui server SMTP.');
    }
    return result;
  },

  updateProfile: async (id, profileData) => {
    const payload = {
      username: profileData.username,
      old_password: profileData.old_password || profileData.oldPassword,
      new_password: profileData.new_password || profileData.newPassword,
      full_name: profileData.full_name || profileData.fullName,
      phone: profileData.phone,
      photo_url: profileData.photo_url || profileData.photoUrl,
    };

    try {
      const res = await httpClient.put(`/accounts/${id}/profile`, payload);
      return res.data;
    } catch (err) {
      return { ...payload, id };
    }
  },
};
