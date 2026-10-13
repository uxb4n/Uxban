/* ==============================================
   UXBAN — RELEASE PAGE CONFIG

   Slugs below use dashes (URL format), not spaces.
   e.g. "SWITCH UP" → 'switch-up'
        "Things You Can't Prove" → 'things-you-cant-prove'

   How it works:
   1. defaultCredits apply to every release automatically
   2. Per-release overrides REPLACE any matching default
   3. Featuring from iTunes auto-adds, but your override wins
   4. Set a role to `false` to hide it entirely
   ============================================== */

window.UXBAN_RELEASE_CONFIG = {

  /* ── STORIES ──────────────────────────────── */
  stories: {
    // 'back2me':   'A return to form. Recorded in Auckland over the winter, mixed late at night.',
    'uxtra':     'The debut album. Eleven tracks mapping the space between rage and quiet.',
    'ux':        '“UX” by Uxban is his 1st ever debut album was released December 31st 2025, following his EP “More Than Days” on May 30th 2025.',
    //'switch-up': 'A collab with prod.andrew that flips the tempo on its head.',
    'more-than-days': `"More Than Days +" is Uxban's debut project and first official release on major streaming platforms. The tape blends Hip-Hop and underground rap influences, with tracks like "Billie" and "Crazy" highlighting his experimental approach to structure and sound. Notably, the entire project was self-produced using BandLab, underscoring its raw, independent creative process.`,
  },


  /* ── DEFAULT CREDITS ────────────────────────
     Applied to every release. Override per-release
     below when something differs. */
  defaultCredits: {
    'Written by':  'Uxban',
    'Produced by': 'Uxban',
    'Mixed by':    'Uxban',
    'Mastered by': 'Uxban',
  },


  /* ── PER-RELEASE CREDITS ────────────────────
     Only entries that differ from the defaults. */
  credits: {

    'uxtra': {
      'Produced by': 'Various Artists',
    },

    'ux': {
      'Produced by': '9griffin',
      'Mixed by':    '9griffin',
      'Mastered by': '9griffin',
    },

    // 'more-than-days' — pure defaults, no entry needed

    'on-you': {
      'Produced by': 'Nyro6 & Axellino',
      'Featuring':   'oafalls',
    },

    'back2me': {
      'Produced by': 'Dusk',
    },

    'uno': {
      'Produced by': 'K9wya & Xeus',
    },

    'switch-up': {
      'Produced by': 'prod.andrew',
      'Featuring':   'prod.andrew',
    },

    'things-you-cant-prove': {
      'Produced by': 'D3ad_sstar',
    },

    'freddy-krue': {
      'Produced by': 'Klhett',
      'Mixed by':    'Uxban & VZee',
    },

    'dying-inna-red': {
      'Written by':  'Uxban & Wylie J!',
      'Produced by': 'Smokey808',
      'Featuring':   'Wylie J!',
    },

    'everythinguwant': {
      'Produced by': 'Kkingston',
    },

    'miss-me': {
      'Written by': 'Uxban & $HXDOW',
      'Featuring':  '$HXDOW',
    },

    'dancer': {
      'Produced by': 'RPprods',
    },

    'i-hope': {
      'Produced by': 'RPprods',
      'Mixed by':    'Uxban & ISHVES*',
      'Mastered by': 'Uxban & ISHVES*',
      'Featuring':   'ISHVES*',
    },

    // You're just a feature on this one — no production credits.
    'kicked-out': {
      'Written by':  false,
      'Produced by': false,
      'Mixed by':    false,
      'Mastered by': false,
    },

  },
};