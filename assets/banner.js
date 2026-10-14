/* ==============================================
   UXBAN — BANNER
   Controls the top site banner on every page.

   ┌─────────────────────────────────────────────┐
   │ EDIT THE CONFIG BLOCK BELOW                 │
   │                                             │
   │ Every page loads this via:                  │
   │   <script src="/assets/banner.js" defer>    │
   │                                             │
   │ The banner is created automatically — you   │
   │ don't need any HTML on the page.            │
   └─────────────────────────────────────────────┘
   ============================================== */

window.UXBAN_BANNER = {

  /* ── Master switch ─────────────────────────── */
  enabled: true,

  /* ── Show the X close button? ────────────────
     Dismissing hides the banner for THIS version.
     Bump the version string to re-show to everyone. */
  dismissible: true,
  version: 'velvet-v1',

  /* ── Content ─────────────────────────────────
     Array of segments, rendered left to right.

     Each segment can be:

     ── Plain text ──
       { text: '// NEW SINGLE' }

     ── Button ──
       { text: 'PRE-SAVE', href: 'https://...', style: 'primary' }
       style: 'primary' (white bg) | 'outline' (bordered) | 'link' (underlined)

     ── Live countdown ──
       {
         type: 'countdown',
         target: '2026-08-21T16:00:00+12:00',
         label: 'DROPS IN',
         expiredStyle: 'hide',
         expiredText: 'OUT NOW',
         expiredHref: 'https://too.fm/back2me',
       }

     Every segment can also have:
       hideOnMobile: true   → hidden under 480px
  ────────────────────────────────────────────── */
  segments: [
    { text: '// NEW SINGLE VELVET — COMING SOON', hideOnMobile: false },
  ],

};