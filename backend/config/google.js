/**
 * Google OAuth2 client configuration
 *
 * Environment variables used:
 *  - GOOGLE_CLIENT_ID (required for verifying ID tokens)
 *  - GOOGLE_CLIENT_SECRET (optional, required for code exchange flows)
 *  - GOOGLE_REDIRECT_URI (optional)
 *
 * Fallback: if GOOGLE_CLIENT_ID isn't set in the backend env, fall back to
 * the app's published client ID (it's public — it ships in the frontend
 * bundle anyway). This keeps Google sign-in working on fresh deploys where
 * only the frontend env var was configured.
 */
const { OAuth2Client } = require('google-auth-library');

const FALLBACK_CLIENT_ID = '198016649152-gsu4t27m9o47ovbho2eg0fefr42588rq.apps.googleusercontent.com';

const clientId = process.env.GOOGLE_CLIENT_ID || FALLBACK_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
const redirectUri = process.env.GOOGLE_REDIRECT_URI || '';

const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

module.exports = oauth2Client;
