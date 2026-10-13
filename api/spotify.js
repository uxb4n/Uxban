/* ==============================================
   UXBAN — /api/spotify
   Serves data/releases.json (catalog) OR
   ?tracks=ALBUM_ID for a tracklist.
   Track lookup uses iTunes (matches the catalog IDs).
   ============================================== */

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(process.cwd(), 'data', 'releases.json');
const TRACKS_TTL = 1000 * 60 * 60 * 24; // 24h

let catalogCache = null;
let catalogMtime = 0;
const tracksCache = {};

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
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&entity=song&limit=200`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'uxban.shop/1.0' },
    });

    if (!r.ok) throw new Error(`iTunes returned ${r.status}`);
    const data = await r.json();

    // iTunes returns the album first, then every track
    const allItems = data.results || [];
    const tracks = allItems
      .filter(x => x.wrapperType === 'track')
      .map((t, i) => ({
        number:    t.trackNumber || (i + 1),
        name:      t.trackName,
        duration:  t.trackTimeMillis || 0,
        featuring: [],
      }));

    if (!tracks.length) throw new Error('No tracks in album');

    const result = { tracks, total: tracks.length };
    tracksCache[id] = { time: Date.now(), data: result };

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json(result);

  } catch (err) {
    console.error('[spotify tracks]', err.message);
    return res.status(500).json({ error: 'Failed to fetch tracks', detail: err.message });
  }
}

module.exports = async function handler(req, res) {
  if (req.query.tracks) return handleTracks(req.query.tracks, res);
  return handleCatalog(res);
};