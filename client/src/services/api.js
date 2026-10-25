const API_BASE = (typeof window !== 'undefined' && window.location.pathname.startsWith('/ask-rodrigo'))
  ? '/ask-rodrigo/api'
  : '/api';

const TOKEN_KEY = 'ask_rodrigo_jwt_token';
const USER_KEY = 'ask_rodrigo_current_user';

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Authentication Endpoints
 */
export async function loginAsGuest() {
  const response = await fetch(`${API_BASE}/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al iniciar sesión de invitado');
  }
  const data = await response.json();
  setAuthToken(data.token);
  setStoredUser({ role: 'guest', name: 'Invitado', email: null });
  return data;
}

export async function loginAsAdmin(email, pin) {
  const response = await fetch(`${API_BASE}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pin })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Credenciales de administrador incorrectas');
  }
  const data = await response.json();
  setAuthToken(data.token);
  setStoredUser({ role: 'admin', name: data.name || 'Rodrigo García', email: data.email });
  return data;
}

export async function loginWithGoogle(credential, accessToken = null) {
  const response = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential, accessToken })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Autenticación con Google fallida');
  }
  const data = await response.json();
  setAuthToken(data.token);
  setStoredUser({
    role: 'admin',
    name: data.name,
    email: data.email,
    picture: data.picture,
    isOwner: data.isOwner,
    canEditProjects: data.canEditProjects
  });
  return data;
}

export async function fetchAuthConfig() {
  try {
    const res = await fetch(`${API_BASE}/auth/config`);
    if (!res.ok) return { googleClientId: '', authorizedEmail: 'lg2012garcia@gmail.com' };
    return await res.json();
  } catch {
    return { googleClientId: '', authorizedEmail: 'lg2012garcia@gmail.com' };
  }
}

export async function fetchMe() {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) return { authenticated: false, role: 'guest' };
  return await response.json();
}

export function logout() {
  setAuthToken(null);
  setStoredUser(null);
}

/**
 * Sends a chat message via standard POST
 */
export async function sendChatMessage(message, conversationId = null, engine = 'agy', history = []) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: getAuthHeaders({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({ message, conversationId, engine, history })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status}: Failed to generate reply`);
  }

  return await response.json();
}

/**
 * Connects to the SSE stream for real-time token-by-token streaming
 */
export function streamChatMessage(message, conversationId, callbacks, workspace = 'normal') {
  const { onInit, onDelta, onDone, onError, onStatus } = callbacks;

  const url = `${API_BASE}/chat/stream`;
  const controller = new AbortController();

  fetch(url, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ message, conversationId, workspace }),
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let receivedAnyDelta = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const normalized = buffer.replace(/\r\n/g, '\n');
        const lines = normalized.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const matchEvent = block.match(/event:\s*([^\n]+)/);
          const matchData = block.match(/data:\s*([\s\S]+)/);

          if (matchEvent && matchData) {
            const eventType = matchEvent[1].trim();
            try {
              const data = JSON.parse(matchData[1].trim());

              if (eventType === 'init' && onInit) onInit(data);
              if (eventType === 'status' && onStatus) onStatus(data);
              if (eventType === 'delta' && onDelta) {
                receivedAnyDelta = true;
                onDelta(data.text);
              }
              if (eventType === 'done' && onDone) onDone(data);
              if (eventType === 'error' && onError) onError(data.error);
            } catch (err) {
              console.warn('[SSE Parse Error]', err);
            }
          }
        }
      }
    })
    .catch(async (err) => {
      if (err.name === 'AbortError') return;
      console.warn('[streamChatMessage] Stream error:', err.message);

      // If tokens were already delivered to the client, the server process already executed.
      // Do NOT trigger duplicate full prompt fallback because running two turns simultaneously causes "error: interrupted".
      if (receivedAnyDelta) {
        if (onDone) onDone({ status: 'completed' });
        return;
      }

      const maxRetries = 2;
      let lastErr = err;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (onStatus) {
            onStatus({
              message:
                attempt === 1
                  ? 'Reconectando con el servidor...'
                  : `Reintentando conexión con el servidor (${attempt}/${maxRetries})...`
            });
          }
          if (attempt > 1) {
            await new Promise((r) => setTimeout(r, 1200));
          }
          const res = await sendChatMessage(message, conversationId);
          if (res.conversationId && onInit) onInit({ conversationId: res.conversationId });
          if (res.reply && onDelta) onDelta(res.reply);
          if (onDone) onDone(res);
          return;
        } catch (fallbackErr) {
          lastErr = fallbackErr;
          console.warn(`[streamChatMessage] Fallback attempt ${attempt}/${maxRetries} failed:`, fallbackErr.message);
        }
      }

      if (onError) onError(lastErr.message || 'Error de conexión con el servidor.');
    });

  return () => controller.abort();
}

/**
 * Fetches Antigravity conversations (Admin Only)
 */
export async function fetchConversations() {
  const response = await fetch(`${API_BASE}/conversations`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    if (response.status === 403) return { conversations: [] };
    throw new Error('Failed to fetch conversations');
  }
  return await response.json();
}

/**
 * Fetches transcript messages for a conversation
 */
export async function fetchConversationDetail(conversationId) {
  const response = await fetch(`${API_BASE}/conversations/${encodeURIComponent(conversationId)}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch conversation detail');
  return await response.json();
}

