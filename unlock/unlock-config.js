/* ==============================================
   UXBAN — UNLOCK CONFIG
   Per-release pre-save gates.

   Each entry is a slug → config object.
   URL: /unlock/{slug}/

   Just add a new block for each release you
   want to gate. Nothing else to touch.

   ──────────────────────────────────────────────
   TIMESTAMPS (all ISO 8601 with NZ offset):
     openAt        → when pre-saves open
                     (set to null to always be open)
     releaseDate   → when the track drops
     closeAt       → when the reward window ends
                     (set to null to never close)
   ────────────────────────────────────────────── */

window.UXBAN_UNLOCK_CONFIG = {

  /* ════════════════════════════════════════════
     VELVET — First gated release
     ════════════════════════════════════════════ */
  'velvet': {
    slug:  'velvet',
    title: 'VELVET',
    public: false,

    // ── Artwork ────────────────────────────────
    coverImage: '/assets/images/velvet-cover.jpg',

    // ── Pre-save / stream link (Too.fm) ────────
    // The same URL works pre + post release — Too.fm
    // auto-switches the landing page for you.
    streamUrl: 'https://too.fm/velvet',

    // ── Timing ─────────────────────────────────
    openAt:      null,                              // always open
    releaseDate: '2026-11-01T00:00:00+13:00',       // ← set your real date
    closeAt:     '2026-11-15T23:59:59+13:00',       // ← set your real close

    // ── Locked state copy ──────────────────────
    locked: {
      eyebrow: '// EXCLUSIVE EARLY ACCESS',
      title:   'HEAR IT\nBEFORE\nIT DROPS.',
      desc:    'Pre-save VELVET to unlock the full track, 48 hours before it hits streaming.',
      cta:     'PRE-SAVE VELVET',
      waiting: 'Waiting for you to come back…',
    },

    // ── Unlocked state copy ────────────────────
    unlocked: {
      eyebrow: '// YOU\'RE IN',
      title:   'YOU\'RE\nEARLY.',
      desc:    'You\'re hearing this before anyone else. Keep it between us.',
    },

    // ── Post-release copy (stream-to-unlock phase) ──
    streaming: {
      eyebrow: '// OUT NOW',
      title:   'STREAM IT.\nUNLOCK IT.',
      desc:    'VELVET is out now. Stream the track below to unlock the extended cut.',
      cta:     'STREAM VELVET',
      waiting: 'Waiting for you to come back…',
    },

    // ── Too early state ────────────────────────
    tooEarly: {
      eyebrow: '// NOT YET',
      title:   'TOO\nEARLY.',
      desc:    'Pre-saves open on the date below. Come back then to claim your early access.',
    },

    // ── Ended state ────────────────────────────
    ended: {
      eyebrow: '// CLOSED',
      title:   'YOU MISSED\nIT.',
      desc:    'The early access window for VELVET has closed. Stream it everywhere now.',
    },

    // ── Rewards ────────────────────────────────
    // (array — you can stack more reward types later)
    rewards: [
      {
        type:  'audio',
        label: 'VELVET — Early Stream',
        src:   '/assets/audio/velvet.mp3',
      },
    ],
  },


  /* ════════════════════════════════════════════
     EXAMPLE — copy this block for the next release
     ════════════════════════════════════════════ */
  // 'next-single': {
  //   slug:  'next-single',
  //   title: 'NEXT SINGLE',
  //   coverImage: '/assets/images/next-cover.jpg',
  //   streamUrl:  'https://too.fm/next-single',
  //   openAt:      null,
  //   releaseDate: '2026-12-01T00:00:00+13:00',
  //   closeAt:     '2026-12-15T23:59:59+13:00',
  //   locked:    { eyebrow: '// EARLY ACCESS', title: 'HEAR IT\nFIRST.', desc: 'Pre-save to unlock.', cta: 'PRE-SAVE' },
  //   unlocked:  { eyebrow: '// YOU\'RE IN',    title: 'YOU\'RE\nEARLY.', desc: 'Enjoy it first.' },
  //   streaming: { eyebrow: '// OUT NOW',       title: 'STREAM IT.',      desc: 'Stream to unlock.', cta: 'STREAM NOW' },
  //   tooEarly:  { eyebrow: '// NOT YET',       title: 'TOO\nEARLY.',     desc: 'Come back soon.' },
  //   ended:     { eyebrow: '// CLOSED',        title: 'CLOSED.',         desc: 'This window has ended.' },
  //   rewards:   [{ type: 'audio', label: 'NEXT SINGLE — Early', src: '/assets/audio/next.mp3' }],
  // },

};