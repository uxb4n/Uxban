/* ==============================================
   UXBAN — /api/preview?name=back2me&artist=Uxban
   Looks up a 30-second preview URL via the public
   iTunes Search API. No auth, no key, no cost.

   Results cached in memory per serverless instance
   + on Vercel's CDN for a week.
   ============================================== */

const cache = {};
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

module.exports = async function handler(req, res) {
  const { name, artist = 'Uxban' } = req.query;
  if (!name) return res.status(400).json({ error: 'Missing name', previewUrl: null });

  const key = `${name}__${artist}`.toLowerCase();

  // Memory cache
  if (cache[key] && Date.now() - cache[key].time < CACHE_TTL) {
    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=86400');
    return res.status(200).json(cache[key].data);
  }

  try {
    const q   = encodeURIComponent(`${artist} ${name}`);
    const url = `https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=3`;

    const r = await fetch(url, {
      headers: { 'User-Agent': 'uxban.shop/1.0' },
    });

    if (!r.ok) throw new Error(`iTunes ${r.status}`);
    const data = await r.json();

    // Pick the best match — artist name contains "uxban" (case-insensitive)
    const match = (data.results || []).find(t =>
      (t.artistName || '').toLowerCase().includes(artist.toLowerCase())
    ) || data.results?.[0];

    const result = {
      previewUrl: match?.previewUrl || null,
      trackName:  match?.trackName  || null,
      artistName: match?.artistName || null,
    };

    cache[key] = { time: Date.now(), data: result };

    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=86400');
    return res.status(200).json(result);

  } catch (err) {
    console.error('[preview]', err.message);
    return res.status(200).json({
      previewUrl: null,
      error: err.message,
    });
  }
};