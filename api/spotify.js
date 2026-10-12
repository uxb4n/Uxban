// Simple in-memory cache — persists across requests in the same serverless instance
let cache = null;
let cacheTime = 0;
let cacheNeedsResolution = false; // true while some release is still missing Apple/YouTube links
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours — used once everything is fully resolved
const RETRY_TTL = 1000 * 60 * 2;       // 2 minutes — used while backfill is still in progress

// Per-release cross-platform link cache for anything NOT already covered by
// the manual maps below. Once a release's Apple Music / YouTube Music links
// are resolved via Odesli they never change, so we keep this forever (for
// the life of the serverless instance) instead of re-hitting Odesli every 24h.
const linksCache = {}; // { [spotifyReleaseId]: { appleMusic, youtubeMusic } }

const ARTIST_ID = '433lt9JbmTHzNzHqZtiK7C'; // Uxban's Spotify artist ID

// --- Manual overrides -------------------------------------------------
// Hand-entered Apple Music / YouTube Music links, keyed by Spotify release ID.
// These are checked FIRST and never touch Odesli at all — fast, free, and
// never rate-limited. Add a new release here as soon as you have its links;
// anything not listed here automatically falls back to Odesli below.
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
// ------------------------------------------------------------------------

// Odesli's free tier is 10 requests/minute. Getting a free API key (email
// developers@song.link) raises this a lot — if you get one, set
// ODESLI_API_KEY and it'll be used automatically and the throttling below
// becomes unnecessary.
const ODESLI_API_KEY = process.env.ODESLI_API_KEY || '';

