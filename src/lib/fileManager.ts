// ============================================
// VenAI - File Manager Library
// Handle file operations: save, read, list, delete
// ============================================

import { promises as fs } from 'fs';
import path from 'path';

const UPLOAD_BASE_DIR = '/tmp/uploads';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total per session
const MAX_FILES_PER_SESSION = 10;

// Supported text file extensions
const SUPPORTED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.json', '.md', '.txt', '.csv',
  '.yaml', '.yml', '.html', '.css', '.sql', '.sh', '.env', '.gitignore',
  '.prisma', '.toml', '.xml', '.svg', '.log', '.conf', '.cfg', '.ini',
  '.graphql', '.gql', '.rs', '.go', '.java', '.c', '.cpp', '.h', '.hpp',
  '.rb', '.php', '.swift', '.kt', '.scala', '.r', '.lua', '.pl',
]);

export interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  sessionId: string;
  size: number;
  type: string;
  createdAt: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getSessionDir(sessionId: string): string {
  return path.join(UPLOAD_BASE_DIR, sessionId);
}

async function ensureSessionDir(sessionId: string): Promise<string> {
  const dir = getSessionDir(sessionId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function getFileExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext;
}

function isSupportedFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  // Support files without extension too (like Dockerfile, Makefile)
  return SUPPORTED_EXTENSIONS.has(ext) || filename.includes('.');
}

function getFileType(filename: string): string {
  const ext = getFileExtension(filename);
  const typeMap: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript-react', '.js': 'javascript', '.jsx': 'javascript-react',
    '.py': 'python', '.json': 'json', '.md': 'markdown', '.txt': 'text', '.csv': 'csv',
    '.yaml': 'yaml', '.yml': 'yaml', '.html': 'html', '.css': 'css', '.sql': 'sql',
    '.sh': 'shell', '.env': 'env', '.gitignore': 'gitignore',
    '.prisma': 'prisma', '.toml': 'toml', '.xml': 'xml', '.svg': 'svg',
    '.rs': 'rust', '.go': 'go', '.java': 'java', '.c': 'c', '.cpp': 'cpp',
    '.rb': 'ruby', '.php': 'php', '.swift': 'swift', '.kt': 'kotlin',
  };
  return typeMap[ext] || 'text';
}

function sanitizeFileName(filename: string): string {
  // Remove path traversal attempts
  const sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  // Limit length
  return sanitized.substring(0, 255);
}

/**
 * Save an uploaded file to disk
 */
export async function saveFile(
  sessionId: string,
  originalName: string,
  content: string | Buffer,
  size: number
): Promise<UploadedFile> {
  if (!isSupportedFile(originalName)) {
    throw new Error(`Loại file không được hỗ trợ: ${getFileExtension(originalName) || 'unknown'}`);
  }

  if (size > MAX_FILE_SIZE) {
    throw new Error(`File quá lớn. Tối đa ${MAX_FILE_SIZE / 1024 / 1024}MB mỗi file.`);
  }

  // Check session limits
  const sessionDir = await ensureSessionDir(sessionId);
  const existingFiles = await listFiles(sessionId);
  
  if (existingFiles.length >= MAX_FILES_PER_SESSION) {
    throw new Error(`Tối đa ${MAX_FILES_PER_SESSION} files mỗi phiên.`);
  }

  const totalSize = existingFiles.reduce((sum, f) => sum + f.size, 0);
  if (totalSize + size > MAX_TOTAL_SIZE) {
    throw new Error(`Vượt quá giới hạn tổng dung lượng (${MAX_TOTAL_SIZE / 1024 / 1024}MB).`);
  }

  const id = generateId();
  const sanitized = sanitizeFileName(originalName);
  const fileExtension = getFileExtension(originalName);
  const savedName = `${id}${fileExtension}`;
  const filePath = path.join(sessionDir, savedName);

  if (typeof content === 'string') {
    await fs.writeFile(filePath, content, 'utf-8');
  } else {
    await fs.writeFile(filePath, content);
  }

  return {
    id,
    name: savedName,
    originalName: sanitized,
    sessionId,
    size,
    type: getFileType(originalName),
    createdAt: Date.now(),
  };
}

