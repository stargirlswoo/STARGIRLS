# Checkout security

The browser never decides the final charge amount. The Worker reloads the public catalog and verifies that each requested product is available and has a server-side price before creating the Stripe Checkout Session.

Never commit `STRIPE_SECRET_KEY` or any Apliiq shared secret. Keep all fulfillment credentials in backend secrets only.
