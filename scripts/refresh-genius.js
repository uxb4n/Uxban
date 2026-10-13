/* ==============================================
   UXBAN — Refresh Genius descriptions & bio
   Run: node scripts/refresh-genius.js

   Reads data/releases.json, then for each release
   searches Genius and pulls the song's description.
   Also fetches the artist bio once.

   Writes data/genius.json.

   Requires env var:
     GENIUS_ACCESS_TOKEN

   Debug mode (dump raw search):
     $env:GENIUS_DEBUG="1"
   ============================================== */

const fs   = require('fs');
const path = require('path');

const TOKEN  = process.env.GENIUS_ACCESS_TOKEN;
const API    = 'https://api.genius.com';
const ARTIST = 'Uxban';

// Known artist ID — from Genius search (api_path: /artists/4800288)
const ARTIST_ID = 4800288;

const RELEASES_PATH = path.join(__dirname, '..', 'data', 'releases.json');
const OUT_PATH      = path.join(__dirname, '..', 'data', 'genius.json');

if (!TOKEN) {
  console.error('❌ Missing GENIUS_ACCESS_TOKEN env var');
  console.error('   Get one at https://genius.com/api-clients');
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function slugify(name) {
  return String(name || '').toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/* Genius returns description as either HTML string, { html }, or { dom } */
function extractDescription(song) {
  const d = song.description;
  if (!d) return '';
  let html = '';
  if (typeof d === 'string') html = d;
  else if (d.html)           html = d.html;
  else if (d.dom)            html = domToHtml(d.dom);

  // Genius wraps in <root>...</root> — strip it
  return html
    .replace(/^\s*<root>\s*/i, '')
    .replace(/\s*<\/root>\s*$/i, '')
    .trim();
}

function domToHtml(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(domToHtml).join('');
  if (node.tag) {
    const attrs = node.attributes
      ? Object.entries(node.attributes)
          .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`)
          .join('')
      : '';
    const children = domToHtml(node.children || []);
    return `<${node.tag}${attrs}>${children}</${node.tag}>`;
  }
  if (node.children) return domToHtml(node.children);
  return '';
}

/* Genius API wrapper with rate limiting */
async function genius(pathname) {
  await sleep(1000);
  const r = await fetch(`${API}${pathname}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'User-Agent':  'uxban.shop/1.0',
    },
  });
  if (!r.ok) {
    console.warn(`⚠️  Genius ${r.status} for ${pathname}`);
    return null;
  }
  return r.json();
}

/* Find the Uxban artist ID.
   Genius search returns SONGS for "Uxban" (not artist hits),
   so we extract the primary_artist.id from any matching song.
   Falls back to the hardcoded ARTIST_ID if search fails. */
async function findArtistId() {
  const data = await genius(`/search?q=${encodeURIComponent(ARTIST)}`);
  if (!data) return ARTIST_ID;

  const hits = data.response?.hits || [];

  // Direct artist hit
  const artistHit = hits.find(h => h.type === 'artist' && h.result?.id);
  if (artistHit) {
    const name = String(artistHit.result.name || '').toLowerCase();
    if (name === ARTIST.toLowerCase() || name.includes(ARTIST.toLowerCase())) {
      console.log(`   Found artist: ${artistHit.result.name} (${artistHit.result.id})`);
      return artistHit.result.id;
    }
  }

  // Song hit — pull primary_artist.id
  const songHit = hits.find(h =>
    h.type === 'song' &&
    h.result?.primary_artist?.id &&
    String(h.result.primary_artist.name || '').toLowerCase().includes(ARTIST.toLowerCase())
  );
  if (songHit) {
    const a = songHit.result.primary_artist;
    console.log(`   Found artist via "${songHit.result.title}": ${a.name} (${a.id})`);
    return a.id;
  }

  // Last resort
  console.log(`   Falling back to known artist ID: ${ARTIST_ID}`);
  return ARTIST_ID;
}

/* Fetch artist bio */
async function fetchArtistBio(artistId) {
  const data = await genius(`/artists/${artistId}`);
  return extractDescription(data?.response?.artist || {});
}

/* Search for a specific song and return its description */
async function findSongDescription(trackName) {
  const q = `${ARTIST} ${trackName}`;
  const data = await genius(`/search?q=${encodeURIComponent(q)}`);
  if (!data) return null;

  const hits = data.response?.hits || [];
  const songs = hits
    .filter(h => h.type === 'song' && h.result)
    .map(h => h.result);

  if (!songs.length) return null;

  const wantTitle    = slugify(trackName);
  const artistLower  = ARTIST.toLowerCase();

  const scored = songs.map(s => {
    let score = 0;
    const primaryName = String(s.primary_artist?.name || '').toLowerCase();
    const allArtists  = String(s.artist_names || '').toLowerCase();

    if (primaryName === artistLower)            score += 100;
    else if (primaryName.includes(artistLower)) score += 60;
    else if (allArtists.includes(artistLower))  score += 30;

    const titleSlug = slugify(s.title);
    if (titleSlug === wantTitle)            score += 50;
    else if (titleSlug.includes(wantTitle)) score += 20;

    return { song: s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  if (!best || best.score < 30) return null;

  const full = await genius(`/songs/${best.song.id}`);
  return extractDescription(full?.response?.song || {}) || null;
}

async function main() {
  if (!fs.existsSync(RELEASES_PATH)) {
    console.error('❌ data/releases.json not found — run refresh-releases.js first');
    process.exit(1);
  }

  /* ── DEBUG: dump raw search results ── */
  if (process.env.GENIUS_DEBUG === '1') {
    console.log('→ Debug: raw search for "Uxban"...');
    const raw = await genius(`/search?q=Uxban`);
    console.log(JSON.stringify(raw, null, 2));
    return;
  }
  /* ── END DEBUG ── */

  const releasesData = JSON.parse(fs.readFileSync(RELEASES_PATH, 'utf8'));
  const releases = [
    ...(releasesData.albums  || []),
    ...(releasesData.singles || []),
  ];

  console.log('→ Searching Genius for Uxban artist...');
  const artistId = await findArtistId();

  if (!artistId) {
    console.error('❌ Could not find Uxban on Genius');
    process.exit(1);
  }

  console.log(`→ Using artist ID: ${artistId}`);
  console.log('→ Fetching artist bio...');
  const artistBio = await fetchArtistBio(artistId);

  const descriptions = {};
  let found = 0;
  let missing = 0;

  for (const release of releases) {
    const slug = slugify(release.name);
    process.stdout.write(`   ${release.name}... `);

    const desc = await findSongDescription(release.name);
    if (desc) {
      descriptions[slug] = desc;
      found++;
      process.stdout.write('✅\n');
    } else {
      missing++;
      process.stdout.write('—\n');
    }
  }

  const result = {
    _generated: new Date().toISOString(),
    artistBio,
    descriptions,
  };

  if (fs.existsSync(OUT_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
      const same =
        existing.artistBio === artistBio &&
        JSON.stringify(existing.descriptions) === JSON.stringify(descriptions);
      if (same) {
        console.log('ℹ️  No changes — genius.json is already up to date');
        return;
      }
    } catch {}
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));

  console.log('');
  console.log(`✅ Wrote ${OUT_PATH}`);
  console.log(`   Bio: ${artistBio ? 'yes' : 'no'}`);
  console.log(`   ${found} description(s) found, ${missing} missing`);
}

main().catch(err => {
  console.error('❌', err);
  process.exit(1);
});