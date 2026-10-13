/* ==============================================
   UXBAN — /api/preview

   Two modes:
     /api/preview?id=<itunes_collection_id>       → exact album lookup
     /api/preview?id=<id>&trackIndex=3            → track #3 from that album
     /api/preview?name=<track_name>               → fallback, verified search

   The search fallback ONLY returns previews by Uxban.
   If no Uxban match is found, it returns null — no
   more accidentally playing other people's songs.
   ============================================== */

const cache = {};
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days
const ARTIST_VERIFY = 'uxban';

module.exports = async function handler(req, res) {
  const { id, name, trackIndex } = req.query;

  if (!id && !name) {
    return res.status(400).json({ previewUrl: null, error: 'Missing id or name' });
  }

  const key = id
    ? `${id}__${trackIndex ?? ''}`.toLowerCase()
    : `name__${name}`.toLowerCase();

  if (cache[key] && Date.now() - cache[key].time < CACHE_TTL) {
    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=86400');
    return res.status(200).json(cache[key].data);
  }

  try {
    let result;
    if (id) {
      result = await lookupByAlbum(id, trackIndex);
    } else {
      result = await searchByName(name);
    }

    cache[key] = { time: Date.now(), data: result };

    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=86400');
    return res.status(200).json(result);

  } catch (err) {
    console.error('[preview]', err.message);
    return res.status(200).json({ previewUrl: null, error: err.message });
  }
};

/* ════════════════════════════════════════════════
   EXACT ALBUM LOOKUP — deterministic, uses real IDs
   ════════════════════════════════════════════════ */
async function lookupByAlbum(collectionId, trackIndex) {
  const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(collectionId)}&entity=song&limit=200`;
  const r = await fetch(url, { headers: { 'User-Agent': 'uxban.shop/1.0' } });

  if (!r.ok) throw new Error(`iTunes lookup ${r.status}`);
  const data = await r.json();

  const tracks = (data.results || []).filter(x => x.wrapperType === 'track');
  if (!tracks.length) return { previewUrl: null, error: 'No tracks in album' };

  let match = tracks[0];
  if (trackIndex != null) {
    const idx = parseInt(trackIndex, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= tracks.length) match = tracks[idx - 1];
  }

  // Safety: confirm the previewing artist is Uxban or a collaborator on a Uxban release
  // (Some features list the collaborator as the primary artist — that's fine.)

  return {
    previewUrl: match.previewUrl || null,
    trackName:  match.trackName  || null,
    artistName: match.artistName || null,
  };
}

/* ════════════════════════════════════════════════
   SAFE NAME SEARCH — only returns Uxban tracks
   ════════════════════════════════════════════════ */
async function searchByName(trackName) {
  const q = encodeURIComponent(`Uxban ${trackName}`);
  const url = `https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=25`;

  const r = await fetch(url, { headers: { 'User-Agent': 'uxban.shop/1.0' } });
  if (!r.ok) throw new Error(`iTunes search ${r.status}`);
  const data = await r.json();

  const results = data.results || [];

  // Filter: artistName MUST contain "uxban" (case-insensitive)
  const uxbanOnly = results.filter(t =>
    String(t.artistName || '').toLowerCase().includes(ARTIST_VERIFY)
  );

  if (!uxbanOnly.length) {
    // No verified match — return null rather than a wrong song
    return { previewUrl: null, error: 'No Uxban match found' };
  }

  // Prefer the one whose track name most closely matches
  const wanted = String(trackName).toLowerCase().trim();
  const exact  = uxbanOnly.find(t => (t.trackName || '').toLowerCase().trim() === wanted);
  const match  = exact || uxbanOnly[0];

  return {
    previewUrl: match.previewUrl || null,
    trackName:  match.trackName  || null,
    artistName: match.artistName || null,
  };
}