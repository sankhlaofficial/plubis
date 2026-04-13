#!/usr/bin/env node
/**
 * Blog freshness refresh script.
 *
 * Updates the `lastUpdated` timestamp on all (or selected) blog articles
 * in content/blog.json. Run this monthly or quarterly to keep freshness
 * signals alive for GEO and SEO.
 *
 * Usage:
 *   node scripts/refresh-blog.cjs                    # touch all articles
 *   node scripts/refresh-blog.cjs --situation divorce # touch only divorce articles
 *   node scripts/refresh-blog.cjs --dry-run           # preview without writing
 */

const fs = require('fs');
const path = require('path');

const BLOG_JSON_PATH = path.join(__dirname, '..', 'content', 'blog.json');

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const situationIdx = args.indexOf('--situation');
  const situationFilter = situationIdx >= 0 ? args[situationIdx + 1] : null;

  if (!fs.existsSync(BLOG_JSON_PATH)) {
    console.error('ERROR: content/blog.json not found');
    process.exit(1);
  }

  const articles = JSON.parse(fs.readFileSync(BLOG_JSON_PATH, 'utf8'));
  const now = new Date().toISOString();
  let updated = 0;

  for (const article of articles) {
    if (situationFilter && article.situationSlug !== situationFilter) continue;
    article.lastUpdated = now;
    updated++;
  }

  console.log(`Updated ${updated} of ${articles.length} articles to ${now}`);
  if (situationFilter) console.log(`  Filter: situationSlug = "${situationFilter}"`);

  if (dryRun) {
    console.log('  (dry run — no file written)');
  } else {
    const sorted = [...articles].sort((a, b) => a.slug.localeCompare(b.slug));
    fs.writeFileSync(BLOG_JSON_PATH, JSON.stringify(sorted, null, 2) + '\n');
    console.log('  Written to content/blog.json');
    console.log('');
    console.log('Next steps:');
    console.log('  git add content/blog.json && git commit -m "chore: refresh blog timestamps" && git push');
  }
}

main();
