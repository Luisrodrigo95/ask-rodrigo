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
import {
  loginGuest,
  loginAdmin,
  loginGoogle,
  getMe,
  getAuthConfig
} from '../controllers/authController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply authenticateToken middleware to parse Bearer token across all routes
router.use(authenticateToken);

// --- Auth Endpoints ---
router.get('/auth/config', getAuthConfig);
router.post('/auth/guest', loginGuest);
router.post('/auth/admin-login', loginAdmin);
router.post('/auth/google', loginGoogle);
router.get('/auth/me', getMe);

// --- Public Endpoints ---
router.get('/health', healthHandler);
router.get('/profile', profileHandler);
router.get('/suggestions', suggestionsHandler);

// --- Interactive Chat (Guests: Safe Knowledge AI / Admin: Native AGy-cli) ---
router.post('/chat', chatHandler);
router.all('/chat/stream', chatStreamHandler);

// --- Admin-Only Endpoints (Antigravity sessions & VPS metrics) ---
router.get('/conversations', requireAdmin, conversationsHandler);
router.get('/conversations/:id', requireAdmin, conversationDetailHandler);
router.delete('/conversations/:id', requireAdmin, deleteConversationHandler);
router.get('/metrics', requireAdmin, metricsHandler);

// --- Calendar Endpoints (Read: All, Write: Admin Only) ---
router.get('/calendar', calendarGetHandler);
router.post('/calendar', requireAdmin, calendarPostHandler);
router.delete('/calendar/:id', requireAdmin, calendarDeleteHandler);

export default router;
