/* =========================
   UXBAN — script.js
========================= */

/* ---------- HELPERS ---------- */
function uxbanSlugify(name) {
  return String(name || '').toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ---------- SITE BANNER ---------- */
const BANNER_TEXT    = '// NEW SINGLE BACK2ME — AUG 21, 4PM NZT // PRE-SAVE NOW //';
const BANNER_ENABLED = true;

const siteBanner   = document.getElementById('site-banner');
const bannerTextEl = document.querySelector('.site-banner-text');

if (siteBanner && bannerTextEl) {
  if (BANNER_ENABLED) {
    bannerTextEl.textContent = BANNER_TEXT;
  } else {
    siteBanner.style.display = 'none';
  }
}

/* ---------- PAGE TRANSITIONS ---------- */
document.querySelectorAll('a[href]').forEach(link => {
  const href = link.getAttribute('href');
  if (
    href && href.startsWith('/') &&
    !href.startsWith('//') &&
    !link.hasAttribute('target')
  ) {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.body.classList.add('fade-out');
      setTimeout(() => { window.location.href = href; }, 200);
    });
  }
});

/* ---------- NAV OFFSET ---------- */
function updateNavOffset() {
  const banner = document.getElementById('site-banner');
  const nav    = document.getElementById('top-bar');
  if (!nav) return;
  const visible = banner && banner.style.display !== 'none' && banner.offsetHeight;
  nav.style.top = visible ? banner.offsetHeight + 'px' : '0';
}
updateNavOffset();
window.addEventListener('resize', updateNavOffset, { passive: true });
window.addEventListener('load',   updateNavOffset);

const bannerClose = document.querySelector('.site-banner-close');
if (bannerClose) {
  bannerClose.addEventListener('click', () => {
    if (siteBanner) siteBanner.style.display = 'none';
    setTimeout(updateNavOffset, 30);
  });
}

