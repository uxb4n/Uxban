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
  version: 'back2me-v1',

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
         target: '2026-08-21T16:00:00+12:00',   // any ISO date
         label: 'DROPS IN',                     // optional prefix
         expiredText: 'OUT NOW',                // shown after the timer hits zero
         expiredHref: 'https://too.fm/back2me', // where the expired state links
       }

     Every segment can also have:
       hideOnMobile: true   → hidden under 480px
  ────────────────────────────────────────────── */
  segments: [
    { text: '// NEW SINGLE ON YOU', hideOnMobile: false },
    {
      type: 'countdown',
      target: '2026-10-02T16:00:00+13:00',
      label: 'DROPS IN',
      expiredText: 'OUT NOW',
      expiredHref: 'https://too.fm/on-you',
    },
    { text: 'PRE-SAVE', href: 'https://too.fm/on-you', style: 'primary' },
  ],

  /* ═══════════════════════════════════════════
     EXAMPLES — copy/paste what you need
     ═══════════════════════════════════════════

     Countdown only (no button):
       segments: [
         { text: '// NEW SINGLE BACK2ME' },
         { type: 'countdown', target: '2026-08-21T16:00:00+12:00', label: 'DROPS IN' },
       ],

     Countdown + two buttons:
       segments: [
         { type: 'countdown', target: '2026-12-01T00:00:00+13:00', label: 'DROPS IN' },
         { text: 'PRE-SAVE', href: 'https://...', style: 'primary' },
         { text: 'PREVIEW', href: 'https://...', style: 'outline' },
       ],

     Countdown with no label:
       { type: 'countdown', target: '2026-08-21T16:00:00+12:00' },

     Simple announcement, no countdown:
       segments: [
         { text: '// FREE SHIPPING ON ALL ORDERS' },
         { text: 'SHOP', href: '/store/', style: 'primary', target: '_self' },
       ],

     Hide a segment on mobile:
       { text: 'AUG 21 · 4PM NZT', hideOnMobile: true },

     Turn the banner off entirely:
       enabled: false,
     ═══════════════════════════════════════════ */
};


/* ════════════════════════════════════════════════
   LOGIC — no need to edit below this line
   ════════════════════════════════════════════════ */
(function () {
  'use strict';

  const config = window.UXBAN_BANNER || {};
  if (!config.enabled) return;

  /* ── Build or find the banner container ── */
  let banner = document.getElementById('site-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'site-banner';
    banner.className = 'site-banner';
    document.body.insertBefore(banner, document.body.firstChild);
  }

  /* ── Dismiss handling ── */
  const dismissKey = `uxban-banner-dismissed-${config.version || 'v1'}`;
  const isDismissible = config.dismissible !== false;

  if (isDismissible) {
    try {
      if (localStorage.getItem(dismissKey) === '1') {
        banner.style.display = 'none';
        positionNav();
        return;
      }
    } catch {}
  }

  /* ── Rebuild contents ── */
  banner.innerHTML = '';
  const intervals = []; // track countdown timers for cleanup on dismiss

  const inner = document.createElement('div');
  inner.className = 'site-banner-inner';

  (config.segments || []).forEach(seg => {
    const node = renderSegment(seg);
    if (node) inner.appendChild(node);
  });

  banner.appendChild(inner);

  /* ── Close button ── */
  if (isDismissible) {
    const close = document.createElement('button');
    close.className = 'site-banner-close';
    close.setAttribute('aria-label', 'Close banner');
    close.textContent = '✕';
    close.addEventListener('click', () => {
      intervals.forEach(clearInterval);
      banner.classList.add('dismissed');
      try { localStorage.setItem(dismissKey, '1'); } catch {}
      setTimeout(() => {
        banner.style.display = 'none';
        positionNav();
      }, 280);
    });
    banner.appendChild(close);
  }

  /* ── Position the nav below the banner ── */
  function positionNav() {
    const nav = document.getElementById('top-bar');
    if (!nav) return;
    const visible = banner.style.display !== 'none' && !banner.classList.contains('dismissed');
    nav.style.top = visible ? banner.offsetHeight + 'px' : '0';
  }

  /* ════════════════════════════════════════════
     SEGMENT RENDERERS
  ════════════════════════════════════════════ */
  function renderSegment(seg) {
    if (!seg) return null;

    if (seg.type === 'countdown') return renderCountdown(seg);

    if (seg.href) return renderLink(seg);

    return renderText(seg);
  }

  function renderText(seg) {
    const span = document.createElement('span');
    span.className = 'site-banner-text';
    if (seg.hideOnMobile) span.classList.add('hide-on-mobile');
    span.textContent = seg.text;
    return span;
  }

  function renderLink(seg) {
    const style = seg.style || 'primary';
    const a = document.createElement('a');

    if (style === 'link') {
      a.className = 'site-banner-link';
    } else {
      a.className = 'site-banner-btn' + (style === 'outline' ? ' outline' : '');
    }
    if (seg.hideOnMobile) a.classList.add('hide-on-mobile');

    a.href = seg.href;
    if (seg.target !== '_self') {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    a.textContent = seg.text;
    return a;
  }

  function renderCountdown(seg) {
    const wrap = document.createElement('span');
    wrap.className = 'site-banner-countdown';
    if (seg.hideOnMobile) wrap.classList.add('hide-on-mobile');

    const label = seg.label ? `<span class="cd-label">${seg.label}</span>` : '';

    wrap.innerHTML = `
      ${label}
      <span class="cd-num" data-cd="days">00</span><span class="cd-suffix">d</span>
      <span class="cd-num" data-cd="hours">00</span><span class="cd-suffix">h</span>
      <span class="cd-num" data-cd="mins">00</span><span class="cd-suffix">m</span>
      <span class="cd-num" data-cd="secs">00</span><span class="cd-suffix">s</span>
    `;

    const target = new Date(seg.target).getTime();
    const pad = n => String(n).padStart(2, '0');

    function tick() {
      const diff = target - Date.now();

      if (diff <= 0) {
        // Replace with an "OUT NOW" link (or plain text if no href)
        const expired = document.createElement('span');
        if (seg.expiredHref) {
          expired.className = 'site-banner-countdown-expired';
          expired.innerHTML = `<a href="${seg.expiredHref}" ${seg.expiredHref.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${seg.expiredText || 'OUT NOW'} →</a>`;
        } else {
          expired.className = 'cd-expired-text';
          expired.textContent = seg.expiredText || 'OUT NOW';
        }
        wrap.replaceWith(expired);
        const idx = intervals.indexOf(timer);
        if (idx !== -1) intervals.splice(idx, 1);
        clearInterval(timer);
        // Re-measure in case size changed
        setTimeout(positionNav, 30);
        return;
      }

      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      const get = k => wrap.querySelector(`[data-cd="${k}"]`);
      if (get('days'))  get('days').textContent  = pad(d);
      if (get('hours')) get('hours').textContent = pad(h);
      if (get('mins'))  get('mins').textContent  = pad(m);
      if (get('secs'))  get('secs').textContent  = pad(s);
    }

    // If already expired on load, render the expired state immediately
    if (Date.now() >= target) {
      tick(); // triggers the expired branch
      return wrap;
    }

    tick();
    const timer = setInterval(tick, 1000);
    intervals.push(timer);

    return wrap;
  }

  /* ════════════════════════════════════════════
     BOOT
  ════════════════════════════════════════════ */
  positionNav();
  window.addEventListener('resize', positionNav, { passive: true });
  window.addEventListener('load', positionNav);

  // Let other scripts know the banner is ready
  window.dispatchEvent(new Event('uxban:banner-rendered'));
})();