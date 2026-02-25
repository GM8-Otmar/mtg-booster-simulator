import * as fs from 'fs/promises';
import * as path from 'path';
import { SealedEvent } from '../types/server';

const EVENTS_DIR = path.join(process.cwd(), 'data', 'events');

/**
 * Ensure the events directory exists
 */
async function ensureEventsDir(): Promise<void> {
  try {
    await fs.mkdir(EVENTS_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create events directory:', EVENTS_DIR, err);
    throw err;
  }
}

/**
 * Get the file path for an event
 */
function getEventPath(eventId: string): string {
  return path.join(EVENTS_DIR, `${eventId}.json`);
}

/**
 * Save an event to disk
 */
export async function saveEvent(event: SealedEvent): Promise<void> {
  await ensureEventsDir();
  const eventPath = getEventPath(event.id);
  await fs.writeFile(eventPath, JSON.stringify(event, null, 2), 'utf-8');
}

/**
 * Load an event from disk
 */
export async function loadEvent(eventId: string): Promise<SealedEvent | null> {
  try {
    const eventPath = getEventPath(eventId);
    const data = await fs.readFile(eventPath, 'utf-8');
    return JSON.parse(data) as SealedEvent;
  } catch (error) {
    return null;
  }
}

/**
 * Load event by code (searches all events)
 */
export async function loadEventByCode(code: string): Promise<SealedEvent | null> {
  await ensureEventsDir();

  try {
    const files = await fs.readdir(EVENTS_DIR);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const eventPath = path.join(EVENTS_DIR, file);
      const data = await fs.readFile(eventPath, 'utf-8');
      const event = JSON.parse(data) as SealedEvent;

      if (event.code.toLowerCase() === code.toLowerCase()) {
        return event;
      }
    }
  } catch (error) {
    console.error('Error loading event by code:', error);
  }

  return null;
}

/**
 * Delete an event from disk
 */
export async function deleteEvent(eventId: string): Promise<void> {
  try {
    const eventPath = getEventPath(eventId);
    await fs.unlink(eventPath);
  } catch (error) {
    // Ignore errors if file doesn't exist
  }
}

/**
 * Clean up old events (older than 24 hours)
 */
export async function cleanupOldEvents(): Promise<void> {
  await ensureEventsDir();

  try {
    const files = await fs.readdir(EVENTS_DIR);
    const now = Date.now();
    const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const eventPath = path.join(EVENTS_DIR, file);

      try {
        const data = await fs.readFile(eventPath, 'utf-8');
        const event = JSON.parse(data) as SealedEvent;
        const createdAt = new Date(event.createdAt).getTime();

        if (now - createdAt > MAX_AGE) {
          await fs.unlink(eventPath);
          console.log(`Deleted old event: ${event.id} (${event.code})`);
        }
      } catch (error) {
        console.error(`Error processing event file ${file}:`, error);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old events:', error);
  }
}

/**
 * List all active events
 */
export async function listEvents(): Promise<SealedEvent[]> {
  await ensureEventsDir();
  const events: SealedEvent[] = [];

  try {
    const files = await fs.readdir(EVENTS_DIR);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const eventPath = path.join(EVENTS_DIR, file);
      const data = await fs.readFile(eventPath, 'utf-8');
      const event = JSON.parse(data) as SealedEvent;
      events.push(event);
    }
  } catch (error) {
    console.error('Error listing events:', error);
  }

  return events;
}
