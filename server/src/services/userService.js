import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.resolve(__dirname, '../data/users.json');

const PRIMARY_ADMIN_EMAIL = (process.env.PRIMARY_ADMIN_EMAIL || 'lg2012garcia@gmail.com').toLowerCase().trim();

function ensureUsersFile() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    const initial = [
      {
        email: PRIMARY_ADMIN_EMAIL,
        name: 'Luis Rodrigo García Hernández',
        role: 'admin',
        isOwner: true,
        canEditProjects: true,
        picture: null,
        addedAt: new Date().toISOString(),
        lastLogin: null
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

export function getUsers() {
  ensureUsersFile();
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const users = JSON.parse(raw);
    
    // Ensure primary admin is always in list with isOwner=true
    if (!users.some(u => u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL)) {
      users.unshift({
        email: PRIMARY_ADMIN_EMAIL,
        name: 'Luis Rodrigo García Hernández',
        role: 'admin',
        isOwner: true,
        canEditProjects: true,
        picture: null,
        addedAt: new Date().toISOString(),
        lastLogin: null
      });
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    }
    return users;
  } catch (err) {
    console.error('[UserService Error reading users.json]:', err);
    return [];
  }
}

export function getUserByEmail(email) {
  if (!email) return null;
  const cleanEmail = String(email).trim().toLowerCase();
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === cleanEmail) || null;
}

export function isEmailAuthorized(email) {
  if (!email) return false;
  const cleanEmail = String(email).trim().toLowerCase();
  if (cleanEmail === PRIMARY_ADMIN_EMAIL) return true;
  return Boolean(getUserByEmail(cleanEmail));
}

export function addUser({ email, name, canEditProjects = false, isOwner = false, picture = null }) {
  ensureUsersFile();
  const users = getUsers();
  const cleanEmail = String(email).trim().toLowerCase();

  const existingIdx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
  const now = new Date().toISOString();

  if (existingIdx !== -1) {
    users[existingIdx] = {
      ...users[existingIdx],
      canEditProjects: Boolean(canEditProjects),
      name: name || users[existingIdx].name,
      picture: picture || users[existingIdx].picture,
      updatedAt: now
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    return users[existingIdx];
  }

  const newUser = {
    email: cleanEmail,
    name: name || cleanEmail.split('@')[0],
    role: 'admin',
    isOwner: Boolean(isOwner || cleanEmail === PRIMARY_ADMIN_EMAIL),
    canEditProjects: cleanEmail === PRIMARY_ADMIN_EMAIL ? true : Boolean(canEditProjects),
    picture: picture || null,
    addedAt: now,
    lastLogin: null
  };

  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  return newUser;
}

export function updateUser(email, updates = {}) {
  ensureUsersFile();
  const users = getUsers();
  const cleanEmail = String(email).trim().toLowerCase();
  const idx = users.findIndex(u => u.email.toLowerCase() === cleanEmail);

  if (idx === -1) return null;

  // Never allow removing owner flag from PRIMARY_ADMIN_EMAIL
  const isTargetPrimary = cleanEmail === PRIMARY_ADMIN_EMAIL;
  
  users[idx] = {
    ...users[idx],
    ...updates,
    email: cleanEmail,
    isOwner: isTargetPrimary ? true : Boolean(updates.isOwner ?? users[idx].isOwner),
    canEditProjects: isTargetPrimary ? true : Boolean(updates.canEditProjects ?? users[idx].canEditProjects),
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  return users[idx];
}

export function deleteUser(email) {
  ensureUsersFile();
  const cleanEmail = String(email).trim().toLowerCase();

  if (cleanEmail === PRIMARY_ADMIN_EMAIL) {
    throw new Error('No es posible eliminar al propietario principal del sistema.');
  }

  const users = getUsers();
  const filtered = users.filter(u => u.email.toLowerCase() !== cleanEmail);
  fs.writeFileSync(USERS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}
