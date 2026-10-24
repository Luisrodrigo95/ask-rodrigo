import { rodrigoKnowledge } from '../data/rodrigoKnowledge.js';
import { generateChatResponse } from '../services/aiService.js';
import {
  executeAgyPrompt,
  listAgyConversations,
  getConversationTranscript,
  deleteAgyConversation
} from '../services/agyBridgeService.js';
import { getSystemMetrics } from '../services/metricsService.js';
import {
  getCalendarEvents,
  addCalendarEvent,
  deleteCalendarEvent
} from '../services/calendarService.js';

/**
 * Standard JSON chat endpoint.
 * Defaults to Opción B (AGy-cli Native Bridge), falling back to Gemini / Local if requested or unavailable.
 */
export async function chatHandler(req, res) {
  try {
    const { message, conversationId, engine = 'agy', history } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'El mensaje es requerido y no puede estar vacío.' });
    }

    const cleanMsg = message.trim();

    if (engine === 'agy') {
      try {
        const agyResult = await executeAgyPrompt(cleanMsg, { conversationId });
        return res.json(agyResult);
      } catch (errAgy) {
        console.warn('[ChatController] AGy-cli execution error, attempting fallback:', errAgy.message);
        // Fallback to internal AI engine
        const fallback = await generateChatResponse(cleanMsg, history || []);
        return res.json({
          ...fallback,
          conversationId: conversationId || null,
          note: `Ejecutado con fallback debido a: ${errAgy.message}`
        });
      }
    }

    // Direct Gemini / Local fallback engine
    const response = await generateChatResponse(cleanMsg, history || []);
    return res.json({
      ...response,
      conversationId: conversationId || null
    });
  } catch (error) {
    console.error('[ChatController Error]:', error);
    return res.status(500).json({
      error: 'Error interno procesando la consulta.',
      details: error.message
    });
  }
}

/**
 * Server-Sent Events (SSE) streaming endpoint for live token generation.
 * GET or POST /api/chat/stream
 */
export async function chatStreamHandler(req, res) {
  const message = req.method === 'POST' ? req.body.message : req.query.message;
  const conversationId = req.method === 'POST' ? req.body.conversationId : req.query.conversationId;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Mensaje requerido.' });
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Heartbeat to prevent reverse proxy/Cloudflare idle disconnects during long turns
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': keepalive\n\n');
    }
  }, 15000);

  try {
    sendEvent('status', { message: 'Iniciando turno en AGy-cli...' });

    let activeConvId = conversationId || null;

    const result = await executeAgyPrompt(message.trim(), {
      conversationId: activeConvId,
      onInit: (assignedId) => {
        activeConvId = assignedId;
        sendEvent('init', { conversationId: assignedId });
      },
      onDelta: (textChunk) => {
        sendEvent('delta', { text: textChunk });
      }
    });

    sendEvent('done', {
      conversationId: result.conversationId || activeConvId,
      duration: result.duration,
      usage: result.usage,
      status: result.status,
      engine: result.engine
    });

    res.end();
  } catch (errStream) {
    console.error('[ChatController SSE Error]:', errStream);
    sendEvent('error', { error: errStream.message });
    res.end();
  } finally {
    clearInterval(heartbeat);
  }
}

/**
 * Lists past Antigravity conversations from SQLite database.
 */
export async function conversationsHandler(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 25;
    const conversations = await listAgyConversations(limit);
    return res.json({ conversations });
  } catch (err) {
    return res.status(500).json({ error: 'Error obteniendo conversaciones', details: err.message });
  }
}

/**
 * Returns clean transcript messages for a specific conversation ID.
 */
export async function conversationDetailHandler(req, res) {
  try {
    const { id } = req.params;
    const messages = await getConversationTranscript(id);
    return res.json({ conversationId: id, messages });
  } catch (err) {
    return res.status(500).json({ error: 'Error obteniendo transcript', details: err.message });
  }
}

/**
 * Deletes / archives a conversation.
 */
export async function deleteConversationHandler(req, res) {
  try {
    const { id } = req.params;
    const ok = await deleteAgyConversation(id);
    return res.json({ ok });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando conversación', details: err.message });
  }
}

/**
 * System metrics endpoint for live VPS monitoring.
 */
export async function metricsHandler(req, res) {
  try {
    const metrics = await getSystemMetrics();
    return res.json(metrics);
  } catch (err) {
    return res.status(500).json({ error: 'Error obteniendo métricas del servidor', details: err.message });
  }
}

/**
 * Calendar endpoints.
 */
export function calendarGetHandler(req, res) {
  const events = getCalendarEvents();
  return res.json({ events });
}

export function calendarPostHandler(req, res) {
  try {
    const newEvent = addCalendarEvent(req.body);
    return res.json({ ok: true, event: newEvent });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

export function calendarDeleteHandler(req, res) {
  const { id } = req.params;
  const ok = deleteCalendarEvent(id);
  return res.json({ ok });
}

export function suggestionsHandler(req, res) {
  const raw = rodrigoKnowledge.suggestions || [];
  const flat = [];
  for (const item of raw) {
    if (Array.isArray(item.questions)) {
      flat.push(...item.questions);
    } else if (typeof item === 'string') {
      flat.push(item);
    }
  }
  return res.json({
    suggestions: flat,
    categorized: raw
  });
}

export function profileHandler(req, res) {
  return res.json({
    profile: rodrigoKnowledge.profile,
    skills: rodrigoKnowledge.skills,
    experience: rodrigoKnowledge.experience,
    projects: rodrigoKnowledge.projects,
    infrastructure: rodrigoKnowledge.infrastructure
  });
}

export function healthHandler(req, res) {
  return res.json({
    status: 'healthy',
    service: 'Ask-Rodrigo API & AGy-cli Bridge',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    aiEngine: 'AGy-cli Native (Antigravity CLI Wrapper Active)'
  });
}
