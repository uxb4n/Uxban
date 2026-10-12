/* ==============================================
   UXBAN — HERO CONFIG
   Controls what shows in the homepage hero.

   Two modes:
   1) AUTO   → flip useCustom:false, pulls the newest release from Spotify
   2) CUSTOM → flip useCustom:true, uses the `custom` block below

   Edit this file whenever you want to change the hero.
   No other files need touching.
   ============================================== */

window.UXBAN_HERO = {

  /* ── Mode ───────────────────────────────── */
  useCustom: false,   // false = auto newest release, true = use `custom` block

  /* ── CUSTOM HERO (used when useCustom:true) ──
     Good for: music videos, announcements, pre-saves,
     anything you want to pin up top for a while. */
  custom: {
    eyebrow:    'NEW SINGLE',
    title:      'BACK2ME',
    subtitle:   'The new single from Uxban. Dropping Aug 21, 4PM NZT.',
    ctaText:    'PRE-SAVE NOW',
    ctaLink:    'https://distrokid.com/hyperfollow/uxban/back2me?ref=release',
    background: '/assets/images/cover-back2me.jpg',
  },

  /* ── AUTO MODE OPTIONS ──────────────────────
     When useCustom is false, the hero uses the newest release
     from /api/spotify. Optionally pin a specific release by
     name (case-insensitive, partial match works).

     Examples:
       pin: null,           → newest release
       pin: 'uxtra',        → always feature UXTRA
       pin: 'switch up',    → always feature SWITCH UP */
  pin: null,

  /* ── FALLBACK ───────────────────────────────
     Shown if the Spotify fetch fails. Keep this matched to
     the current hero in index.html so nothing changes if the
     API is down. */
  fallback: {
    eyebrow:    'NEW SINGLE',
    title:      'BACK2ME',
    subtitle:   'The new single from Uxban. Dropping Aug 21, 4PM NZT.',
    ctaText:    'PRE-SAVE NOW',
    ctaLink:    'https://distrokid.com/hyperfollow/uxban/back2me?ref=release',
    background: '/assets/images/cover-back2me.jpg',
  },
};