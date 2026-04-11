import Anthropic from '@anthropic-ai/sdk';
import type { BookManifest } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface StartSessionResult {
  sessionId: string;
}

/**
 * Creates a new Managed Agents session and sends the initial user message.
 * Returns the session ID for subsequent polling.
 */
export async function startBookSession(prompt: string): Promise<StartSessionResult> {
  const agentId = process.env.AGENT_ID!;
  const environmentId = process.env.ENVIRONMENT_ID!;

  const session = await client.beta.sessions.create({
    agent: { type: 'agent', id: agentId },
    environment_id: environmentId,
  } as any);

  await (client.beta.sessions as any).events.send(session.id, {
    events: [{
      type: 'user.message',
      content: [{ type: 'text', text: prompt }],
    }],
  });

  return { sessionId: session.id };
}

export interface SessionEventsResult {
  events: any[];
  nextCursor: string | null;
  isIdle: boolean;
}

/**
 * Lists session events. Anthropic Managed Agents events.list does NOT support
 * cursor-based pagination via 'after' (verified during QA on 2026-04-11 — the
 * API only accepts `limit`, `order`, `page`). So we fetch all events ascending
 * each time and rely on the caller to dedupe / extract what it needs.
 *
 * The `afterCursor` argument is preserved in the signature for backwards
 * compatibility but is no longer used for the API call. The returned
 * `nextCursor` is set to the last event id so the caller can still detect
 * "no new events since last poll" by comparing strings.
 */
export async function listNewEvents(
  sessionId: string,
  afterCursor: string | null,
): Promise<SessionEventsResult> {
  void afterCursor; // intentionally unused — see comment above

  const resp: any = await (client.beta.sessions as any).events.list(sessionId, {
    limit: 1000,
    order: 'asc',
  });
  const events = resp.data || [];
  const nextCursor = events.length > 0 ? events[events.length - 1].id : null;
  const isIdle = events.some((e: any) => e.type === 'session.status_idle');

  return { events, nextCursor, isIdle };
}

/**
 * Scans event history for a write-tool call whose content looks like book.json.
 * Mirrors the CLI fallback when the Files API returns zero files.
 */
export function extractBookJsonFromEvents(events: any[]): BookManifest | null {
  for (const ev of events) {
    if (ev.type === 'agent.tool_use') {
      const toolName = ev.name || ev.tool_name;
      if (toolName === 'write') {
        const content = ev.input?.content;
        if (typeof content === 'string' && content.includes('"pages"')) {
          try {
            return JSON.parse(content) as BookManifest;
          } catch {
            continue;
          }
        }
      }
    }
  }
  return null;
}

/**
 * Derives a user-facing progress message from the most recent event type.
 */
export function deriveProgress(events: any[]): { phase: string; message: string; percent: number } {
  if (events.length === 0) {
    return { phase: 'starting', message: 'Starting up...', percent: 5 };
  }
  const last = events[events.length - 1];
  const type = last.type;

  if (type === 'agent.tool_use') {
    const tool = last.name || last.tool_name;
    if (tool === 'web_search') return { phase: 'researching', message: 'Researching ideas...', percent: 15 };
    if (tool === 'write') return { phase: 'writing', message: 'Writing the story...', percent: 45 };
    if (tool === 'bash') return { phase: 'drafting-images', message: 'Preparing illustrations...', percent: 55 };
  }
  if (type === 'agent.message') {
    return { phase: 'writing', message: 'Thinking...', percent: 25 };
  }
  if (type === 'session.status_idle') {
    return { phase: 'generating-images', message: 'Story ready, generating pictures...', percent: 70 };
  }
  return { phase: 'writing', message: 'Working...', percent: 30 };
}
