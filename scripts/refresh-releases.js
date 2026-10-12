/* ==============================================
   UXBAN — Refresh Releases
   Run: node scripts/refresh-releases.js
   Fetches your catalog from Spotify and writes
   data/releases.json. Commit the JSON, push.

   Safety layers:
   1. Retry each Spotify call once on failure
   2. Never write if albums AND singles are both empty
   3. Never overwrite a category with fewer items than
      what's already on disk (prevents a partial API
      failure from wiping your releases)
   ============================================== */

const fs   = require('fs');
const path = require('path');

const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const ARTIST_ID     = '433lt9JbmTHzNzHqZtiK7C';

const APPLE_MUSIC = {
  '5GNic68ZHANOnMKxtuGyXL': 'https://music.apple.com/us/album/1895801290',
  '62Qw3eFdZ9SpvHqsVDKuDt': 'https://music.apple.com/nz/album/1890788021',
  '6tENe37MOcfJKgNU9dZVF9': 'https://music.apple.com/nz/album/1865750129',
  '3QCyhSXN4yDG2w3JRfAfAQ': 'https://music.apple.com/nz/album/1820471067',
  '1CTU6z0vSGiEf8RyES9Xsi': 'https://music.apple.com/nz/album/1886136281',
  '74vhHwUhDXZWKv3DOxiSnq': 'https://music.apple.com/nz/album/1879704694',
  '1uc8yz010uIRPqyOT0Zx0m': 'https://music.apple.com/nz/album/1880895489',
  '7IJiyvFMc56YhrmVdoPv5i': 'https://music.apple.com/nz/album/1871039629',
  '2vjoSEcG3YYkWkjxewOHxj': 'https://music.apple.com/nz/album/1867427792',
  '5Fh1ye2J4G1bdnDWgU2HYo': 'https://music.apple.com/nz/album/1860476267',
  '7pm1KQQaIwjwqwNzurI2t3': 'https://music.apple.com/nz/album/1851584322',
  '1Tz40KGs6zeAbTFaYcvV6D': 'https://music.apple.com/nz/album/1852455305',
  '2M3FlO0jN2vT70ghjLV43p': 'https://music.apple.com/nz/album/1843959528',
  '2H0OVWyrjOIOCrszdJdaJQ': 'https://music.apple.com/nz/album/1839375160',
  '1yQixBb23SLoZirynDt6nW': 'https://music.apple.com/us/song/uno/6781066550',
};

const YOUTUBE_MUSIC = {
  '5GNic68ZHANOnMKxtuGyXL': 'https://music.youtube.com/playlist?list=OLAK5uy_mseRsxvqY8hPT2QpppUNrebTDwyW7YAEU',
  '62Qw3eFdZ9SpvHqsVDKuDt': 'https://music.youtube.com/playlist?list=OLAK5uy_m73sxIBNrIyaa6ScNtXQwPoLGZfn5GYeY',
  '6tENe37MOcfJKgNU9dZVF9': 'https://music.youtube.com/playlist?list=OLAK5uy_k0Qj8sZ7f8xzFF9QNzJ1L15OPjnDGIrho',
  '3QCyhSXN4yDG2w3JRfAfAQ': 'https://music.youtube.com/playlist?list=OLAK5uy_ki9uFKVpJDeC2h_835U_7QVe-5oEnQ_mg',
  '1CTU6z0vSGiEf8RyES9Xsi': 'https://music.youtube.com/playlist?list=OLAK5uy_mOrNuzjwdwrYOjlqnf-ETg8V2VUwWXhMM',
  '74vhHwUhDXZWKv3DOxiSnq': 'https://music.youtube.com/playlist?list=OLAK5uy_nJA-hm-MGsg13XC87ykl9-KbHE8T6lslY',
  '1uc8yz010uIRPqyOT0Zx0m': 'https://music.youtube.com/playlist?list=OLAK5uy_nFh2adXJvwDKZ__zDc3kIzU3BjZwRrKlY',
  '7IJiyvFMc56YhrmVdoPv5i': 'https://music.youtube.com/playlist?list=OLAK5uy_k-X4cVzlp9aNiZhZV9P9Z1wgox1tLPxQM',
  '2vjoSEcG3YYkWkjxewOHxj': 'https://music.youtube.com/playlist?list=OLAK5uy_lIdV5pz944KOxjNhDSTchk8wbCeniJU18',
  '5Fh1ye2J4G1bdnDWgU2HYo': 'https://music.youtube.com/playlist?list=OLAK5uy_l-E6vNQ0nJDx2jCXzBGHKCZhWUIYOH0wA',
  '7pm1KQQaIwjwqwNzurI2t3': 'https://music.youtube.com/playlist?list=OLAK5uy_loxgeqGExIYbLkGHQq98KDqXF074ylZnE',
  '1Tz40KGs6zeAbTFaYcvV6D': 'https://music.youtube.com/playlist?list=OLAK5uy_mLGeTiYaugBeW01h941SHUdyGBGfooEWQ',
  '2M3FlO0jN2vT70ghjLV43p': 'https://music.youtube.com/playlist?list=OLAK5uy_mU7QqX_v_EClEhZRMDjS0lZbfDiyLs5Ik',
  '2H0OVWyrjOIOCrszdJdaJQ': 'https://music.youtube.com/playlist?list=OLAK5uy_kZHHZCrDBpRyH-2bLmXI-voWt38uGylyc',
  '1yQixBb23SLoZirynDt6nW': 'https://music.youtube.com/playlist?list=OLAK5uy_m00maI3WDPfJFhYbykTlI8SMQeJlH8wcs',
};