/**
 * Deletes / archives an Antigravity conversation
 */
export async function deleteConversation(conversationId) {
  const response = await fetch(`${API_BASE}/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete conversation');
  return await response.json();
}

/**
 * Batch deletes multiple Antigravity conversations
 */
export async function batchDeleteConversations(ids) {
  const response = await fetch(`${API_BASE}/conversations/batch-delete`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ids })
  });
  if (!response.ok) throw new Error('Failed to batch delete conversations');
  return await response.json();
}

/**
 * Batch archives / unarchives Antigravity conversations
 */
export async function batchArchiveConversations(ids, archived = true) {
  const response = await fetch(`${API_BASE}/conversations/batch-archive`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ids, archived })
  });
  if (!response.ok) throw new Error('Failed to batch archive conversations');
  return await response.json();
}

/**
 * Fetches real-time server metrics (Admin Only)
 */
export async function fetchMetrics() {
  const response = await fetch(`${API_BASE}/metrics`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('403_ADMIN_REQUIRED');
    }
    throw new Error('Failed to fetch metrics');
  }
  return await response.json();
}

/**
 * Calendar endpoints
 */
export async function fetchCalendarEvents() {
  const response = await fetch(`${API_BASE}/calendar`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch calendar');
  return await response.json();
}

export async function createCalendarEvent(eventData) {
  const response = await fetch(`${API_BASE}/calendar`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(eventData)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create calendar event');
  }
  return await response.json();
}

export async function removeCalendarEvent(eventId) {
  const response = await fetch(`${API_BASE}/calendar/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to remove event');
  }
  return await response.json();
}

/**
 * Profile & Suggestions
 */
export async function fetchSuggestions(lang = 'en') {
  const response = await fetch(`${API_BASE}/suggestions?lang=${encodeURIComponent(lang)}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch suggestions');
  return await response.json();
}

export async function fetchProfile() {
  const response = await fetch(`${API_BASE}/profile`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch profile');
  return await response.json();
}

export async function fetchHealth() {
  const response = await fetch(`${API_BASE}/health`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch health');
  return await response.json();
}

/**
 * AI Token Usage & Rate Limits (5h & Weekly)
 */
export async function fetchUsage(refresh = false) {
  const query = refresh ? '?refresh=true' : '';
  const response = await fetch(`${API_BASE}/usage${query}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to fetch usage quota');
  }
  return await response.json();
}

export async function updateUsageConfig(config) {
  const response = await fetch(`${API_BASE}/usage/config`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(config)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update usage config');
  }
  return await response.json();
}

/**
 * File Uploads for Terminal & Antigravity (Admin Only)
 */
export async function uploadAdminFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers,
    body: formData
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al subir archivo al servidor');
  }

  return await response.json();
}

