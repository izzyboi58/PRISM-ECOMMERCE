// Paystack - Initialize a transaction
// POST /api/initialize { email, name, phone, items:[{name,price,qty}], testMode }

// Server-side catalogue: the browser's price is NEVER trusted.
// Prices must match the cards shown on the site (in Naira).
const CATALOG = {
  // iPhones
  'iphone 13 128gb': 650000,
  'iphone 14 128gb': 820000,
  'iphone 15 128gb': 1100000,
  'iphone 16 pro 256gb': 1490000,
  'iphone 17 256gb': 1490000,
  'iphone air 256gb': 1827500,
  'iphone 17 pro 256gb': 2050000,
  'iphone 17 pro max 1tb': 3250000,
  // Samsung
  'z fold8 ultra 1tb': 3499780,
  'z fold8 512gb': 2981970,
  'z fold8 256gb': 2726060,
  'galaxy a57': 485000,
  'galaxy a37': 385000,
  's24 ultra 512gb': 1450000,
  'watch 9 44mm': 465410,
  'watch 9 40mm': 429410,
  // Laptops & gadgets
  'macbook pro 16 m4 max': 3228280,
  'macbook air 15 m3': 1450000,
  'dell xps 16': 2850000,
  'hp pavilion 14': 670000,
  'lenovo ideapad flex 5': 770000,
  'dell latitude 3500': 419750,
  'airpods pro 3': 400000,
  'poolee powerpod': 35000,
  // Accessories
  'anker power bank': 35000,
  'smart watch ultra': 45000,
  'oraimo earbuds': 32000,
  'anker 65w charger': 28000,
  'bluetooth speaker': 55000,
  'poolee stylepod': 33000,
  // Tablets
  'ipad pro 12.9 m2': 1250000,
  'galaxy tab a9': 291000,
  'redmi pad pro': 428800,
  'ipad air': 680000
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, name, phone, items, testMode } = req.body || {};
    const isTest = Boolean(testMode);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }
    if (items.length > 30) return res.status(400).json({ error: 'Too many items in cart.' });

    // Rebuild the order from the server catalogue - ignore browser-supplied prices.
    const order = [];
    let total = 0;
    for (const item of items) {
      const key = String(item.name || '').trim().toLowerCase();
      const unit = CATALOG[key];
      const qty = Math.max(1, Math.min(20, Number(item.qty) || 1));
      if (!unit) return res.status(400).json({ error: `Unknown product: ${item.name}` });
      total += unit * qty;
      order.push({ name: item.name, qty, price: unit });
    }
    if (!total || total < 100) return res.status(400).json({ error: 'Invalid order total.' });

    const secret = isTest ? process.env.PAYSTACK_TEST_SECRET : process.env.PAYSTACK_LIVE_SECRET;
    if (!secret) return res.status(500).json({ error: 'Payment is not configured. Missing Paystack key.' });

    const origin = (process.env.SITE_URL || req.headers.origin || '').replace(/\/$/, '');
    if (!origin) return res.status(500).json({ error: 'Site URL is not configured.' });

    // Prefix marks test payments so the success page can verify with the right key.
    const reference = (isTest ? 'TEST-' : 'PRISM-') + Date.now() + '-' +
      Math.random().toString(36).slice(2, 8).toUpperCase();

    const payload = {
      email,
      amount: Math.round(total * 100), // kobo
      currency: 'NGN',
      reference,
      callback_url: `${origin}/payment-success.html?mode=${isTest ? 'test' : 'live'}`,
      metadata: {
        custom_fields: [
          { display_name: 'Customer Name', variable_name: 'customer_name', value: name || 'PRISM Customer' },
          { display_name: 'Phone Number', variable_name: 'customer_phone', value: phone || '' },
          { display_name: 'Order Items', variable_name: 'order_items', value: order.map(i => `${i.name} x${i.qty}`).join(', ') }
        ],
        order_items: order,
        customer_name: name || 'PRISM Customer',
        customer_phone: phone || '',
        mode: isTest ? 'test' : 'live',
        source: 'PRISM Web Store'
      }
    };

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!data.status) return res.status(400).json({ error: data.message || 'Could not initialize payment.' });
    return res.status(200).json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      amount: total,
      items: order
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
