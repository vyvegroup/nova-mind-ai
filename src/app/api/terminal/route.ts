// ============================================
// VenAI - Terminal API Route
// Allows AI to execute commands and users to view output
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

const MAX_OUTPUT_LENGTH = 50000;
const COMMAND_TIMEOUT = 15000;

// Dangerous commands blocklist
const BLOCKED_COMMANDS = [
  'rm -rf /', 'mkfs', 'dd if=', ':(){ :|:& };:', 'fork bomb',
  'shutdown', 'reboot', 'halt', 'poweroff', 'init 0', 'init 6',
  'passwd', 'chmod 777 /', 'chown', 'wget', 'curl -o /',
  '> /dev/sda', 'format', 'del /f /s /q C:',
];

function isCommandSafe(cmd: string): boolean {
  const lower = cmd.toLowerCase().trim();
  return !BLOCKED_COMMANDS.some(blocked => lower.includes(blocked.toLowerCase()));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command } = body as { command: string };

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }

    if (!isCommandSafe(command)) {
      return NextResponse.json({
        error: 'Command blocked for safety reasons',
        output: '',
        exitCode: -1,
      });
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: COMMAND_TIMEOUT,
        maxBuffer: 1024 * 1024,
        cwd: '/tmp',
      });

      const output = (stdout + stderr).substring(0, MAX_OUTPUT_LENGTH);
      return NextResponse.json({
        output,
        exitCode: 0,
        truncated: (stdout + stderr).length > MAX_OUTPUT_LENGTH,
      });
    } catch (execError: unknown) {
      const err = execError as { stdout?: string; stderr?: string; code?: number };
      const output = ((err.stdout || '') + (err.stderr || '')).substring(0, MAX_OUTPUT_LENGTH);
      return NextResponse.json({
        output: output || `Command failed with code ${err.code || 'unknown'}`,
        exitCode: err.code || 1,
        error: err.stderr || err.message || 'Execution failed',
      });
    }
  } catch (error) {
    return NextResponse.json({
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown'}`,
      output: '',
      exitCode: -1,
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const baseDir = '/tmp';
    let storageInfo: Array<{ name: string; type: string; size: number; modified: string }> = [];

    try {
      const entries = await readdir(baseDir);
      const items = await Promise.all(
        entries.slice(0, 100).map(async (name) => {
          try {
            const filePath = join(baseDir, name);
            const stats = await stat(filePath);
            return {
              name,
              type: stats.isDirectory() ? 'directory' : 'file',
              size: stats.size,
              modified: stats.mtime.toISOString(),
            };
          } catch {
            return null;
          }
        })
      );
      storageInfo = items.filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => {
          if (a.type === 'directory' && b.type !== 'directory') return -1;
          if (a.type !== 'directory' && b.type === 'directory') return 1;
          return b.modified.localeCompare(a.modified);
        });
    } catch {
      // Ignore readdir errors
    }

    let systemInfo = '';
    try {
      const { stdout } = await execAsync('uname -a && echo "---" && free -h 2>/dev/null || echo "N/A" && echo "---" && df -h / /tmp 2>/dev/null | head -5', {
        timeout: 5000,
      });
      systemInfo = stdout.substring(0, 3000);
    } catch {
      systemInfo = 'System info unavailable';
    }

    return NextResponse.json({
      storage: storageInfo,
      systemInfo,
      baseDir,
    });
  } catch (error) {
    return NextResponse.json({
      error: `Storage info failed: ${error instanceof Error ? error.message : 'Unknown'}`,
      storage: [],
      systemInfo: '',
    }, { status: 500 });
  }
}
