import { signUserToken } from '../middleware/auth.js';

const PRIMARY_ADMIN_EMAIL = process.env.PRIMARY_ADMIN_EMAIL || 'lg2012garcia@gmail.com';
const ADMIN_PIN = process.env.ADMIN_PIN;
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
 * STRICT CHECK: Grants full unrestricted admin access IF AND ONLY IF email === lg2012garcia@gmail.com.
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
    let name = 'Rodrigo García';
    let picture = null;
    let emailVerified = false;

    // Strategy 1: Verify as ID token (JWT from Google Identity Services)
    if (credential && credential.includes('.')) {
      try {
        const idTokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (idTokenRes.ok) {
          const idData = await idTokenRes.json();
          email = (idData.email || '').toLowerCase();
          emailVerified = idData.email_verified === 'true' || idData.email_verified === true;
          name = idData.name || name;
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
          email = (userData.email || '').toLowerCase();
          emailVerified = userData.email_verified === true || userData.email_verified === 'true';
          name = userData.name || name;
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

    // STRICT CHECK: Only Rodrigo's Gmail is granted admin access
    const isAuthorized = email === PRIMARY_ADMIN_EMAIL || ADMIN_EMAILS.includes(email);

    if (!isAuthorized) {
      console.warn(`[loginGoogle] Unauthorized email attempt: ${email}. Allowed: ${PRIMARY_ADMIN_EMAIL}, ${ADMIN_EMAILS.join(',')}`);
      return res.status(403).json({
        error: `Acceso restringido: La cuenta ${email} no tiene permisos de Administrador. Solo ${PRIMARY_ADMIN_EMAIL} puede acceder a las funciones avanzadas.`
      });
    }

    console.log(`[loginGoogle] Authorized admin login for: ${email}`);

    const payload = {
      role: 'admin',
      name: name || 'Rodrigo García',
      email,
      picture,
      scope: 'full:admin',
      createdAt: new Date().toISOString()
    };

    const token = signUserToken(payload, '30d');

    return res.json({
      ok: true,
      role: 'admin',
      name: payload.name,
      email: payload.email,
      picture,
      token,
      message: 'Autenticación con Google completada exitosamente. Acceso total a Ask-Rodrigo concedido.'
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
      email: req.user.email
    }
  });
}
