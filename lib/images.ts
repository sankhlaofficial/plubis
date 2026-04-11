/**
 * Calls Cloudflare Workers AI (Flux Schnell) to generate a single image.
 * Returns the image bytes as a Uint8Array, or throws on failure.
 */
export async function generateImage(prompt: string): Promise<Uint8Array> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error('Cloudflare credentials not configured');
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Cloudflare image API ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  if (!data?.result?.image) {
    throw new Error('Cloudflare response missing result.image');
  }

  return Uint8Array.from(Buffer.from(data.result.image, 'base64'));
}
