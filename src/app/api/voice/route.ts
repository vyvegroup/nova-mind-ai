import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'tts') {
      const { text } = body;
      if (!text || typeof text !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Text is required for TTS' },
          { status: 400 }
        );
      }

      const zai = await ZAI.create();
      const ttsResult = await (zai as any).tts.synthesize({ text });

      return NextResponse.json({
        success: true,
        audio: ttsResult,
      });
    }

    if (action === 'stt') {
      const { audio } = body;
      if (!audio || typeof audio !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Audio base64 is required for STT' },
          { status: 400 }
        );
      }

      const zai = await ZAI.create();
      const sttResult = await (zai as any).asr.transcribe({ audio });

      return NextResponse.json({
        success: true,
        text: sttResult,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "tts" or "stt".' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Voice API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Voice processing failed' },
      { status: 500 }
    );
  }
}
