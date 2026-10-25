import { spawn, execFile } from 'child_process';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONV_META_PATH = path.join(__dirname, '../data/conversations_meta.json');

const execFileAsync = promisify(execFile);

const AGY_BIN = process.env.AGY_BIN_PATH || '/usr/bin/agy';
const AGY_HOME = process.env.AGY_HOME || '/home/bombi';
const AGY_DB_PATH = path.join(AGY_HOME, '.gemini/antigravity-cli/conversation_summaries.db');
const AGY_BRAIN_DIR = path.join(AGY_HOME, '.gemini/antigravity-cli/brain');

/**
 * Executes a prompt against Antigravity CLI (/usr/bin/agy).
 * Supports streaming via onDelta and returns a summary on completion.
 *
 * @param {string} message - User prompt
 * @param {Object} options
 * @param {string} [options.conversationId] - If resuming an existing session
 * @param {Function} [options.onDelta] - Callback for streaming text deltas (chunk: string)
 * @param {Function} [options.onInit] - Callback when conversation_id is assigned (id: string)
 * @param {number} [options.timeoutMs=120000] - Timeout in ms
 * @param {string} [options.cwd] - Working directory
 * @returns {Promise<{ conversationId: string, reply: string, duration: number, usage: object, status: string, engine: string }>}
 */
