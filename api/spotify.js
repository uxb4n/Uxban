/* ==============================================
   UXBAN — /api/spotify
   Serves data/releases.json (catalog) OR
   ?tracks=ALBUM_ID for a tracklist.
   ============================================== */

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(process.cwd(), 'data', 'releases.json');
const ARTIST_ID = '433lt9JbmTHzNzHqZtiK7C';
const TRACKS_TTL = 1000 * 60 * 60 * 24; // 24h

let catalogCache = null;
let catalogMtime = 0;
const tracksCache = {}; // id -> { time, data }

async function handleCatalog(res) {
  try {
    const stat = fs.statSync(DATA_PATH);
    if (!catalogCache || stat.mtimeMs !== catalogMtime) {
      catalogCache = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      catalogMtime = stat.mtimeMs;
    }

    const albums  = catalogCache.albums  || [];
    const singles = catalogCache.singles || [];
    const available = albums.length + singles.length > 0;

    res.setHeader(
      'Cache-Control',
      available
        ? 's-maxage=3600, stale-while-revalidate=86400'
        : 's-maxage=60, stale-while-revalidate=300'
    );

    return res.status(200).json({ available, albums, singles });
  } catch (err) {
    console.error('[spotify catalog]', err.message);
    return res.status(200).json({ available: false, albums: [], singles: [], error: err.message });
  }
}

async function handleTracks(id, res) {
  if (!id) return res.status(400).json({ error: 'Missing tracks id' });

  if (tracksCache[id] && Date.now() - tracksCache[id].time < TRACKS_TTL) {
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json(tracksCache[id].data);
  }

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) throw new Error('Token fetch failed');
    const { access_token } = await tokenRes.json();

    const albumRes = await fetch(`https://api.spotify.com/v1/albums/${id}?market=NZ`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });

    if (!albumRes.ok) throw new Error(`Album fetch failed: ${albumRes.status}`);
    const album = await albumRes.json();

    const tracks = (album.tracks?.items || []).map((t, i) => ({
      number:    i + 1,
      name:      t.name,
      duration:  t.duration_ms,
      featuring: (t.artists || [])
        .filter(a => a.id !== ARTIST_ID)
        .map(a => a.name),
    }));

    const data = { tracks, total: album.tracks?.total || tracks.length };
    tracksCache[id] = { time: Date.now(), data };

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[spotify tracks]', err.message);
    return res.status(500).json({ error: 'Failed to fetch tracks', detail: err.message });
  }
}

module.exports = async function handler(req, res) {
  if (req.query.tracks) return handleTracks(req.query.tracks, res);
  return handleCatalog(res);
};