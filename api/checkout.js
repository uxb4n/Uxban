const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// =============================================
// PRODUCT PRICES (in NZD cents) – FINAL
// =============================================
const PRODUCTS = {
  tee: {
    name: 'UXTRA Tee',
    baseAmountNZD: 4500,
    sizeAmountsNZD: {
      '2XL': 5000,
      '3XL': 5000,
      '4XL': 5500,
      '5XL': 5500,
    },
  },
  hoodie: {
    name: 'UXTRA Hoodie',
    baseAmountNZD: 7500,
    sizeAmountsNZD: {
      '2XL': 8000,
      '3XL': 8000,
      '4XL': 8500,
      '5XL': 8500,
    },
  },
  socks: {
    name: 'UXTRA Socks',
    baseAmountNZD: 2500,
  },
  cd: {
    name: 'UXTRA — Jewel Case CD',
    baseAmountNZD: 4000,
  },
};

// =============================================
// SHIPPING RATES (in NZD cents) – FINAL
// =============================================
const SHIPPING_RATES = {
  tee: {
    NZ: { first: 1700, additional: 680 },
    AU: { first: 2100, additional: 839 },
    US: { first: 700, additional: 367 },
    GB: { first: 1700, additional: 680 },
    CA: { first: 1600, additional: 748 },
  },
  hoodie: {
    NZ: { first: 2500, additional: 1667 },
    AU: { first: 3600, additional: 1635 },
    US: { first: 1400, additional: 345 },
    GB: { first: 2500, additional: 1667 },
    CA: { first: 2100, additional: 1090 },
  },
  socks: {
    NZ: { first: 1000, additional: 703 },
    AU: { first: 2100, additional: 839 },
    US: { first: 1000, additional: 703 },
    GB: { first: 1000, additional: 703 },
    CA: { first: 1000, additional: 703 },
  },
  cd: {
    NZ: { first: 1000, additional: 1000 },   // 10.00 NZD
    AU: { first: 920, additional: 920 },     // 9.20 AUD
    US: { first: 610, additional: 610 },     // 6.10 USD
    GB: { first: 490, additional: 200 },     // 2.00 GBP
    CA: { first: 840, additional: 9.20 },     // 9.20 CAD
  },
};

// =============================================
// HELPERS
// =============================================
const SUPPORTED_CURRENCIES = ['USD', 'NZD', 'AUD', 'GBP', 'CAD'];
const SUPPORTED_COUNTRIES = ['NZ', 'AU', 'US', 'GB', 'CA'];

