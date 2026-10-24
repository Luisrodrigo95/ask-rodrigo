import {
  getUsers,
  addUser,
  updateUser,
  deleteUser
} from '../services/userService.js';

export function listUsersHandler(req, res) {
  try {
    const users = getUsers();
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: 'Error obteniendo lista de usuarios', details: err.message });
  }
}

export function addUserHandler(req, res) {
  try {
    const { email, canEditProjects = false, name } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Debes proporcionar un correo electrónico válido.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const created = addUser({
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      canEditProjects: Boolean(canEditProjects)
    });

    return res.json({
      ok: true,
      user: created,
      message: `Usuario ${cleanEmail} autorizado exitosamente con permisos de edición: ${created.canEditProjects ? 'Sí' : 'No'}.`
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error agregando usuario', details: err.message });
  }
}

export function updateUserPermissionsHandler(req, res) {
  try {
    const { email } = req.params;
    const { canEditProjects } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Correo de usuario requerido.' });
    }

    const updated = updateUser(email, {
      canEditProjects: Boolean(canEditProjects)
    });

    if (!updated) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    return res.json({
      ok: true,
      user: updated,
      message: `Permisos de edición de proyectos actualizados para ${updated.email}: ${updated.canEditProjects ? 'Permitido' : 'Restringido'}.`
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error actualizando permisos', details: err.message });
  }
}

export function deleteUserHandler(req, res) {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'Correo requerido.' });
    }

    deleteUser(email);
    return res.json({ ok: true, message: `Acceso revocado para ${email}.` });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
