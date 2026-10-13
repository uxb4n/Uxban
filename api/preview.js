/* ==============================================
   UXBAN — /api/preview

   Two modes:
     /api/preview?id=1234567890              → exact album lookup
     /api/preview?id=123&name=back2Me        → specific track from that album
     /api/preview?name=back2Me               → search fallback

   When `id` is provided (iTunes collection ID, from
   data/releases.json), we hit iTunes' lookup endpoint
   and match the exact track. No more guessing.
   ============================================== */

const cache = {};
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

module.exports = async function handler(req, res) {
  const { id, name, artist = 'Uxban', trackIndex } = req.query;

  // Need at least one identifier
  if (!id && !name) {
    return res.status(400).json({ previewUrl: null, error: 'Missing id or name' });
  }

  const key = id
    ? `${id}__${name || ''}__${trackIndex ?? ''}`.toLowerCase()
    : `${artist}__${name}`.toLowerCase();

  // Memory cache
  if (cache[key] && Date.now() - cache[key].time < CACHE_TTL) {
    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=86400');
    return res.status(200).json(cache[key].data);
  }

  try {
    let result = null;

    if (id) {
      result = await lookupByAlbum(id, name, trackIndex);
    } else {
      result = await searchByText(name, artist);
    }

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

/* ════════════════════════════════════════════════
   EXACT ALBUM LOOKUP — used when we have the iTunes ID
   ════════════════════════════════════════════════ */
async function lookupByAlbum(collectionId, trackName, trackIndex) {
  const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(collectionId)}&entity=song&limit=200`;
  const r = await fetch(url, { headers: { 'User-Agent': 'uxban.shop/1.0' } });

  if (!r.ok) throw new Error(`iTunes lookup ${r.status}`);
  const data = await r.json();

  const tracks = (data.results || []).filter(x => x.wrapperType === 'track');
  if (!tracks.length) {
    return { previewUrl: null, error: 'No tracks in album' };
  }

  // 1. Match by exact track name
  let match = null;
  if (trackName) {
    const wanted = String(trackName).toLowerCase().trim();
    match = tracks.find(t => (t.trackName || '').toLowerCase().trim() === wanted);
  }

  // 2. Match by track index (1-based for iTunes)
  if (!match && trackIndex != null) {
    const idx = parseInt(trackIndex, 10);
    if (!isNaN(idx)) {
      match = tracks[idx - 1] || tracks[idx];
    }
  }

  // 3. Fallback: first track
  if (!match) match = tracks[0];

  return {
    previewUrl: match?.previewUrl || null,
    trackName:  match?.trackName  || null,
    artistName: match?.artistName || null,
  };
}

/* ════════════════════════════════════════════════
   TEXT SEARCH FALLBACK — used when only a name exists
   ════════════════════════════════════════════════ */
async function searchByText(name, artist) {
  const q = encodeURIComponent(`${artist} ${name}`);
  const url = `https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=10`;

  const r = await fetch(url, { headers: { 'User-Agent': 'uxban.shop/1.0' } });
  if (!r.ok) throw new Error(`iTunes search ${r.status}`);
  const data = await r.json();

  const results = data.results || [];

  // Prefer results whose artistName contains the artist we asked for
  const artistLower = String(artist).toLowerCase();
  const artistMatches = results.filter(t =>
    (t.artistName || '').toLowerCase().includes(artistLower)
  );

  // Within those, prefer results whose trackName matches
  let match = null;
  if (artistMatches.length) {
    const nameLower = String(name).toLowerCase().trim();
    match = artistMatches.find(t => (t.trackName || '').toLowerCase().trim() === nameLower);
    if (!match) match = artistMatches[0];
  }
  if (!match) match = results[0];

  return {
    previewUrl: match?.previewUrl || null,
    trackName:  match?.trackName  || null,
    artistName: match?.artistName || null,
  };
}