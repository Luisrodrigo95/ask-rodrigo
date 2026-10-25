import fs from 'fs';
import path from 'path';
import multer from 'multer';

// List of available projects managed on the VPS
export const AVAILABLE_PROJECTS = [
  {
    id: 'portfolio',
    name: 'therodrigo.com (Portfolio)',
    description: 'Express 5 + EJS personal portfolio',
    path: '/var/www/my-portfolio',
    badge: 'Express',
    port: 3000
  },
  {
    id: 'askrodrigo',
    name: 'Ask-Rodrigo',
    description: 'Vite React + Express AI Workstation',
    path: '/var/www/ask-rodrigo',
    badge: 'React + Node',
    port: 3005
  },
  {
    id: 'preswin',
    name: 'PresWin',
    description: 'Construction cost estimating suite',
    path: '/var/www/preswin',
    badge: 'App Suite',
    port: 4000
  },
  {
    id: 'totimigraciones',
    name: 'TotiMigraciones',
    description: 'Immigration legal services portal',
    path: '/var/www/totimigraciones',
    badge: 'Portal',
    port: 3001
  },
  {
    id: 'wiwishop',
    name: 'WiwiShop',
    description: 'E-commerce catalog subproject',
    path: '/var/www/my-portfolio/public/wiwishop',
    badge: 'Frontend',
    port: null
  }
];

// Binary file extensions that should not be loaded as text in Monaco
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.mp3', '.wav', '.ogg', '.mp4', '.webm',
  '.woff', '.woff2', '.ttf', '.eot',
  '.bin', '.exe', '.so', '.dylib', '.dll'
]);

function getProject(projectId) {
  return AVAILABLE_PROJECTS.find(p => p.id === projectId) || null;
}

/**
 * Safely resolves a path inside a project root, protecting against directory traversal.
 */
