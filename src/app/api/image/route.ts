// ============================================
// VenAI - Image Generation API
// Using z-ai-web-dev-sdk
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, size } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Validate size
    const validSizes = ['1024x1024', '768x1344', '864x1152', '1344x768', '1152x864', '1440x720', '720x1440'];
    const imageSize = validSizes.includes(size) ? size : '1024x1024';

    console.log(`[Image API] Generating: "${prompt.substring(0, 80)}..." size=${imageSize}`);
    
    const zai = await ZAI.create();
    const response = await zai.images.generations.create({
      prompt,
      size: imageSize,
    });

    // Response format: { data: [{ base64: "..." }] } or { url: "..." }
    let imageBase64: string;
    let imageUrl: string | undefined;

    if (response?.data?.[0]?.base64) {
      imageBase64 = response.data[0].base64;
    } else if (response?.data?.[0]?.url) {
      imageUrl = response.data[0].url;
    } else if (response?.url) {
      imageUrl = response.url;
    } else if (typeof response === 'string') {
      // Might be raw base64
      imageBase64 = response;
    } else {
      // Try to extract from response
      imageBase64 = JSON.stringify(response);
    }

    console.log(`[Image API] Success! Has base64: ${!!imageBase64}, Has URL: ${!!imageUrl}`);

    return NextResponse.json({
      success: true,
      image: imageBase64,
      url: imageUrl,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Kiểm tra cấu hình API.` 
      },
      { status: 500 }
    );
  }
}
