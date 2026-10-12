/* ==============================================
   UXBAN — LINKS CONFIG
   Add a new entry here for every song.
   The individual page at /listen/[slug]/ reads this.
   ============================================== */

window.UXBAN_LINKS_CONFIG = [

  /* ── UPCOMING / PRESAVE ────────────────────── */

  {
    slug:         'back2me',
    spotifyId:    '',
    released:     false,
    releaseDate:  '2026-08-21T16:00:00+12:00',
    type:         'SINGLE',
    title:        'back2Me',
    subtitle:     'AUG 21, 4PM NZT',
    coverImage:   '/assets/images/cover-back2me.jpg',
    links: {
      presave: 'https://distrokid.com/hyperfollow/uxban/back2me?ref=release',
    },
  },

  /* ── RELEASED TRACKS ─────────────────────────
     released: true  → shows streaming buttons
     released: false → shows presave + countdown
  ──────────────────────────────────────────────*/

  {
    slug:         'uxtra',
    spotifyId:    '62Qw3eFdZ9SpvHqsVDKuDt',
    released:     true,
    releaseDate:  '2025-04-06T00:00:00',
    type:         'ALBUM',
    links: {
      spotify:      'https://open.spotify.com/album/62Qw3eFdZ9SpvHqsVDKuDt',
      appleMusic:   'https://music.apple.com/album/uxtra/1890788021',
      youtubeMusic: 'https://music.youtube.com/playlist?list=OLAK5uy_m73sxIBNrIyaa6ScNtXQwPoLGZfn5GYeY',
    },
  },

  {
    slug:         'things-you-cant-prove',
    spotifyId:    '1CTU6z0vSGiEf8RyES9Xsi',
    released:     true,
    releaseDate:  '2026-01-01T00:00:00',
    type:         'SINGLE',
    links: {
      spotify:      'https://open.spotify.com/album/1CTU6z0vSGiEf8RyES9Xsi',
      appleMusic:   'https://music.apple.com/us/album/things-you-cant-prove-single/1886136281',
      youtubeMusic: 'https://music.youtube.com/watch?v=fN7DrcUYDOE&si=RSvdw6gNzmvQ3zMK',
    },
  },

  {
    slug:         'switch-up',
    spotifyId:    '447IcV1QdO8wuzgESV9UBf',
    released:     true,
    releaseDate:  '2026-05-15T15:00:00',
    type:         'SINGLE',
    title:        'SWITCH UP',
    subtitle:     'FEAT. PRODANDREW',
    links: {
      spotify:      'https://open.spotify.com/track/447IcV1QdO8wuzgESV9UBf',
      appleMusic:   '',
      youtubeMusic: '',
    },
  },

];