/**
 * Read a file's content as text
 */
export async function readFile(sessionId: string, fileId: string): Promise<{ name: string; content: string } | null> {
  const sessionDir = getSessionDir(sessionId);
  
  try {
    const files = await fs.readdir(sessionDir);
    const file = files.find(f => f.startsWith(fileId));
    
    if (!file) return null;
    
    const filePath = path.join(sessionDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    
    return {
      name: file.replace(/^\w+-\w+-/, ''), // Remove ID prefix to get original-ish name
      content,
    };
  } catch {
    return null;
  }
}

/**
 * Read all files in a session for context building
 */
export async function readAllSessionFiles(sessionId: string): Promise<Array<{ name: string; content: string }>> {
  const files = await listFiles(sessionId);
  const results: Array<{ name: string; content: string }> = [];

  for (const file of files) {
    const content = await readFile(sessionId, file.id);
    if (content) {
      results.push({
        name: file.originalName,
        content: content.content,
      });
    }
  }

  return results;
}

/**
 * List all uploaded files for a session
 */
export async function listFiles(sessionId: string): Promise<UploadedFile[]> {
  const sessionDir = getSessionDir(sessionId);
  
  try {
    await fs.access(sessionDir);
  } catch {
    return [];
  }

  try {
    const entries = await fs.readdir(sessionDir);
    const files: UploadedFile[] = [];

    for (const entry of entries) {
      const filePath = path.join(sessionDir, entry);
      try {
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          const ext = getFileExtension(entry);
          files.push({
            id: entry.replace(ext, ''),
            name: entry,
            originalName: entry.replace(/^\w+-\w+-/, ''),
            sessionId,
            size: stat.size,
            type: getFileType(entry),
            createdAt: stat.mtimeMs,
          });
        }
      } catch {
        // Skip unreadable files
      }
    }

    return files.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/**
 * Delete a file
 */
export async function deleteFile(sessionId: string, fileId: string): Promise<boolean> {
  const sessionDir = getSessionDir(sessionId);
  
  try {
    const entries = await fs.readdir(sessionDir);
    const file = entries.find(f => f.startsWith(fileId));
    
    if (!file) return false;
    
    await fs.unlink(path.join(sessionDir, file));
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete all files in a session
 */
export async function deleteAllSessionFiles(sessionId: string): Promise<void> {
  const sessionDir = getSessionDir(sessionId);
  
  try {
    await fs.rm(sessionDir, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
}

/**
 * Build context string from files for AI prompts
 */
export function buildFileContextForPrompt(files: Array<{ name: string; content: string }>): string {
  if (!files || files.length === 0) return '';

  const MAX_TOTAL_CHARS = 30000;
  let context = '';
  let totalChars = 0;

  context += `Người dùng đã đính kèm ${files.length} file:\n`;

  for (const file of files) {
    if (totalChars >= MAX_TOTAL_CHARS) {
      context += '\n... [Một số file đã bị cắt bớt do giới hạn độ dài]';
      break;
    }

    const fileHeader = `\n--- File: ${file.name} ---\n`;
    const remainingChars = MAX_TOTAL_CHARS - totalChars;
    const maxFileContent = remainingChars - fileHeader.length - 50;

    if (maxFileContent <= 0) break;

    let fileContent = file.content;
    if (fileContent.length > maxFileContent) {
      fileContent = fileContent.substring(0, maxFileContent) + '\n... [nội dung đã được cắt bớt]';
    }

    context += fileHeader + fileContent + `\n--- Kết thúc ${file.name} ---\n`;
    totalChars += fileHeader.length + fileContent.length + 30;
  }

  return context;
}
