/**
 * Example Manual Tests for Embeddings
 *
 * This file contains example code for manually testing the embeddings functionality.
 * These are NOT automated tests - run them manually in a Node.js environment.
 *
 * To test locally:
 * 1. Ensure OPENAI_API_KEY is set in .env.local
 * 2. Run: node -r dotenv/config -r ts-node/register src/lib/embeddings/__tests__/example.test.ts
 *
 * Or create a simple API route to test via browser.
 */

import { embeddingService } from '../embedding-service';
import { Goal, GoalCategory, GoalPriority, GoalStatus } from '@/types/goals';
import { Note, NoteType } from '@/types/notes';
import { Reflection, ReflectionType } from '@/types/reflections';

/**
 * Example 1: Generate embedding for a Goal
 */
export async function testGoalEmbedding() {
  const exampleGoal: Partial<Goal> = {
    name: 'Покращити англійську мову',
    description: 'Досягнути рівня C1 для роботи в міжнародних проектах',
    category: GoalCategory.LEARNING,
    priority: GoalPriority.HIGH,
    status: GoalStatus.IN_PROGRESS,
    tags: ['english', 'learning', 'career'],
  };

  try {
    console.log('Testing Goal embedding...');
    const embedding = await embeddingService.generateGoalEmbedding(exampleGoal);
    console.log('✓ Goal embedding generated');
    console.log('  - Dimensions:', embedding.length); // Should be 1536
    console.log('  - First 5 values:', embedding.slice(0, 5));
    return embedding;
  } catch (error) {
    console.error('✗ Failed to generate Goal embedding:', error);
    throw error;
  }
}

/**
 * Example 2: Generate embedding for a Note
 */
export async function testNoteEmbedding() {
  const exampleNote: Partial<Note> = {
    title: 'Ідея для нового проекту',
    content: 'Створити додаток для трекінгу особистих цілей з AI-асистентом',
    noteType: NoteType.IDEA,
    tags: ['project', 'ai', 'productivity'],
  };

  try {
    console.log('Testing Note embedding...');
    const embedding = await embeddingService.generateNoteEmbedding(exampleNote);
    console.log('✓ Note embedding generated');
    console.log('  - Dimensions:', embedding.length);
    console.log('  - First 5 values:', embedding.slice(0, 5));
    return embedding;
  } catch (error) {
    console.error('✗ Failed to generate Note embedding:', error);
    throw error;
  }
}

/**
 * Example 3: Generate embedding for a Reflection
 */
export async function testReflectionEmbedding() {
  const exampleReflection: Partial<Reflection> = {
    title: 'Щоденна рефлексія',
    content: 'Сьогодні добре попрацював над проектом. Вивчив нові концепції TypeScript.',
    reflectionType: ReflectionType.DAILY,
    reflectionDate: new Date(),
    moodScore: 8,
    energyLevel: 7,
    tags: ['productive', 'learning'],
  };

  try {
    console.log('Testing Reflection embedding...');
    const embedding = await embeddingService.generateReflectionEmbedding(exampleReflection);
    console.log('✓ Reflection embedding generated');
    console.log('  - Dimensions:', embedding.length);
    console.log('  - First 5 values:', embedding.slice(0, 5));
    return embedding;
  } catch (error) {
    console.error('✗ Failed to generate Reflection embedding:', error);
    throw error;
  }
}

/**
 * Example 4: Test batch embedding generation
 */
export async function testBatchEmbeddings() {
  const goals: Partial<Goal>[] = [
    {
      name: 'Вивчити React',
      description: 'Освоїти React для frontend розробки',
      category: GoalCategory.LEARNING,
      priority: GoalPriority.HIGH,
      status: GoalStatus.IN_PROGRESS,
      tags: ['react', 'frontend'],
    },
    {
      name: 'Почати бігати',
      description: 'Бігати 3 рази на тиждень',
      category: GoalCategory.HEALTH_SPORTS,
      priority: GoalPriority.MEDIUM,
      status: GoalStatus.NOT_STARTED,
      tags: ['running', 'health'],
    },
  ];

  try {
    console.log('Testing batch embeddings...');
    const embeddings = await embeddingService.generateGoalEmbeddingsBatch(goals);
    console.log('✓ Batch embeddings generated');
    console.log('  - Count:', embeddings.length); // Should be 2
    console.log('  - Dimensions:', embeddings[0].length); // Should be 1536
    return embeddings;
  } catch (error) {
    console.error('✗ Failed to generate batch embeddings:', error);
    throw error;
  }
}

/**
 * Example 5: Test search query embedding
 */
export async function testSearchQueryEmbedding() {
  const query = 'покращити англійську мову';

  try {
    console.log('Testing search query embedding...');
    const embedding = await embeddingService.generateSearchQueryEmbedding(query);
    console.log('✓ Search query embedding generated');
    console.log('  - Query:', query);
    console.log('  - Dimensions:', embedding.length);
    console.log('  - First 5 values:', embedding.slice(0, 5));
    return embedding;
  } catch (error) {
    console.error('✗ Failed to generate search query embedding:', error);
    throw error;
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('='.repeat(60));
  console.log('Running Embeddings Tests');
  console.log('='.repeat(60));

  try {
    await testGoalEmbedding();
    console.log();
    await testNoteEmbedding();
    console.log();
    await testReflectionEmbedding();
    console.log();
    await testBatchEmbeddings();
    console.log();
    await testSearchQueryEmbedding();
    console.log();
    console.log('='.repeat(60));
    console.log('✓ All tests passed!');
    console.log('='.repeat(60));
  } catch (error) {
    console.log();
    console.log('='.repeat(60));
    console.log('✗ Tests failed');
    console.log('='.repeat(60));
    throw error;
  }
}

// Uncomment to run tests directly
// runAllTests().catch(console.error);
