const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send({ message: 'Only POST requests allowed' });
    return;
  }

  try {
    const { plan, accountCount, uid, email } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let line_items = [];
    let priceData = {};

    if (plan === 'per_account') {
      priceData = {
        currency: 'usd',
        product_data: {
          name: 'Pro - Per Account',
          description: 'Manage multiple accounts ($1/account/mo)'
        },
        unit_amount: 100, // $1.00
        recurring: { interval: 'month' }
      };

      line_items.push({
        price_data: priceData,
        quantity: accountCount > 0 ? accountCount : 1,
      });
    } else if (plan === 'unlimited') {
      priceData = {
        currency: 'usd',
        product_data: {
          name: 'Pro - Unlimited',
          description: 'Unlimited accounts and checks'
        },
        unit_amount: 500, // $5.00
        recurring: { interval: 'month' }
      };

      line_items.push({
        price_data: priceData,
        quantity: 1,
      });
    } else {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items,
      success_url: `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      client_reference_id: uid,
      customer_email: email,
      // IMPORTANT: Set metadata on SESSION level so verify-checkout can read it
      metadata: {
        plan: plan,
        uid: uid
      },
      subscription_data: {
        trial_period_days: 60,
        metadata: {
          plan: plan
        }
      }
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe API Error:', error);
    res.status(500).json({ error: error.message });
  }
};
