import { getSituation, SITUATION_OTHER } from './situations';

export interface BookPromptInput {
  topic: string;
  pages: number;
  childName?: string | null;
  childAge?: number | null;
  childDescription?: string | null;
  artStyle?: string | null;
  /** Slug from lib/situations.ts. When set, we layer the situation's emotional
   * framing template on top of the story. `other` means the parent typed
   * freeform context into `situationOther`. */
  situationSlug?: string | null;
  /** Free-text emotional context when situationSlug === 'other'. */
  situationOther?: string | null;
}

/**
 * Builds the initial user message sent to the Managed Agent.
 *
 * The topic line is the surface story. If a situation is picked, we layer the
 * emotional framing from lib/situations.ts on top — so the story serves the
 * real-life transition the parent is trying to help their child through, while
 * the surface premise (fox, dragon, moon, etc.) comes from the topic field.
 */
export function buildBookPrompt(input: BookPromptInput): string {
  const {
    topic,
    pages,
    childName,
    childAge,
    childDescription,
    artStyle,
    situationSlug,
    situationOther,
  } = input;

  const parts: string[] = [
    `Write a ${pages}-page children's picture book about: ${topic}`,
    '',
  ];

  // Layer the situation framing right after the topic. This is the moat —
  // every competitor can accept a "topic" input, but only Plubis layers a
  // curated emotional template on top of it.
  const situation = getSituation(situationSlug);
  if (situation) {
    parts.push(
      `Emotional framing — this book is for a child going through "${situation.label}".`,
      `Age range: ${situation.ageRange}.`,
      situation.promptTemplate,
      '',
      'The surface story (above) must serve this framing. The topic is the costume; the framing is the body underneath it.',
      '',
    );
  } else if (situationSlug === SITUATION_OTHER && situationOther && situationOther.trim().length > 0) {
    parts.push(
      'Emotional framing — this book is being made because the child is going through a specific moment the parent has described:',
      `"${situationOther.trim()}"`,
      '',
      'Follow these principles in how you frame the story around it: name the feeling honestly without minimizing it; open the story in a familiar, safe world before the change appears; let the protagonist feel the hard feeling without anyone rushing to fix it; resolve on "the feeling makes sense and you are loved through it" rather than "everything is fine now"; no medical or therapy language; the surface story (above) is the costume and this framing is the body underneath.',
      '',
    );
  }

  parts.push(
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
  );

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
