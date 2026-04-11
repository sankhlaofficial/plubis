import { describe, it, expect } from 'vitest';
import { buildBookPrompt } from './prompts';

describe('buildBookPrompt', () => {
  it('includes topic and page count', () => {
    const prompt = buildBookPrompt({ topic: 'a brave little fox', pages: 10 });
    expect(prompt).toContain('a brave little fox');
    expect(prompt).toContain('10');
    expect(prompt).toContain('book.json');
  });

  it('instructs the agent to output images under /mnt/session/outputs', () => {
    const prompt = buildBookPrompt({ topic: 'fireflies', pages: 12 });
    expect(prompt).toContain('imagePrompt');
    expect(prompt).toContain('2-3 sentences');
  });

  it('omits personalization when fields are absent', () => {
    const prompt = buildBookPrompt({ topic: 'clouds', pages: 12 });
    expect(prompt).not.toContain('hero of the story is named');
  });
});
