/* ==============================================
   UXBAN — Refresh Releases (iTunes edition)
   Run: node scripts/refresh-releases.js
   ============================================== */

const fs   = require('fs');
const path = require('path');

const ITUNES_ARTIST_ID = '1757422943';

const OUT_PATH       = path.join(__dirname, '..', 'data', 'releases.json');
const OVERRIDES_PATH = path.join(__dirname, '..', 'data', 'spotify-overrides.json');
const INDEX_PATH     = path.join(__dirname, '..', 'index.html');

/* ── Releases to exclude from the site entirely ──
   Add a name here if a release shouldn't appear anywhere. */
const IGNORED_RELEASES = [
  // 'i hope',
  // 'dancer',
  // 'kicked out',
];

/* ── Helpers ── */
function normalizeKey(str) {
  return String(str || '').toLowerCase().trim();
}

function upscaleArtwork(url) {
  if (!url) return '';
  // 600x600 is plenty for grid tiles and featured card.
  // Detail pages can request 1200x1200 on demand if needed.
  return url.replace(/\/\d+x\d+bb\.(jpg|png)$/i, '/600x600bb.$1');
}

function parseName(raw) {
  let name = String(raw || '').trim();
  const featuring = [];
  const featMatch = name.match(/\(feat\.\s*([^)]+)\)/i);
  if (featMatch) {
    featMatch[1].split(/,|&/).forEach(a => {
      const clean = a.trim().replace(/^Uxban$/i, '').trim();
      if (clean) featuring.push(clean);
    });
    name = name.replace(/\s*\(feat\.[^)]+\)/i, '').trim();
  }
  name = name.replace(/\s+-\s+(Single|EP|Album)$/i, '').trim();
  return { name, featuring };
}

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

/* ════════════════════════════════════════════════
   Update homepage OG meta tags from newest release
   ════════════════════════════════════════════════ */
function updateHomepageMeta(newest) {
  if (!newest) return false;
  if (!fs.existsSync(INDEX_PATH)) return false;

  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  const original = html;

  const title = `Uxban — ${newest.name}`;
  const desc  = `New ${newest.album_type} out now. Stream everywhere.`;
  const cover = newest.images?.[0]?.url || '';

  function setMeta(html, prop, value) {
    const re = new RegExp(
      `(<meta\\s+(?:property|name)="${prop}"\\s+content=")[^"]*(")`,
      'i'
    );
    return html.replace(re, `$1${value}$2`);
  }

  html = setMeta(html, 'og:title',            title);
  html = setMeta(html, 'og:description',      desc);
  html = setMeta(html, 'twitter:title',       title);
  html = setMeta(html, 'twitter:description', desc);
  html = setMeta(html, 'description',         `Uxban — NZ artist. New ${newest.album_type} "${newest.name}", out now.`);

  if (cover) {
    html = setMeta(html, 'og:image',      cover);
    html = setMeta(html, 'twitter:image', cover);
  }

  if (html === original) return false;

  fs.writeFileSync(INDEX_PATH, html);
  return true;
}

/* ════════════════════════════════════════════════
   Regenerate sitemap.xml from current releases
   ════════════════════════════════════════════════ */
function updateSitemap(result) {
  const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');
  const today = new Date().toISOString().slice(0, 10);
  const base  = 'https://uxban.shop';

  const staticPages = [
    { loc: '/',         priority: '1.0' },
    { loc: '/releases/',priority: '0.9' },
    { loc: '/events/',  priority: '0.9' },
    { loc: '/store/',   priority: '0.8' },
    { loc: '/about/',   priority: '0.8' },
    { loc: '/links/',   priority: '0.7' },
    { loc: '/privacy/', priority: '0.3' },
  ];

  const slugify = (name) => String(name || '').toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const releasePages = [
    ...(result.albums  || []),
    ...(result.singles || []),
  ].map(r => ({
    loc:      `/release/${slugify(r.name)}/`,
    priority: '0.7',
  }));

  const all = [...staticPages, ...releasePages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(p => `  <url>
    <loc>${base}${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  const old = fs.existsSync(SITEMAP_PATH) ? fs.readFileSync(SITEMAP_PATH, 'utf8') : '';
  if (old === xml) return false;
  fs.writeFileSync(SITEMAP_PATH, xml);
  return true;
}

/* ── Main ── */
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
  let releases = (data.results || []).filter(x => x.wrapperType === 'collection');

  // Filter ignored releases
  if (IGNORED_RELEASES.length) {
    const ignoredLower = IGNORED_RELEASES.map(n => n.toLowerCase().trim());
    const before = releases.length;
    releases = releases.filter(item => {
      const cleanName = parseName(item.collectionName).name.toLowerCase().trim();
      return !ignoredLower.includes(cleanName);
    });
    const removed = before - releases.length;
    if (removed > 0) console.log(`→ Filtered out ${removed} ignored release(s)`);
  }

  if (releases.length === 0) {
    console.error('❌ iTunes returned zero releases — leaving files untouched');
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

    const type   = (item.trackCount || 1) <= 3 ? 'single' : 'album';
    const bucket = type === 'single' ? singles : albums;

    // Override handling:
    //   null → hide spotify link (empty string)
    //   string → direct spotify URL
    //   object → { spotify, youtubeMusic }
    //   undefined → auto search fallback
    const rawOverride = overrides[key];
    let spotifyUrl = '';
    let youtubeMusic = '';
    let hasDirectSpotify = false;

    if (rawOverride === null) {
      // Explicitly hide Spotify — no link at all
      spotifyUrl = null;   // ← real null, not empty string
    } else if (typeof rawOverride === 'string' && rawOverride) {
      spotifyUrl = rawOverride;
      hasDirectSpotify = true;
    } else if (rawOverride && typeof rawOverride === 'object') {
      spotifyUrl      = rawOverride.spotify || '';
      youtubeMusic    = rawOverride.youtubeMusic || '';
      hasDirectSpotify = !!rawOverride.spotify;
    }

    // If no override at all → fall back to search URL
    if (rawOverride === undefined) {
      spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(name + ' Uxban')}`;
      missingSpotify.push(name);
    } else if (rawOverride !== null && !hasDirectSpotify) {
      // Object override with no spotify field → still missing
      spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(name + ' Uxban')}`;
      missingSpotify.push(name);
    }

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
        youtubeMusic: youtubeMusic,
      },
    });
  }

  const byDate = (a, b) => new Date(b.release_date) - new Date(a.release_date);
  albums.sort(byDate);
  singles.sort(byDate);

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

  /* ── Update homepage OG tags ── */
  const newest = [...albums, ...singles]
    .sort((a, b) => new Date(b.release_date) - new Date(a.release_date))[0];

  if (newest) {
    const updated = updateHomepageMeta(newest);
    if (updated) {
      console.log(`✅ Updated homepage OG tags → "${newest.name}"`);
    } else {
      console.log(`ℹ️  Homepage OG tags already current ("${newest.name}")`);
    }
  }

  if (missingSpotify.length) {
    console.log('');
    console.log(`ℹ️  ${missingSpotify.length} release(s) using auto Spotify search URL:`);
    missingSpotify.forEach(n => console.log(`   • ${n}`));
    console.log('');
    console.log('   To upgrade: add to data/spotify-overrides.json');
    console.log('   To hide Spotify link: set value to null');
  }

    /* ── Regenerate sitemap ── */
  const sitemapChanged = updateSitemap(result);
  if (sitemapChanged) {
    console.log(`✅ Regenerated sitemap.xml`);
  }
}

main().catch(err => {
  console.error('❌', err);
  process.exit(1);
});