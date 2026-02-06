/**
 * Canvas Event Tracker
 * Tracks user activity in canvas: block creation, prompt completion, etc.
 */

export type CanvasEventType =
  | 'block_created'
  | 'goal_created'
  | 'block_deleted'
  | 'block_renamed'
  | 'prompt_added'
  | 'prompt_deleted'
  | 'prompt_completed'
  | 'prompt_uncompleted'
  | 'clockify_started'
  | 'clockify_stopped';

export interface CanvasEventData {
  // Block events
  block_created?: {
    node_type: string;
    title: string;
    position?: { x: number; y: number };
  };
  goal_created?: {
    title: string;
    category?: string;
    position?: { x: number; y: number };
  };
  block_deleted?: {
    title: string;
  };
  block_renamed?: {
    old_title: string;
    new_title: string;
  };

  // Prompt events
  prompt_added?: {
    node_title: string;
    prompt_content: string;
  };
  prompt_deleted?: {
    node_title: string;
    prompt_content: string;
  };
  prompt_completed?: {
    node_title: string;
    prompt_content: string;
  };
  prompt_uncompleted?: {
    node_title: string;
    prompt_content: string;
  };

  // Clockify events
  clockify_started?: {
    node_title: string;
    project_name?: string;
  };
  clockify_stopped?: {
    node_title: string;
    duration?: number; // in seconds
  };
}

interface TrackEventParams {
  canvasId: string;
  eventType: CanvasEventType;
  targetId: string; // node.id or "node.id:prompt.id"
  eventData?: Record<string, any>;
  slotId?: string;
}

/**
 * Track a canvas event
 */
export async function trackCanvasEvent({
  canvasId,
  eventType,
  targetId,
  eventData = {},
  slotId,
}: TrackEventParams): Promise<void> {
  try {
    // Skip if no canvasId (shouldn't happen, but safety check)
    if (!canvasId) {
      console.warn('[EventTracker] No canvasId provided, skipping event tracking');
      return;
    }

    await fetch('/api/canvas/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        canvasId,
        eventType,
        targetId,
        eventData,
        slotId,
      }),
    });
  } catch (error) {
    // Fail silently - don't break user experience if tracking fails
    console.error('[EventTracker] Failed to track event:', error);
  }
}

/**
 * Helper functions for specific event types
 */

export const EventTracker = {
  // Block events
  blockCreated: (canvasId: string, nodeId: string, title: string, nodeType = 'prompt', position?: { x: number; y: number }) =>
    trackCanvasEvent({
      canvasId,
      eventType: 'block_created',
      targetId: nodeId,
      eventData: { node_type: nodeType, title, position },
    }),

  goalCreated: (canvasId: string, nodeId: string, title: string, category?: string, position?: { x: number; y: number }) =>
    trackCanvasEvent({
      canvasId,
      eventType: 'goal_created',
      targetId: nodeId,
      eventData: { title, category, position },
    }),

  blockDeleted: (canvasId: string, nodeId: string, title: string) =>
    trackCanvasEvent({
      canvasId,
      eventType: 'block_deleted',
      targetId: nodeId,
      eventData: { title },
    }),

  blockRenamed: (canvasId: string, nodeId: string, oldTitle: string, newTitle: string) =>
    trackCanvasEvent({
      canvasId,
      eventType: 'block_renamed',
      targetId: nodeId,
      eventData: { old_title: oldTitle, new_title: newTitle },
    }),

  // Prompt events
  promptAdded: (canvasId: string, nodeId: string, nodeTitle: string, promptId: string, promptContent: string) =>
    trackCanvasEvent({
      canvasId,
      eventType: 'prompt_added',
      targetId: `${nodeId}:${promptId}`,
      eventData: { node_title: nodeTitle, prompt_content: promptContent },
    }),

  promptDeleted: (canvasId: string, nodeId: string, nodeTitle: string, promptId: string, promptContent: string) =>
    trackCanvasEvent({
      canvasId,
      eventType: 'prompt_deleted',
      targetId: `${nodeId}:${promptId}`,
      eventData: { node_title: nodeTitle, prompt_content: promptContent },
    }),

  promptCompleted: (canvasId: string, nodeId: string, nodeTitle: string, promptId: string, promptContent: string) =>
    trackCanvasEvent({
      canvasId,
      eventType: 'prompt_completed',
      targetId: `${nodeId}:${promptId}`,
      eventData: { node_title: nodeTitle, prompt_content: promptContent },
    }),

  promptUncompleted: (canvasId: string, nodeId: string, nodeTitle: string, promptId: string, promptContent: string) =>
    trackCanvasEvent({
      canvasId,
      eventType: 'prompt_uncompleted',
      targetId: `${nodeId}:${promptId}`,
      eventData: { node_title: nodeTitle, prompt_content: promptContent },
    }),

  // Clockify events
  clockifyStarted: (canvasId: string, nodeId: string, nodeTitle: string, projectName?: string) =>
    trackCanvasEvent({
      canvasId,
      eventType: 'clockify_started',
      targetId: nodeId,
      eventData: { node_title: nodeTitle, project_name: projectName },
    }),

  clockifyStopped: (canvasId: string, nodeId: string, nodeTitle: string, duration?: number) =>
    trackCanvasEvent({
      canvasId,
      eventType: 'clockify_stopped',
      targetId: nodeId,
      eventData: { node_title: nodeTitle, duration },
    }),
};
