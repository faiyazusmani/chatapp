import api from './api';
import { auth, googleProvider } from '../config/firebase';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';

/**
 * Exchange Firebase user credential with backend to obtain JWT and session.
 * @param {import('firebase/auth').UserCredential} result
 */
async function exchangeTokenWithBackend(result) {
  const firebaseUser = result.user;
  const idToken = await firebaseUser.getIdToken();
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const googleIdToken = credential?.idToken || null;

  const resp = await api.post('/auth/google', {
    idToken,
    googleIdToken,
    firebaseUser: {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified
    }
  });

  const { token, ...userData } = resp.data;
  return { success: true, token, user: userData };
}

/**
 * Check if the current device is a mobile or touch device where popups are typically blocked.
 */
export function isMobileOrPopupRestricted() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileUA = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTouchDevice = 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 1 && !/Windows NT/i.test(ua);
  return isMobileUA || isTouchDevice;
}

/**
 * Triggers Google Sign-In.
 * Automatically chooses between popup and redirect based on device/browser environment
 * and falls back seamlessly to redirect if popup is blocked.
 * 
 * @param {boolean} [forceRedirect=false] - If true, directly triggers redirect without attempting popup.
 * @returns {Promise<{success: boolean, token?: string, user?: object, message?: string, pendingRedirect?: boolean}>}
 */
export async function signInWithFirebaseGoogle(forceRedirect = false) {
  // Mobile browsers (iOS Safari, mobile Chrome) block window.open popups by default.
  // Using signInWithRedirect provides a smooth, native sign-in flow for any email.
  if (forceRedirect || isMobileOrPopupRestricted()) {
    try {
      await signInWithRedirect(auth, googleProvider);
      return { success: true, pendingRedirect: true };
    } catch (redirectErr) {
      console.error('[GoogleAuth] signInWithRedirect error:', redirectErr);
      return {
        success: false,
        message: redirectErr?.message || 'Failed to open Google login page.'
      };
    }
  }

  // Desktop environment: try popup first
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return await exchangeTokenWithBackend(result);
  } catch (err) {
    console.warn('[GoogleAuth] Popup failed, checking fallback...', err.code, err.message);

    // If popup was blocked by browser or canceled, immediately fallback to redirect
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/cancelled-popup-request' ||
      err.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      try {
        console.info('[GoogleAuth] Falling back to signInWithRedirect...');
        await signInWithRedirect(auth, googleProvider);
        return { success: true, pendingRedirect: true };
      } catch (fallbackErr) {
        return {
          success: false,
          message: 'Unable to open Google sign-in. Please check your browser settings.'
        };
      }
    }

    let message = 'Google sign-in failed. Please try again.';
    if (err.code === 'auth/popup-closed-by-user') {
      message = 'Sign-in window was closed before completing.';
    } else if (err.code === 'auth/network-request-failed') {
      message = 'Network error during Google sign-in. Please check your connection.';
    } else if (err?.response?.data?.message) {
      message = err.response.data.message;
    } else if (err.message) {
      message = err.message;
    }

    return { success: false, message, error: err };
  }
}

/**
 * Direct redirect sign-in (guaranteed to bypass any popup blockers)
 */
export async function signInWithGoogleRedirect() {
  return await signInWithFirebaseGoogle(true);
}

/**
 * Checks for a pending redirect result when the page loads after a Google redirect.
 * @returns {Promise<{success: boolean, token?: string, user?: object, message?: string} | null>}
 */
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (!result || !result.user) {
      return null;
    }
    return await exchangeTokenWithBackend(result);
  } catch (err) {
    console.error('[GoogleAuth] Error in handleRedirectResult:', err);
    let message = err?.response?.data?.message || err?.message || 'Google sign-in failed after redirect.';
    return { success: false, message, error: err };
  }
}

/**
 * Sign out from Firebase Auth
 */
export async function signOutFirebase() {
  try {
    await signOut(auth);
  } catch (err) {
    // non-fatal
  }
}

export default signInWithFirebaseGoogle;
