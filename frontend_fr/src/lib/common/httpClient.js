import { API_BASE_URL } from './config';
import { tokenStorage } from './tokenStorage';

export async function httpRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = tokenStorage.getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? 10000);

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const { timeout, signal, ...fetchOptions } = options;
    const response = await fetch(url, {
      ...fetchOptions,
      signal: signal || controller.signal,
      headers,
    });

    const responseText = await response.text();
    let data = {};
    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: responseText.trim() };
      }
    }

    if (!response.ok) {
      const errorMsg = data?.error?.message || data?.message || `HTTP Error ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    const msg = err instanceof Error
      ? (err.name === 'AbortError'
        ? 'Waktu tunggu koneksi ke server habis.'
        : err.message)
      : (typeof err === 'string' ? err : 'Koneksi ke server backend terputus.');
    console.warn(`[HTTP Client Warning] Request to ${url} failed:`, msg);
    throw new Error(msg);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const httpClient = {
  get: (endpoint, options) => httpRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => httpRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options) => httpRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, options) => httpRequest(endpoint, { ...options, method: 'DELETE' }),
};