export async function executeAgyPrompt(message, options = {}) {
  const {
    conversationId,
    onDelta,
    onInit,
    onToolUpdate,
    timeoutMs = 7200000, // 2 hours per turn
    cwd = AGY_HOME,
    model,
    effort,
    isGuest = false
  } = options;

  return new Promise((resolve, reject) => {
    let finalPrompt = message;

    if (isGuest) {
      finalPrompt = `[SYSTEM INSTRUCTION - GUEST USER (STRICT READ-ONLY MODE)]:\n` +
        `- You are chatting with a Guest user on Ask-Rodrigo.\n` +
        `- Language: You MUST reply in English by default unless the guest explicitly requests another language.\n` +
        `- Security Boundary: You are in STRICT READ-ONLY MODE. Under NO circumstances are you allowed to create, edit, overwrite, modify, or delete any files, code, or directories in any of Rodrigo's projects or on the server. Do not execute any modification commands (no file writes, no git commit/push, no sed, no rm, no touch, no npm install, no systemctl, no write tools).\n` +
        `- If the guest asks you to write code to a file or modify any part of the system or projects, politely refuse in English: "I have read-only permissions as this is a guest session. I cannot modify files or project code, but I can review, explain, and guide you through anything."\n` +
        `- You CAN inspect, read files, explain architecture, discuss Rodrigo's work, skills, and portfolio projects in English.\n\n` +
        `Guest Inquiry:\n${finalPrompt}`;
    }

    if (finalPrompt && finalPrompt.length > 50000) {
      // Auto-offload huge prompt texts to /home/bombi/uploads to prevent CLI argument overflow (spawn E2BIG)
      try {
        const uploadDir = '/home/bombi/uploads';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const autoFile = path.join(uploadDir, `prompt_${Date.now()}.txt`);
        fs.writeFileSync(autoFile, finalPrompt, 'utf8');
        try {
          fs.chmodSync(autoFile, 0o664);
          fs.chownSync(autoFile, 1001, 1001);
        } catch {}
        finalPrompt = `📎 [Texto extenso guardado automáticamente en el servidor]: ${autoFile}\nPor favor lee el contenido completo del archivo usando tus herramientas de lectura para responder y ejecutar la solicitud del usuario.`;
      } catch (errOffload) {
        console.warn('[AGy Bridge] Failed to offload huge prompt:', errOffload.message);
      }
    }

    // Resolve model and thinking effort parameters safely for Antigravity CLI
    let cleanEffort = (effort || 'high').toLowerCase().trim();
    if (!['low', 'medium', 'high'].includes(cleanEffort)) {
      cleanEffort = 'high';
    }

    let resolvedModel = 'gemini-3.8-flash-high';
    const rawModel = (model || '').toLowerCase().trim();

    if (rawModel.includes('opus')) {
      resolvedModel = 'claude-opus-4-6-thinking';
    } else if (rawModel.includes('sonnet')) {
      resolvedModel = 'claude-sonnet-4-6';
    } else if (rawModel.includes('gpt') || rawModel.includes('120b')) {
      resolvedModel = 'gpt-oss-120b-medium';
    } else {
      // Gemini 3.8 Flash (Low / Medium / High)
      resolvedModel = `gemini-3.8-flash-${cleanEffort}`;
    }

    // Pass input format as text and stream prompt through stdin to avoid Linux MAX_ARG_STRLEN (E2BIG)
    const args = [
      '--input-format', 'text',
      '--output-format', 'stream-json',
      '--dangerously-skip-permissions',
      '--model', resolvedModel
    ];

    if (!resolvedModel.includes('-low') && !resolvedModel.includes('-medium') && !resolvedModel.includes('-high')) {
      args.push('--effort', cleanEffort);
    }

    if (isGuest) {
      args.push('--sandbox');
    }

    if (conversationId && typeof conversationId === 'string' && conversationId.trim() !== '' && !conversationId.startsWith('draft-')) {
      args.push('--conversation', conversationId.trim());
    }

    const effectiveCwd = isGuest ? '/var/www/my-portfolio' : (cwd || AGY_HOME);

    const env = {
      ...process.env,
      HOME: AGY_HOME,
      PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin'
    };

    let assignedConversationId = conversationId || null;
    let accumulatedReply = '';
    let resultMeta = null;
    let timedOut = false;
    let aborted = false;

    const child = spawn(AGY_BIN, args, {
      cwd: effectiveCwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (options.signal) {
      if (options.signal.aborted) {
        try { child.kill('SIGTERM'); } catch {}
        return reject(new Error('Turn aborted by client'));
      }
      options.signal.addEventListener('abort', () => {
        aborted = true;
        clearTimeout(timer);
        try {
          if (child && !child.killed) {
            child.kill('SIGTERM');
            setTimeout(() => {
              try { if (!child.killed) child.kill('SIGKILL'); } catch {}
            }, 1000);
          }
        } catch (e) {
          console.warn('[AGy Bridge signal abort error]:', e.message);
        }
        reject(new Error('Turn aborted by client'));
      }, { once: true });
    }

    child.stdin.on('error', (err) => {
      if (err.code !== 'EPIPE') {
        console.warn('[AGy Bridge stdin error]:', err.message);
      }
    });

    // Write full prompt directly into child stdin and close
    child.stdin.write(finalPrompt || '');
    child.stdin.end();

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      reject(new Error(`Antigravity CLI turn timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    const rl = readline.createInterface({
      input: child.stdout,
      terminal: false
    });

    rl.on('line', (line) => {
      if (!line || !line.trim()) return;
      try {
        const ev = JSON.parse(line.trim());
        
        // Initial setup event with conversation_id
        if (ev.event === 'init') {
          if (ev.conversation_id) {
            assignedConversationId = ev.conversation_id;
            if (onInit) onInit(ev.conversation_id);
          }
        }

        // Live streaming token deltas & tool events
        if (ev.event === 'step_update' && ev.step_update) {
          const update = ev.step_update;
          if (update.conversation_id && !assignedConversationId) {
            assignedConversationId = update.conversation_id;
            if (onInit) onInit(update.conversation_id);
          }
          if (update.step_type === 'tool' && onToolUpdate) {
            onToolUpdate({
              stepIndex: update.step_index,
              state: update.state,
              toolName: update.tool_name || (update.tool_info && update.tool_info.name),
              duration: update.duration_seconds,
              toolInfo: update.tool_info
            });
          }
          if (update.text_delta) {
            accumulatedReply += update.text_delta;
            if (onDelta) {
              onDelta(update.text_delta);
            }
          }
        }

        // Final result payload
        if (ev.event === 'result' && ev.result) {
          resultMeta = ev.result;
          if (ev.result.conversation_id) {
            assignedConversationId = ev.result.conversation_id;
          }
          if (ev.result.response && !accumulatedReply) {
            accumulatedReply = ev.result.response;
          }
        }
      } catch (errParse) {
        // Not JSON; could be raw text output fallback
        accumulatedReply += line + '\n';
        if (onDelta) onDelta(line + '\n');
      }
    });

    let stderrOutput = '';
    child.stderr.on('data', (chunk) => {
      stderrOutput += chunk.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (!timedOut && !aborted) {
        reject(new Error(`Failed to spawn agy binary (${AGY_BIN}): ${err.message}`));
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut || aborted) return;

      if (code !== 0 && !accumulatedReply.trim()) {
        const errorMsg = stderrOutput.trim() || `agy exited with non-zero exit code ${code}`;
        return reject(new Error(errorMsg));
      }

      resolve({
        conversationId: assignedConversationId || (resultMeta && resultMeta.conversation_id) || null,
        reply: (accumulatedReply || (resultMeta && resultMeta.response) || '').trim(),
        duration: resultMeta ? resultMeta.duration_seconds : null,
        usage: resultMeta ? resultMeta.usage : null,
        status: (resultMeta && resultMeta.status) || (code === 0 ? 'SUCCESS' : 'COMPLETED_WITH_WARNINGS'),
        engine: `AGy-cli (${resolvedModel})`
      });
    });
  });
}

export function getConversationsMeta() {
  try {
    if (!fs.existsSync(CONV_META_PATH)) return {};
    const raw = fs.readFileSync(CONV_META_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveConversationsMeta(meta) {
  try {
    fs.writeFileSync(CONV_META_PATH, JSON.stringify(meta, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('[ConversationsMeta] save error:', e.message);
    return false;
  }
}

export function batchArchiveAgyConversations(ids = [], archived = true) {
  const meta = getConversationsMeta();
  for (const id of ids) {
    if (typeof id !== 'string') continue;
    const cleanId = id.trim();
    if (!cleanId) continue;
    if (!meta[cleanId]) meta[cleanId] = {};
    meta[cleanId].archived = Boolean(archived);
    meta[cleanId].updatedAt = new Date().toISOString();
  }
  return saveConversationsMeta(meta);
}

/**
 * Retrieves the recent conversations list from Antigravity summaries SQLite database.
 *
 * @param {number} [limit=100]
 * @returns {Promise<Array<{ id: string, title: string, preview: string, lastModified: string, stepCount: number, archived: boolean }>>}
 */
export async function listAgyConversations(limit = 100) {
  try {
    if (!fs.existsSync(AGY_DB_PATH)) {
      return [];
    }

    const query = `SELECT conversation_id, title, preview, last_modified_time, step_count FROM conversation_summaries WHERE killed = 0 ORDER BY last_modified_time DESC LIMIT ${Math.max(1, Math.min(200, limit))};`;
    const { stdout } = await execFileAsync('sqlite3', ['-json', AGY_DB_PATH, query]);

    if (!stdout || !stdout.trim()) {
      return [];
    }

    const meta = getConversationsMeta();
    const items = JSON.parse(stdout);
    return items.map((item) => {
      const textPreview = item.preview || item.title || '';
      return {
        id: item.conversation_id,
        title: item.title || item.preview || 'Conversación sin título',
        preview: textPreview,
        snippet: textPreview,
        lastModified: item.last_modified_time,
        updatedAt: item.last_modified_time,
        stepCount: Number(item.step_count) || 0,
        archived: Boolean(meta[item.conversation_id]?.archived)
      };
    });
  } catch (error) {
    console.error('[AGy Bridge Error] listAgyConversations failed:', error.message);
    return [];
  }
}

function cleanToolArgs(args) {
  if (!args || typeof args !== 'object') return {};
  const clean = {};
  for (const [k, v] of Object.entries(args)) {
    if (typeof v === 'string') {
      let str = v.trim();
      if (str.startsWith('"') && str.endsWith('"') && str.length >= 2) {
        try {
          str = JSON.parse(str);
        } catch {
          str = str.slice(1, -1);
        }
      }
      clean[k] = str;
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

/**
 * Reads and cleans conversation history from a transcript.jsonl file.
 *
 * @param {string} conversationId
 * @returns {Promise<Array<{ role: 'user' | 'assistant', content: string, time: string, stepIndex: number, tools?: Array<object> }>>}
 */
export async function getConversationTranscript(conversationId) {
  try {
    if (!conversationId || typeof conversationId !== 'string') {
      return [];
    }

    const transcriptPath = path.join(AGY_BRAIN_DIR, conversationId, '.system_generated/logs/transcript.jsonl');
    if (!fs.existsSync(transcriptPath)) {
      return [];
    }

    const fileContent = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    const messages = [];
    let currentTurnTools = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line.trim());
        if (item.type === 'USER_INPUT') {
          let text = item.content || '';
          // Strip system-injected tags if present
          const userMatch = text.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
          if (userMatch) {
            text = userMatch[1].trim();
          } else {
            // Remove metadata tags
            text = text.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '')
                       .replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/g, '')
                       .trim();
          }
          if (text) {
            messages.push({
              role: 'user',
              content: text,
              time: item.created_at,
              stepIndex: item.step_index
            });
            currentTurnTools = [];
          }
        } else if (item.type === 'PLANNER_RESPONSE') {
          if (item.tool_calls && Array.isArray(item.tool_calls)) {
            for (const tc of item.tool_calls) {
              currentTurnTools.push({
                stepIndex: item.step_index,
                toolName: tc.name,
                parameters: cleanToolArgs(tc.args),
                output: null,
                state: 'DONE',
                time: item.created_at
              });
            }
          }
          if (item.content) {
            messages.push({
              role: 'assistant',
              content: item.content,
              time: item.created_at,
              stepIndex: item.step_index,
              tools: currentTurnTools.length > 0 ? [...currentTurnTools] : undefined
            });
            currentTurnTools = [];
          }
        } else if (item.type === 'GENERIC') {
          // Tool execution output
          if (currentTurnTools.length > 0) {
            const lastTool = currentTurnTools[currentTurnTools.length - 1];
            if (!lastTool.output) {
              lastTool.output = item.content || '';
              lastTool.state = item.status || 'DONE';
            }
          }
        }
      } catch (errLine) {
        // skip malformed line
      }
    }

    if (currentTurnTools.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.tools) {
        lastMsg.tools = currentTurnTools;
      } else if (!lastMsg || lastMsg.role === 'user') {
        messages.push({
          role: 'assistant',
          content: '',
          time: new Date().toISOString(),
          tools: currentTurnTools
        });
      }
    }

    return messages;
  } catch (error) {
    console.error('[AGy Bridge Error] getConversationTranscript failed:', error.message);
    return [];
  }
}

/**
 * Marks a conversation as killed/hidden in summaries database.
 */
export async function deleteAgyConversation(conversationId) {
  try {
    if (!conversationId || !fs.existsSync(AGY_DB_PATH)) return false;
    const cleanId = conversationId.replace(/[^a-zA-Z0-9-]/g, '');
    const query = `UPDATE conversation_summaries SET killed = 1 WHERE conversation_id = '${cleanId}';`;
    await execFileAsync('sqlite3', [AGY_DB_PATH, query]);

    const meta = getConversationsMeta();
    if (meta[cleanId]) {
      delete meta[cleanId];
      saveConversationsMeta(meta);
    }
    return true;
  } catch (error) {
    console.error('[AGy Bridge Error] deleteAgyConversation failed:', error.message);
    return false;
  }
}

/**
 * Batch marks multiple conversations as killed/hidden in summaries database.
 */
export async function batchDeleteAgyConversations(ids = []) {
  try {
    if (!Array.isArray(ids) || ids.length === 0 || !fs.existsSync(AGY_DB_PATH)) return false;
    const cleanIds = ids
      .map((id) => (typeof id === 'string' ? id.replace(/[^a-zA-Z0-9-]/g, '') : ''))
      .filter(Boolean);
    if (cleanIds.length === 0) return false;

    const inClause = cleanIds.map((id) => `'${id}'`).join(',');
    const query = `UPDATE conversation_summaries SET killed = 1 WHERE conversation_id IN (${inClause});`;
    await execFileAsync('sqlite3', [AGY_DB_PATH, query]);

    // Also purge from conversations_meta if present
    const meta = getConversationsMeta();
    let changed = false;
    for (const id of cleanIds) {
      if (meta[id]) {
        delete meta[id];
        changed = true;
      }
    }
    if (changed) saveConversationsMeta(meta);

    return true;
  } catch (error) {
    console.error('[AGy Bridge Error] batchDeleteAgyConversations failed:', error.message);
    return false;
  }
}
