const API_BASE = (typeof window !== 'undefined' && window.location.pathname.startsWith('/ask-rodrigo'))
  ? '/ask-rodrigo/api'
  : '/api';

/**
 * Sends a chat message via standard POST
 */
export async function sendChatMessage(message, conversationId = null, engine = 'agy', history = []) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
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
export function streamChatMessage(message, conversationId, callbacks) {
  const { onInit, onDelta, onDone, onError, onStatus } = callbacks;

  const url = `${API_BASE}/chat/stream`;
  
  // Using fetch with ReadableStream for POST-like SSE or standard EventSource
  const controller = new AbortController();

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
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
    .catch((err) => {
      if (err.name !== 'AbortError' && onError) {
        onError(err.message);
      }
    });

  return () => controller.abort();
}

/**
 * Fetches Antigravity conversations
 */
export async function fetchConversations() {
  const response = await fetch(`${API_BASE}/conversations`);
  if (!response.ok) throw new Error('Failed to fetch conversations');
  return await response.json();
}

/**
 * Fetches transcript messages for a conversation
 */
export async function fetchConversationDetail(conversationId) {
  const response = await fetch(`${API_BASE}/conversations/${encodeURIComponent(conversationId)}`);
  if (!response.ok) throw new Error('Failed to fetch conversation detail');
  return await response.json();
}

/**
 * Deletes / archives an Antigravity conversation
 */
export async function deleteConversation(conversationId) {
  const response = await fetch(`${API_BASE}/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete conversation');
  return await response.json();
}

/**
 * Fetches real-time server metrics
 */
export async function fetchMetrics() {
  const response = await fetch(`${API_BASE}/metrics`);
  if (!response.ok) throw new Error('Failed to fetch metrics');
  return await response.json();
}

/**
 * Calendar endpoints
 */
export async function fetchCalendarEvents() {
  const response = await fetch(`${API_BASE}/calendar`);
  if (!response.ok) throw new Error('Failed to fetch calendar');
  return await response.json();
}

export async function createCalendarEvent(eventData) {
  const response = await fetch(`${API_BASE}/calendar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
  if (!response.ok) throw new Error('Failed to create calendar event');
  return await response.json();
}

export async function removeCalendarEvent(eventId) {
  const response = await fetch(`${API_BASE}/calendar/${encodeURIComponent(eventId)}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to remove event');
  return await response.json();
}

/**
 * Profile & Suggestions
 */
export async function fetchSuggestions() {
  const response = await fetch(`${API_BASE}/suggestions`);
  if (!response.ok) throw new Error('Failed to fetch suggestions');
  return await response.json();
}

export async function fetchProfile() {
  const response = await fetch(`${API_BASE}/profile`);
  if (!response.ok) throw new Error('Failed to fetch profile');
  return await response.json();
}

export async function fetchHealth() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error('Failed to fetch health');
  return await response.json();
}
