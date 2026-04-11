export interface BookPromptInput {
  topic: string;
  pages: number;
  childName?: string | null;
  childAge?: number | null;
  childDescription?: string | null;
  artStyle?: string | null;
}

/**
 * Builds the initial user message sent to the Managed Agent.
 * Slice 1: topic + pages only. Personalization fields are wired for Slice 3
 * but safe to pass here — they are only rendered if present.
 */
export function buildBookPrompt(input: BookPromptInput): string {
  const { topic, pages, childName, childAge, childDescription, artStyle } = input;

  const parts: string[] = [
    `Write a ${pages}-page children's picture book about: ${topic}`,
    '',
    'Story rules:',
    '- 2-3 sentences per page, warm, bedtime-friendly, ending with resolution.',
    '- Use simple vocabulary a 3-8 year old will understand.',
    '',
    'Output: create a file called book.json in /mnt/session/outputs/ with this exact shape:',
    '{',
    '  "title": "...",',
    '  "subtitle": "..."?,',
    '  "author": "Aditya Sankhla",',
    '  "cover": { "prompt": "detailed cover illustration prompt" },',
    '  "pages": [',
    '    { "pageNumber": 1, "text": "...", "imageFile": "images/page_1.png", "imagePrompt": "..." }',
    '  ]',
    '}',
    '',
    'Image rules:',
    '- Each imagePrompt must be self-contained (no references like "same character as page 3").',
    '- Describe setting, mood, character, and art style in every imagePrompt.',
  ];

  if (childName) {
    parts.push('', 'Personalization:');
    parts.push(`- The hero of the story is named ${childName}.`);
    if (childAge) parts.push(`- They are ${childAge} years old.`);
    if (childDescription) {
      parts.push(`- Physical description: ${childDescription}. Include this in every imagePrompt so illustrations match.`);
    }
  }

  if (artStyle) {
    parts.push('', `Art style for every imagePrompt: ${artStyle}.`);
  }

  return parts.join('\n');
}
