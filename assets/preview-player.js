/* ==============================================
   UXBAN — Preview Player
   Shared <audio> element. One preview at a time.
   Updates --preview-progress on the active button
   so the UI can show a left-to-right fill.
   ============================================== */
(function () {
  'use strict';

  let audio = null;
  let currentBtn = null;
  let rafId = null;
  const urlCache = new Map();

  function getAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.volume = 0.75;
    audio.preload = 'none';
    audio.addEventListener('ended', resetBtn);
    audio.addEventListener('error', resetBtn);
    audio.addEventListener('play',  startProgress);
    audio.addEventListener('pause', stopProgress);
    return audio;
  }

  function startProgress() {
    if (rafId) cancelAnimationFrame(rafId);
    const tick = () => {
      if (!currentBtn || !audio || audio.paused || audio.ended) {
        rafId = null;
        return;
      }
      if (audio.duration) {
        const pct = (audio.currentTime / audio.duration) * 100;
        currentBtn.style.setProperty('--preview-progress', pct.toFixed(2) + '%');
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function stopProgress() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function resetBtn() {
    if (currentBtn) {
      currentBtn.classList.remove('playing', 'loading');
      currentBtn.setAttribute('aria-label', 'Play preview');
      currentBtn.style.setProperty('--preview-progress', '0%');
    }
    stopProgress();
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

    // Same button — pause / resume
    if (currentBtn === btn && !a.paused) {
      a.pause();
      // Keep the fill where it is — the pause event stops tracking
      btn.classList.remove('playing');
      btn.setAttribute('aria-label', 'Resume preview');
      currentBtn = null;
      return;
    }

    // Different button — stop previous fully
    if (currentBtn && currentBtn !== btn) {
      a.pause();
      a.currentTime = 0;
      resetBtn();
    }

    // Resume a paused preview on the same button
    if (btn.dataset._loadedSrc && a.src && a.currentTime > 0 && a.paused) {
      a.play();
      currentBtn = btn;
      btn.classList.add('playing');
      btn.setAttribute('aria-label', 'Stop preview');
      return;
    }

    btn.classList.add('loading');
    btn.setAttribute('aria-label', 'Loading preview');

    const id         = btn.dataset.id || null;
    const trackIndex = btn.dataset.trackIndex || null;
    const trackName  = name || btn.dataset.name || null;

    const url = await fetchPreview({
      id, name: trackName, artist: artist || 'Uxban', trackIndex,
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
    btn.dataset._loadedSrc = url;
    btn.style.setProperty('--preview-progress', '0%');

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