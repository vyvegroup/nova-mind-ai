// ============================================
// VenAI - Files API Route
// POST: Upload files | GET: List files | DELETE: Remove files
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { saveFile, listFiles, deleteFile, readFile } from '@/lib/fileManager';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const files = formData.getAll('files') as File[];

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      try {
        const content = await file.text();
        const savedFile = await saveFile(sessionId, file.name, content, file.size);
        results.push(savedFile);
      } catch (err) {
        results.push({
          error: true,
          name: file.name,
          message: err instanceof Error ? err.message : 'Failed to save file',
        });
      }
    }

    const saved = results.filter((r) => !('error' in r));
    const errors = results.filter((r) => 'error' in r);

    return NextResponse.json({
      success: true,
      saved: saved.length,
      errors: errors.length,
      files: saved,
      errorDetails: errors,
    });
  } catch (error) {
    console.error('[Files API] Upload error:', error);
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const files = await listFiles(sessionId);
    return NextResponse.json({ success: true, files });
  } catch (error) {
    return NextResponse.json(
      { error: `List failed: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const fileId = searchParams.get('fileId');

    if (!sessionId || !fileId) {
      return NextResponse.json({ error: 'sessionId and fileId are required' }, { status: 400 });
    }

    const deleted = await deleteFile(sessionId, fileId);
    
    if (!deleted) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Delete failed: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
