import { signUserToken } from '../middleware/auth.js';
import {
  getUserByEmail,
  updateUser,
  addUser,
  isEmailAuthorized
} from '../services/userService.js';

const PRIMARY_ADMIN_EMAIL = (process.env.PRIMARY_ADMIN_EMAIL || 'lg2012garcia@gmail.com').toLowerCase().trim();
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || `${PRIMARY_ADMIN_EMAIL},contacto@therodrigo.com`)
  .split(',')
  .map(e => e.trim().toLowerCase());

/**
 * Public auth configuration for frontend Google Identity Services
 */
export function getAuthConfig(req, res) {
  return res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    authorizedEmail: PRIMARY_ADMIN_EMAIL
  });
}

/**
 * Guest Login: Instant 1-click token for external visitors/recruiters
 */
export function loginGuest(req, res) {
  try {
    const payload = {
      role: 'guest',
      name: 'Invitado',
      email: null,
      scope: 'read:knowledge',
      isOwner: false,
      canEditProjects: false,
      createdAt: new Date().toISOString()
    };

    const token = signUserToken(payload, '7d');

    return res.json({
      ok: true,
      role: 'guest',
      name: 'Invitado',
      token,
      message: 'Sesión de Invitado iniciada con éxito. Modo consulta sobre perfil y proyectos de Rodrigo activo.'
    });
  } catch (err) {
    console.error('[Auth loginGuest Error]:', err);
    return res.status(500).json({ error: 'Error generando sesión de invitado' });
  }
}

/**
 * Admin Login: Fallback via Email + Security PIN
 * STRICT CHECK: Only Rodrigo's Gmail (lg2012garcia@gmail.com) is allowed.
 */
export function loginAdmin(req, res) {
  return res.status(403).json({
    error: 'El inicio de sesión manual mediante correo y PIN ha sido desactivado. Por favor autentícate mediante el botón directo de Google.'
  });
}

/**
 * Direct Google OAuth Login:
 * Verifies Google ID token or OAuth access token with Google's servers.
 * Retrieves real name, email, and avatar from Google.
 * Verifies against authorized users database.
 */
export async function loginGoogle(req, res) {
  try {
    const { credential, accessToken } = req.body;
    const tokenToVerify = credential || accessToken;
    const tokenPrefix = tokenToVerify ? String(tokenToVerify).slice(0, 15) + '...' : 'none';

    console.log('[loginGoogle] Auth attempt received:', {
      hasCredential: Boolean(credential),
      hasAccessToken: Boolean(accessToken),
      tokenPrefix
    });

    if (!tokenToVerify) {
      return res.status(400).json({ error: 'Token de Google no recibido.' });
    }

    let email = null;
    let name = null;
    let picture = null;
    let emailVerified = false;

    // Strategy 1: Verify as ID token (JWT from Google Identity Services)
    if (credential && credential.includes('.')) {
      try {
        const idTokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (idTokenRes.ok) {
          const idData = await idTokenRes.json();
          email = (idData.email || '').toLowerCase().trim();
          emailVerified = idData.email_verified === 'true' || idData.email_verified === true;
          name = idData.name || null;
          picture = idData.picture || null;
        }
      } catch (errId) {
        console.warn('[loginGoogle] ID token verification attempt failed:', errId.message);
      }
    }

    // Strategy 2: If ID token verification did not succeed or accessToken was provided, verify with userinfo endpoint
    if (!email) {
      try {
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenToVerify}` }
        });
        if (userinfoRes.ok) {
          const userData = await userinfoRes.json();
          email = (userData.email || '').toLowerCase().trim();
          emailVerified = userData.email_verified === true || userData.email_verified === 'true';
          name = userData.name || null;
          picture = userData.picture || null;
        }
      } catch (errUser) {
        console.warn('[loginGoogle] Userinfo verification attempt failed:', errUser.message);
      }
    }

    if (!email) {
      console.warn('[loginGoogle] No email obtained from verification for token:', tokenPrefix);
      return res.status(401).json({
        error: 'No se pudo verificar la identidad con los servidores de Google. Token inválido o expirado.'
      });
    }

    if (!emailVerified) {
      console.warn('[loginGoogle] Email not verified by Google:', email);
      return res.status(403).json({ error: 'El correo de Google no está verificado.' });
    }

    // CHECK AUTHORIZATION: Rodrigo or authorized user in database / env
    const isOwner = email === PRIMARY_ADMIN_EMAIL;
    let userRecord = getUserByEmail(email);

    // If user is in ADMIN_EMAILS env variable but not in JSON yet, auto-register them
    if (!userRecord && ADMIN_EMAILS.includes(email)) {
      userRecord = addUser({
        email,
        name: name || email.split('@')[0],
        isOwner,
        canEditProjects: isOwner,
        picture
      });
    }

    if (!isOwner && !userRecord) {
      console.warn(`[loginGoogle] Unauthorized email attempt: ${email}`);
      return res.status(403).json({
        error: `Acceso restringido: La cuenta ${email} no está autorizada. Contacta a Rodrigo para solicitar acceso a Ask-Rodrigo.`
      });
    }

    // If user exists, update their real name & picture from Google and lastLogin
    const finalName = name || (userRecord && userRecord.name) || email.split('@')[0];
    const finalPicture = picture || (userRecord && userRecord.picture) || null;
    const canEditProjects = isOwner ? true : Boolean(userRecord?.canEditProjects);

    updateUser(email, {
      name: finalName,
      picture: finalPicture,
      lastLogin: new Date().toISOString()
    });

    console.log(`[loginGoogle] Authorized login for ${finalName} (${email}) - Owner: ${isOwner}, EditProjects: ${canEditProjects}`);

    const payload = {
      role: 'admin',
      name: finalName,
      email,
      picture: finalPicture,
      isOwner,
      canEditProjects,
      scope: isOwner ? 'full:owner' : 'full:collaborator',
      createdAt: new Date().toISOString()
    };

    const token = signUserToken(payload, '30d');

    return res.json({
      ok: true,
      role: 'admin',
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      isOwner: payload.isOwner,
      canEditProjects: payload.canEditProjects,
      token,
      message: `Autenticación con Google completada. ¡Bienvenido, ${payload.name}!`
    });
  } catch (err) {
    console.error('[Auth loginGoogle Error]:', err);
    return res.status(500).json({ error: 'Error en la verificación directa con Google', details: err.message });
  }
}

/**
 * Get current session info
 */
export function getMe(req, res) {
  if (!req.user) {
    return res.json({
      authenticated: false,
      role: 'guest',
      user: null
    });
  }

  return res.json({
    authenticated: true,
    role: req.user.role,
    user: {
      role: req.user.role,
      name: req.user.name,
      email: req.user.email,
      picture: req.user.picture || null,
      isOwner: Boolean(req.user.isOwner),
      canEditProjects: Boolean(req.user.canEditProjects)
    }
  });
}
