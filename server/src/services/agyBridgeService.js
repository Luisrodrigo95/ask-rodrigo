import { spawn, execFile } from 'child_process';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

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
    timeoutMs = 900000, // 15 minutes per turn
    cwd = AGY_HOME
  } = options;

  return new Promise((resolve, reject) => {
    // Pipe prompt through stdin via '-p' '-' to avoid Linux ARG_MAX / MAX_ARG_STRLEN limits (spawn E2BIG)
    const args = ['-p', '-', '--output-format', 'stream-json', '--dangerously-skip-permissions'];
    if (conversationId && typeof conversationId === 'string' && conversationId.trim() !== '') {
      args.push('--conversation', conversationId.trim());
    }

    const env = {
      ...process.env,
      HOME: AGY_HOME,
      PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin'
    };

    let assignedConversationId = conversationId || null;
    let accumulatedReply = '';
    let resultMeta = null;
    let timedOut = false;

    const child = spawn(AGY_BIN, args, {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    child.stdin.on('error', (err) => {
      if (err.code !== 'EPIPE') {
        console.warn('[AGy Bridge stdin error]:', err.message);
      }
    });

    // Write prompt message directly to child stdin and close
    child.stdin.write(message);
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

        // Live streaming token deltas
        if (ev.event === 'step_update' && ev.step_update) {
          const update = ev.step_update;
          if (update.conversation_id && !assignedConversationId) {
            assignedConversationId = update.conversation_id;
            if (onInit) onInit(update.conversation_id);
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
      if (!timedOut) {
        reject(new Error(`Failed to spawn agy binary (${AGY_BIN}): ${err.message}`));
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return;

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
        engine: 'AGy-cli Native (Antigravity)'
      });
    });
  });
}

/**
 * Retrieves the recent conversations list from Antigravity summaries SQLite database.
 *
 * @param {number} [limit=25]
 * @returns {Promise<Array<{ conversation_id: string, title: string, preview: string, last_modified_time: string, step_count: number }>>}
 */
export async function listAgyConversations(limit = 25) {
  try {
    if (!fs.existsSync(AGY_DB_PATH)) {
      return [];
    }

    const query = `SELECT conversation_id, title, preview, last_modified_time, step_count FROM conversation_summaries WHERE killed = 0 ORDER BY last_modified_time DESC LIMIT ${Math.max(1, Math.min(100, limit))};`;
    const { stdout } = await execFileAsync('sqlite3', ['-json', AGY_DB_PATH, query]);

    if (!stdout || !stdout.trim()) {
      return [];
    }

    const items = JSON.parse(stdout);
    return items.map((item) => ({
      id: item.conversation_id,
      title: item.title || item.preview || 'Conversación sin título',
      preview: item.preview || '',
      lastModified: item.last_modified_time,
      stepCount: Number(item.step_count) || 0
    }));
  } catch (error) {
    console.error('[AGy Bridge Error] listAgyConversations failed:', error.message);
    return [];
  }
}

/**
 * Reads and cleans conversation history from a transcript.jsonl file.
 *
 * @param {string} conversationId
 * @returns {Promise<Array<{ role: 'user' | 'assistant', content: string, time: string, stepIndex: number }>>}
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
          }
        } else if (item.type === 'PLANNER_RESPONSE' && item.content) {
          messages.push({
            role: 'assistant',
            content: item.content,
            time: item.created_at,
            stepIndex: item.step_index
          });
        }
      } catch (errLine) {
        // skip malformed line
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
    return true;
  } catch (error) {
    console.error('[AGy Bridge Error] deleteAgyConversation failed:', error.message);
    return false;
  }
}
