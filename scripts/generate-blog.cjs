#!/usr/bin/env node
/**
 * Programmatic SEO article generator.
 *
 * Generates up to 125 long-tail blog articles for Plubis by asking Claude to
 * draft one picture-book guide per (age × situation) pair defined in
 * lib/blog/seo-config.ts. Output is appended to content/blog.json.
 *
 * Resumable — articles that already exist in content/blog.json are skipped,
 * so you can stop mid-run (Ctrl+C) and re-run to pick up where you left off.
 *
 * Environment:
 *   ANTHROPIC_API_KEY    — required. Pulled from .env.local if present.
 *   ANTHROPIC_MODEL      — optional. Defaults to 'claude-opus-4-6'. Set to
 *                          'claude-sonnet-4-6' for ~60% cost reduction or
 *                          'claude-haiku-4-5' for ~80% cost reduction at
 *                          the cost of some prose quality.
 *   BLOG_GEN_LIMIT       — optional. Max articles per run (default: 999,
 *                          which effectively means "all of them"). Useful
 *                          for testing with a small sample.
 *
 * Cost estimate (all 125 articles, one-shot):
 *   - claude-opus-4-6:    ~$6.50
 *   - claude-sonnet-4-6:  ~$4.00  ← the plan's budget
 *   - claude-haiku-4-5:   ~$1.30
 *
 * Usage:
 *   node scripts/generate-blog.cjs                       # generate all missing
 *   BLOG_GEN_LIMIT=3 node scripts/generate-blog.cjs      # test with 3
 *   ANTHROPIC_MODEL=claude-sonnet-4-6 node scripts/generate-blog.cjs
 */

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

// Simple .env.local loader so the script works out of the box without
// needing to export ANTHROPIC_API_KEY globally.
function loadEnvLocal() {
  const p = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('ERROR: ANTHROPIC_API_KEY not set. Add it to .env.local and re-run.');
  process.exit(1);
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-6';
const LIMIT = parseInt(process.env.BLOG_GEN_LIMIT || '999', 10);

// Load the article config. We require() the compiled TypeScript via a small
// inline loader — ts-node isn't installed, so we hand-mirror the situation
// grid here. Update this list in sync with lib/blog/seo-config.ts when the
// picker catalog changes.
const AGES = [2, 3, 4, 5, 6];
const SITUATIONS = [
  { slug: 'new-sibling', label: 'a new baby brother or sister', keyword: 'new sibling', pickerSlug: 'new-sibling' },
  { slug: 'first-day-school', label: 'the first day of school', keyword: 'first day of school', pickerSlug: 'first-day-school' },
  { slug: 'grief-pet', label: 'the loss of a pet', keyword: 'losing a pet', pickerSlug: 'grief-pet' },
  { slug: 'grief-grandparent', label: 'losing a grandparent', keyword: 'a grandparent dying', pickerSlug: 'grief-grandparent' },
  { slug: 'divorce', label: 'parents getting divorced', keyword: 'divorce', pickerSlug: 'divorce' },
  { slug: 'moving', label: 'moving to a new home', keyword: 'moving house', pickerSlug: 'moving' },
  { slug: 'nightmares', label: 'being afraid of the dark', keyword: 'nightmares and the dark', pickerSlug: 'nightmares' },
  { slug: 'doctor-visit', label: 'going to the doctor', keyword: 'doctor visits', pickerSlug: 'doctor-visit' },
  { slug: 'dentist-visit', label: 'going to the dentist', keyword: 'dentist visits', pickerSlug: 'dentist-visit' },
  { slug: 'potty-regression', label: 'potty training', keyword: 'potty training', pickerSlug: 'potty-regression' },
  { slug: 'parent-travel', label: 'a parent going away', keyword: 'a parent traveling', pickerSlug: 'parent-travel' },
  { slug: 'deployment', label: 'a parent being deployed', keyword: 'military deployment', pickerSlug: 'deployment' },
  { slug: 'big-feelings', label: 'big feelings', keyword: 'big feelings', pickerSlug: 'big-feelings' },
  { slug: 'tantrums', label: 'tantrums and meltdowns', keyword: 'tantrums', pickerSlug: 'tantrums' },
  { slug: 'new-pet', label: 'getting a new pet', keyword: 'a new pet', pickerSlug: 'new-pet' },
  { slug: 'lost-friend', label: 'a friend moving away', keyword: 'a friend moving away', pickerSlug: 'lost-friend' },
  { slug: 'new-school', label: 'starting at a new school', keyword: 'a new school', pickerSlug: 'new-school' },
  { slug: 'new-language', label: 'learning a new language', keyword: 'a new language', pickerSlug: 'new-language' },
  { slug: 'parent-illness', label: 'a parent being unwell', keyword: 'a parent being sick', pickerSlug: 'parent-illness' },
  { slug: 'bedtime', label: 'bedtime', keyword: 'bedtime routines', pickerSlug: null },
  { slug: 'sharing', label: 'learning to share', keyword: 'sharing', pickerSlug: null },
  { slug: 'making-friends', label: 'making new friends', keyword: 'making friends', pickerSlug: null },
  { slug: 'confidence', label: 'building confidence', keyword: 'confidence and self-esteem', pickerSlug: null },
  { slug: 'picky-eating', label: 'trying new foods', keyword: 'picky eating', pickerSlug: null },
  { slug: 'independence', label: 'being more independent', keyword: 'independence and big-kid skills', pickerSlug: null },
];

const CONFIGS = [];
for (const age of AGES) {
  for (const s of SITUATIONS) {
    CONFIGS.push({
      slug: `picture-books-for-${age}-year-old-about-${s.slug}`,
      age,
      situationSlug: s.slug,
      situationLabel: s.label,
      situationKeyword: s.keyword,
      pickerSlug: s.pickerSlug,
      title: `The best picture books to read to a ${age}-year-old about ${s.label}`,
      metaDescription: `Picture books for ${age}-year-olds going through ${s.keyword}. Our picks plus how to make a custom one for your child in five minutes.`,
    });
  }
}

const BLOG_JSON_PATH = path.join(__dirname, '..', 'content', 'blog.json');

function loadArticles() {
  if (!fs.existsSync(BLOG_JSON_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(BLOG_JSON_PATH, 'utf8'));
  } catch (err) {
    console.error(`ERROR: content/blog.json is not valid JSON: ${err.message}`);
    process.exit(1);
  }
}

function saveArticles(articles) {
  // Sort by slug so git diffs stay stable across regenerations.
  const sorted = [...articles].sort((a, b) => a.slug.localeCompare(b.slug));
  fs.writeFileSync(BLOG_JSON_PATH, JSON.stringify(sorted, null, 2) + '\n');
}

function buildPrompt(config) {
  return `Write a 1500-word SEO-optimized blog article titled "${config.title}" for parents searching Google for picture book recommendations for their ${config.age}-year-old.

Context: this article will appear on plubis.app/blog — a site that makes AI-generated picture books for children facing specific hard moments. The CTA at the end of every article tells parents they can make a custom picture book for their child in about five minutes and the first one is free.

Target reader: a parent of a ${config.age}-year-old whose child is currently dealing with ${config.situationLabel}.

Required structure (use markdown with ## and ### headings only — no # heading, no HTML):

1. Intro paragraph (2-3 sentences) — acknowledge the specific hard moment the parent is facing and name the search intent. Do not use "you" more than once; talk about the child and the moment, not the parent.

2. ## What to look for in a picture book about ${config.situationKeyword} for a ${config.age}-year-old
A 2-paragraph section on age-appropriate framing. For 2-4 year olds, emphasize repetition, sensory detail, and short sentences. For 5-7 year olds, emphasize inner feelings and character choices.

3. ## Our picks
5 to 8 real, published picture books. For each book:
- Start with **"Book Title" by Author Name** on its own line (use bold markdown asterisks).
- Follow with 2-3 sentences describing what makes it work for ${config.situationKeyword} at age ${config.age}.
- Be honest: if a book is out of print or hard to find, say "try your library". Do not invent books. Only include books you are confident exist.

4. ## How to read it together
A 2-3 paragraph section on reading posture, timing, and what to say (or not say) before, during, and after. Use specific concrete moves, not generic advice.

5. ## When a book isn't enough
A single short paragraph (2-3 sentences) noting that if the child is really struggling, a pediatrician or counselor is the right next step. Use the phrase "conversation starter" — do not use "therapy," "treatment," "cure," or any other medical-claim word.

6. ## Make a book made for your child
A 3-sentence paragraph positioning Plubis as the alternative: the parent picks the situation, gives the child's name, we generate a custom picture book in about five minutes, the first one is free. End on this exact sentence: "The first one is free."

Hard rules:
- Only recommend REAL published picture books. If you are not sure a book exists, do not include it.
- Do not use medical or therapy language anywhere.
- Do not promise the hard thing will stop being hard.
- Write ~1500 words total. Concrete, warm, age-appropriate.
- Output only the markdown. No preamble, no closing remarks, no code fences, no "Here's your article:" text.
- Do not include a # H1 — the page already renders the title.`;
}

async function generateOne(client, config) {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    messages: [{ role: 'user', content: buildPrompt(config) }],
  });

  // Extract the text from the first content block.
  const text = resp.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!text) throw new Error('Empty response from Claude');

  return {
    ...config,
    generatedAt: new Date().toISOString(),
    body: text,
  };
}

