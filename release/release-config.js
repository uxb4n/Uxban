/* ==============================================
   UXBAN — RELEASE PAGE CONFIG

   Per-release content for /release/{slug}/.
   Everything is optional — the page falls back
   to Spotify data automatically.

   Use `stories` for a short paragraph per release,
   and `credits` for the credit grid at the bottom.

   Keys = the slug of the release (name slugified):
     back2Me                    → back2me
     SWITCH UP                  → switch-up
     Things You Can't Prove     → things-you-cant-prove
     UXTRA                      → uxtra
   ============================================== */

window.UXBAN_RELEASE_CONFIG = {

  /* ── STORIES ────────────────────────────────
     One short paragraph per release. Shows under
     the title. If omitted, defaults to a generic line. */
  stories: {
    'back2me':   'A return to form. Recorded in Auckland over the winter, mixed late at night.',
    'uxtra':     'The debut album. Eleven tracks mapping the space between rage and quiet.',
    'ux':        'The 2025 debut. Twelve songs that set the tone for everything that followed.',
    'switch-up': 'A collab with PRODANDREW that flips the tempo on its head.',
  },

  /* ── CREDITS ────────────────────────────────
     Grid at the bottom of the page. Any number of
     groups per release. If omitted, uses defaultCredits. */
  credits: {
    'back2me': {
      'Written & Produced by': 'Uxban',
      'Mixed & Mastered by':   'Uxban',
    },
    'uxtra': {
      'Written & Produced by': 'Uxban',
      'Mixed & Mastered by':   'Uxban',
      'Cover Art':             'Uxban',
    },
  },

  defaultCredits: {
    'Written & Produced by': 'Uxban',
  },

};