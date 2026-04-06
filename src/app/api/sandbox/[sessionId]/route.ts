// ============================================
// NovaMind AI - Per-Session Sandbox API
// Isolated workspace per chat session
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// =============================================
// Security & Config
// =============================================
const SANDBOX_BASE = '/tmp/sandbox';
const MAX_FILE_SIZE_WRITE = 5 * 1024 * 1024; // 5MB
const MAX_FILE_SIZE_UPLOAD = 10 * 1024 * 1024; // 10MB
const MAX_SANDBOX_SIZE = 50 * 1024 * 1024; // 50MB
const COMMAND_TIMEOUT = 15000; // 15 seconds
const MAX_OUTPUT_LENGTH = 50 * 1024; // 50KB

const DANGEROUS_COMMANDS = [
  'rm -rf /',
  'rm -rf /*',
  'mkfs',
  'dd if=',
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'init 0',
  'init 6',
  ':(){:|:&};:', // fork bomb
  'chmod -R 777 /',
  'chown -R',
  'mv / ',
  '> /dev/sda',
  'wipefs',
  'fdisk',
  'parted',
  'mkswap',
  'swapoff',
  'kill -9 -1',
  'pkill -9 -u',
];

/**
 * Sanitize session ID - only allow alphanumeric, hyphens, underscores
 */
function sanitizeSessionId(sessionId: string): string | null {
  if (!sessionId || typeof sessionId !== 'string') return null;
  const sanitized = sessionId.replace(/[^a-zA-Z0-9\-_]/g, '');
  if (sanitized !== sessionId) return null;
  if (sanitized.length === 0 || sanitized.length > 128) return null;
  return sanitized;
}

/**
 * Sanitize file path - no traversal, must be relative
 */
function sanitizeFilePath(filePath: string): string | null {
  if (!filePath || typeof filePath !== 'string') return null;
  // Remove leading slashes, prevent traversal
  let normalized = filePath.replace(/\\/g, '/');
  // Remove leading slashes
  normalized = normalized.replace(/^\/+/, '');
  // Remove ..
  if (normalized.includes('..')) return null;
  // Check for absolute path patterns
  if (path.isAbsolute(normalized)) return null;
  // Empty after normalization
  if (normalized.length === 0) return null;
  // Check max path depth
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length > 20) return null;
  return normalized;
}

/**
 * Check if command is dangerous
 */
function isDangerousCommand(command: string): boolean {
  const lower = command.toLowerCase().trim();
  return DANGEROUS_COMMANDS.some(d => lower.includes(d.toLowerCase()));
}

/**
 * Get the sandbox directory for a session
 */
function getSandboxDir(sessionId: string): string {
  return path.join(SANDBOX_BASE, sessionId);
}

/**
 * Ensure sandbox directory exists
 */
async function ensureSandbox(sessionId: string): Promise<string> {
  const dir = getSandboxDir(sessionId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Get total size of a directory
 */
async function getDirectorySize(dir: string): Promise<number> {
  let totalSize = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        totalSize += await getDirectorySize(fullPath);
      } else if (entry.isFile()) {
        const stat = await fs.stat(fullPath);
        totalSize += stat.size;
      }
    }
  } catch {
    // Directory doesn't exist yet
  }
  return totalSize;
}

/**
 * List all files recursively
 */
async function listFilesRecursive(dir: string, basePath: string): Promise<Array<{
  name: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  path: string;
}>> {
  const results: Array<{
    name: string;
    type: 'file' | 'directory';
    size: number;
    modified: string;
    path: string;
  }> = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      // Skip hidden files
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      try {
        const stat = await fs.stat(fullPath);

        if (entry.isDirectory()) {
          results.push({
            name: entry.name,
            type: 'directory',
            size: 0,
            modified: stat.mtime.toISOString(),
            path: relativePath,
          });
          // Recurse into directories (max 3 levels)
          const depth = relativePath.split('/').length;
          if (depth < 3) {
            const subFiles = await listFilesRecursive(fullPath, basePath);
            results.push(...subFiles);
          }
        } else {
          results.push({
            name: entry.name,
            type: 'file',
            size: stat.size,
            modified: stat.mtime.toISOString(),
            path: relativePath,
          });
        }
      } catch {
        // Skip files we can't stat
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return results;
}

// =============================================
// GET - List files + system info
// =============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const safeId = sanitizeSessionId(sessionId);
    if (!safeId) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const sandboxDir = await ensureSandbox(safeId);
    const files = await listFilesRecursive(sandboxDir, sandboxDir);
    const totalSize = await getDirectorySize(sandboxDir);

    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      nodeVersion: process.version,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      sandboxSize: totalSize,
      sandboxPath: sandboxDir,
      totalFiles: files.filter(f => f.type === 'file').length,
      totalDirs: files.filter(f => f.type === 'directory').length,
    };

    return NextResponse.json({
      files,
      systemInfo,
      basePath: sandboxDir,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to list files: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}

// =============================================
// POST - Execute commands, file operations
// =============================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const safeId = sanitizeSessionId(sessionId);
    if (!safeId) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const sandboxDir = await ensureSandbox(safeId);

    // Check content type to determine if it's a file upload
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      return handleFileUpload(request, sandboxDir, safeId);
    }

    // JSON body operations
    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      case 'exec':
        return handleExec(body, sandboxDir);
      case 'write':
        return handleWrite(body, sandboxDir);
      case 'read':
        return handleRead(body, sandboxDir);
      case 'delete':
        return handleDelete(body, sandboxDir);
      case 'edit':
        return handleEdit(body, sandboxDir);
      case 'mkdir':
        return handleMkdir(body, sandboxDir);
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}

