import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup environment: load from server/.env, then fallback to root .env
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Trust Nginx reverse proxy headers (X-Forwarded-For, X-Forwarded-Proto)
app.set('trust proxy', 1);

// Security Middleware with custom CSP & same-origin-allow-popups for Google OAuth
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
  })
);

// CORS setup
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3005',
  'https://therodrigo.com',
  'https://www.therodrigo.com'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in internal reverse proxy
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiter for chat endpoint (protection against abuse)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // max 60 requests per minute per IP
  message: {
    error: 'Demasiadas solicitudes. Por favor espera un momento.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false }
});

app.use('/api/chat', chatLimiter);

// Mount API
app.use('/api', apiRoutes);

// Serve static frontend in production
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// SPA catch-all route to client index.html
app.get('*', (req, res, next) => {
  // If request is for an unhandled API endpoint, return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found.' });
  }
  
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      // If client is not built yet (during initial dev setup)
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>Ask-Rodrigo API Server</title>
          <style>
            body { font-family: monospace; background: #0f172a; color: #f8fafc; padding: 2rem; }
            a { color: #38bdf8; }
            .card { background: #1e293b; padding: 1.5rem; border-radius: 8px; border: 1px solid #334155; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>🚀 Ask-Rodrigo API Server is Online</h2>
            <p>Port: <strong>${PORT}</strong> | Mode: <strong>${process.env.NODE_ENV || 'production'}</strong></p>
            <p>Client build is not compiled yet. Run <code>npm run build</code> in the root directory.</p>
            <ul>
              <li><a href="/api/health">/api/health</a></li>
              <li><a href="/api/profile">/api/profile</a></li>
              <li><a href="/api/suggestions">/api/suggestions</a></li>
            </ul>
          </div>
        </body>
        </html>
      `);
    }
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error Handler]:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Ask-Rodrigo] Server running on http://127.0.0.1:${PORT}`);
  console.log(`[Ask-Rodrigo] Node Environment: ${process.env.NODE_ENV || 'production'}`);
});

// Configure 15-minute timeout for extended AGy-cli tasks
server.setTimeout(900000);
server.keepAliveTimeout = 65000;
