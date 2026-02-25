import { Router } from 'express';
import https from 'https';
import http from 'http';

const router = Router();

// In-memory cache: scryfallId -> buffer
const cache = new Map<string, Buffer>();

/**
 * GET /api/cardimg/:scryfallId
 * Proxies Scryfall CDN images server-side to avoid 503 hotlink blocks.
 * scryfallId is the Scryfall UUID (e.g. f5fca2ef-7263-4873-bdca-8fba7ed6de35)
 * Optional query param: ?size=normal|large|png (default: normal)
 */
router.get('/:scryfallId', (req, res) => {
  const { scryfallId } = req.params;
  const size = (req.query.size as string) || 'normal';

  // Validate UUID format to prevent abuse
  if (!/^[0-9a-f-]{36}$/.test(scryfallId)) {
    res.status(400).json({ error: 'Invalid scryfallId' });
    return;
  }

  const cacheKey = `${scryfallId}:${size}`;
  if (cache.has(cacheKey)) {
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=604800'); // 7 days
    res.send(cache.get(cacheKey));
    return;
  }

  // Build Scryfall CDN URL from UUID
  const id = scryfallId;
  const url = `https://cards.scryfall.io/${size}/front/${id[0]}/${id[1]}/${id}.jpg`;

  const protocol = url.startsWith('https') ? https : http;
  const request = protocol.get(url, {
    headers: {
      'User-Agent': 'MTG-Booster-Simulator/1.0 (educational project)',
    },
  }, (sfRes) => {
    if (sfRes.statusCode !== 200) {
      res.status(sfRes.statusCode || 502).json({ error: 'Image not found' });
      return;
    }

    const chunks: Buffer[] = [];
    sfRes.on('data', (chunk: Buffer) => chunks.push(chunk));
    sfRes.on('end', () => {
      const buf = Buffer.concat(chunks);
      cache.set(cacheKey, buf);
      res.set('Content-Type', sfRes.headers['content-type'] || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=604800');
      res.send(buf);
    });
  });

  request.on('error', () => {
    res.status(502).json({ error: 'Failed to fetch image' });
  });
});

export default router;
