import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/home/bombi/uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error('[Upload] Failed to create upload dir:', err.message);
  }
}

// Allowed text and code extensions for terminal/Antigravity ingestion
const ALLOWED_EXTENSIONS = new Set([
  '.txt', '.log', '.md', '.markdown',
  '.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx',
  '.py', '.json', '.sh', '.bash', '.zsh',
  '.yml', '.yaml', '.css', '.scss', '.html',
  '.sql', '.env', '.csv', '.tsv', '.xml',
  '.conf', '.ini', '.cfg', '.patch', '.diff',
  '.java', '.c', '.cpp', '.h', '.hpp',
  '.rs', '.go', '.php', '.rb', '.toml'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nameWithoutExt = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = `${Date.now()}-${nameWithoutExt}${ext}`;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  // Allow all typical text/code extensions or plain text mimetypes
  if (ALLOWED_EXTENSIONS.has(ext) || file.mimetype.startsWith('text/') || file.mimetype === 'application/json') {
    cb(null, true);
  } else {
    // Also allow files with no extension if text
    if (!ext) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no soportado (${ext}). Sube archivos de texto, código, logs o scripts.`));
    }
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max
  }
});

/**
 * Handles file upload from admin user.
 * POST /api/upload (Admin Only)
 */
export function uploadFileHandler(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  }

  const filePath = req.file.path;
  try {
    fs.chmodSync(filePath, 0o664);
    // Give ownership to user bombi (1001:1001)
    fs.chownSync(filePath, 1001, 1001);
  } catch (e) {
    console.warn('[Upload] Failed to chmod/chown uploaded file:', e.message);
  }

  console.log(`[Upload] File saved successfully: ${filePath} (${req.file.size} bytes) for ${req.user?.email || 'admin'}`);

  return res.json({
    ok: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    path: filePath,
    message: `Archivo subido y listo en: ${filePath}`
  });
}

/**
 * Lists recent uploaded files in /home/bombi/uploads
 * GET /api/upload/list (Admin Only)
 */
export function listUploadsHandler(req, res) {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      return res.json({ files: [] });
    }

    const fileNames = fs.readdirSync(UPLOAD_DIR);
    const files = fileNames
      .map((name) => {
        const fullPath = path.join(UPLOAD_DIR, name);
        try {
          const stats = fs.statSync(fullPath);
          return {
            filename: name,
            path: fullPath,
            size: stats.size,
            mtime: stats.mtime
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 30);

    return res.json({ files });
  } catch (err) {
    return res.status(500).json({ error: 'Error listando archivos subidos', details: err.message });
  }
}
