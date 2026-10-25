import crypto from 'crypto';
import { rodrigoKnowledge, getSanitizedPublicKnowledge } from '../data/rodrigoKnowledge.js';
import { generateChatResponse } from '../services/aiService.js';
import {
  executeAgyPrompt,
  listAgyConversations,
  getConversationTranscript,
  deleteAgyConversation,
  batchDeleteAgyConversations,
  batchArchiveAgyConversations
} from '../services/agyBridgeService.js';
import { getSystemMetrics } from '../services/metricsService.js';
import { invalidateUsageCache } from '../services/usageService.js';
import {
  getCalendarEvents,
  addCalendarEvent,
  deleteCalendarEvent,
  generateICalFeed
} from '../services/calendarService.js';

/**
 * Standard JSON chat endpoint.
 * - Guests: Strictly routed to safe, grounded knowledge AI (no bash, no tool calls).
 * - Admin (Rodrigo): Routed to native AGy-cli bridge with full tool & terminal capability.
 */
export async function chatHandler(req, res) {
  try {
    const { message, conversationId, engine = 'agy', history, model, effort } = req.body;
    const userRole = req.user?.role || 'guest';

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'El mensaje es requerido y no puede estar vacío.' });
    }

    const cleanMsg = message.trim();

    // 1. Guest Mode: Routed to AGy-cli Bridge in strict read-only mode (English default, cannot modify projects)
    if (userRole !== 'admin') {
      try {
        const agyResult = await executeAgyPrompt(cleanMsg, {
          conversationId,
          isGuest: true,
          cwd: '/var/www/my-portfolio',
          model,
          effort
        });
        invalidateUsageCache();
        return res.json({
          ...agyResult,
          role: 'guest'
        });
      } catch (errAgy) {
        console.warn('[ChatController] AGy-cli error for guest, fallback:', errAgy.message);
        const fallback = await generateChatResponse(cleanMsg, history || [], { isGuest: true, model, effort });
        return res.json({
          ...fallback,
          conversationId: 'guest-session',
          role: 'guest'
        });
      }
    }

    // 2. Admin Mode: Full AGy-cli Bridge execution
    if (engine === 'agy') {
      try {
        let effectivePrompt = cleanMsg;
        if (!req.user?.canEditProjects && !req.user?.isOwner) {
          effectivePrompt = `[RESTRICCIÓN DE SEGURIDAD]: El usuario actual (${req.user?.name} <${req.user?.email}>) tiene rol de Colaborador con permiso de SOLO LECTURA sobre los proyectos del servidor. NO tiene autorización para editar, modificar, borrar o sobreescribir archivos en /var/www ni proyectos existentes hasta que Rodrigo lo autorice expresamente. Puedes responder sus dudas, explicar el código o crear archivos en /home/bombi/uploads, pero NUNCA modifiques el código existente.\n\nConsulta del usuario:\n${cleanMsg}`;
        }
        const agyResult = await executeAgyPrompt(effectivePrompt, { conversationId, model, effort });
        invalidateUsageCache();
        return res.json({
          ...agyResult,
          role: 'admin'
        });
      } catch (errAgy) {
        console.warn('[ChatController] AGy-cli error for admin, using fallback:', errAgy.message);
        const fallback = await generateChatResponse(cleanMsg, history || [], { isGuest: false, model, effort });
        return res.json({
          ...fallback,
          conversationId: conversationId || null,
          role: 'admin',
          note: `Ejecutado con fallback debido a: ${errAgy.message}`
        });
      }
    }

    // Direct knowledge engine for admin if requested
    const response = await generateChatResponse(cleanMsg, history || [], { isGuest: false, model, effort });
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

const WORKSPACE_MAP = {
  normal: '/home/bombi',
  askrodrigo: '/var/www/ask-rodrigo',
  'ask-rodrigo': '/var/www/ask-rodrigo',
  portfolio: '/var/www/my-portfolio',
  preswin: '/var/www/preswin',
  totimigraciones: '/var/www/totimigraciones',
  wiwishop: '/var/www/my-portfolio/public/wiwishop'
};

