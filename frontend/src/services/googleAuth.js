import api from './api';

/**
 * Send Google ID token to backend to perform login (or account creation).
 * @param {string} idToken - Google ID token (credential)
 * @returns {Promise<{success: boolean, token?: string, user?: object, message?: string}>}
 */
export default async function loginWithGoogle(idToken) {
  try {
    const resp = await api.post('/auth/google', { idToken });
    const { token, ...user } = resp.data;
    return { success: true, token, user };
  } catch (err) {
    const message = err?.response?.data?.message || err.message || 'Google login failed';
    return { success: false, message };
  }
}
