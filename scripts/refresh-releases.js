/* ==============================================
   UXBAN — Refresh Releases
   Run: node scripts/refresh-releases.js
   Fetches your catalog from Spotify and writes
   data/releases.json. Commit the JSON, push.

   Safety: if Spotify returns zero releases (quota
   error, network fail, etc.), the existing
   releases.json is left untouched so a bad run
   never wipes the live site.
   ============================================== */

const fs   = require('fs');
const path = require('path');

const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const ARTIST_ID     = '433lt9JbmTHzNzHqZtiK7C';

// Manually maintained — Apple Music + YouTube Music links
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

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET env vars');
    console.error('   Set them in your terminal, e.g.:');
    console.error('   $env:SPOTIFY_CLIENT_ID="..."; $env:SPOTIFY_CLIENT_SECRET="..."');
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

  const safeFetch = async (url) => {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!r.ok) {
      console.error(`❌ Spotify ${r.status} for ${url}:`, (await r.text()).slice(0, 200));
      return { items: [] };
    }
    return r.json();
  };

  const [albumsData, singlesData1, singlesData2] = await Promise.all([
    safeFetch(`https://api.spotify.com/v1/artists/${ARTIST_ID}/albums?include_groups=album&limit=20&offset=0`),
    safeFetch(`https://api.spotify.com/v1/artists/${ARTIST_ID}/albums?include_groups=single&limit=20&offset=0`),
    safeFetch(`https://api.spotify.com/v1/artists/${ARTIST_ID}/albums?include_groups=single&limit=20&offset=20`),
  ]);

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
  const total   = albums.length + singles.length;

  if (total === 0) {
    console.error('❌ Spotify returned zero releases — refusing to overwrite existing releases.json');
    console.error('   (This usually means the API quota was hit. It resets within 24h.)');
    process.exit(1);
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
    albums:  albums.map(attachLinks),
    singles: singles.map(attachLinks),
  };

  const newJson = JSON.stringify(result, null, 2);

  // Skip write if nothing changed (keeps git clean for the auto-refresh cron)
  if (fs.existsSync(OUT_PATH)) {
    const existing = fs.readFileSync(OUT_PATH, 'utf8');
    if (existing === newJson) {
      console.log('ℹ️  No changes — releases.json is already up to date');
      return;
    }
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, newJson);

  console.log(`✅ Wrote ${OUT_PATH}`);
  console.log(`   ${albums.length} album(s), ${singles.length} single(s)`);
}

main().catch(err => {
  console.error('❌', err);
  process.exit(1);
});