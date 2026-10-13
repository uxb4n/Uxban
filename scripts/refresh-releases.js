/* ==============================================
   UXBAN — Refresh Releases (iTunes edition)
   Run: node scripts/refresh-releases.js

   Fully automatic. Pulls the entire catalog
   from iTunes — no auth, no key, no quota.

   Spotify links:
     • Default → auto search URL (works instantly)
     • Optional → add direct album URLs to
       data/spotify-overrides.json (keyed by
       release name) to upgrade specific ones

   YouTube Music links:
     • Optional overrides via the same JSON file
   ============================================== */

const fs   = require('fs');
const path = require('path');

const ITUNES_ARTIST_ID = '1757422943';

const OUT_PATH       = path.join(__dirname, '..', 'data', 'releases.json');
const OVERRIDES_PATH = path.join(__dirname, '..', 'data', 'spotify-overrides.json');

/* ── Helpers ──────────────────────────────── */
function normalizeKey(str) {
  return String(str || '').toLowerCase().trim();
}

function upscaleArtwork(url) {
  if (!url) return '';
  return url.replace(/\/\d+x\d+bb\.(jpg|png)$/i, '/1200x1200bb.$1');
}

/* Strip " - Single" / " - EP" / " - Album" suffixes.
   Extract "(feat. X)" into the featuring array. */
function parseName(raw) {
  let name = String(raw || '').trim();

  // Extract featuring before stripping
  const featuring = [];
  const featMatch = name.match(/\(feat\.\s*([^)]+)\)/i);
  if (featMatch) {
    featMatch[1].split(/,|&/).forEach(a => {
      const clean = a.trim().replace(/^Uxban$/i, '').trim();
      if (clean) featuring.push(clean);
    });
    name = name.replace(/\s*\(feat\.[^)]+\)/i, '').trim();
  }

  // Strip release-type suffixes
  name = name
    .replace(/\s+-\s+(Single|EP|Album)$/i, '')
    .trim();

  return { name, featuring };
}

/* ── Load optional overrides ──────────────── */
function loadOverrides() {
  try {
    if (!fs.existsSync(OVERRIDES_PATH)) return {};
    const raw = fs.readFileSync(OVERRIDES_PATH, 'utf8');
    const data = JSON.parse(raw);
    console.log(`→ Loaded ${Object.keys(data).length} Spotify override(s)`);
    return data;
  } catch (e) {
    console.warn('⚠️  Could not read spotify-overrides.json:', e.message);
    return {};
  }
}

/* ── Main ─────────────────────────────────── */
async function main() {
  console.log(`→ Fetching Uxban catalog from iTunes (artist ${ITUNES_ARTIST_ID})...`);

  const url = `https://itunes.apple.com/lookup?id=${ITUNES_ARTIST_ID}&entity=album&limit=200`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'uxban.shop/1.0' },
  });

  if (!r.ok) {
    console.error(`❌ iTunes returned ${r.status}`);
    process.exit(1);
  }

  const data = await r.json();
  const releases = (data.results || []).filter(x => x.wrapperType === 'collection');

  if (releases.length === 0) {
    console.error('❌ iTunes returned zero releases — leaving releases.json untouched');
    process.exit(1);
  }

  console.log(`→ Found ${releases.length} releases on iTunes`);

  const overrides = loadOverrides();
  const albums  = [];
  const singles = [];
  const missingSpotify = [];

  for (const item of releases) {
    const { name, featuring } = parseName(item.collectionName);
    const key = normalizeKey(name);

    // 1-3 tracks = single, 4+ = album
    const type   = (item.trackCount || 1) <= 3 ? 'single' : 'album';
    const bucket = type === 'single' ? singles : albums;

    // Spotify: try override, else auto search URL
    const override      = overrides[key] || {};
    const spotifyDirect = override.spotify || '';
    const spotifyUrl    = spotifyDirect || `https://open.spotify.com/search/${encodeURIComponent(name + ' Uxban')}`;

    if (!spotifyDirect) missingSpotify.push(name);

    // YouTube: override only (rarely used)
    const youtubeUrl = override.youtubeMusic || '';

    bucket.push({
      id:            String(item.collectionId || ''),
      name,
      album_type:    type,
      release_date:  (item.releaseDate || '').slice(0, 10),
      total_tracks:  item.trackCount || 1,
      images:        [{ url: upscaleArtwork(item.artworkUrl100) }],
      external_urls: { spotify: spotifyUrl },
      artists:       [{ id: ITUNES_ARTIST_ID, name: 'Uxban' }],
      featuring,
      links: {
        spotify:      spotifyUrl,
        appleMusic:   item.collectionViewUrl || '',
        youtubeMusic: youtubeUrl,
      },
      _spotifyDirect: !!spotifyDirect, // internal flag, stripped below
    });
  }

  // Sort newest first
  const byDate = (a, b) => new Date(b.release_date) - new Date(a.release_date);
  albums.sort(byDate);
  singles.sort(byDate);

  // Strip internal flag before writing
  [...albums, ...singles].forEach(r => delete r._spotifyDirect);

  const result  = { albums, singles };
  const newJson = JSON.stringify(result, null, 2);
  const oldJson = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, 'utf8') : '';

  if (oldJson === newJson) {
    console.log('ℹ️  No changes — releases.json is already up to date');
  } else {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, newJson);
    console.log(`✅ Wrote ${OUT_PATH}`);
    console.log(`   ${albums.length} album(s), ${singles.length} single(s)`);
  }

  if (missingSpotify.length) {
    console.log('');
    console.log(`ℹ️  ${missingSpotify.length} release(s) using auto Spotify search URL:`);
    missingSpotify.forEach(n => console.log(`   • ${n}`));
    console.log('');
    console.log('   To upgrade any of these to a direct Spotify album link,');
    console.log('   add an entry to data/spotify-overrides.json:');
    console.log('   { "release name lowercased": "https://open.spotify.com/album/..." }');
  }
}

main().catch(err => {
  console.error('❌', err);
  process.exit(1);
});