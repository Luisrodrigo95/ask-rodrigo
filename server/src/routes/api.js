import express from 'express';
import {
  chatHandler,
  chatStreamHandler,
  conversationsHandler,
  conversationDetailHandler,
  deleteConversationHandler,
  metricsHandler,
  calendarGetHandler,
  calendarPostHandler,
  calendarDeleteHandler,
  suggestionsHandler,
  profileHandler,
  healthHandler
} from '../controllers/chatController.js';

const router = express.Router();

// Health check & System summary
router.get('/health', healthHandler);
router.get('/metrics', metricsHandler);

// Profile & Knowledge summary
router.get('/profile', profileHandler);
router.get('/suggestions', suggestionsHandler);

// Interactive Chat (JSON & Realtime SSE)
router.post('/chat', chatHandler);
router.all('/chat/stream', chatStreamHandler);

// Conversation management (AGy-cli persistent sessions)
router.get('/conversations', conversationsHandler);
router.get('/conversations/:id', conversationDetailHandler);
router.delete('/conversations/:id', deleteConversationHandler);

// Calendar & Agenda
router.get('/calendar', calendarGetHandler);
router.post('/calendar', calendarPostHandler);
router.delete('/calendar/:id', calendarDeleteHandler);

export default router;
