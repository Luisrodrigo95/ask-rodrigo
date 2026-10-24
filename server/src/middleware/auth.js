import jwt from 'jsonwebtoken';

function getJwtSecret() {
  return process.env.JWT_SECRET || 'ask_rodrigo_jwt_fallback_secret_change_in_production';
}

/**
 * Extracts and verifies JWT from Authorization header
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, getJwtSecret(), (err, decoded) => {
    if (err) {
      req.user = null;
      return next();
    }
    req.user = decoded;
    next();
  });
}

/**
 * Requires valid authenticated user (Guest or Admin)
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Autenticación requerida. Por favor inicia sesión como Invitado o Administrador.'
    });
  }
  next();
}

/**
 * Strictly requires Admin role (Rodrigo)
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acceso restringido. Esta funcionalidad requiere privilegios de Administrador (Rodrigo).'
    });
  }
  next();
}

/**
 * Sign token helper
 */
export function signUserToken(payload, expiresIn = '30d') {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}