async function main() {
  const client = new Anthropic({ apiKey });
  const existing = loadArticles();
  const existingSlugs = new Set(existing.map((a) => a.slug));
  const todo = CONFIGS.filter((c) => !existingSlugs.has(c.slug)).slice(0, LIMIT);

  console.log(`Model: ${MODEL}`);
  console.log(`Existing articles: ${existing.length}`);
  console.log(`Configs to generate this run: ${todo.length} (of ${CONFIGS.length} total)`);
  console.log('');

  if (todo.length === 0) {
    console.log('Nothing to do — all articles already generated.');
    return;
  }

  const articles = [...existing];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < todo.length; i++) {
    const config = todo[i];
    const progress = `[${i + 1}/${todo.length}]`;
    process.stdout.write(`${progress} ${config.slug} ... `);
    try {
      const article = await generateOne(client, config);
      articles.push(article);
      saveArticles(articles); // save after each success — resumable
      successCount++;
      const wordCount = article.body.split(/\s+/).length;
      console.log(`ok (${wordCount} words)`);
    } catch (err) {
      failCount++;
      console.log(`FAIL: ${err.message || err}`);
      // Continue with the next article — don't abort the whole run for one failure.
    }
  }

  console.log('');
  console.log(`Done. Success: ${successCount}, Failed: ${failCount}`);
  console.log(`Total articles in content/blog.json: ${articles.length}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Spot-check a few articles in content/blog.json for quality.');
  console.log('  2. git add content/blog.json && git commit && git push');
  console.log('  3. Vercel rebuilds and statically generates /blog/[slug] pages.');
  console.log('  4. Submit /sitemap.xml to Google Search Console.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
