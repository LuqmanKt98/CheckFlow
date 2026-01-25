const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    const { session_id } = req.query;

    if (!session_id) {
        return res.status(400).json({ error: 'Missing session_id' });
    }

    try {
        // Retrieve the session with expanded subscription
        const session = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ['subscription']
        });

        console.log('Session retrieved:', {
            id: session.id,
            status: session.status,
            payment_status: session.payment_status,
            metadata: session.metadata,
            client_reference_id: session.client_reference_id
        });

        // Check if checkout was completed (status 'complete' for paid, 'open' for trial without payment)
        if (session.status === 'complete' || session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
            // Get plan from session metadata (preferred) or subscription metadata (fallback)
            let plan = session.metadata?.plan;

            if (!plan && session.subscription && typeof session.subscription === 'object') {
                plan = session.subscription.metadata?.plan;
            }

            // If still no plan, try to infer from product name
            if (!plan) {
                plan = 'unlimited'; // Default fallback
            }

            const uid = session.client_reference_id || session.metadata?.uid;

            // Determine status based on subscription state
            let status = 'active';
            if (session.subscription && typeof session.subscription === 'object') {
                if (session.subscription.status === 'trialing') {
                    status = 'trialing';
                } else if (session.subscription.status === 'active') {
                    status = 'active';
                }
            }

            return res.status(200).json({
                verified: true,
                plan: plan,
                status: status,
                uid: uid,
                subscriptionId: session.subscription?.id || session.subscription
            });
        } else {
            return res.status(400).json({
                verified: false,
                error: 'Checkout not completed',
                sessionStatus: session.status,
                paymentStatus: session.payment_status
            });
        }
    } catch (error) {
        console.error('Verify Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
