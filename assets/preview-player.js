/* ==============================================
   UXBAN — Preview Player
   One shared <audio> element for every preview
   button on the page. Starting a new preview
   auto-stops the previous one.
   ============================================== */
(function () {
  'use strict';

  let audio = null;
  let currentBtn = null;
  const urlCache = new Map(); // "name__artist" -> previewUrl (or null)

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

  async function fetchPreview(name, artist) {
    const key = `${name}__${artist || 'Uxban'}`.toLowerCase();
    if (urlCache.has(key)) return urlCache.get(key);

    try {
      const res  = await fetch(`/api/preview?name=${encodeURIComponent(name)}&artist=${encodeURIComponent(artist || 'Uxban')}`);
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

    // Loading state
    btn.classList.add('loading');
    btn.setAttribute('aria-label', 'Loading preview');

    const url = await fetchPreview(name, artist);

    btn.classList.remove('loading');

    if (!url) {
      // "Unavailable" flash
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