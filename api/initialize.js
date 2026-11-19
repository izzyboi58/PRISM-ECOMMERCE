// Paystack - Initialize a transaction
// POST /api/initialize  { email, name, phone, items:[{name,price,qty}] }
const crypto = require('crypto');

function secretKey(testMode) {
  return testMode ? process.env.PAYSTACK_TEST_SECRET : process.env.PAYSTACK_LIVE_SECRET;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, name, phone, items, testMode } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    // Recalculate total server-side - never trust the price sent by the browser
    const total = items.reduce((sum, i) => {
      const price = Number(i.price) || 0;
      const qty = Math.max(1, Number(i.qty) || 1);
      return sum + price * qty;
    }, 0);
    if (!total || total < 100) return res.status(400).json({ error: 'Invalid order total.' });

    const key = secretKey(Boolean(testMode));
    if (!key) return res.status(500).json({ error: 'Payment is not configured. Missing Paystack secret key.' });

    const origin = process.env.SITE_URL || (req.headers.origin || '').replace(/\/$/, '');
    const reference = 'PRISM-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const payload = {
      email,
      amount: Math.round(total * 100), // Paystack expects kobo
      currency: 'NGN',
      reference,
      callback_url: `${origin}/payment-success.html`,
      metadata: {
        custom_fields: [
          { display_name: 'Customer Name', variable_name: 'customer_name', value: name || 'PRISM Customer' },
          { display_name: 'Phone Number', variable_name: 'customer_phone', value: phone || '' },
          { display_name: 'Order Items', variable_name: 'order_items', value: items.map(i => `${i.name} x${i.qty || 1}`).join(', ') }
        ],
        order_items: items,
        customer_name: name || 'PRISM Customer',
        customer_phone: phone || '',
        source: 'PRISM Web Store'
      }
    };

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({ error: data.message || 'Could not initialize payment.' });
    }
    return res.status(200).json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      amount: total
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
