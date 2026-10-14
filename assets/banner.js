/* ==============================================
   UXBAN — BANNER
   Config + rendering logic. Load on every page
   via: <script src="/assets/banner.js" defer>
   ============================================== */

window.UXBAN_BANNER = {

  enabled: true,
  dismissible: true,
  version: 'velvet-v1',

  /* Segments render left to right.
     Plain text: { text: '...' }
     Button:     { text: '...', href: '...', style: 'primary' | 'outline' | 'link' }
     Countdown:  { type: 'countdown', target: '...', label: '...', ... } */
  segments: [
    { text: '// NEW SINGLE VELVET — COMING SOON', hideOnMobile: false },
  ],
};


/* ════════════════════════════════════════════════
   LOGIC — no need to edit below this line
════════════════════════════════════════════════ */
(function () {
  'use strict';

  const config = window.UXBAN_BANNER || {};
  if (!config.enabled) return;

  let banner = document.getElementById('site-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'site-banner';
    banner.className = 'site-banner';
    document.body.insertBefore(banner, document.body.firstChild);
  }

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

  banner.innerHTML = '';
  const intervals = [];

  const inner = document.createElement('div');
  inner.className = 'site-banner-inner';

  (config.segments || []).forEach(seg => {
    try {
      const node = renderSegment(seg);
      if (node) inner.appendChild(node);
    } catch (err) {
      console.error('[banner] segment render failed:', err, seg);
    }
  });

  banner.appendChild(inner);

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

  function positionNav() {
    const nav = document.getElementById('top-bar');
    if (!nav) return;
    const visible = banner.style.display !== 'none' && !banner.classList.contains('dismissed');
    nav.style.top = visible ? banner.offsetHeight + 'px' : '0';
  }

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

  function buildExpiredEl(seg) {
    const style = seg.expiredStyle || 'hide';
    if (style === 'hide') return null;

    const expired = document.createElement('span');

    if (style === 'link' && seg.expiredHref) {
      expired.className = 'site-banner-countdown-expired';
      const target = seg.expiredHref.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
      expired.innerHTML = `<a href="${seg.expiredHref}"${target}>${seg.expiredText || 'OUT NOW'} →</a>`;
    } else {
      expired.className = 'cd-expired-text';
      expired.textContent = seg.expiredText || 'OUT NOW';
    }
    return expired;
  }

  function renderCountdown(seg) {
    const target = new Date(seg.target).getTime();
    const pad = n => String(n).padStart(2, '0');

    if (!Number.isFinite(target) || Date.now() >= target) {
      return buildExpiredEl(seg);
    }

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

    let timer = null;

    function tick() {
      const diff = target - Date.now();

      if (diff <= 0) {
        const expired = buildExpiredEl(seg);
        if (wrap.parentNode) {
          if (expired) {
            wrap.parentNode.replaceChild(expired, wrap);
          } else {
            wrap.parentNode.removeChild(wrap);
          }
        }
        if (timer) {
          const idx = intervals.indexOf(timer);
          if (idx !== -1) intervals.splice(idx, 1);
          clearInterval(timer);
        }
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

    tick();
    timer = setInterval(tick, 1000);
    intervals.push(timer);

    return wrap;
  }

  positionNav();
  requestAnimationFrame(positionNav);
  window.addEventListener('resize', positionNav, { passive: true });
  window.addEventListener('load', positionNav);

  [50, 200, 500, 1000].forEach(ms => setTimeout(positionNav, ms));

  window.dispatchEvent(new Event('uxban:banner-rendered'));
})();