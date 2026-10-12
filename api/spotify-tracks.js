/* ==============================================
   UXBAN — /api/spotify-tracks?id=ALBUM_ID
   Returns the tracklist for an album or single.
   Cached in memory per serverless instance.
   ============================================== */

const cache = {};
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

const ARTIST_ID = '433lt9JbmTHzNzHqZtiK7C';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing album id' });

  // Memory cache
  if (cache[id] && Date.now() - cache[id].time < CACHE_TTL) {
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json(cache[id].data);
  }

  try {
    const clientId     = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) throw new Error('Token fetch failed');
    const { access_token } = await tokenRes.json();

    const albumRes = await fetch(`https://api.spotify.com/v1/albums/${id}?market=NZ`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });

    if (!albumRes.ok) throw new Error(`Spotify album fetch failed: ${albumRes.status}`);
    const album = await albumRes.json();

    const tracks = (album.tracks?.items || []).map((t, i) => ({
      number:    i + 1,
      name:      t.name,
      duration:  t.duration_ms,
      featuring: (t.artists || [])
        .filter(a => a.id !== ARTIST_ID)
        .map(a => a.name),
    }));

    const data = {
      tracks,
      total: album.tracks?.total || tracks.length,
    };

    cache[id] = { time: Date.now(), data };

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json(data);

  } catch (err) {
    console.error('[spotify-tracks]', err.message);
    return res.status(500).json({ error: 'Failed to fetch tracks', detail: err.message });
  }
}