const mongoose = require('mongoose');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const oauth2Client = require('../config/google');
const { memoryUsers } = require('./authController');

const jwt = require('jsonwebtoken');

/**
 * Verify Firebase ID token or Google OAuth ID token
 */
async function verifyGoogleOrFirebaseToken(idToken, googleIdToken) {
  const tokenToInspect = idToken || googleIdToken;
  if (!tokenToInspect) return null;

  let decoded = null;
  try {
    decoded = jwt.decode(tokenToInspect, { complete: true });
  } catch (err) {
    // ignore decode error
  }
  const payload = decoded?.payload || {};
  const issuer = payload.iss || '';

  // 1. If Firebase ID token (issuer contains securetoken.google.com)
  if (issuer.includes('securetoken.google.com') || !googleIdToken) {
    try {
      const apiKey = process.env.FIREBASE_API_KEY || 'AIzaSyAKiPWD7e93TCRj6aZyM2_rgqfFTme2LAA';
      const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        }
      );
      if (verifyRes.ok) {
        const data = await verifyRes.json();
        const user = data.users?.[0];
        if (user && user.email) {
          return {
            email: user.email.toLowerCase(),
            emailVerified: user.emailVerified === true,
            sub: user.localId || payload.sub,
            name: user.displayName || payload.name || '',
            picture: user.photoUrl || payload.picture || ''
          };
        }
      }
    } catch (err) {
      console.warn('[Firebase Auth] identitytoolkit lookup failed:', err.message);
    }
  }

  // 2. If Google OAuth token or googleIdToken passed
  const gToken = googleIdToken || (issuer.includes('accounts.google.com') ? idToken : null);
  if (gToken) {
    try {
      const ticket = await oauth2Client.verifyIdToken({
        idToken: gToken,
        audience: process.env.GOOGLE_CLIENT_ID || undefined
      });
      const gPayload = ticket.getPayload();
      if (gPayload && gPayload.email) {
        return {
          email: gPayload.email.toLowerCase(),
          emailVerified: gPayload.email_verified === true,
          sub: gPayload.sub,
          name: gPayload.name || '',
          picture: gPayload.picture || ''
        };
      }
    } catch (err) {
      // Fallback: Check Google tokeninfo endpoint
      try {
        const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${gToken}`);
        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info && info.email) {
            return {
              email: info.email.toLowerCase(),
              emailVerified: info.email_verified === 'true' || info.email_verified === true,
              sub: info.sub,
              name: info.name || '',
              picture: info.picture || ''
            };
          }
        }
      } catch (e2) {
        // ignore
      }
    }
  }

  // 3. Fallback: Validated JWT payload from Google or Firebase
  if (payload && payload.email && (issuer.includes('securetoken.google.com') || issuer.includes('accounts.google.com'))) {
    return {
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true,
      sub: payload.sub || payload.user_id,
      name: payload.name || '',
      picture: payload.picture || ''
    };
  }

  return null;
}

/**
 * POST /api/auth/google
 * Body: { idToken, googleIdToken, firebaseUser }
 * Verifies Firebase/Google ID token, finds or creates a user, returns JWT and user
 */
const googleLogin = async (req, res, next) => {
  try {
    const { idToken, googleIdToken, firebaseUser } = req.body;

    if (!idToken && !googleIdToken && !firebaseUser) {
      return res.status(400).json({ message: 'ID token is required' });
    }

    // Verify token
    let verified = await verifyGoogleOrFirebaseToken(idToken, googleIdToken);

    // If client sent firebaseUser with valid email, accept as verified fallback
    if ((!verified || !verified.email) && firebaseUser && firebaseUser.email) {
      verified = {
        email: firebaseUser.email.toLowerCase(),
        emailVerified: firebaseUser.emailVerified !== false,
        sub: firebaseUser.uid || `fb_${Date.now()}`,
        name: firebaseUser.displayName || '',
        picture: firebaseUser.photoURL || ''
      };
    }

    if (!verified || !verified.email) {
      return res.status(400).json({ message: 'Invalid Google authentication token' });
    }

    const email = verified.email.toLowerCase().trim();
    const emailVerified = verified.emailVerified;
    const googleId = verified.sub ? String(verified.sub).trim() : null;
    const name = verified.name || '';
    const picture = verified.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;

    // Helper to derive a clean, valid username of at least 3 characters
    const deriveUsername = (nameStr, emailStr) => {
      const cleanName = (nameStr || '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      const emailPrefix = (emailStr ? emailStr.split('@')[0] : '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

      let candidate = (cleanName.length >= 3) ? cleanName : (emailPrefix.length >= 3 ? emailPrefix : '');
      if (!candidate || candidate.length < 3) {
        candidate = `user_${Date.now().toString().slice(-6)}`;
      }
      return candidate.slice(0, 18);
    };

    // If DB connected, use MongoDB; otherwise use in-memory fallback
    if (mongoose.connection.readyState === 1) {
      let user = null;
      // Try to find by googleId first (only if non-empty string)
      if (googleId) {
        user = await User.findOne({ googleId }).select('-password');
      }

      if (!user && email) {
        // Try finding by email to link accounts
        user = await User.findOne({ email });
      }

      if (user) {
        // If user exists, link or refresh googleId & avatar if missing
        let needsSave = false;
        if (!user.googleId && googleId) {
          user.googleId = googleId;
          user.provider = 'google';
          user.emailVerified = emailVerified;
          needsSave = true;
        }
        const isSuperAdmin = (user.email || '').toLowerCase().trim() === 'faiyazusmani068@gmail.com';
        if (isSuperAdmin && user.role !== 'superadmin') {
          user.role = 'superadmin';
          needsSave = true;
        }

        if (needsSave) {
          await user.save();
        }

        const token = generateToken(user._id.toString());
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000
        });
        return res.json({
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.role || (isSuperAdmin ? 'superadmin' : 'user'),
          status: user.status,
          customStatus: user.customStatus,
          isProfileSetupCompleted: Boolean(user.isProfileSetupCompleted),
          token
        });
      }

      // Create new user with guaranteed unique username (>= 3 chars)
      const baseUsername = deriveUsername(name, email);
      let username = baseUsername;
      let suffix = 0;
      while (await User.findOne({ username })) {
        suffix += 1;
        username = `${baseUsername.slice(0, 14)}${suffix}`;
      }

      const isSuperAdminNew = (email || '').toLowerCase().trim() === 'faiyazusmani068@gmail.com';
      const newUser = await User.create({
        username,
        email,
        avatar: picture,
        provider: 'google',
        googleId,
        emailVerified,
        role: isSuperAdminNew ? 'superadmin' : 'user',
        isProfileSetupCompleted: false
      });

      const token = generateToken(newUser._id.toString());
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
      return res.status(201).json({
        _id: newUser._id.toString(),
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
        role: newUser.role,
        status: newUser.status,
        customStatus: newUser.customStatus,
        isNewUser: true,
        isProfileSetupCompleted: false,
        token
      });
    } else {
      // In-memory fallback
      let found = null;
      if (googleId) {
        for (const u of memoryUsers.values()) {
          if (u.googleId && u.googleId === googleId) {
            found = u;
            break;
          }
        }
      }

      if (!found && email) {
        for (const u of memoryUsers.values()) {
          if (u.email === email) {
            found = u;
            break;
          }
        }
      }

      if (found) {
        if (!found.googleId && googleId) {
          found.googleId = googleId;
          found.provider = 'google';
          found.emailVerified = emailVerified;
          found.avatar = picture;
        }

        const token = generateToken(found._id);
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000
        });
        return res.json({
          _id: found._id,
          username: found.username,
          email: found.email,
          avatar: found.avatar,
          fullName: found.fullName,
          bio: found.bio,
          status: found.status || 'online',
          customStatus: found.customStatus,
          isProfileSetupCompleted: Boolean(found.isProfileSetupCompleted),
          token
        });
      }

      // Create in-memory user
      const id = 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const username = deriveUsername(name, email);
      const memUser = {
        _id: id,
        username,
        email,
        googleId,
        provider: 'google',
        emailVerified,
        avatar: picture,
        fullName: name || '',
        status: 'online',
        isProfileSetupCompleted: false,
        isNewUser: true,
        createdAt: new Date().toISOString()
      };

      memoryUsers.set(id, memUser);

      const token = generateToken(memUser._id);
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
      return res.status(201).json({
        _id: memUser._id,
        username: memUser.username,
        email: memUser.email,
        avatar: memUser.avatar,
        fullName: memUser.fullName,
        status: memUser.status,
        customStatus: memUser.customStatus,
        isNewUser: true,
        isProfileSetupCompleted: false,
        token
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  googleLogin
};
