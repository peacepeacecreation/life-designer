/**
 * Test Embeddings API
 * Simple endpoint to test OpenRouter/OpenAI embeddings
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Determine which provider is being used
    const useOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'No API key found. Please set OPENROUTER_API_KEY or OPENAI_API_KEY in .env.local'
        },
        { status: 500 }
      );
    }

    const baseUrl = useOpenRouter
      ? 'https://openrouter.ai/api/v1/embeddings'
      : 'https://api.openai.com/v1/embeddings';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    // Add OpenRouter-specific headers
    if (useOpenRouter) {
      headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3077';
      headers['X-Title'] = 'Life Designer - Test';
    }

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API error (${response.status}): ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const embedding = data.data[0].embedding;

    return NextResponse.json({
      success: true,
      provider: useOpenRouter ? 'openrouter' : 'openai-direct',
      model: data.model,
      dimensions: embedding.length,
      tokens: data.usage?.total_tokens || 0,
      embedding: embedding,
    });
  } catch (error: any) {
    console.error('Error testing embeddings:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate embedding',
        details: error.message
      },
      { status: 500 }
    );
  }
}
