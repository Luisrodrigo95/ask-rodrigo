import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/home/bombi/uploads';
const ARCHIVE_DIR = path.join(UPLOAD_DIR, 'archive');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error('[Upload] Failed to create upload dir:', err.message);
  }
}

if (!fs.existsSync(ARCHIVE_DIR)) {
  try {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    fs.chmodSync(ARCHIVE_DIR, 0o775);
    fs.chownSync(ARCHIVE_DIR, 1001, 1001);
  } catch (err) {
    console.warn('[Upload] Failed to create archive dir:', err.message);
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
 * Lists recent uploaded files in /home/bombi/uploads and /home/bombi/uploads/archive
 * GET /api/upload/list (Admin Only)
 */
export function listUploadsHandler(req, res) {
  try {
    const files = [];

    // 1. Read active files from UPLOAD_DIR
    if (fs.existsSync(UPLOAD_DIR)) {
      const activeNames = fs.readdirSync(UPLOAD_DIR);
      for (const name of activeNames) {
        if (name === 'archive') continue;
        const fullPath = path.join(UPLOAD_DIR, name);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            files.push({
              filename: name,
              name: name,
              path: fullPath,
              size: formatBytes(stats.size),
              rawSize: stats.size,
              mtime: stats.mtime,
              isArchived: false
            });
          }
        } catch {
          // ignore error
        }
      }
    }

    // 2. Read archived files from ARCHIVE_DIR
    if (fs.existsSync(ARCHIVE_DIR)) {
      const archiveNames = fs.readdirSync(ARCHIVE_DIR);
      for (const name of archiveNames) {
        const fullPath = path.join(ARCHIVE_DIR, name);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            files.push({
              filename: name,
              name: name,
              path: fullPath,
              size: formatBytes(stats.size),
              rawSize: stats.size,
              mtime: stats.mtime,
              isArchived: true
            });
          }
        } catch {
          // ignore error
        }
      }
    }

    files.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));

    return res.json({ files });
  } catch (err) {
    return res.status(500).json({ error: 'Error listando archivos subidos', details: err.message });
  }
}

/**
 * Batch deletes multiple uploaded files permanently.
 * POST /api/upload/batch-delete (Admin Only)
 */
export function batchDeleteUploadsHandler(req, res) {
  try {
    const { filenames } = req.body;
    if (!Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ error: 'Lista de filenames requerida' });
    }

    const deleted = [];
    for (const rawName of filenames) {
      if (!rawName || typeof rawName !== 'string') continue;
      const safeName = path.basename(rawName);

      // Check active dir
      const activePath = path.join(UPLOAD_DIR, safeName);
      if (fs.existsSync(activePath)) {
        try {
          fs.unlinkSync(activePath);
          deleted.push(safeName);
          continue;
        } catch (e) {
          console.warn('[Upload] Failed to unlink:', activePath, e.message);
        }
      }

      // Check archive dir
      const archivePath = path.join(ARCHIVE_DIR, safeName);
      if (fs.existsSync(archivePath)) {
        try {
          fs.unlinkSync(archivePath);
          deleted.push(safeName);
        } catch (e) {
          console.warn('[Upload] Failed to unlink archived file:', archivePath, e.message);
        }
      }
    }

    return res.json({ ok: true, deletedCount: deleted.length, deleted });
  } catch (err) {
    return res.status(500).json({ error: 'Error eliminando archivos subidos', details: err.message });
  }
}

/**
 * Batch archives / unarchives multiple uploaded files.
 * POST /api/upload/batch-archive (Admin Only)
 */
export function batchArchiveUploadsHandler(req, res) {
  try {
    const { filenames, archive = true } = req.body;
    if (!Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ error: 'Lista de filenames requerida' });
    }

    if (!fs.existsSync(ARCHIVE_DIR)) {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }

    const moved = [];
    for (const rawName of filenames) {
      if (!rawName || typeof rawName !== 'string') continue;
      const safeName = path.basename(rawName);

      if (archive) {
        // Move from UPLOAD_DIR to ARCHIVE_DIR
        const srcPath = path.join(UPLOAD_DIR, safeName);
        const destPath = path.join(ARCHIVE_DIR, safeName);
        if (fs.existsSync(srcPath)) {
          try {
            fs.renameSync(srcPath, destPath);
            moved.push(safeName);
          } catch (e) {
            console.warn('[Upload] Failed to archive:', safeName, e.message);
          }
        }
      } else {
        // Unarchive: move from ARCHIVE_DIR to UPLOAD_DIR
        const srcPath = path.join(ARCHIVE_DIR, safeName);
        const destPath = path.join(UPLOAD_DIR, safeName);
        if (fs.existsSync(srcPath)) {
          try {
            fs.renameSync(srcPath, destPath);
            moved.push(safeName);
          } catch (e) {
            console.warn('[Upload] Failed to unarchive:', safeName, e.message);
          }
        }
      }
    }

    return res.json({ ok: true, movedCount: moved.length, moved, archive: Boolean(archive) });
  } catch (err) {
    return res.status(500).json({ error: 'Error archivando archivos subidos', details: err.message });
  }
}
