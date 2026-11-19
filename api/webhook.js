// Paystack Webhook - receives payment events
// Add this URL in Paystack Dashboard > Settings > API Keys & Webhooks:
// https://YOUR-DOMAIN.vercel.app/api/webhook
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  // Verify the request really came from Paystack (HMAC SHA512 of the raw body)
  const signature = req.headers['x-paystack-signature'];
  const raw = JSON.stringify(req.body || {});
  const secret = process.env.PAYSTACK_LIVE_SECRET || process.env.PAYSTACK_TEST_SECRET;

  if (!secret || !signature) return res.status(401).send('Unauthorized');

  const hash = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  // Use timing-safe comparison when both are 64-char hex strings
  let valid = false;
  if (hash.length === signature.length) {
    try { valid = crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature)); } catch (e) { valid = false; }
  }
  if (!valid) return res.status(401).send('Invalid signature');

  const event = req.body;
  if (event.event === 'charge.success') {
    const tx = event.data;
    // Payment confirmed. Log the order (visible in Vercel Function logs).
    console.log('ORDER PAID', {
      reference: tx.reference,
      amount: tx.amount / 100,
      email: tx.customer?.email,
      name: tx.metadata?.customer_name,
      items: tx.metadata?.order_items
    });
    // TODO: save to Supabase/Firebase and send confirmation email here.
  }

  // Always respond 200 so Paystack stops retrying
  return res.status(200).send('OK');
};