async function getExchangeRate(toCurrency) {
  if (toCurrency === 'NZD') return 1;
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=NZD&to=${toCurrency}`);
    const data = await res.json();
    return data.rates[toCurrency];
  } catch {
    return null;
  }
}

function getBaseAmountNZD(product, size) {
  return (product.sizeAmountsNZD && product.sizeAmountsNZD[size])
    || product.baseAmountNZD;
}

// =============================================
// MAIN HANDLER
// =============================================
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { items, product, size, color, currency: reqCurrency, country } = req.body;

  // ---- 1. Validate country ----
  if (!country) {
    return res.status(400).json({ error: 'Please select your country for shipping.' });
  }
  if (!SUPPORTED_COUNTRIES.includes(country)) {
    return res.status(400).json({ error: 'Shipping to this country is not supported.' });
  }

  // ---- 2. Determine target currency ----
  let requestedCurrency = (reqCurrency || 'NZD').toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(requestedCurrency)) {
    requestedCurrency = 'NZD';
  }
  const rate = await getExchangeRate(requestedCurrency);
  const effectiveRate = rate || 1;
  const effectiveCurrency = rate ? requestedCurrency : 'NZD';

  // ---- 3. Process line items and collect product quantities ----
  let lineItems = [];
  let metadataItems = [];
  let totalQty = 0;
  const productQuantities = {};

  try {
    function addProductToCart(productId, qty, size, color) {
      const p = PRODUCTS[productId];
      if (!p) throw new Error(`Invalid product: ${productId}`);
      if (!Number.isInteger(qty) || qty < 1) throw new Error('Invalid quantity');
      if (productId !== 'cd') {
            if (!color) throw new Error('Colour required');
          }
          if (productId !== 'cd' && productId !== 'socks') {
            if (!size) throw new Error('Size required');
          }

      productQuantities[productId] = (productQuantities[productId] || 0) + qty;

      const baseNZD = getBaseAmountNZD(p, size);
      const amountInTarget = Math.round(baseNZD * effectiveRate);

      lineItems.push({
        price_data: {
          currency: effectiveCurrency.toLowerCase(),
          product_data: {
            name: p.name,
            description:
              productId === 'cd'
                ? 'UXTRA Album — Jewel Case Edition'
                : productId === 'socks'
                  ? `Colour: ${color}`
                  : `Colour: ${color} / Size: ${size}`,
          },
          unit_amount: amountInTarget,
        },
        quantity: qty,
      });

      const desc = productId === 'cd'
        ? `${p.name} x${qty}`
        : `${p.name} (${color}, ${size}) x${qty}`;
      metadataItems.push(desc);
      totalQty += qty;
    }

    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        addProductToCart(item.productId, item.qty, item.size, item.color);
      }
    } else if (product) {
      if (!color) return res.status(400).json({ error: 'Colour required' });
      addProductToCart(product, 1, size, color);
    } else {
      return res.status(400).json({ error: 'No items provided' });
    }

    // ================================================================
    //  NEW SHIPPING CALCULATION – ONE FIRST ITEM PER CART
    // ================================================================
    // Build an array of product types with quantities and rates for the country
    const cartItems = [];
    for (const [prodId, qty] of Object.entries(productQuantities)) {
      const rates = SHIPPING_RATES[prodId]?.[country];
      if (!rates) continue;
      cartItems.push({
        productId: prodId,
        quantity: qty,
        first: rates.first || 0,
        additional: rates.additional || 0,
      });
    }

    let totalShippingNzdCents = 0;
    let firstItemProduct = null;
    let highestFirst = 0;

    if (cartItems.length > 0) {
      // Find the product with the highest first‑item shipping cost
      for (const item of cartItems) {
        if (item.first > highestFirst) {
          highestFirst = item.first;
          firstItemProduct = item;
        }
      }

      // Start with the highest first cost
      totalShippingNzdCents = highestFirst;

      // Now add the remaining items using their additional rates
      for (const item of cartItems) {
        // Determine how many items of this product type are NOT the first item
        let qtyToAdd = item.quantity;
        if (item === firstItemProduct) {
          qtyToAdd -= 1; // the first item is already covered by the first cost
        }
        if (qtyToAdd > 0) {
          totalShippingNzdCents += qtyToAdd * item.additional;
        }
      }
    }

    // ---- DEBUG LOGS ----
    console.log('========== Shipping Debug ==========');
    console.log('Cart items:', cartItems.map(i => ({
      product: i.productId,
      qty: i.quantity,
      first: i.first,
      additional: i.additional
    })));
    console.log('Selected first item:', firstItemProduct ? firstItemProduct.productId : 'none');
    console.log('First shipping cost (NZD cents):', highestFirst);
    console.log('Additional shipping costs (NZD cents):', totalShippingNzdCents - highestFirst);
    console.log('Total shipping (NZD cents):', totalShippingNzdCents);
    console.log('======================================');

    // ---- Convert shipping to target currency ----
    const shippingAmountInTarget = Math.round(totalShippingNzdCents * effectiveRate);

    // ---- Build Stripe session ----
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      shipping_address_collection: {
        allowed_countries: [country],
      },
      allow_promotion_codes: true,
      metadata: {
        order_summary: metadataItems.join(' | '),
        item_count: String(totalQty),
        shipping_country: country,
        shipping_nzd_cents: String(totalShippingNzdCents),
        currency_conversion_rate: String(effectiveRate),
      },
      custom_fields: [
        {
          key: 'instagram_handle',
          label: { type: 'custom', custom: 'Instagram handle (optional)' },
          type: 'text',
          optional: true,
        }
      ],
      success_url: 'https://uxban.shop/success',
      cancel_url: 'https://uxban.shop/store/',
    };

    if (shippingAmountInTarget > 0) {
      sessionParams.shipping_options = [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: shippingAmountInTarget,
              currency: effectiveCurrency.toLowerCase(),
            },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 14 },
            },
          },
        },
      ];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url });

  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ error: 'Checkout failed' });
  }
};