// Paystack - Verify a transaction after callback
// GET /api/verify?reference=xxxx&mode=test|live
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const reference = req.query.reference;
  if (!reference) return res.status(400).json({ error: 'Missing reference.' });

  // Test mode is detected from the reference prefix or the explicit mode param.
  const isTest = String(reference).startsWith('TEST-') || String(req.query.mode || '') === 'test';
  const secret = isTest ? process.env.PAYSTACK_TEST_SECRET : process.env.PAYSTACK_LIVE_SECRET;
  if (!secret) return res.status(500).json({ error: 'Payment is not configured.' });

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    const data = await response.json();
    if (!data.status) return res.status(400).json({ error: data.message || 'Verification failed.' });

    const tx = data.data;
    const paid = tx.status === 'success';
    return res.status(200).json({
      success: paid,
      status: tx.status,
      reference: tx.reference,
      amount: tx.amount / 100, // kobo -> naira
      currency: tx.currency || 'NGN',
      paid_at: tx.paid_at,
      mode: isTest ? 'test' : 'live',
      customer: {
        email: tx.customer?.email,
        name: tx.metadata?.customer_name || tx.customer?.first_name || 'PRISM Customer',
        phone: tx.metadata?.customer_phone
      },
      items: tx.metadata?.order_items || []
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
