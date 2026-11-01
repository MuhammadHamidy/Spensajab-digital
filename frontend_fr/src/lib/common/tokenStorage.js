const TOKEN_KEY = 'perpusdig_auth_token';
const USER_KEY = 'perpusdig_auth_user';

/**
 * Menyimpan cookie sesi (Session Cookie tanpa atribut expires).
 * Cookie ini secara otomatis dimusnahkan oleh browser saat tab/jendela browser ditutup.
 */
function setSessionCookie(name, value) {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}

function removeCookie(name) {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function getCookie(name) {
  if (typeof window === 'undefined') return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

/**
 * Membersihkan sisa token di localStorage dari versi terdahulu
 * agar tidak terjadi kebocoran sesi setelah browser ditutup.
 */
function purgeLegacyLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('perpusdig_explicit_logout');
  } catch (e) {}
}

export const tokenStorage = {
  getToken: () => {
    if (typeof window === 'undefined') return null;
    purgeLegacyLocalStorage();

    // 1. Ambil dari sessionStorage (khusus tab/jendela aktif)
    let token = null;
    try {
      token = sessionStorage.getItem(TOKEN_KEY);
    } catch (e) {}

    // 2. Jika tidak ada di sessionStorage, cek session cookie
    if (!token) {
      token = getCookie(TOKEN_KEY);
      if (token) {
        try {
          sessionStorage.setItem(TOKEN_KEY, token);
        } catch (e) {}
      }
    }
    return token;
  },

  setToken: (token) => {
    if (typeof window !== 'undefined') {
      purgeLegacyLocalStorage();
      try {
        sessionStorage.setItem(TOKEN_KEY, token);
      } catch (e) {}
      // Set sebagai Session Cookie (hilang saat browser ditutup)
      setSessionCookie(TOKEN_KEY, token);
    }
  },

  getUser: () => {
    if (typeof window === 'undefined') return null;
    purgeLegacyLocalStorage();

    // 1. Ambil dari sessionStorage
    let data = null;
    try {
      data = sessionStorage.getItem(USER_KEY);
    } catch (e) {}

    // 2. Jika belum di sessionStorage, ambil dari session cookie
    if (!data) {
      data = getCookie(USER_KEY);
      if (data) {
        try {
          sessionStorage.setItem(USER_KEY, data);
        } catch (e) {}
      }
    }

    try {
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setUser: (user) => {
    if (typeof window !== 'undefined') {
      purgeLegacyLocalStorage();
      const userStr = JSON.stringify(user);
      try {
        sessionStorage.setItem(USER_KEY, userStr);
      } catch (e) {}
      // Set sebagai Session Cookie (hilang saat browser ditutup)
      setSessionCookie(USER_KEY, userStr);
    }
  },

  clear: () => {
    if (typeof window !== 'undefined') {
      purgeLegacyLocalStorage();
      try {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        sessionStorage.clear();
      } catch (e) {}
      removeCookie(TOKEN_KEY);
      removeCookie(USER_KEY);
    }
  },

  syncCookies: () => {
    if (typeof window !== 'undefined') {
      purgeLegacyLocalStorage();
      let token = null;
      let user = null;
      try {
        token = sessionStorage.getItem(TOKEN_KEY);
        user = sessionStorage.getItem(USER_KEY);
      } catch (e) {}

      if (token && !getCookie(TOKEN_KEY)) {
        setSessionCookie(TOKEN_KEY, token);
      }
      if (user && !getCookie(USER_KEY)) {
        setSessionCookie(USER_KEY, user);
      }
    }
  },
};
