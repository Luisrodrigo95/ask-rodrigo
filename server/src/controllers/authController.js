import { signUserToken } from '../middleware/auth.js';

const ADMIN_PIN = process.env.ADMIN_PIN;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'contacto@therodrigo.com,rodrigo@therodrigo.com,lrodrigogh@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase());

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
 * Admin Login: Rodrigo's Gmail + Security PIN/Master Key
 */
export function loginAdmin(req, res) {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({ error: 'Email y PIN de seguridad son requeridos.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPin = String(pin).trim();

    // Verify PIN
    if (cleanPin !== ADMIN_PIN) {
      return res.status(401).json({ error: 'PIN de seguridad incorrecto.' });
    }

    // Verify it is a valid Gmail address or configured admin email
    const isConfiguredAdmin = ADMIN_EMAILS.includes(cleanEmail);
    const isGmail = cleanEmail.endsWith('@gmail.com');

    if (!isConfiguredAdmin && !isGmail) {
      return res.status(403).json({
        error: 'El correo debe ser una cuenta Gmail autorizada de Rodrigo o el correo oficial.'
      });
    }

    const payload = {
      role: 'admin',
      name: 'Rodrigo García',
      email: cleanEmail,
      scope: 'full:admin',
      createdAt: new Date().toISOString()
    };

    const token = signUserToken(payload, '30d');

    return res.json({
      ok: true,
      role: 'admin',
      name: 'Rodrigo García',
      email: cleanEmail,
      token,
      message: 'Bienvenido Rodrigo. Acceso completo a Antigravity CLI y métricas de servidor concedido.'
    });
  } catch (err) {
    console.error('[Auth loginAdmin Error]:', err);
    return res.status(500).json({ error: 'Error procesando autenticación de administrador' });
  }
}

/**
 * Google OAuth Token Login: Verifies Google ID token from Google Sign-In button
 */
export async function loginGoogle(req, res) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Token de Google credential no recibido.' });
    }

    // Verify token with Google's tokeninfo API
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!googleRes.ok) {
      return res.status(401).json({ error: 'Token de Google inválido o expirado.' });
    }

    const data = await googleRes.json();
    const email = (data.email || '').toLowerCase();
    const emailVerified = data.email_verified === 'true' || data.email_verified === true;

    if (!emailVerified) {
      return res.status(403).json({ error: 'El correo de Google no está verificado.' });
    }

    const isConfiguredAdmin = ADMIN_EMAILS.includes(email);
    const isGmail = email.endsWith('@gmail.com');

    if (!isConfiguredAdmin && !isGmail) {
      return res.status(403).json({
        error: `Acceso restringido: La cuenta ${email} no está autorizada como administrador de Rodrigo.`
      });
    }

    const payload = {
      role: 'admin',
      name: data.name || 'Rodrigo García',
      email,
      picture: data.picture,
      scope: 'full:admin',
      createdAt: new Date().toISOString()
    };

    const token = signUserToken(payload, '30d');

    return res.json({
      ok: true,
      role: 'admin',
      name: payload.name,
      email: payload.email,
      picture: data.picture,
      token,
      message: 'Autenticación con Google exitosa. Acceso de administrador activo.'
    });
  } catch (err) {
    console.error('[Auth loginGoogle Error]:', err);
    return res.status(500).json({ error: 'Error validando credencial de Google', details: err.message });
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
