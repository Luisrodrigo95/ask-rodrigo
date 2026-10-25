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
 * Strictly requires Admin role (Rodrigo or authorized collaborator)
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acceso restringido. Esta funcionalidad requiere privilegios de Administrador.'
    });
  }
  next();
}

/**
 * Strictly requires Owner role (Rodrigo only)
 */
export function requireOwner(req, res, next) {
  const primaryAdmin = (process.env.PRIMARY_ADMIN_EMAIL || 'lg2012garcia@gmail.com').toLowerCase().trim();
  const userEmail = (req.user?.email || '').toLowerCase().trim();
  if (!req.user || req.user.role !== 'admin' || (!req.user.isOwner && userEmail !== primaryAdmin)) {
    return res.status(403).json({
      error: 'Acceso denegado: Esta acción está reservada exclusivamente para el Propietario del sistema (Rodrigo).'
    });
  }
  next();
}

/**
 * Requires project editing permissions (Owner or Collaborator with canEditProjects: true)
 */
export function requireProjectEditor(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acceso restringido. Esta funcionalidad requiere privilegios de Administrador.'
    });
  }
  const primaryAdmin = (process.env.PRIMARY_ADMIN_EMAIL || 'lg2012garcia@gmail.com').toLowerCase().trim();
  const userEmail = (req.user?.email || '').toLowerCase().trim();
  const isOwner = Boolean(req.user.isOwner || userEmail === primaryAdmin);
  const canEdit = Boolean(req.user.canEditProjects);

  if (!isOwner && !canEdit) {
    return res.status(403).json({
      error: 'Acceso denegado: Tu cuenta no tiene permisos para modificar, subir o borrar archivos en los proyectos.'
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

