// Paystack - Verify a transaction after callback
// GET /api/verify?reference=xxxx&test=1
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const reference = req.query.reference;
  const testMode = String(req.query.test || '') === '1';
  if (!reference) return res.status(400).json({ error: 'Missing reference.' });

  const key = testMode ? process.env.PAYSTACK_TEST_SECRET : process.env.PAYSTACK_LIVE_SECRET;
  if (!key) return res.status(500).json({ error: 'Payment is not configured.' });

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    const data = await response.json();
    if (!data.status) return res.status(400).json({ error: data.message || 'Verification failed.' });

    const tx = data.data;
    return res.status(200).json({
      status: tx.status,                       // 'success' | 'failed' | 'abandoned'
      reference: tx.reference,
      amount: tx.amount / 100,                 // kobo -> naira
      currency: tx.currency,
      paid_at: tx.paid_at,
      customer: {
        email: tx.customer?.email,
        name: tx.metadata?.customer_name || tx.customer?.first_name
      },
      items: tx.metadata?.order_items || []
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
