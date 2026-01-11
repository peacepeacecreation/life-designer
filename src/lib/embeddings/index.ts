/**
 * Embeddings Module
 * Exports all embeddings-related functionality
 */

// OpenAI Client
export {
  OpenAIEmbeddingsClient,
  getEmbeddingsClient,
  resetEmbeddingsClient,
  type EmbeddingResponse,
  type EmbeddingError,
} from './openai-client';

// Content Formatters
export {
  formatGoalForEmbedding,
  formatNoteForEmbedding,
  formatReflectionForEmbedding,
  truncateForEmbedding,
  prepareContentForEmbedding,
} from './content-formatter';

// Embedding Service (recommended for most use cases)
export {
  EmbeddingService,
  getEmbeddingService,
  resetEmbeddingService,
  embeddingService,
} from './embedding-service';
