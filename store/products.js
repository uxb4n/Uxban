// ============================================================
//  UXBAN — products.js
// ============================================================

function getProductPrice(productId, size, currency) {
  const p = STORE_PRODUCTS[productId];
  if (!p) return 0;
  const sizeOverride = p.sizePrices && p.sizePrices[size];
  if (sizeOverride) return sizeOverride[currency] || sizeOverride.NZD;
  return p.prices[currency] || p.prices.NZD;
}

function getStripeAmountNZD(productId, size) {
  const p = STORE_PRODUCTS[productId];
  if (!p) return 0;
  return (p.stripeSizeAmounts && p.stripeSizeAmounts[size]) || p.stripeAmountNZD;
}

const STORE_PRODUCTS = {
  tee: {
    id: 'tee',
    name: 'UXTRA Tee',
    label: 'UXTRA — First Drop',
    description: 'The first official drop from uxban NZ, designed to accompany the debut album UXTRA. NZ urban graphic print on the front, uxban wordmark on the back.',
    details: ['100% cotton', 'Unisex fit', 'Sizes S–5XL'],
    album: 'UXTRA',
    tags: ['merch', 'apparel', 'tee'],
    prices: { USD: 30, NZD: 45, AUD: 42, GBP: 22, CAD: 37 },
    sizePrices: {
      '2XL': { USD: 33, NZD: 50, AUD: 47, GBP: 24, CAD: 42 },
      '3XL': { USD: 33, NZD: 50, AUD: 47, GBP: 24, CAD: 42 },
      '4XL': { USD: 36, NZD: 55, AUD: 51, GBP: 26, CAD: 46 },
      '5XL': { USD: 36, NZD: 55, AUD: 51, GBP: 26, CAD: 46 },
    },
    stripeAmountNZD: 4500,
    stripeSizeAmounts: { '2XL': 5000, '3XL': 5000, '4XL': 5500, '5XL': 5500 },
    launchDate: '2026-06-06T12:00:00+12:00',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
    colors: {
      Black: { swatch: '#111111', images: [
        '/assets/images/store/tee-black-front.png',
        '/assets/images/store/tee-black-back.png',
        '/assets/images/store/tee-black-collar.png',
        '/assets/images/store/tee-black-folded.png',
        '/assets/images/store/tee-size-guide.png',
      ]},
      Navy: { swatch: '#1a2744', images: [
        '/assets/images/store/tee-navy-front.png',
        '/assets/images/store/tee-navy-back.png',
        '/assets/images/store/tee-navy-collar.png',
        '/assets/images/store/tee-navy-folded.png',
        '/assets/images/store/tee-size-guide.png',
      ]},
      White: { swatch: '#f0f0f0', images: [
        '/assets/images/store/tee-white-front.png',
        '/assets/images/store/tee-white-back.png',
        '/assets/images/store/tee-white-collar.png',
        '/assets/images/store/tee-white-folded.png',
        '/assets/images/store/tee-size-guide.png',
      ]}
    }
  },

  hoodie: {
    id: 'hoodie',
    name: 'UXTRA Hoodie',
    label: 'UXTRA — First Drop',
    description: 'The premium counterpart to the debut drop. Same NZ urban graphic on a heavyweight hoodie built for everyday wear.',
    details: ['Heavyweight cotton blend', 'Unisex fit', 'Sizes S–5XL'],
    album: 'UXTRA',
    tags: ['merch', 'apparel', 'hoodie'],
    prices: { USD: 50, NZD: 75, AUD: 68, GBP: 35, CAD: 60 },
    sizePrices: {
      '2XL': { USD: 53, NZD: 80, AUD: 73, GBP: 37, CAD: 65 },
      '3XL': { USD: 53, NZD: 80, AUD: 73, GBP: 37, CAD: 65 },
      '4XL': { USD: 56, NZD: 85, AUD: 77, GBP: 39, CAD: 69 },
      '5XL': { USD: 56, NZD: 85, AUD: 77, GBP: 39, CAD: 69 },
    },
    stripeAmountNZD: 7500,
    stripeSizeAmounts: { '2XL': 8000, '3XL': 8000, '4XL': 8500, '5XL': 8500 },
    launchDate: '2026-06-06T12:00:00+12:00',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
    colors: {
      Black: { swatch: '#111111', images: [
        '/assets/images/store/hoodie-black-front.png',
        '/assets/images/store/hoodie-black-back.png',
        '/assets/images/store/hoodie-black-collar.png',
        '/assets/images/store/hoodie-black-folded.png',
        '/assets/images/store/hoodie-size-guide.png',
      ]},
      Navy: { swatch: '#1a2744', images: [
        '/assets/images/store/hoodie-navy-front.png',
        '/assets/images/store/hoodie-navy-back.png',
        '/assets/images/store/hoodie-navy-collar.png',
        '/assets/images/store/hoodie-navy-folded.png',
        '/assets/images/store/hoodie-size-guide.png',
      ]},
      White: { swatch: '#f0f0f0', images: [
        '/assets/images/store/hoodie-white-front.png',
        '/assets/images/store/hoodie-white-back.png',
        '/assets/images/store/hoodie-white-collar.png',
        '/assets/images/store/hoodie-white-folded.png',
        '/assets/images/store/hoodie-size-guide.png',
      ]}
    }
  },

  socks: {
    id: 'socks',
    name: 'UXTRA Socks',
    label: 'UXTRA — Accessories',
    description: 'Limited-edition 3/4 crew socks featuring the UXTRA starry space design. Premium combed cotton, perfect for everyday wear.',
    details: ['Combed cotton blend', '3/4 crew length', 'One size fits most'],
    album: 'UXTRA',
    tags: ['merch', 'accessories', 'socks'],
    prices: { USD: 23, NZD: 35, AUD: 32, GBP: 18, CAD: 28 },
    stripeAmountNZD: 3500,
    launchDate: '2099-01-01T00:00:00+12:00',
    sizes: ['One Size'],
    colors: {
      'Black Starry': { swatch: '#1a1a2e', images: [
        '/assets/images/store/socks-black-starry.png',
      ]}
    }
  },

  cd: {
    id: 'cd',
    name: 'UXTRA — Jewel Case CD',
    label: 'UXTRA — Physical',
    description: 'The debut album UXTRA on physical CD. Jewel case edition with full artwork booklet. Ships worldwide.',
    details: ['Jewel case', 'Full artwork booklet', 'Ships worldwide'],
    album: 'UXTRA',
    tags: ['merch', 'music', 'physical'],
    prices: { NZD: 40, USD: 23, AUD: 36, GBP: 19, CAD: 31 },
    stripeAmountNZD: 4000,
    launchDate: '2026-06-06T12:00:00+12:00',
    sizes: ['One Size'],
    colors: {
      Standard: { swatch: '#c0c0c0', images: [
        '/assets/images/store/cd-front.png',
        '/assets/images/store/cd-open.png',
        '/assets/images/store/cd-disc.png',
      ]}
    }
  }
};

