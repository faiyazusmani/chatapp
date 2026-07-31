/**
 * Google OAuth2 client configuration
 *
 * Environment variables used:
 *  - GOOGLE_CLIENT_ID (required for verifying ID tokens)
 *  - GOOGLE_CLIENT_SECRET (optional, required for code exchange flows)
 *  - GOOGLE_REDIRECT_URI (optional)
 */
const { OAuth2Client } = require('google-auth-library');

const clientId = process.env.GOOGLE_CLIENT_ID || '';
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
const redirectUri = process.env.GOOGLE_REDIRECT_URI || '';

const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

module.exports = oauth2Client;
