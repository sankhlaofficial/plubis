const fs = require('fs');
const path = require('path');

// Load .env.local
const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach((line) => {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) {
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[m[1]] = v;
  }
});

const accountId = env.CF_ACCOUNT_ID;
const apiToken = env.CF_API_TOKEN;
if (!accountId || !apiToken) {
  console.error('Missing Cloudflare credentials in .env.local');
  process.exit(1);
}

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

async function generate(prompt, filename) {
  console.log(`-> generating ${filename}`);
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`CF API ${resp.status}: ${body.slice(0, 200)}`);
  }
  const data = await resp.json();
  if (!data?.result?.image) throw new Error(`Missing result.image for ${filename}`);
  const bytes = Buffer.from(data.result.image, 'base64');
  const outPath = path.join(__dirname, '..', 'public', filename);
  fs.writeFileSync(outPath, bytes);
  console.log(`   ok: ${outPath} (${bytes.length} bytes)`);
}

(async () => {
  const jobs = [
    [
      "Children's picture book cover. Title at top: Luna's Little Song. Cute crescent moon character with closed eyes humming, soft yellow background, stars and clouds, warm pastel watercolor, hand-drawn illustration, no text other than the title.",
      'showcase-cover.png',
    ],
    [
      "A cute crescent moon character standing on a cloud, looking down at a small village below, soft pastel watercolor children's book illustration, warm and dreamy, no text.",
      'showcase-page-1.png',
    ],
    [
      "A cute crescent moon character handing a tiny star to a sleeping child, bedroom window scene, soft pastel watercolor, no text.",
      'showcase-page-2.png',
    ],
    [
      "A cute crescent moon character flying back into the sky as the sun rises, soft pastel watercolor children's book illustration, no text.",
      'showcase-page-3.png',
    ],
    [
      "Open Graph social card. Cream background, a cute crescent moon character with a small star, scattered sparkles, soft watercolor, warm and dreamy, no text.",
      'og-image.png',
    ],
  ];
  try {
    await Promise.all(jobs.map(([p, f]) => generate(p, f)));
    console.log('all done');
  } catch (e) {
    console.error('FAILED:', e.message);
    process.exit(1);
  }
})();