// ============================================================
//  CART
// ============================================================
const CART_KEY = 'uxban_cart';

const Cart = (() => {
  function _load() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  }

  function _save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    _dispatch();
  }

  function _dispatch() {
    window.dispatchEvent(new CustomEvent('uxban:cart-updated', { detail: getAll() }));
  }

  function _key(productId, color, size) {
    return `${productId}__${color}__${size}`;
  }

  function getAll() { return _load(); }

  function getCount() { return _load().reduce((n, i) => n + i.qty, 0); }

  function add(productId, color, size, currency) {
    const p = STORE_PRODUCTS[productId];
    if (!p) return;
    const items = _load();
    const key   = _key(productId, color, size);
    const idx   = items.findIndex(i => i.id === key);
    const colorObj = p.colors[color] || p.colors[Object.keys(p.colors)[0]];
    const image    = colorObj.images[0] || '';
    const price    = getProductPrice(productId, size, currency);
    const stripeAmt = getStripeAmountNZD(productId, size);

    if (idx > -1) {
      items[idx].qty += 1;
    } else {
      items.push({
        id: key, productId, name: p.name, color, size,
        qty: 1, price, currency, stripeAmount: stripeAmt, image
      });
    }
    _save(items);
  }

  function remove(key) { _save(_load().filter(i => i.id !== key)); }

  function updateQty(key, qty) {
    const items = _load();
    const idx   = items.findIndex(i => i.id === key);
    if (idx === -1) return;
    if (qty < 1) { remove(key); return; }
    items[idx].qty = qty;
    _save(items);
  }

  function clear() { _save([]); }

  function total(currency) {
    return _load().reduce((sum, i) => {
      const unit = getProductPrice(i.productId, i.size, currency);
      return sum + unit * i.qty;
    }, 0);
  }

  return { getAll, getCount, add, remove, updateQty, clear, total };
})();