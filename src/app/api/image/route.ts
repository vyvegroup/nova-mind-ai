import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();
    const response = await zai.images.generations.create({
      prompt,
      size: '1024x1024',
    });

    const imageBase64 = response.data[0].base64;

    return NextResponse.json({
      success: true,
      image: imageBase64,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
}