/* ---------- NAV SCROLL SHRINK ---------- */
const topBar = document.getElementById('top-bar');
if (topBar) {
  window.addEventListener('scroll', () => {
    topBar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

/* ---------- HAMBURGER MENU ---------- */
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobile-nav');

if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      hamburger.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

/* ============================================
   HERO — auto / custom
============================================ */
function applyHeroContent(c) {
  const eyebrow = document.querySelector('.hero-eyebrow');
  const title   = document.querySelector('.hero-title');
  const sub     = document.querySelector('.hero-sub');
  const cta     = document.querySelector('.hero-cta');
  const bgWrap  = document.querySelector('.hero-bg');

  if (eyebrow && c.eyebrow  != null) eyebrow.textContent = c.eyebrow;
  if (title   && c.title    != null) title.textContent   = c.title;
  if (sub     && c.subtitle != null) sub.textContent     = c.subtitle;
  if (cta     && c.ctaText  != null) cta.textContent     = c.ctaText;
  if (cta     && c.ctaLink)          cta.href            = c.ctaLink;

  if (!bgWrap || !c.background) return;

  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(c.background);
  const old = bgWrap.querySelector('img, video');
  if (old) old.remove();

  if (isVideo) {
    const v = document.createElement('video');
    v.autoplay = true;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'metadata';
    if (c.backgroundPoster) v.poster = c.backgroundPoster;
    v.src = c.background;
    v.setAttribute('muted', '');
    v.style.opacity = '0';
    v.style.transition = 'opacity 0.8s ease';
    v.addEventListener('canplay', () => { v.style.opacity = '1'; }, { once: true });
    bgWrap.appendChild(v);
  } else {
    const img = document.createElement('img');
    img.src = c.background;
    img.alt = '';
    bgWrap.appendChild(img);
  }
}

async function initHero() {
  const titleEl = document.querySelector('.hero-title');
  if (!titleEl) return;

  const cfg = window.UXBAN_HERO || {};

  if (cfg.useCustom && cfg.custom) {
    applyHeroContent(cfg.custom);
    return;
  }

  try {
    const res  = await fetch('/api/spotify');
    const data = await res.json();

    const all = [
      ...(data.albums  || []).map(r => ({ ...r, _type: 'ALBUM'  })),
      ...(data.singles || []).map(r => ({ ...r, _type: 'SINGLE' })),
    ].sort((a, b) => new Date(b.release_date) - new Date(a.release_date));

    if (!all.length) {
      if (cfg.fallback) applyHeroContent(cfg.fallback);
      return;
    }

    let release = all[0];
    if (cfg.pin) {
      const pin = cfg.pin.toLowerCase();
      const pinned = all.find(r =>
        r.name.toLowerCase().includes(pin) ||
        uxbanSlugify(r.name) === uxbanSlugify(cfg.pin)
      );
      if (pinned) release = pinned;
    }

    const slug    = uxbanSlugify(release.name);
    const ctaLink = `/listen/${slug}/`;
    const ctaText = 'LISTEN NOW';

    const year     = release.release_date?.slice(0, 4) || '';
    const typeStr  = release._type === 'ALBUM' ? 'Album' : 'Single';
    const subtitle = `${typeStr} · ${year}`;

    applyHeroContent({
      eyebrow:    'LATEST',
      title:      release.name,
      subtitle:   subtitle,
      ctaText,
      ctaLink,
      background: release.images?.[0]?.url || '',
    });
  } catch (err) {
    console.warn('Hero auto-update failed:', err.message);
    if (cfg.fallback) applyHeroContent(cfg.fallback);
  }
}

initHero();

/* ---------- STREAM LINK BUILDER ---------- */
function buildStreamLinks(links) {
  const defs = [
    { key: 'spotify',      label: 'SPOTIFY' },
    { key: 'appleMusic',   label: 'APPLE MUSIC' },
    { key: 'youtubeMusic', label: 'YOUTUBE MUSIC' },
  ];
  return defs
    .filter(d => links[d.key])
    .map(d => `<a class="stream-link" href="${links[d.key]}" target="_blank" rel="noopener">${d.label} ↗</a>`)
    .join('');
}

/* ---------- FEATURED RELEASE CARD ---------- */
function renderFeaturedRelease(release, cover, links, type) {
  const coverEl = document.getElementById('featured-cover');
  const titleEl = document.getElementById('featured-title');
  const metaEl  = document.getElementById('featured-meta');
  const linksEl = document.getElementById('featured-links');
  const badgeEl = document.getElementById('featured-badge');
  if (!coverEl || !titleEl) return;

  coverEl.style.backgroundImage = `url('${cover}')`;
  titleEl.textContent = release.name;

  const year = release.release_date?.slice(0, 4) || '';
  metaEl.textContent = `${type} · ${year}`;
  if (badgeEl) badgeEl.textContent = type === 'ALBUM' ? 'NEW ALBUM' : 'NEW SINGLE';
  linksEl.innerHTML = buildStreamLinks(links);
}

/* ---------- SPOTIFY DATA LOAD ---------- */
async function loadSpotifyData() {
  const gridEl = document.getElementById('releases-grid');
  const featEl = document.getElementById('featured-release');
  if (!gridEl && !featEl) return;

  try {
    const res  = await fetch('/api/spotify');
    const data = await res.json();
    if (!data.albums && !data.singles) return;

    const all = [
      ...(data.albums  || []).map(r => ({ release: r, cover: r.images?.[0]?.url || '', links: r.links || {}, type: 'ALBUM'  })),
      ...(data.singles || []).map(r => ({ release: r, cover: r.images?.[0]?.url || '', links: r.links || {}, type: 'SINGLE' })),
    ].sort((a, b) => new Date(b.release.release_date) - new Date(a.release.release_date));

    if (!all.length) return;

    if (featEl) {
      const f = all[0];
      renderFeaturedRelease(f.release, f.cover, f.links, f.type);
    }

    if (gridEl) {
      const gridItems = all.slice(1, 8);

      gridEl.innerHTML = gridItems.map(({ release, cover, type }) => {
        const slug   = uxbanSlugify(release.name);
        const href   = `/listen/${slug}/`;
        const year   = release.release_date?.slice(0, 4) || '';
        return `
          <a class="grid-card spotlight-card" href="${href}">
            <div class="grid-img">
              <img src="${cover}" alt="${release.name}" loading="lazy">
            </div>
            <div class="grid-info">
              <h3 class="grid-name">${release.name}</h3>
              <p class="grid-price">${type} · ${year}</p>
            </div>
          </a>`;
      }).join('') + `
        <a class="grid-promo" href="/releases/">
          <p class="grid-promo-eyebrow">BROWSE</p>
          <h3 class="grid-promo-title">ALL<br>RELEASES</h3>
        </a>`;
    }
  } catch (err) {
    console.warn('Spotify load failed:', err.message);
  }
}

loadSpotifyData();

/* ---------- EMAIL FORM ---------- */
async function submitEmail(email, source, statusEl) {
  statusEl.textContent = '// SENDING...';
  statusEl.className = 'email-status';
  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source }),
    });
    if (res.ok) {
      statusEl.textContent = "// YOU'RE IN.";
      statusEl.classList.add('success');
      return true;
    }
    throw new Error('Request failed');
  } catch {
    statusEl.textContent = '// SOMETHING WENT WRONG. TRY AGAIN.';
    statusEl.classList.add('error');
    return false;
  }
}

const emailForm = document.getElementById('email-form');
if (emailForm) {
  emailForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email  = document.getElementById('email-input').value.trim();
    const status = document.getElementById('email-status');
    const btn    = emailForm.querySelector('.email-btn, .email-capture-btn');
    if (btn) btn.disabled = true;
    const ok = await submitEmail(email, 'home', status);
    if (ok) emailForm.querySelector('input').value = '';
    if (btn) btn.disabled = false;
  });
}

/* ---------- SCROLL TO TOP ---------- */
const scrollTopBtn = document.getElementById('scroll-top');
if (scrollTopBtn) {
  window.addEventListener('scroll', () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------- CURSOR SPOTLIGHT ---------- */
(function initSpotlight() {
  const cards = document.querySelectorAll('.spotlight-card');
  if (!cards.length) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  let rafId = null;
  let lastEvent = null;

  function update() {
    rafId = null;
    if (!lastEvent) return;

    const { clientX, clientY } = lastEvent;

    cards.forEach(card => {
      const r = card.getBoundingClientRect();
      if (clientX < r.left - 240 || clientX > r.right  + 240 ||
          clientY < r.top  - 240 || clientY > r.bottom + 240) return;

      const x = ((clientX - r.left) / r.width)  * 100;
      const y = ((clientY - r.top)  / r.height) * 100;
      card.style.setProperty('--mx', x + '%');
      card.style.setProperty('--my', y + '%');
    });
  }

  document.addEventListener('pointermove', (e) => {
    lastEvent = e;
    if (rafId === null) rafId = requestAnimationFrame(update);
  }, { passive: true });
})();