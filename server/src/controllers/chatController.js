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
 * - Guests: Strictly routed to safe, grounded knowledge AI (no bash, no tool calls).
 * - Admin (Rodrigo): Routed to native AGy-cli bridge with full tool & terminal capability.
 */
export async function chatHandler(req, res) {
  try {
    const { message, conversationId, engine = 'agy', history } = req.body;
    const userRole = req.user?.role || 'guest';

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'El mensaje es requerido y no puede estar vacío.' });
    }

    const cleanMsg = message.trim();

    // 1. Guest Mode: Strictly restricted to safe Knowledge AI
    if (userRole !== 'admin') {
      const response = await generateChatResponse(cleanMsg, history || [], { isGuest: true });
      return res.json({
        ...response,
        conversationId: 'guest-session',
        role: 'guest'
      });
    }

    // 2. Admin Mode: Full AGy-cli Bridge execution
    if (engine === 'agy') {
      try {
        const agyResult = await executeAgyPrompt(cleanMsg, { conversationId });
        return res.json({
          ...agyResult,
          role: 'admin'
        });
      } catch (errAgy) {
        console.warn('[ChatController] AGy-cli error for admin, using fallback:', errAgy.message);
        const fallback = await generateChatResponse(cleanMsg, history || [], { isGuest: false });
        return res.json({
          ...fallback,
          conversationId: conversationId || null,
          role: 'admin',
          note: `Ejecutado con fallback debido a: ${errAgy.message}`
        });
      }
    }

    // Direct knowledge engine for admin if requested
    const response = await generateChatResponse(cleanMsg, history || [], { isGuest: false });
    return res.json({
      ...response,
      conversationId: conversationId || null,
      role: 'admin'
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
  const userRole = req.user?.role || 'guest';

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

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': keepalive\n\n');
    }
  }, 15000);

  try {
    // 1. Guest Mode SSE: Stream from Knowledge AI (zero bash/tool execution)
    if (userRole !== 'admin') {
      sendEvent('init', { conversationId: 'guest-session' });
      sendEvent('status', { message: 'Consultando base de conocimientos de Rodrigo...' });

      const knowledgeRes = await generateChatResponse(message.trim(), [], { isGuest: true });
      const fullText = knowledgeRes.reply || '';

      // Stream text in small natural chunks
      const chunkSize = 25;
      for (let i = 0; i < fullText.length; i += chunkSize) {
        const slice = fullText.slice(i, i + chunkSize);
        sendEvent('delta', { text: slice });
        // Minimal delay for smooth visual typewriter feel
        await new Promise(r => setTimeout(r, 15));
      }

      sendEvent('done', {
        conversationId: 'guest-session',
        status: 'done',
        engine: 'Knowledge AI (Modo Invitado)',
        role: 'guest'
      });

      res.end();
      return;
    }

    // 2. Admin Mode SSE: Native AGy-cli Bridge stream
    sendEvent('status', { message: 'Iniciando turno en AGy-cli como Administrador...' });

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
      engine: result.engine,
      role: 'admin'
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
 * Lists past Antigravity conversations from SQLite database (Admin only).
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
 * Returns clean transcript messages for a specific conversation ID (Admin only).
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
 * Deletes / archives a conversation (Admin only).
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
 * System metrics endpoint for live VPS monitoring (Admin only).
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

/**
 * Suggestions handler with the 6 priority questions requested by user.
 */
export function suggestionsHandler(req, res) {
  const priorityQuestions = [
    "¿Cuál es la experiencia de Rodrigo en ZAP-Hosting?",
    "¿Qué hizo Rodrigo durante sus 5 años en Continental Automotive?",
    "¿Qué estudios y certificaciones tiene Rodrigo?",
    "¿Qué stack tecnológico y lenguajes domina Rodrigo?",
    "¿Cómo está configurada su infraestructura de servidores VPS?",
    "¿Tiene experiencia con Linux, Nginx y Docker?"
  ];

  return res.json({
    suggestions: priorityQuestions,
    categorized: rodrigoKnowledge.suggestions || []
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
    service: 'Ask-Rodrigo API & Dual-Role Engine',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    aiEngine: 'AGy-cli Native + Grounded Knowledge Engine'
  });
}