// Without a key we deliberately only resolve a couple of NEW releases per
// request (not the whole catalog) so a single page load never has to wait on
// a slow, rate-limited chain of calls. Any releases we don't get to this time
// just stay unresolved and get picked up on a later request.
const MAX_RESOLVE_PER_REQUEST = ODESLI_API_KEY ? 10 : 2;
const CALL_SPACING_MS = ODESLI_API_KEY ? 100 : 1500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Resolve Apple Music / YouTube Music from a Spotify URL using Odesli's public
// API. Returns null on failure/rate-limit so the caller knows NOT to cache it —
// an unresolved release should be retried later, not stuck as permanently empty.
async function resolveOdesliLinks(spotifyUrl) {
  try {
    const url = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(spotifyUrl)}&userCountry=NZ`;
    const headers = ODESLI_API_KEY ? { Authorization: `Bearer ${ODESLI_API_KEY}` } : {};
    const r = await fetch(url, { headers });

    if (r.status === 429) {
      console.warn('Odesli rate limited — will retry this release on a later request');
      return null;
    }
    if (!r.ok) {
      console.error('Odesli error:', r.status, await r.text());
      return null;
    }

    const data = await r.json();
    const byPlatform = data.linksByPlatform || {};
    return {
      appleMusic: byPlatform.appleMusic?.url || '',
      youtubeMusic: byPlatform.youtubeMusic?.url || byPlatform.youtube?.url || '',
    };
  } catch (err) {
    console.error('Odesli fetch failed:', err.message);
    return null; // unresolved, not "known empty" — retry later
  }
}

// Fill in linksCache for a small batch of the newest releases that AREN'T
// already covered by the manual APPLE_MUSIC/YOUTUBE_MUSIC maps and haven't
// been resolved yet, oldest-priority-last, so the current single/album
// resolves first. Only successful lookups get cached; failures are left
// unresolved so they're retried on a future request instead of staying
// broken forever.
async function resolveLinksForReleases(releases) {
  const unresolved = releases
    .filter((r) => !(APPLE_MUSIC[r.id] || YOUTUBE_MUSIC[r.id])) // manually mapped = skip Odesli entirely
    .filter((r) => !linksCache[r.id])
    .sort((a, b) => new Date(b.release_date) - new Date(a.release_date))
    .slice(0, MAX_RESOLVE_PER_REQUEST);

  for (const release of unresolved) {
    const result = await resolveOdesliLinks(release.external_urls.spotify);
    if (result) linksCache[release.id] = result; // only cache real successes
    if (unresolved.length > 1) await sleep(CALL_SPACING_MS);
  }
}

export default async function handler(req, res) {
  console.log('spotify handler start', !!process.env.SPOTIFY_CLIENT_ID, !!process.env.SPOTIFY_CLIENT_SECRET);

  // Serve from cache if still fresh. While some releases are still missing
  // Apple/YouTube links we use a short TTL so we keep retrying every couple
  // of minutes instead of being stuck with a partial result for a full day.
  const effectiveTTL = cacheNeedsResolution ? RETRY_TTL : CACHE_TTL;
  if (cache && (Date.now() - cacheTime) < effectiveTTL) {
    console.log('serving from memory cache', cacheNeedsResolution ? '(backfill still pending)' : '');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json(cache);
  }

  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const artistId     = ARTIST_ID;

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });

    const tokenText = await tokenRes.text();
    if (!tokenRes.ok) {
      console.error('Spotify token error:', tokenRes.status, tokenText);
      if (cache) {
        console.log('serving stale cache after token error');
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
        return res.status(200).json(cache);
      }
      return res.status(tokenRes.status).json({ error: 'Spotify token failed', detail: tokenText });
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      console.error('Token JSON parse error:', tokenText);
      if (cache) {
        console.log('serving stale cache after token parse error');
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
        return res.status(200).json(cache);
      }
      return res.status(500).json({ error: 'Token parse failed', detail: tokenText });
    }

    const token = tokenData.access_token;

    const safeFetch = async (url) => {
      const r    = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const text = await r.text();
      if (!r.ok) {
        console.error('Spotify fetch error:', r.status, text);
        return { items: [] };
      }
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('JSON parse error for', url, text);
        return { items: [] };
      }
    };

    const [albumsData, singlesData1, singlesData2] = await Promise.all([
      safeFetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album&market=NZ&limit=6`),
      safeFetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=single&market=NZ&limit=10&offset=0`),
      safeFetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=single&market=NZ&limit=10&offset=10`),
    ]);

    const dedupe = (items) => {
      const seen = new Set();
      return items.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    };

    const allSinglesItems = [
      ...(singlesData1.items || []),
      ...(singlesData2.items || []),
    ];

    const albums  = dedupe(albumsData.items || []).slice(0, 6);
    const singles = dedupe(allSinglesItems).slice(0, 20);

    // Only the releases NOT already covered by the manual maps need Odesli at all.
    await resolveLinksForReleases([...albums, ...singles]);

    const attachLinks = (release) => {
      // Spotify's `artists` array on an album/single includes every credited
      // artist. Anyone that isn't Uxban himself is a real featured artist —
      // this is how we avoid hardcoding "feat. X" in the HTML.
      const featuring = (release.artists || [])
        .filter((a) => a.id !== artistId)
        .map((a) => a.name);

      return {
        ...release, // keep every original Spotify field intact for other pages that rely on it
        featuring,
        links: {
          spotify:      release.external_urls.spotify,
          // Manual overrides win first; Odesli-resolved links are the fallback.
          appleMusic:   APPLE_MUSIC[release.id]   || linksCache[release.id]?.appleMusic   || '',
          youtubeMusic: YOUTUBE_MUSIC[release.id] || linksCache[release.id]?.youtubeMusic || '',
        }
      };
    };

    const result = {
      albums:  albums.map(attachLinks),
      singles: singles.map(attachLinks),
    };

    // Store in memory cache
    cache     = result;
    cacheTime = Date.now();
    cacheNeedsResolution = [...result.albums, ...result.singles]
      .some((r) => !r.links.appleMusic || !r.links.youtubeMusic);

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    res.status(200).json(result);

  } catch (err) {
    console.error('Spotify handler caught:', err.message);

    // If we have stale cache, serve it rather than erroring
    if (cache) {
      console.log('serving stale cache after error');
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
      return res.status(200).json(cache);
    }

    res.status(500).json({ error: 'Failed to fetch', detail: err.message });
  }
}