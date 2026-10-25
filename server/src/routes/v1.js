import express from 'express';
import { executeAgyPrompt } from '../services/agyBridgeService.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * GET /v1/models
 * Returns available models for Continue or any OpenAI-compatible client
 */
router.get('/models', requireAdmin, (req, res) => {
  return res.json({
    object: 'list',
    data: [
      {
        id: 'antigravity-gemini',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'google-antigravity',
        permission: [],
        root: 'antigravity-gemini',
        parent: null
      },
      {
        id: 'gemini-3.8-flash',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'google',
        permission: [],
        root: 'gemini-3.8-flash',
        parent: null
      }
    ]
  });
});

/**
 * POST /v1/chat/completions
 * OpenAI-compatible chat completions proxying directly to Antigravity CLI (agy)
 */
router.post('/chat/completions', requireAdmin, async (req, res) => {
  const { messages = [], stream = false, model = 'antigravity-gemini' } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: 'Messages array is required.' } });
  }

  // Format the prompt for Antigravity
  // If multiple messages, synthesize context
  let promptText = '';
  if (messages.length === 1) {
    promptText = typeof messages[0].content === 'string' ? messages[0].content : JSON.stringify(messages[0].content);
  } else {
    promptText = messages
      .map((m) => {
        const role = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System';
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return `[${role}]: ${content}`;
      })
      .join('\n\n');
  }

  const completionId = `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const created = Math.floor(Date.now() / 1000);

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Initial role chunk
    const initChunk = {
      id: completionId,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [
        {
          index: 0,
          delta: { role: 'assistant', content: '' },
          finish_reason: null
        }
      ]
    };
    res.write(`data: ${JSON.stringify(initChunk)}\n\n`);

    try {
      await executeAgyPrompt(promptText, {
        onDelta: (chunk) => {
          if (!chunk) return;
          const sseData = {
            id: completionId,
            object: 'chat.completion.chunk',
            created,
            model,
            choices: [
              {
                index: 0,
                delta: { content: chunk },
                finish_reason: null
              }
            ]
          };
          res.write(`data: ${JSON.stringify(sseData)}\n\n`);
        }
      });

      // Final stop chunk
      const finishChunk = {
        id: completionId,
        object: 'chat.completion.chunk',
        created,
        model,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop'
          }
        ]
      };
      res.write(`data: ${JSON.stringify(finishChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      console.error('[OpenAI Bridge Error]:', err.message);
      const errorChunk = {
        id: completionId,
        object: 'chat.completion.chunk',
        created,
        model,
        choices: [
          {
            index: 0,
            delta: { content: `\n\n[Error de Antigravity: ${err.message}]` },
            finish_reason: 'stop'
          }
        ]
      };
      res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } else {
    // Non-streaming response
    try {
      const result = await executeAgyPrompt(promptText);
      return res.json({
        id: completionId,
        object: 'chat.completion',
        created,
        model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: result.reply || ''
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: (result.reply || '').length,
          total_tokens: 15 + (result.reply || '').length
        }
      });
    } catch (err) {
      return res.status(500).json({ error: { message: err.message } });
    }
  }
});

export default router;
