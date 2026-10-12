/* ==============================================
   UXBAN — Command Palette (⌘K / Ctrl+K)
   Zero dependencies. Fuzzy search across pages,
   links, and every release from /api/spotify.
   ============================================== */
(function () {
  'use strict';

  const OVERLAY_ID = 'uxban-cmdk';
  let overlay, input, listEl;
  let items = [];
  let filtered = [];
  let activeIdx = 0;
  let releasesCache = null;

    const STATIC = [
    { group: 'Pages', title: 'Home',     href: '/',          keywords: 'start' },
    { group: 'Pages', title: 'Releases', href: '/releases/', keywords: 'discography music albums singles' },
    { group: 'Pages', title: 'Store',    href: '/store/',    keywords: 'merch shop buy apparel' },
    { group: 'Pages', title: 'Links',    href: '/links/',    keywords: 'socials follow bio' },
    { group: 'Links', title: 'Spotify',     href: 'https://open.spotify.com/artist/433lt9JbmTHzNzHqZtiK7C', external: true },
    { group: 'Links', title: 'Apple Music', href: 'https://music.apple.com/us/artist/uxban/1757422943',   external: true },
    { group: 'Links', title: 'Instagram',   href: 'https://instagram.com/uxbanwtf',      external: true },
    { group: 'Links', title: 'TikTok',      href: 'https://www.tiktok.com/@uxbanwtf',    external: true },
    { group: 'Links', title: 'X / Twitter', href: 'https://x.com/uxbanwtf',              external: true },
    { group: 'Links', title: 'YouTube',     href: 'https://www.youtube.com/@uxban',      external: true },
  ];

  function fuzzyScore(query, text) {
    if (!query) return 1;
    const q = query.toLowerCase();
    const t = String(text || '').toLowerCase();
    if (!t) return 0;
    if (t.includes(q)) return 100 - t.indexOf(q);

    let i = 0, score = 0, lastMatch = -1;
    for (const ch of q) {
      const found = t.indexOf(ch, i);
      if (found === -1) return 0;
      if (lastMatch >= 0) score -= (found - lastMatch - 1);
      lastMatch = found;
      i = found + 1;
    }
    return score + 20;
  }

  function slugify(name) {
    return String(name || '').toLowerCase()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function getItems() {
    if (items.length) return items;

    let releaseItems = [];
    if (releasesCache) {
      releaseItems = releasesCache;
    } else {
      try {
        const res  = await fetch('/api/spotify');
        const data = await res.json();
        const all  = [
          ...(data.albums  || []).map(r => ({ ...r, _type: 'ALBUM'  })),
          ...(data.singles || []).map(r => ({ ...r, _type: 'SINGLE' })),
        ];

        releaseItems = all.map(r => ({
          group:       r._type === 'ALBUM' ? 'Albums' : 'Singles',
          title:       r.name,
          description: `${r._type} · ${r.release_date?.slice(0, 4) || ''}`,
          href:        `/listen/${slugify(r.name)}/`,
          external:    false,
        }));
        releasesCache = releaseItems;
      } catch {}
    }

    items = [...STATIC, ...releaseItems];
    return items;
  }

  function render(query) {
    const q = query.trim();

    filtered = items
      .map(it => ({
        ...it,
        score: Math.max(
          fuzzyScore(q, it.title),
          fuzzyScore(q, it.description || '') * 0.6,
          fuzzyScore(q, it.keywords    || '') * 0.4
        ),
      }))
      .filter(it => it.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    if (!filtered.length) {
      listEl.innerHTML = `<div class="cmdk-empty">// NO RESULTS</div>`;
      return;
    }

    if (activeIdx >= filtered.length) activeIdx = filtered.length - 1;
    if (activeIdx < 0) activeIdx = 0;

    const groups = {};
    filtered.forEach(it => {
      (groups[it.group] = groups[it.group] || []).push(it);
    });

    let idx = 0;
    listEl.innerHTML = Object.entries(groups).map(([group, arr]) => `
      <div class="cmdk-group">
        <p class="cmdk-group-label">${group}</p>
        ${arr.map(it => {
          const myIdx = idx++;
          return `
            <a class="cmdk-item ${myIdx === activeIdx ? 'active' : ''}"
               data-idx="${myIdx}"
               href="${it.href}"
               ${it.external ? 'target="_blank" rel="noopener"' : ''}>
              <span class="cmdk-item-title">${it.title}</span>
              ${it.description ? `<span class="cmdk-item-desc">${it.description}</span>` : ''}
              <span class="cmdk-item-arrow">${it.external ? '↗' : '→'}</span>
            </a>`;
        }).join('')}
      </div>
    `).join('');

    listEl.querySelectorAll('.cmdk-item').forEach(el => {
      el.addEventListener('mouseenter', () => {
        activeIdx = parseInt(el.dataset.idx, 10);
        listEl.querySelectorAll('.cmdk-item').forEach(e =>
          e.classList.toggle('active', e === el));
      });
    });
  }

  async function open() {
    await getItems();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    input.value = '';
    activeIdx = 0;
    render('');
    setTimeout(() => input.focus(), 30);
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function buildDOM() {
    if (document.getElementById(OVERLAY_ID)) return;

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'cmdk-overlay';
    overlay.innerHTML = `
      <div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="cmdk-input-wrap">
          <svg class="cmdk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5" stroke-linecap="round"/>
          </svg>
          <input class="cmdk-input" type="text" placeholder="Search releases, pages, links..." autocomplete="off" spellcheck="false">
          <kbd class="cmdk-kbd">ESC</kbd>
        </div>
        <div class="cmdk-list" id="cmdk-list"></div>
        <div class="cmdk-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>ESC</kbd> Close</span>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    input  = overlay.querySelector('.cmdk-input');
    listEl = overlay.querySelector('#cmdk-list');

    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    input.addEventListener('input', () => { activeIdx = 0; render(input.value); });

    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, filtered.length - 1);
        render(input.value);
        listEl.querySelector('.cmdk-item.active')?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
        render(input.value);
        listEl.querySelector('.cmdk-item.active')?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const it = filtered[activeIdx];
        if (!it) return;
        if (it.external) window.open(it.href, '_blank', 'noopener');
        else window.location.href = it.href;
      } else if (e.key === 'Escape') {
        close();
      }
    });
  }

  document.addEventListener('keydown', e => {
    const isK = e.key && e.key.toLowerCase() === 'k';
    if ((e.metaKey || e.ctrlKey) && isK) {
      e.preventDefault();
      if (overlay && overlay.classList.contains('open')) close();
      else open();
    }
    if (e.key === 'Escape' && overlay?.classList.contains('open')) close();
  });

  window.UxbanCmdk = { open, close };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildDOM);
  } else {
    buildDOM();
  }
})();