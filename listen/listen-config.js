/* ==============================================
   UXBAN — LISTEN CONFIG

   Every /listen/{slug}/ redirects to your Too.fm
   smart link. Too.fm auto-switches between the
   pre-save page and the listen page on release day,
   so you never touch this file for normal releases.

   ┌─────────────────────────────────────────────┐
   │ HOW TO SET UP A NEW RELEASE                 │
   │                                             │
   │ 1. In Too Lost, open the release link      │
   │    editor and rename the URL extension     │
   │    to match the release name slugified.    │
   │                                             │
   │      back2Me              → back2me        │
   │      SWITCH UP            → switch-up      │
   │      Things You Can't Prove → things-you-cant-prove │
   │                                             │
   │ 2. Done. /listen/back2me/ now redirects    │
   │    to https://too.fm/back2me                │
   │                                             │
   │ If the slug is too short for Too.fm (min   │
   │ 3 characters) or already taken, add an     │
   │ override below.                            │
   └─────────────────────────────────────────────┘
   ============================================== */

window.UXBAN_LINKS_CONFIG = {

  /* ════════════════════════════════════════════
     DEFAULT PATTERN
     Every /listen/{slug}/ redirects here.
     {slug} is replaced with the URL slug.

     Requires the Too.fm link to be renamed to
     match (see instructions above).
  ════════════════════════════════════════════ */
  pattern: 'https://too.fm/{slug}',


  /* ════════════════════════════════════════════
     OVERRIDES
     For releases where the Too.fm slug can't be
     renamed to match (too short, already taken,
     special characters, etc.).

     String → redirect here instead of the pattern
     null   → don't redirect — show an on-site
              listen page instead

     The on-site page reads release data from
     Spotify automatically, so you don't need to
     enter a title, cover, or links here.
  ════════════════════════════════════════════ */
  overrides: {

    // ── Too.fm slugs that can't be renamed ──
    // "UX" is only 2 characters — Too.fm requires 3+,
    // so we point /listen/ux/ at the actual Too.fm URL.
    'ux': 'https://too.fm/ux1',

    // ── Add more as you need them ──
    // 'some-track': 'https://too.fm/abc123',

  },

};