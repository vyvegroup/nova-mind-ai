// ============================================
// VenAI - Voice API (TTS + STT)
// Using z-ai-web-dev-sdk
// ============================================

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

      console.log(`[Voice API] TTS request: ${text.substring(0, 50)}...`);
      const zai = await ZAI.create();
      
      // Correct SDK API: zai.audio.tts.create({ input, voice, ... })
      const ttsResult = await zai.audio.tts.create({
        input: text,
        voice: 'alloy',
        response_format: 'mp3',
      });

      // The SDK returns audio data - could be base64 or binary
      let audioBase64: string;
      if (typeof ttsResult === 'string') {
        audioBase64 = ttsResult;
      } else if (ttsResult?.data) {
        audioBase64 = typeof ttsResult.data === 'string' 
          ? ttsResult.data 
          : JSON.stringify(ttsResult.data);
      } else if (Buffer.isBuffer(ttsResult)) {
        audioBase64 = ttsResult.toString('base64');
      } else {
        audioBase64 = JSON.stringify(ttsResult);
      }

      console.log(`[Voice API] TTS success, audio length: ${audioBase64.length}`);
      return NextResponse.json({
        success: true,
        audio: audioBase64,
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

      console.log(`[Voice API] STT request: audio length=${audio.length}`);
      const zai = await ZAI.create();
      
      // Correct SDK API: zai.audio.asr.create({ file_base64, ... })
      const sttResult = await zai.audio.asr.create({
        file_base64: audio,
      });

      // Extract text from result
      let transcribedText: string;
      if (typeof sttResult === 'string') {
        transcribedText = sttResult;
      } else if (sttResult?.text) {
        transcribedText = sttResult.text;
      } else if (sttResult?.data?.text) {
        transcribedText = sttResult.data.text;
      } else {
        transcribedText = JSON.stringify(sttResult);
      }

      console.log(`[Voice API] STT result: ${transcribedText.substring(0, 100)}`);
      return NextResponse.json({
        success: true,
        text: transcribedText,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "tts" or "stt".' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Voice API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Voice API failed: ${error instanceof Error ? error.message : 'Unknown error'}. Kiểm tra cấu hình API.` 
      },
      { status: 500 }
    );
  }
}