// =============================================
// Command Execution
// =============================================
async function handleExec(
  body: { command: string },
  sandboxDir: string
) {
  const { command } = body;

  if (!command || typeof command !== 'string') {
    return NextResponse.json({ error: 'Command is required' }, { status: 400 });
  }

  if (isDangerousCommand(command)) {
    return NextResponse.json(
      { output: 'Command blocked for security reasons.', exitCode: 1 },
      { status: 403 }
    );
  }

  // Wrap command to run in sandbox directory
  const wrappedCommand = `cd "${sandboxDir}" && ${command}`;

  try {
    const { stdout, stderr } = await execAsync(wrappedCommand, {
      timeout: COMMAND_TIMEOUT,
      maxBuffer: MAX_OUTPUT_LENGTH,
      env: { ...process.env, HOME: sandboxDir },
      shell: '/bin/bash',
    });

    let output = stdout || '';
    if (stderr) {
      output += (output ? '\n' : '') + stderr;
    }

    // Truncate output if too long
    if (output.length > MAX_OUTPUT_LENGTH) {
      output = output.substring(0, MAX_OUTPUT_LENGTH) + '\n... [output truncated]';
    }

    return NextResponse.json({
      output: output || '(no output)',
      exitCode: 0,
    });
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string; code?: number };
    let output = err.stdout || '';
    if (err.stderr) {
      output += (output ? '\n' : '') + err.stderr;
    }
    if (!output) {
      output = err.message || 'Command execution failed';
    }

    if (output.length > MAX_OUTPUT_LENGTH) {
      output = output.substring(0, MAX_OUTPUT_LENGTH) + '\n... [output truncated]';
    }

    return NextResponse.json({
      output,
      exitCode: err.code || 1,
    });
  }
}

// =============================================
// File Write
// =============================================
async function handleWrite(
  body: { path: string; content: string },
  sandboxDir: string
) {
  const { path: filePath, content } = body;

  if (!filePath || !content) {
    return NextResponse.json({ error: 'Path and content are required' }, { status: 400 });
  }

  const safePath = sanitizeFilePath(filePath);
  if (!safePath) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  if (content.length > MAX_FILE_SIZE_WRITE) {
    return NextResponse.json({ error: `File content too large. Max ${MAX_FILE_SIZE_WRITE / 1024 / 1024}MB` }, { status: 413 });
  }

  // Check total sandbox size
  const currentSize = await getDirectorySize(sandboxDir);
  if (currentSize + content.length > MAX_SANDBOX_SIZE) {
    return NextResponse.json({ error: 'Sandbox storage limit exceeded (50MB)' }, { status: 413 });
  }

  const fullPath = path.join(sandboxDir, safePath);

  // Ensure parent directory exists
  const parentDir = path.dirname(fullPath);
  await fs.mkdir(parentDir, { recursive: true });

  await fs.writeFile(fullPath, content, 'utf-8');

  return NextResponse.json({ success: true, path: safePath });
}

// =============================================
// File Read
// =============================================
async function handleRead(
  body: { path: string },
  sandboxDir: string
) {
  const { path: filePath } = body;

  if (!filePath) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  const safePath = sanitizeFilePath(filePath);
  if (!safePath) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  const fullPath = path.join(sandboxDir, safePath);

  // Security: verify path is within sandbox
  const resolvedPath = path.resolve(fullPath);
  const resolvedSandbox = path.resolve(sandboxDir);
  if (!resolvedPath.startsWith(resolvedSandbox)) {
    return NextResponse.json({ error: 'Access denied: path outside sandbox' }, { status: 403 });
  }

  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    // Truncate if too large
    if (content.length > MAX_OUTPUT_LENGTH) {
      return NextResponse.json({
        content: content.substring(0, MAX_OUTPUT_LENGTH) + '\n... [content truncated]',
        path: safePath,
        truncated: true,
      });
    }
    return NextResponse.json({ content, path: safePath });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 404 }
    );
  }
}

