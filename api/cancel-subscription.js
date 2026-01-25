const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { subscriptionId, uid } = req.body;

        if (!subscriptionId) {
            return res.status(400).json({ error: 'Subscription ID is required' });
        }

        // Cancel the subscription at period end (user keeps access until billing period ends)
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
        });

        res.status(200).json({
            success: true,
            message: 'Subscription will be canceled at the end of the billing period',
            cancelAt: subscription.cancel_at,
            currentPeriodEnd: subscription.current_period_end
        });
    } catch (error) {
        console.error('Cancel Subscription Error:', error);
        res.status(500).json({ error: error.message });
    }
};
