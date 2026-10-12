(function () {
  'use strict';

  const CURRENCY_SYMBOLS = { USD: '$', NZD: '$', AUD: '$', GBP: '£', CAD: '$' };
  const CURRENCY_LABELS  = { USD: 'USD', NZD: 'NZD', AUD: 'AUD', GBP: 'GBP', CAD: 'CAD' };

  function getCurrency() {
    return (typeof userCurrency !== 'undefined' && userCurrency) ? userCurrency : 'USD';
  }

  function injectNavButton() {
    const navInfo = document.querySelector('.nav-info');
    if (!navInfo || document.getElementById('cart-nav-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'cart-nav-btn';
    btn.className = 'cart-btn';
    btn.setAttribute('aria-label', 'Open cart');
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
      <span class="cart-count" id="cart-count-badge"></span>`;
    btn.addEventListener('click', openCart);
    const hamburger = navInfo.querySelector('.hamburger');
    if (hamburger) navInfo.insertBefore(btn, hamburger);
    else navInfo.appendChild(btn);
  }

  function injectDrawer() {
    if (document.getElementById('cart-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'cart-overlay';
    overlay.className = 'cart-overlay';
    overlay.addEventListener('click', closeCart);
    document.body.appendChild(overlay);

    const drawer = document.createElement('div');
    drawer.id = 'cart-drawer';
    drawer.className = 'cart-drawer';
    drawer.innerHTML = `
      <div class="cart-drawer-head">
        <span class="cart-drawer-title">// Cart</span>
        <button class="cart-drawer-close" id="cart-close-btn" aria-label="Close cart">✕</button>
      </div>
      <div class="cart-drawer-body" id="cart-drawer-body"></div>
      <div class="cart-drawer-foot" id="cart-drawer-foot" style="display:none">
        <div class="cart-total-row">
          <span class="cart-total-label">Total</span>
          <div>
            <span class="cart-total-amount" id="cart-total-amount">—</span>
            <span class="cart-total-currency" id="cart-total-currency"></span>
          </div>
        </div>
        <div class="cart-country-wrap">
          <label class="cart-country-label">// Shipping to</label>
          <select class="cart-country-select" id="checkout-country">
            <option value="">Select country</option>
            <option value="NZ">New Zealand</option>
            <option value="AU">Australia</option>
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="CA">Canada</option>
          </select>
        </div>
        <button class="cart-checkout-btn" id="cart-checkout-btn">Checkout</button>
        <p class="cart-shipping-note">// Shipping calculated at checkout</p>
      </div>`;
    document.body.appendChild(drawer);

    const toast = document.createElement('div');
    toast.id = 'cart-toast';
    toast.className = 'cart-toast';
    document.body.appendChild(toast);

    document.getElementById('cart-close-btn').addEventListener('click', closeCart);
    document.getElementById('cart-checkout-btn').addEventListener('click', checkout);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeCart();
    });
  }

  function openCart() {
    renderDrawer();
    document.getElementById('cart-overlay').classList.add('open');
    document.getElementById('cart-drawer').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    document.getElementById('cart-overlay')?.classList.remove('open');
    document.getElementById('cart-drawer')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderDrawer() {
    const body  = document.getElementById('cart-drawer-body');
    const foot  = document.getElementById('cart-drawer-foot');
    const items = Cart.getAll();
    const cur   = getCurrency();
    const sym   = CURRENCY_SYMBOLS[cur];
    const label = CURRENCY_LABELS[cur];

    if (items.length === 0) {
      body.innerHTML = `
        <div class="cart-empty-state">
          <div class="cart-empty-icon">◻</div>
          <p class="cart-empty-text">// Your cart is empty</p>
          <a class="cart-empty-link" href="/store/">Browse the store</a>
        </div>`;
      foot.style.display = 'none';
      return;
    }

    foot.style.display = 'block';

    body.innerHTML = items.map(item => {
      const p    = STORE_PRODUCTS[item.productId];
      const unit = p ? (p.prices[cur] || p.prices.USD) : item.price;
      return `
        <div class="cart-item" data-key="${item.id}">
          <div class="cart-item-img"><img src="${item.image}" alt="${item.name}" loading="lazy"></div>
          <div class="cart-item-info">
            <p class="cart-item-name">${item.name}</p>
            <p class="cart-item-meta">${item.color} · ${item.size}</p>
            <div class="cart-item-actions">
              <div class="cart-qty-wrap">
                <button class="cart-qty-btn" data-action="dec" data-key="${item.id}">−</button>
                <span class="cart-qty-num">${item.qty}</span>
                <button class="cart-qty-btn" data-action="inc" data-key="${item.id}">+</button>
              </div>
              <button class="cart-item-remove" data-action="remove" data-key="${item.id}">Remove</button>
            </div>
          </div>
          <div class="cart-item-price">${sym}${unit * item.qty}</div>
        </div>`;
    }).join('');

    body.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', e => {
        const key    = e.currentTarget.dataset.key;
        const action = e.currentTarget.dataset.action;
        const item   = Cart.getAll().find(i => i.id === key);
        if (!item) return;
        if (action === 'inc')    Cart.updateQty(key, item.qty + 1);
        if (action === 'dec')    Cart.updateQty(key, item.qty - 1);
        if (action === 'remove') Cart.remove(key);
        renderDrawer();
        updateBadge();
      });
    });

    const tot = Cart.total(cur);
    document.getElementById('cart-total-amount').textContent   = `${sym}${tot}`;
    document.getElementById('cart-total-currency').textContent = label;
  }

  async function checkout() {
    const btn   = document.getElementById('cart-checkout-btn');
    const items = Cart.getAll();
    if (!items.length) return;

    const country = document.getElementById('checkout-country')?.value || '';
    if (!country) {
      CartUI.showToast('Please select your country for shipping.');
      return;
    }

    const currency = getCurrency();
    btn.disabled    = true;
    btn.textContent = 'Redirecting...';

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({
            productId: i.productId, size: i.size, color: i.color, qty: i.qty
          })),
          currency, country,
        }),
      });
      const data = await res.json();
      if (data.url) { Cart.clear(); window.location.href = data.url; }
      else throw new Error(data.error || 'No URL returned');
    } catch (err) {
      console.error('Checkout error:', err);
      btn.disabled = false;
      btn.textContent = 'Checkout';
      CartUI.showToast('Checkout failed. Please try again.');
    }
  }

  function updateBadge() {
    const badge = document.getElementById('cart-count-badge');
    if (!badge) return;
    const n = Cart.getCount();
    badge.textContent = n;
    badge.classList.toggle('has-items', n > 0);
  }

  window.CartUI = {
    showToast(msg) {
      const t = document.getElementById('cart-toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(t._timer);
      t._timer = setTimeout(() => t.classList.remove('show'), 2200);
    },
    bumpBadge() {
      const badge = document.getElementById('cart-count-badge');
      if (!badge) return;
      badge.classList.remove('bump');
      void badge.offsetWidth;
      badge.classList.add('bump');
    },
    open: openCart,
    close: closeCart,
  };

  window.addEventListener('uxban:cart-updated', updateBadge);

  function init() {
    injectNavButton();
    injectDrawer();
    updateBadge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();