// =============================================
// File Delete
// =============================================
async function handleDelete(
  body: { path: string },
  sandboxDir: string
) {
  const { path: filePath } = body;

  if (!filePath) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  const safePath = sanitizeFilePath(filePath);
  if (!safePath) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  const fullPath = path.join(sandboxDir, safePath);

  // Security: verify path is within sandbox
  const resolvedPath = path.resolve(fullPath);
  const resolvedSandbox = path.resolve(sandboxDir);
  if (!resolvedPath.startsWith(resolvedSandbox)) {
    return NextResponse.json({ error: 'Access denied: path outside sandbox' }, { status: 403 });
  }

  try {
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 404 }
    );
  }
}

// =============================================
// Multi-Edit (Search/Replace)
// =============================================
async function handleEdit(
  body: { path: string; edits: Array<{ search: string; replace: string }> },
  sandboxDir: string
) {
  const { path: filePath, edits } = body;

  if (!filePath || !edits || !Array.isArray(edits) || edits.length === 0) {
    return NextResponse.json({ error: 'Path and edits array are required' }, { status: 400 });
  }

  const safePath = sanitizeFilePath(filePath);
  if (!safePath) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  const fullPath = path.join(sandboxDir, safePath);

  // Security: verify path is within sandbox
  const resolvedPath = path.resolve(fullPath);
  const resolvedSandbox = path.resolve(sandboxDir);
  if (!resolvedPath.startsWith(resolvedSandbox)) {
    return NextResponse.json({ error: 'Access denied: path outside sandbox' }, { status: 403 });
  }

  try {
    let content = await fs.readFile(fullPath, 'utf-8');
    let changesApplied = 0;

    for (const edit of edits) {
      if (edit.search && content.includes(edit.search)) {
        content = content.replace(edit.search, edit.replace);
        changesApplied++;
      }
    }

    if (changesApplied > 0) {
      await fs.writeFile(fullPath, content, 'utf-8');
    }

    return NextResponse.json({ success: true, changesApplied });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to edit file: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 404 }
    );
  }
}

// =============================================
// Create Directory
// =============================================
async function handleMkdir(
  body: { path: string },
  sandboxDir: string
) {
  const { path: dirPath } = body;

  if (!dirPath) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  const safePath = sanitizeFilePath(dirPath);
  if (!safePath) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const fullPath = path.join(sandboxDir, safePath);

  // Security: verify path is within sandbox
  const resolvedPath = path.resolve(fullPath);
  const resolvedSandbox = path.resolve(sandboxDir);
  if (!resolvedPath.startsWith(resolvedSandbox)) {
    return NextResponse.json({ error: 'Access denied: path outside sandbox' }, { status: 403 });
  }

  await fs.mkdir(fullPath, { recursive: true });

  return NextResponse.json({ success: true });
}

// =============================================
// File Upload (multipart form-data)
// =============================================
async function handleFileUpload(
  request: NextRequest,
  sandboxDir: string,
  _sessionId: string
) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const subPath = formData.get('path') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_UPLOAD) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_FILE_SIZE_UPLOAD / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    // Check total sandbox size
    const currentSize = await getDirectorySize(sandboxDir);
    if (currentSize + file.size > MAX_SANDBOX_SIZE) {
      return NextResponse.json({ error: 'Sandbox storage limit exceeded (50MB)' }, { status: 413 });
    }

    // Determine file path
    let filePath = file.name || 'uploaded_file';
    if (subPath) {
      const safeSubPath = sanitizeFilePath(subPath);
      if (safeSubPath) {
        filePath = path.join(safeSubPath, filePath);
      }
    }

    const safeFilePath = sanitizeFilePath(filePath);
    if (!safeFilePath) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const fullPath = path.join(sandboxDir, safeFilePath);

    // Ensure parent directory exists
    const parentDir = path.dirname(fullPath);
    await fs.mkdir(parentDir, { recursive: true });

    // Read file buffer and write
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(fullPath, buffer);

    return NextResponse.json({
      success: true,
      path: safeFilePath,
      size: file.size,
      name: file.name,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}

// =============================================
// DELETE - Clear entire sandbox
// =============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const safeId = sanitizeSessionId(sessionId);
    if (!safeId) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const sandboxDir = getSandboxDir(safeId);

    try {
      await fs.access(sandboxDir);
      await fs.rm(sandboxDir, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, that's fine
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to clear sandbox: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
