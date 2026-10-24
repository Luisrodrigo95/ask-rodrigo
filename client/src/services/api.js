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
  setStoredUser({ role: 'admin', name: data.name, email: data.email, picture: data.picture });
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

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
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
              if (eventType === 'delta' && onDelta) onDelta(data.text);
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
      console.warn('[streamChatMessage] Stream error, attempting resilient fallback to POST /chat:', err.message);

      const maxRetries = 3;
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
          // Delay with backoff between attempts to allow server/proxy recovery (1s, 2.5s)
          if (attempt > 1) {
            await new Promise((r) => setTimeout(r, (attempt - 1) * 1500));
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