const activeExecutions = new Map();

/**
 * Server-Sent Events (SSE) streaming endpoint for live token generation.
 * GET or POST /api/chat/stream
 */
export async function chatStreamHandler(req, res) {
  const message = req.method === 'POST' ? req.body.message : req.query.message;
  const conversationId = req.method === 'POST' ? req.body.conversationId : req.query.conversationId;
  const workspace = req.method === 'POST' ? req.body.workspace : req.query.workspace;
  const model = req.method === 'POST' ? req.body.model : req.query.model;
  const effort = req.method === 'POST' ? req.body.effort : req.query.effort;
  const userRole = req.user?.role || 'guest';

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Mensaje requerido.' });
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  // Immediate handshake ping to establish connection through proxy
  res.write(': connected\n\n');

  const sendEvent = (event, data) => {
    if (!res.writableEnded && !res.destroyed) {
      try {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        // Socket disconnected
      }
    }
  };

  const abortController = new AbortController();
  const execId = `exec-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const cancelToken = crypto.randomBytes(16).toString('hex');
  const clientKey = conversationId && !conversationId.startsWith('draft-') ? conversationId : execId;
  let activeConvId = userRole === 'admin' ? (conversationId || null) : `guest-${Date.now()}`;

  const execObj = {
    abort: () => {
      try {
        abortController.abort();
      } catch {}
    },
    abortController,
    userRole,
    userId: req.user?.email || null,
    cancelToken
  };

  let heartbeat = null;

  try {
    activeExecutions.set(clientKey, execObj);
    if (activeConvId) activeExecutions.set(activeConvId, execObj);

    // Heartbeat every 10s to keep connection alive through Nginx & proxies
    heartbeat = setInterval(() => {
      if (!res.writableEnded && !res.destroyed) {
        try {
          res.write(': keepalive\n\n');
        } catch {
          clearInterval(heartbeat);
        }
      }
    }, 10000);

    req.on('close', () => {
      if (heartbeat) clearInterval(heartbeat);
      if (!res.writableEnded) {
        try {
          abortController.abort();
        } catch {}
      }
      activeExecutions.delete(clientKey);
      if (activeConvId) activeExecutions.delete(activeConvId);
    });

    // 1. Guest Mode SSE: Stream from AGy-cli Bridge in strict read-only sandbox mode (English default)
    if (userRole !== 'admin') {
      sendEvent('init', {
        conversationId: activeConvId || conversationId || 'guest-session',
        cancelToken
      });
      sendEvent('status', { message: 'Connecting to Ask Rodrigo AI (Guest Mode)...' });

      try {
        const result = await executeAgyPrompt(message.trim(), {
          conversationId: activeConvId,
          isGuest: true,
          cwd: '/var/www/my-portfolio',
          model,
          effort,
          signal: abortController.signal,
          onInit: (assignedId) => {
            activeConvId = assignedId;
            activeExecutions.set(assignedId, execObj);
            sendEvent('init', { conversationId: assignedId, cancelToken });
          },
          onDelta: (textChunk) => {
            sendEvent('delta', { text: textChunk });
          },
          onToolUpdate: (toolEvent) => {
            sendEvent('tool', toolEvent);
          }
        });

        invalidateUsageCache();
        sendEvent('done', {
          conversationId: result.conversationId || activeConvId || 'guest-session',
          duration: result.duration,
          usage: result.usage,
          status: result.status,
          engine: result.engine || 'AGy (Guest Read-Only)',
          role: 'guest'
        });
        res.end();
        return;
      } catch (errGuest) {
        if (abortController.signal.aborted) {
          sendEvent('aborted', { message: 'Generation cancelled by user' });
          res.end();
          return;
        }
        console.warn('[ChatController] Guest AGy stream error, falling back:', errGuest.message);
        const knowledgeRes = await generateChatResponse(message.trim(), [], { isGuest: true, model, effort });
        const fullText = knowledgeRes.reply || '';
        const chunkSize = 25;
        for (let i = 0; i < fullText.length; i += chunkSize) {
          if (abortController.signal.aborted) break;
          const slice = fullText.slice(i, i + chunkSize);
          sendEvent('delta', { text: slice });
          await new Promise(r => setTimeout(r, 15));
        }
        invalidateUsageCache();
        sendEvent('done', {
          conversationId: 'guest-session',
          status: 'done',
          engine: knowledgeRes.engine || 'Knowledge AI (Guest Fallback)',
          role: 'guest'
        });
        res.end();
        return;
      }
    }

    // 2. Admin Mode SSE: Native AGy-cli Bridge stream with workspace cwd, model, and effort
    const targetCwd = (workspace && WORKSPACE_MAP[workspace.toLowerCase()]) || '/home/bombi';
    sendEvent('status', { message: `Iniciando turno en AGy-cli (${workspace || 'normal'} -> ${targetCwd})...` });

    let effectiveMessage = message.trim();
    if (!req.user?.canEditProjects && !req.user?.isOwner) {
      effectiveMessage = `[RESTRICCIÓN DE SEGURIDAD]: El usuario actual (${req.user?.name} <${req.user?.email}>) tiene rol de Colaborador con permiso de SOLO LECTURA sobre los proyectos del servidor. NO tiene autorización para editar, modificar, borrar o sobreescribir archivos en /var/www ni proyectos existentes hasta que Rodrigo lo autorice expresamente. Puedes responder sus dudas, explicar el código o crear archivos en /home/bombi/uploads, pero NUNCA modifiques el código existente.\n\nConsulta del usuario:\n${message.trim()}`;
    }

    const result = await executeAgyPrompt(effectiveMessage, {
      conversationId: activeConvId,
      cwd: targetCwd,
      model,
      effort,
      signal: abortController.signal,
      onInit: (assignedId) => {
        activeConvId = assignedId;
        activeExecutions.set(assignedId, execObj);
        sendEvent('init', { conversationId: assignedId, cancelToken });
      },
      onDelta: (textChunk) => {
        sendEvent('delta', { text: textChunk });
      },
      onToolUpdate: (toolEvent) => {
        sendEvent('tool', toolEvent);
      }
    });

    invalidateUsageCache();
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
    if (abortController.signal.aborted || errStream.message?.includes('aborted')) {
      sendEvent('aborted', { message: 'Turn stopped by user' });
    } else {
      console.error('[ChatController SSE Error]:', errStream);
      sendEvent('error', { error: errStream.message });
    }
    res.end();
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    activeExecutions.delete(clientKey);
    if (activeConvId) activeExecutions.delete(activeConvId);
  }
}

/**
 * Stops an active chat generation for a given conversation.
 * POST /api/chat/stop
 */
export async function chatStopHandler(req, res) {
  try {
    const { conversationId, cancelToken } = req.body || {};
    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId es requerido.' });
    }

    const exec = activeExecutions.get(conversationId);
    if (exec) {
      const callerRole = req.user?.role || 'guest';
      const callerEmail = req.user?.email || null;

      // Security check:
      // 1. Admins can abort any session
      // 2. Authenticated users can abort their own sessions
      // 3. Guests / unauthenticated callers MUST provide the matching per-session cancelToken
      const isAdmin = callerRole === 'admin';
      const isOwner = Boolean(callerEmail && exec.userId === callerEmail);
      const hasValidToken = Boolean(cancelToken && exec.cancelToken === cancelToken);

      if (!isAdmin && !isOwner && !hasValidToken) {
        return res.status(403).json({ error: 'No autorizado para detener esta ejecución.' });
      }

      exec.abort();
      activeExecutions.delete(conversationId);
      return res.json({ ok: true, stopped: true, message: 'Turno cancelado exitosamente.' });
    }

    return res.json({ ok: true, stopped: false, message: 'No hay turno activo para cancelar.' });
  } catch (err) {
    console.error('[chatStopHandler Error]:', err);
    return res.status(500).json({ error: 'Error deteniendo la generación.', details: err.message });
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
 * Batch deletes multiple conversations (Admin only).
 * POST /api/conversations/batch-delete
 */
export async function batchDeleteConversationsHandler(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs requerida' });
    }
    const ok = await batchDeleteAgyConversations(ids);
    return res.json({ ok, deletedCount: ids.length });
  } catch (err) {
    return res.status(500).json({ error: 'Error en eliminación múltiple', details: err.message });
  }
}

/**
 * Batch archives / unarchives multiple conversations (Admin only).
 * POST /api/conversations/batch-archive
 */
export async function batchArchiveConversationsHandler(req, res) {
  try {
    const { ids, archived = true } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs requerida' });
    }
    const ok = batchArchiveAgyConversations(ids, archived);
    return res.json({ ok, count: ids.length, archived: Boolean(archived) });
  } catch (err) {
    return res.status(500).json({ error: 'Error en archivado múltiple', details: err.message });
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

export function calendarIcsHandler(req, res) {
  try {
    const icsContent = generateICalFeed();
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="rodrigo-calendar.ics"');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(icsContent);
  } catch (err) {
    return res.status(500).send('Error generating iCalendar feed: ' + err.message);
  }
}


/**
 * Suggestions handler with the 6 priority questions requested by user.
 */
export function suggestionsHandler(req, res) {
  const lang = (req.query.lang || 'en').toLowerCase();

  const priorityQuestionsEn = [
    "What is Rodrigo's experience at ZAP-Hosting?",
    "What did Rodrigo do during his 5 years at Continental Automotive?",
    "What degrees and certifications does Rodrigo hold?",
    "What technical stack and languages does Rodrigo master?",
    "How is his VPS server infrastructure configured?",
    "Does Rodrigo have experience with Linux, Nginx, and Docker?"
  ];

  const priorityQuestionsEs = [
    "¿Cuál es la experiencia de Rodrigo en ZAP-Hosting?",
    "¿Qué hizo Rodrigo durante sus 5 años en Continental Automotive?",
    "¿Qué estudios y certificaciones tiene Rodrigo?",
    "¿Qué stack tecnológico y lenguajes domina Rodrigo?",
    "¿Cómo está configurada su infraestructura de servidores VPS?",
    "¿Tiene experiencia con Linux, Nginx y Docker?"
  ];

  const suggestions = lang === 'es' ? priorityQuestionsEs : priorityQuestionsEn;

  return res.json({
    suggestions,
    categorized: rodrigoKnowledge.suggestions || []
  });
}

export function profileHandler(req, res) {
  const isAdmin = req.user?.role === 'admin';

  if (!isAdmin) {
    const pub = getSanitizedPublicKnowledge();
    return res.json({
      profile: pub.profile,
      skills: pub.skills,
      experience: pub.experience,
      projects: pub.projects,
      infrastructure: pub.infrastructure
    });
  }

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

/**
 * Lists available subagents and execution units in Antigravity CLI (Admin only).
 */
export function subagentsHandler(req, res) {
  const subagents = [
    { id: 'research', name: 'Codebase Researcher', role: 'Exploración de código y análisis profundo', status: 'ready', type: 'system' },
    { id: 'frontend-developer', name: 'Frontend Developer', role: 'React 19, Vite, Tailwind & UI', status: 'ready', type: 'system' },
    { id: 'backend-security-coder', name: 'Security Architect', role: 'Tri-Guard Prompt Armor & Sanitización', status: 'active', type: 'security' },
    { id: 'devops-troubleshooter', name: 'DevOps & SRE', role: 'Nginx, PM2, Systemd & VPS Linux', status: 'ready', type: 'infra' },
    { id: 'database-architect', name: 'Database Architect', role: 'SQLite, Postgres & Cache local', status: 'ready', type: 'data' },
    { id: 'code-reviewer', name: 'PR & Code Reviewer', role: 'Calidad de código, linting y tests', status: 'ready', type: 'quality' }
  ];
  return res.json({ subagents });
}