export async function fetchUploadsList() {
  const response = await fetch(`${API_BASE}/upload/list`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Error al listar archivos subidos');
  return await response.json();
}

/**
 * Antigravity Subagents
 */
export async function fetchSubagents() {
  const response = await fetch(`${API_BASE}/subagents`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Error al obtener lista de subagentes');
  return await response.json();
}

/**
 * Admin Notes & Prompts Scratchpad
 */
export async function fetchNotes() {
  const response = await fetch(`${API_BASE}/notes`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Error al obtener notas');
  return await response.json();
}

export async function saveAdminNote(noteData) {
  const response = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(noteData)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al guardar nota');
  }
  return await response.json();
}

export async function deleteAdminNote(id) {
  const response = await fetch(`${API_BASE}/notes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Error al eliminar nota');
  return await response.json();
}

/**
 * User Management (Owner only)
 */
export async function fetchUsers() {
  const response = await fetch(`${API_BASE}/users`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    if (response.status === 403) return { users: [] };
    throw new Error('Error al obtener lista de usuarios');
  }
  return await response.json();
}

export async function addAuthorizedUser(email, canEditProjects = false) {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, canEditProjects })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al agregar usuario autorizado');
  }
  return await response.json();
}

export async function updateUserPermission(email, canEditProjects) {
  const response = await fetch(`${API_BASE}/users/${encodeURIComponent(email)}/permissions`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ canEditProjects })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al actualizar permisos del usuario');
  }
  return await response.json();
}

export async function deleteAuthorizedUser(email) {
  const response = await fetch(`${API_BASE}/users/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al revocar acceso al usuario');
  }
  return await response.json();
}

/**
 * Developer IDE & File Management Endpoints
 */
export async function fetchDeveloperProjects() {
  const response = await fetch(`${API_BASE}/developer/projects`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al obtener proyectos disponibles');
  }
  return await response.json();
}

export async function fetchDeveloperTree(projectId) {
  const response = await fetch(`${API_BASE}/developer/tree?projectId=${encodeURIComponent(projectId)}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al cargar el árbol de archivos');
  }
  return await response.json();
}

export async function fetchDeveloperFile(projectId, filePath) {
  const response = await fetch(
    `${API_BASE}/developer/file?projectId=${encodeURIComponent(projectId)}&filePath=${encodeURIComponent(filePath)}`,
    {
      headers: getAuthHeaders()
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al cargar archivo');
  }
  return await response.json();
}

export async function saveDeveloperFile(projectId, filePath, content) {
  const response = await fetch(`${API_BASE}/developer/file`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ projectId, filePath, content })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al guardar el archivo');
  }
  return await response.json();
}

export async function createDeveloperItem(projectId, targetPath, name, type) {
  const response = await fetch(`${API_BASE}/developer/create`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ projectId, targetPath, name, type })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al crear elemento');
  }
  return await response.json();
}

export async function deleteDeveloperItem(projectId, itemPath) {
  const response = await fetch(`${API_BASE}/developer/item`, {
    method: 'DELETE',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ projectId, itemPath })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al eliminar elemento');
  }
  return await response.json();
}

export async function renameDeveloperItem(projectId, oldPath, newName) {
  const response = await fetch(`${API_BASE}/developer/rename`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ projectId, oldPath, newName })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al renombrar elemento');
  }
  return await response.json();
}

export async function uploadDeveloperFiles(projectId, destinationPath, files) {
  const formData = new FormData();
  formData.append('projectId', projectId);
  formData.append('destinationPath', destinationPath || '');
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }

  const response = await fetch(`${API_BASE}/developer/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al subir archivos');
  }
  return await response.json();
}

export async function fetchDeveloperPRs() {
  const response = await fetch(`${API_BASE}/developer/prs`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al obtener PR reviews');
  }
  return await response.json();
}

export async function createDeveloperPR(data) {
  const response = await fetch(`${API_BASE}/developer/prs`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al crear PR review');
  }
  return await response.json();
}

export async function updateDeveloperPRStatus(id, status) {
  const response = await fetch(`${API_BASE}/developer/prs/status`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id, status })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al actualizar estado de PR');
  }
  return await response.json();
}


