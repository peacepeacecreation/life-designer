/**
 * Embeddings Client (OpenAI & OpenRouter)
 * Generates vector embeddings using text-embedding models
 *
 * Supports:
 * - OpenAI API (direct): Set OPENAI_API_KEY
 * - OpenRouter API (recommended): Set OPENROUTER_API_KEY
 *
 * Default Model: text-embedding-3-small
 * Dimensions: 1536
 * Cost (OpenRouter): Often cheaper than direct OpenAI
 * Max input: 8191 tokens (~30,000 characters)
 *
 * OpenRouter provides unified access to multiple AI providers
 * with automatic fallbacks and cost optimization.
 */

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface EmbeddingError {
  message: string;
  type: string;
  code: string;
}

export class OpenAIEmbeddingsClient {
  private apiKey: string;
  private model = 'text-embedding-3-small';
  private baseUrl: string;
  private maxRetries = 3;
  private retryDelay = 1000; // ms
  private useOpenRouter: boolean;

  constructor(apiKey?: string, options?: { useOpenRouter?: boolean; model?: string }) {
    // Support both OpenAI and OpenRouter API keys
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';
    this.useOpenRouter = options?.useOpenRouter ?? !!process.env.OPENROUTER_API_KEY;

    // Set base URL based on provider
    this.baseUrl = this.useOpenRouter
      ? 'https://openrouter.ai/api/v1/embeddings'
      : 'https://api.openai.com/v1/embeddings';

    // Allow custom model override
    if (options?.model) {
      this.model = options.model;
    }

    // Don't throw error on initialization - allow graceful degradation
    // Error will be thrown when trying to use embedding methods without API key
  }

  /**
   * Generate embedding for a single text
   * Automatically retries on failure
   *
   * @param text - Text to generate embedding for
   * @returns Embedding vector and metadata
   */
  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    if (!this.apiKey) {
      const provider = this.useOpenRouter ? 'OPENROUTER' : 'OPENAI';
      throw new Error(
        `${provider}_API_KEY is required. ` +
        `Please add it to your .env.local file.`
      );
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        };

        // Add OpenRouter-specific headers if using OpenRouter
        if (this.useOpenRouter) {
          headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3077';
          headers['X-Title'] = 'Life Designer';
        }

        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: this.model,
            input: text,
            encoding_format: 'float',
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(
            `OpenAI API error (${response.status}): ${error.error?.message || response.statusText}`
          );
        }

        const data = await response.json();

        return {
          embedding: data.data[0].embedding,
          model: data.model,
          usage: data.usage,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on authentication errors
        if (lastError.message.includes('401') || lastError.message.includes('Invalid API key')) {
          throw lastError;
        }

        // Wait before retrying
        if (attempt < this.maxRetries - 1) {
          await this.sleep(this.retryDelay * (attempt + 1));
        }
      }
    }

    throw new Error(
      `Failed to generate embedding after ${this.maxRetries} attempts. ` +
      `Last error: ${lastError?.message}`
    );
  }

  /**
   * Generate embeddings for multiple texts in batch
   * More efficient than individual calls
   *
   * @param texts - Array of texts to generate embeddings for
   * @returns Array of embeddings
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<EmbeddingResponse[]> {
    if (!this.apiKey) {
      const provider = this.useOpenRouter ? 'OPENROUTER' : 'OPENAI';
      throw new Error(
        `${provider}_API_KEY is required. ` +
        `Please add it to your .env.local file.`
      );
    }

    // OpenAI supports batch processing up to 2048 inputs
    // Use conservative limit for serverless environment
    const maxBatchSize = 100;
    const batches: string[][] = [];

    for (let i = 0; i < texts.length; i += maxBatchSize) {
      batches.push(texts.slice(i, i + maxBatchSize));
    }

    const results: EmbeddingResponse[] = [];

    for (const batch of batches) {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          };

          // Add OpenRouter-specific headers if using OpenRouter
          if (this.useOpenRouter) {
            headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3077';
            headers['X-Title'] = 'Life Designer';
          }

          const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: this.model,
              input: batch,
              encoding_format: 'float',
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(
              `OpenAI API error (${response.status}): ${error.error?.message || response.statusText}`
            );
          }

          const data = await response.json();

          // Process batch results
          for (let i = 0; i < data.data.length; i++) {
            results.push({
              embedding: data.data[i].embedding,
              model: data.model,
              usage: {
                prompt_tokens: Math.round(data.usage.prompt_tokens / batch.length),
                total_tokens: Math.round(data.usage.total_tokens / batch.length),
              },
            });
          }

          break; // Success, exit retry loop
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          // Don't retry on authentication errors
          if (lastError.message.includes('401') || lastError.message.includes('Invalid API key')) {
            throw lastError;
          }

          // Wait before retrying
          if (attempt < this.maxRetries - 1) {
            await this.sleep(this.retryDelay * (attempt + 1));
          }
        }
      }

      if (lastError) {
        throw new Error(
          `Failed to generate batch embeddings after ${this.maxRetries} attempts. ` +
          `Last error: ${lastError.message}`
        );
      }
    }

    return results;
  }

  /**
   * Generate embedding for search query
   * Uses the same model to ensure compatibility with stored embeddings
   *
   * @param query - Search query text
   * @returns Embedding vector
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    const response = await this.generateEmbedding(query);
    return response.embedding;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance for reuse across requests
let embeddingsClient: OpenAIEmbeddingsClient | null = null;

/**
 * Get or create singleton OpenAI embeddings client
 * Reuses the same client instance to avoid recreating API connections
 *
 * @returns Cached OpenAI embeddings client
 */
export function getEmbeddingsClient(): OpenAIEmbeddingsClient {
  if (!embeddingsClient) {
    embeddingsClient = new OpenAIEmbeddingsClient();
  }
  return embeddingsClient;
}

/**
 * Reset the cached embeddings client
 * Useful for testing or when API key changes
 */
export function resetEmbeddingsClient(): void {
  embeddingsClient = null;
}
