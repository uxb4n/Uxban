/* ==============================================
   UXBAN — Preview Player
   One shared <audio> element for every preview
   button on the page. Starting a new preview
   auto-stops the previous one.

   Buttons can carry:
     data-preview      → mark as preview button
     data-name         → track name (for API lookup)
     data-id           → iTunes collection ID (exact match)
     data-track-index  → optional 1-based track index
   ============================================== */
(function () {
  'use strict';

  let audio = null;
  let currentBtn = null;
  const urlCache = new Map();

  function getAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.volume = 0.75;
    audio.preload = 'none';
    audio.addEventListener('ended', resetBtn);
    audio.addEventListener('error', resetBtn);
    return audio;
  }

  function resetBtn() {
    if (currentBtn) {
      currentBtn.classList.remove('playing', 'loading');
      currentBtn.setAttribute('aria-label', 'Play preview');
    }
    currentBtn = null;
  }

  async function fetchPreview({ id, name, artist, trackIndex }) {
    const key = `${id || ''}__${name || ''}__${trackIndex ?? ''}`.toLowerCase();
    if (urlCache.has(key)) return urlCache.get(key);

    const params = new URLSearchParams();
    if (id)         params.set('id', id);
    if (name)       params.set('name', name);
    if (artist)     params.set('artist', artist);
    if (trackIndex != null) params.set('trackIndex', trackIndex);

    try {
      const res  = await fetch(`/api/preview?${params.toString()}`);
      const data = await res.json();
      urlCache.set(key, data.previewUrl);
      return data.previewUrl;
    } catch {
      urlCache.set(key, null);
      return null;
    }
  }

  async function toggle(btn, name, artist) {
    const a = getAudio();

    // Same button — pause
    if (currentBtn === btn && !a.paused) {
      a.pause();
      resetBtn();
      return;
    }

    // Different button — stop previous
    if (currentBtn && currentBtn !== btn) {
      a.pause();
      a.currentTime = 0;
      resetBtn();
    }

    btn.classList.add('loading');
    btn.setAttribute('aria-label', 'Loading preview');

    // Read everything from the button
    const id         = btn.dataset.id || null;
    const trackIndex = btn.dataset.trackIndex || null;
    const trackName  = name || btn.dataset.name || null;

    const url = await fetchPreview({
      id,
      name: trackName,
      artist: artist || 'Uxban',
      trackIndex,
    });

    btn.classList.remove('loading');

    if (!url) {
      btn.classList.add('unavailable');
      btn.setAttribute('aria-label', 'Preview unavailable');
      setTimeout(() => {
        btn.classList.remove('unavailable');
        btn.setAttribute('aria-label', 'Play preview');
      }, 1800);
      return;
    }

    a.src = url;
    a.currentTime = 0;

    try {
      await a.play();
      currentBtn = btn;
      btn.classList.add('playing');
      btn.setAttribute('aria-label', 'Stop preview');
    } catch (err) {
      console.warn('Preview playback failed:', err);
      resetBtn();
    }
  }

  window.UxbanPreview = { toggle };
})();