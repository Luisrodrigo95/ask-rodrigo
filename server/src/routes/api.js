import express from 'express';
import {
  chatHandler,
  chatStreamHandler,
  conversationsHandler,
  conversationDetailHandler,
  deleteConversationHandler,
  batchDeleteConversationsHandler,
  batchArchiveConversationsHandler,
  metricsHandler,
  calendarGetHandler,
  calendarPostHandler,
  calendarDeleteHandler,
  calendarIcsHandler,
  suggestionsHandler,
  profileHandler,
  healthHandler,
  subagentsHandler
} from '../controllers/chatController.js';
import {
  loginGuest,
  loginAdmin,
  loginGoogle,
  getMe,
  getAuthConfig
} from '../controllers/authController.js';
import {
  uploadMiddleware,
  uploadFileHandler,
  listUploadsHandler,
  batchDeleteUploadsHandler,
  batchArchiveUploadsHandler
} from '../controllers/uploadController.js';
import {
  getNotesHandler,
  saveNoteHandler,
  deleteNoteHandler
} from '../controllers/notesController.js';
import {
  listUsersHandler,
  addUserHandler,
  updateUserPermissionsHandler,
  deleteUserHandler
} from '../controllers/userController.js';
import { authenticateToken, requireAdmin, requireOwner } from '../middleware/auth.js';

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
router.post('/conversations/batch-delete', requireAdmin, batchDeleteConversationsHandler);
router.post('/conversations/batch-archive', requireAdmin, batchArchiveConversationsHandler);
router.get('/conversations/:id', requireAdmin, conversationDetailHandler);
router.delete('/conversations/:id', requireAdmin, deleteConversationHandler);
router.get('/metrics', requireAdmin, metricsHandler);
router.get('/subagents', requireAdmin, subagentsHandler);

// --- Admin-Only Notes & Prompts Scratchpad ---
router.get('/notes', requireAdmin, getNotesHandler);
router.post('/notes', requireAdmin, saveNoteHandler);
router.delete('/notes/:id', requireAdmin, deleteNoteHandler);

// --- Calendar Endpoints (Read: All, Write: Admin Only) ---
router.get('/calendar', calendarGetHandler);
router.get('/calendar.ics', calendarIcsHandler);
router.get('/calendar/feed.ics', calendarIcsHandler);
router.post('/calendar', requireAdmin, calendarPostHandler);
router.delete('/calendar/:id', requireAdmin, calendarDeleteHandler);

// --- Admin-Only File Uploads for Terminal / Antigravity Execution ---
router.post('/upload', requireAdmin, (req, res, next) => {
  uploadMiddleware.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al procesar archivo adjunto.' });
    }
    next();
  });
}, uploadFileHandler);
router.get('/upload/list', requireAdmin, listUploadsHandler);
router.post('/upload/batch-delete', requireAdmin, batchDeleteUploadsHandler);
router.post('/upload/batch-archive', requireAdmin, batchArchiveUploadsHandler);

// --- Owner-Only User Management (Authorized Google Accounts) ---
router.get('/users', requireOwner, listUsersHandler);
router.post('/users', requireOwner, addUserHandler);
router.patch('/users/:email/permissions', requireOwner, updateUserPermissionsHandler);
router.delete('/users/:email', requireOwner, deleteUserHandler);

export default router;
