/* ==============================================
   UXBAN — HERO + FEATURED CONFIG
   Controls the homepage hero AND the featured
   release card.

   ── HOW TO SWITCH BETWEEN STATES ──

   UPCOMING (before release):
     useCustom: true
     featuredOverride.active: true
     Fill in the custom + featuredOverride blocks
     with cover art, title, and (later) presave URL.

   LIVE (after release is on streaming):
     useCustom: false
     featuredOverride.active: false
     The site auto-pulls the newest release from iTunes.
   ============================================== */

window.UXBAN_HERO = {

  /* ═══════════════════════════════════════════
     HERO (top of homepage)
  ═══════════════════════════════════════════ */
  useCustom: true,   // ← true = show upcoming below, false = auto iTunes

  custom: {
    eyebrow:    'OUT NOW',
    title:      'VELVET',
    subtitle:   'The new single from Uxban.',
    ctaText:    'LISTEN NOW',                    // shown until you have a URL
    ctaLink:    'https://too.fm/velvet-presave',                               // empty = disabled button
    background: '/assets/images/velvet-cover.jpg',
  },


  /* ═══════════════════════════════════════════
     FEATURED RELEASE CARD
     (the big tile below the hero)
  ═══════════════════════════════════════════ */
  featuredOverride: {
    active:     true,                             // ← flip to false after release
    eyebrow:    'OUT NOW',                    // becomes 'NEW SINGLE' when live
    title:      'VELVET',
    meta:       'SINGLE',                         // shows under the title
    coverImage: '/assets/images/velvet-cover.jpg',
    ctaText:    'LISTEN NOW',
    ctaLink:    'https://too.fm/velvet-presave',                               // empty = disabled
  },


  /* ── Auto mode fallback (used when useCustom:false) ── */
  pin: null,
  fallback: {
    eyebrow:    'NEW SINGLE',
    title:      'ON YOU',
    subtitle:   'New single out now.',
    ctaText:    'LISTEN NOW',
    ctaLink:    'https://too.fm/on-you',
    background: '',
  },

};