/**
 * Test API Route for Embeddings
 *
 * Simple endpoint to test embeddings generation without setting up full database
 *
 * Usage:
 *   POST /api/embeddings/test
 *   Body: { type: 'goal' | 'note' | 'reflection' | 'query', data: {...} }
 *
 * Example:
 *   curl -X POST http://localhost:3077/api/embeddings/test \
 *     -H "Content-Type: application/json" \
 *     -d '{"type":"query","data":"покращити англійську"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { embeddingService } from '@/lib/embeddings';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data' },
        { status: 400 }
      );
    }

    let embedding: number[];
    let formattedContent: string;

    switch (type) {
      case 'goal':
        embedding = await embeddingService.generateGoalEmbedding(data);
        formattedContent = `Goal: ${data.name || 'Unnamed'}`;
        break;

      case 'note':
        embedding = await embeddingService.generateNoteEmbedding(data);
        formattedContent = `Note: ${data.title || 'Untitled'}`;
        break;

      case 'reflection':
        embedding = await embeddingService.generateReflectionEmbedding(data);
        formattedContent = `Reflection: ${data.title || 'Untitled'}`;
        break;

      case 'query':
        embedding = await embeddingService.generateSearchQueryEmbedding(data);
        formattedContent = `Query: ${data}`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type. Must be: goal, note, reflection, or query' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      type,
      content: formattedContent,
      embedding: {
        dimensions: embedding.length,
        firstValues: embedding.slice(0, 5),
        // Don't send full embedding in response to save bandwidth
        // full: embedding, // Uncomment if needed for testing
      },
    });
  } catch (error: any) {
    console.error('Embeddings test error:', error);

    // Check for OpenAI API key error
    if (error.message.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          details: 'Please add OPENAI_API_KEY to your .env.local file',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate embedding',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Simple GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Embeddings test endpoint is ready',
    usage: {
      method: 'POST',
      body: {
        type: 'goal | note | reflection | query',
        data: 'object or string depending on type',
      },
    },
    examples: [
      {
        type: 'query',
        data: 'покращити англійську мову',
      },
      {
        type: 'goal',
        data: {
          name: 'Вивчити TypeScript',
          description: 'Освоїти advanced TypeScript features',
          category: 'learning',
          tags: ['typescript', 'programming'],
        },
      },
    ],
  });
}
