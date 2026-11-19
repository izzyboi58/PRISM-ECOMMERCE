// Paystack Webhook - receives payment events
// Add in Paystack Dashboard > Settings > API Keys & Webhooks:
//   https://web-azure-three-16.vercel.app/api/webhook
// And for test mode:
//   https://web-azure-three-16.vercel.app/api/webhook?mode=test
const crypto = require('crypto');

function validSignature(signature, raw, secret) {
  if (!signature || !secret) return false;
  const hash = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  if (hash.length !== signature.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch (e) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const signature = req.headers['x-paystack-signature'];
  const body = req.body || {};
  // Vercel parses JSON before we see it. Re-stringify to rebuild the signed payload.
  const raw = JSON.stringify(body);

  const secrets = [process.env.PAYSTACK_LIVE_SECRET, process.env.PAYSTACK_TEST_SECRET].filter(Boolean);
  const isTestEvent = String(body.data?.reference || '').startsWith('TEST-') ||
    String(req.query?.mode || '') === 'test';
  const ordered = isTestEvent
    ? [process.env.PAYSTACK_TEST_SECRET, process.env.PAYSTACK_LIVE_SECRET].filter(Boolean)
    : secrets;

  if (!ordered.some(s => validSignature(signature, raw, s))) {
    return res.status(401).send('Invalid signature');
  }

  const event = body;
  if (event.event === 'charge.success') {
    const tx = event.data;
    console.log('ORDER PAID', JSON.stringify({
      reference: tx.reference,
      amount: tx.amount / 100,
      currency: tx.currency,
      email: tx.customer?.email,
      name: tx.metadata?.customer_name,
      phone: tx.metadata?.customer_phone,
      items: tx.metadata?.order_items,
      paid_at: tx.paid_at
    }));
    // TODO: persist the order (Supabase/Firebase) and send a receipt email here.
  }

  // Always 200 so Paystack stops retrying.
  return res.status(200).send('OK');
};