function resolveSafePath(projectId, relativePath = '') {
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Proyecto no válido o desconocido: "${projectId}".`);
  }

  const root = path.resolve(project.path);
  if (!fs.existsSync(root)) {
    throw new Error(`El directorio raíz del proyecto no existe en el disco: ${root}`);
  }

  // Normalize and remove leading slashes
  const cleanRel = String(relativePath || '').replace(/^(\/|\\)+/, '');
  const resolved = path.resolve(root, cleanRel);

  // Ensure resolved path is strictly within the project root
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error('Violación de seguridad: Intento de acceso fuera del directorio del proyecto.');
  }

  return { root, resolved, relativePath: cleanRel, project };
}

/**
 * Recursively builds file tree, excluding heavy directories for speed
 */
function buildFileTree(dirPath, rootPath, currentDepth = 0, maxDepth = 6) {
  if (currentDepth > maxDepth) return [];
  
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    return [];
  }

  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  const IGNORED = new Set([
    'node_modules', '.git', 'dist', '.gemini', 'package-lock.json.backup', '.next', 'coverage', '.cache'
  ]);

  const tree = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(rootPath, fullPath);

    if (IGNORED.has(entry.name)) {
      if (entry.isDirectory()) {
        tree.push({
          name: entry.name,
          relativePath: relPath,
          isDirectory: true,
          isIgnored: true,
          children: []
        });
      }
      continue;
    }

    if (entry.isDirectory()) {
      tree.push({
        name: entry.name,
        relativePath: relPath,
        isDirectory: true,
        children: buildFileTree(fullPath, rootPath, currentDepth + 1, maxDepth)
      });
    } else {
      let size = 0;
      let modifiedAt = null;
      try {
        const st = fs.statSync(fullPath);
        size = st.size;
        modifiedAt = st.mtime.toISOString();
      } catch {}

      const ext = path.extname(entry.name).toLowerCase();
      tree.push({
        name: entry.name,
        relativePath: relPath,
        isDirectory: false,
        size,
        modifiedAt,
        isBinary: BINARY_EXTENSIONS.has(ext)
      });
    }
  }

  return tree;
}

/**
 * GET /api/developer/projects
 */
export async function getProjectsHandler(req, res) {
  try {
    const projects = AVAILABLE_PROJECTS.map((p) => ({
      ...p,
      exists: fs.existsSync(p.path)
    }));
    return res.json({ projects });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/developer/tree?projectId=...
 */
export async function getTreeHandler(req, res) {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'Parámetro projectId es requerido.' });
    }

    const { root, project } = resolveSafePath(projectId);
    const tree = buildFileTree(root, root);

    return res.json({
      project: {
        id: project.id,
        name: project.name,
        root
      },
      tree
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/**
 * GET /api/developer/file?projectId=...&filePath=...
 */
export async function readFileHandler(req, res) {
  try {
    const { projectId, filePath } = req.query;
    if (!projectId || !filePath) {
      return res.status(400).json({ error: 'Se requieren projectId y filePath.' });
    }

    const { resolved, relativePath } = resolveSafePath(projectId, filePath);

    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: `El archivo "${filePath}" no fue encontrado.` });
    }

    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return res.status(400).json({ error: 'La ruta solicitada es un directorio, no un archivo.' });
    }

    const ext = path.extname(resolved).toLowerCase();
    const isBinary = BINARY_EXTENSIONS.has(ext);

    if (isBinary) {
      return res.json({
        relativePath,
        name: path.basename(resolved),
        size: stat.size,
        isBinary: true,
        message: 'Archivo binario (no editable en texto plano).'
      });
    }

    // Size limit check (max 5 MB for browser editor)
    if (stat.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        error: `El archivo es demasiado grande (${(stat.size / 1024 / 1024).toFixed(1)} MB) para cargarse en el editor web (máx 5 MB).`
      });
    }

    const content = fs.readFileSync(resolved, 'utf-8');

    return res.json({
      relativePath,
      name: path.basename(resolved),
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      isBinary: false,
      content
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/**
 * POST /api/developer/file
 * Saves changes to an existing or new text file
 */
export async function saveFileHandler(req, res) {
  try {
    const { projectId, filePath, content } = req.body;
    if (!projectId || !filePath || typeof content !== 'string') {
      return res.status(400).json({ error: 'Se requieren projectId, filePath y content.' });
    }

    const { resolved, relativePath } = resolveSafePath(projectId, filePath);

    // Ensure parent directory exists
    const parentDir = path.dirname(resolved);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(resolved, content, 'utf-8');
    
    // Set proper permissions and bombi ownership if running as root
    try {
      fs.chownSync(resolved, 1001, 1001); // bombi:bombi
    } catch {}

    const stat = fs.statSync(resolved);

    return res.json({
      success: true,
      relativePath,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      message: 'Archivo guardado correctamente.'
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/**
 * POST /api/developer/create
 * Creates a new file or directory
 */
export async function createItemHandler(req, res) {
  try {
    const { projectId, targetPath, name, type } = req.body;
    if (!projectId || !name || !type) {
      return res.status(400).json({ error: 'Se requieren projectId, name y type (file/folder).' });
    }

    // Target path is the parent directory
    const cleanParent = String(targetPath || '').replace(/^(\/|\\)+/, '');
    const cleanName = path.basename(String(name).trim());
    if (!cleanName || cleanName === '.' || cleanName === '..') {
      return res.status(400).json({ error: 'Nombre de archivo o carpeta no válido.' });
    }

    const itemRelative = cleanParent ? path.join(cleanParent, cleanName) : cleanName;
    const { resolved, relativePath } = resolveSafePath(projectId, itemRelative);

    if (fs.existsSync(resolved)) {
      return res.status(400).json({ error: `Ya existe un elemento con el nombre "${cleanName}".` });
    }

    if (type === 'folder') {
      fs.mkdirSync(resolved, { recursive: true });
    } else {
      const parent = path.dirname(resolved);
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }
      fs.writeFileSync(resolved, '', 'utf-8');
    }

    try {
      fs.chownSync(resolved, 1001, 1001);
    } catch {}

    return res.json({
      success: true,
      relativePath,
      name: cleanName,
      type
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/**
 * DELETE /api/developer/item
 * Deletes a file or directory
 */
export async function deleteItemHandler(req, res) {
  try {
    const { projectId, itemPath } = req.body;
    if (!projectId || !itemPath) {
      return res.status(400).json({ error: 'Se requieren projectId y itemPath.' });
    }

    const { root, resolved, relativePath } = resolveSafePath(projectId, itemPath);

    // Prevent deleting the root directory itself
    if (resolved === root || relativePath === '') {
      return res.status(400).json({ error: 'No es posible eliminar el directorio raíz del proyecto.' });
    }

    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: `El elemento "${itemPath}" no existe.` });
    }

    const stat = fs.statSync(resolved);
    const isDir = stat.isDirectory();

    fs.rmSync(resolved, { recursive: true, force: true });

    return res.json({
      success: true,
      relativePath,
      isDir,
      message: `Elemento "${path.basename(resolved)}" eliminado correctamente.`
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/**
 * POST /api/developer/rename
 */
export async function renameItemHandler(req, res) {
  try {
    const { projectId, oldPath, newName } = req.body;
    if (!projectId || !oldPath || !newName) {
      return res.status(400).json({ error: 'Se requieren projectId, oldPath y newName.' });
    }

    const { root, resolved: resolvedOld } = resolveSafePath(projectId, oldPath);
    if (resolvedOld === root) {
      return res.status(400).json({ error: 'No es posible renombrar la raíz del proyecto.' });
    }

    if (!fs.existsSync(resolvedOld)) {
      return res.status(404).json({ error: 'El archivo o carpeta de origen no existe.' });
    }

    const cleanNewName = path.basename(String(newName).trim());
    const parentDir = path.dirname(resolvedOld);
    const resolvedNew = path.join(parentDir, cleanNewName);

    // Verify destination is still safe
    const { resolved: verifiedNew, relativePath: newRelative } = resolveSafePath(
      projectId,
      path.relative(root, resolvedNew)
    );

    if (fs.existsSync(verifiedNew)) {
      return res.status(400).json({ error: `Ya existe un elemento con el nombre "${cleanNewName}".` });
    }

    fs.renameSync(resolvedOld, verifiedNew);

    return res.json({
      success: true,
      oldPath,
      newPath: newRelative,
      newName: cleanNewName
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

// Multer memory storage for direct writing to target project directory
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max per uploaded file
  }
});

export const developerUploadMiddleware = memoryUpload.array('files', 15);

/**
 * POST /api/developer/upload
 * Uploads one or multiple files into a project directory
 */
export async function uploadDeveloperFilesHandler(req, res) {
  try {
    const { projectId, destinationPath = '' } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'Parámetro projectId es requerido.' });
    }

    const { resolved: destDir } = resolveSafePath(projectId, destinationPath);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const uploaded = [];
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({ error: 'No se recibieron archivos para subir.' });
    }

    for (const file of files) {
      const safeName = path.basename(file.originalname).replace(/[\/\\]/g, '_');
      const targetFilePath = path.join(destDir, safeName);

      fs.writeFileSync(targetFilePath, file.buffer);
      try {
        fs.chownSync(targetFilePath, 1001, 1001);
      } catch {}

      uploaded.push({
        originalName: file.originalname,
        name: safeName,
        size: file.size,
        relativePath: path.relative(resolveSafePath(projectId).root, targetFilePath)
      });
    }

    return res.json({
      success: true,
      count: uploaded.length,
      files: uploaded,
      message: `${uploaded.length} archivo(s) subido(s) correctamente.`
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
