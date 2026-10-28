// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAKiPWD7e93TCRj6aZyM2_rgqfFTme2LAA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "chat-app-4f049.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "chat-app-4f049",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "chat-app-4f049.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "584539605882",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:584539605882:web:e2406cb356cd42a1e8a4c3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-JNYZQLNS6V"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = getAuth(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Analytics (safely initialized in supported browser environments)
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Graceful fallback if analytics is blocked
  });
}

export { app, auth, googleProvider, analytics };
export default app;
