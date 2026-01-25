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

        // Get the subscription to find the customer
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = subscription.customer;

        if (!customerId) {
            return res.status(400).json({ error: 'No customer found for this subscription' });
        }

        // Create a billing portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: req.headers.origin || 'https://project-eight-ashen-87.vercel.app/',
        });

        res.status(200).json({ url: portalSession.url });
    } catch (error) {
        console.error('Billing Portal Error:', error);
        res.status(500).json({ error: error.message });
    }
};