const OUT_PATH = path.join(__dirname, '..', 'data', 'releases.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET env vars');
    process.exit(1);
  }

  console.log('→ Fetching Spotify token...');
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!tokenRes.ok) {
    console.error('❌ Token fetch failed:', tokenRes.status, await tokenRes.text());
    process.exit(1);
  }

  const { access_token } = await tokenRes.json();
  console.log('→ Token ok. Fetching albums + singles...');

  // Retry once on failure, with a small delay
  const safeFetch = async (url, attempt = 1) => {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!r.ok) {
      const text = await r.text();
      console.error(`❌ Spotify ${r.status} for ${url}:`, text.slice(0, 200));
      if (attempt < 2) {
        console.log(`   Retrying in 2s...`);
        await sleep(2000);
        return safeFetch(url, attempt + 1);
      }
      return { items: [] };
    }
    return r.json();
  };

  // Use limit=10 (safer than 20 with Spotify's flaky endpoint) and run them in sequence
  const albumsData   = await safeFetch(`https://api.spotify.com/v1/artists/${ARTIST_ID}/albums?include_groups=album&limit=10&offset=0`);
  await sleep(500);
  const singlesData1 = await safeFetch(`https://api.spotify.com/v1/artists/${ARTIST_ID}/albums?include_groups=single&limit=10&offset=0`);
  await sleep(500);
  const singlesData2 = await safeFetch(`https://api.spotify.com/v1/artists/${ARTIST_ID}/albums?include_groups=single&limit=10&offset=10`);

  const dedupe = (items) => {
    const seen = new Set();
    return items.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  };

  const albums  = dedupe(albumsData.items || []);
  const singles = dedupe([...(singlesData1.items || []), ...(singlesData2.items || [])]);

  // ── Load existing file for comparison ────────
  let existing = { albums: [], singles: [] };
  if (fs.existsSync(OUT_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    } catch {}
  }

  const existingAlbumCount  = (existing.albums  || []).length;
  const existingSingleCount = (existing.singles || []).length;

  // ── Sanity checks ────────────────────────────
  // If both came back empty, bail entirely
  if (albums.length === 0 && singles.length === 0) {
    console.error('❌ Spotify returned zero releases — refusing to write anything');
    console.error('   Existing data/releases.json is untouched. (Quota probably hit.)');
    process.exit(1);
  }

  // If a category got fewer results than before, keep the existing one
  // (prevents partial API failures from wiping data)
  const finalAlbums  = (albums.length  >= existingAlbumCount  || existingAlbumCount  === 0) ? albums  : (existing.albums  || []);
  const finalSingles = (singles.length >= existingSingleCount || existingSingleCount === 0) ? singles : (existing.singles || []);

  if (albums.length < existingAlbumCount) {
    console.warn(`⚠️  Albums dropped from ${existingAlbumCount} to ${albums.length} — keeping existing albums`);
  }
  if (singles.length < existingSingleCount) {
    console.warn(`⚠️  Singles dropped from ${existingSingleCount} to ${singles.length} — keeping existing singles`);
  }

  const attachLinks = (release) => {
    const featuring = (release.artists || [])
      .filter(a => a.id !== ARTIST_ID)
      .map(a => a.name);

    return {
      id:             release.id,
      name:           release.name,
      album_type:     release.album_type,
      release_date:   release.release_date,
      images:         release.images,
      external_urls:  release.external_urls,
      artists:        release.artists,
      total_tracks:   release.total_tracks,
      featuring,
      links: {
        spotify:      release.external_urls.spotify,
        appleMusic:   APPLE_MUSIC[release.id]   || '',
        youtubeMusic: YOUTUBE_MUSIC[release.id] || '',
      },
    };
  };

  const result = {
    albums:  finalAlbums.map(attachLinks),
    singles: finalSingles.map(attachLinks),
  };

  const newJson = JSON.stringify(result, null, 2);
  const oldJson = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, 'utf8') : '';

  if (oldJson === newJson) {
    console.log('ℹ️  No changes — releases.json is already up to date');
    return;
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, newJson);

  console.log(`✅ Wrote ${OUT_PATH}`);
  console.log(`   ${result.albums.length} album(s), ${result.singles.length} single(s)`);
}

main().catch(err => {
  console.error('❌', err);
  process.exit(1);
});