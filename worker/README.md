# STARGIRLS store worker

This folder contains the checkout backend for the custom STARGIRLS storefront and Stripe-to-Printful fulfillment.

## Required Cloudflare configuration

- KV binding: `STARGIRLS_PRODUCTS`
- Secret: `STRIPE_SECRET_KEY`
- Secret: `STRIPE_WEBHOOK_SECRET`
- Secret: `PRINTFUL_API_TOKEN`
- `ALLOWED_ORIGIN=https://stargirls.maison`
- `PUBLIC_SITE_URL=https://stargirls.maison/`
- `CATALOG_URL=https://stargirls.maison/content/products.json`
- `SUCCESS_URL=https://stargirls.maison/checkout-success.html`
- `CANCEL_URL=https://stargirls.maison/checkout-cancelled.html`

Optional:

- `PRINTFUL_CONFIRM_ORDERS=true` only after a draft fulfillment test has been verified. When absent or false, Printful orders are created as drafts.

Never commit Stripe or Printful secret values.

## Stripe webhook

Create a Stripe webhook endpoint pointing to:

`https://stargirls.stargirlswoo.workers.dev/stripe/webhook`

Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Copy Stripe's webhook signing secret into Cloudflare as the secret `STRIPE_WEBHOOK_SECRET`.

At checkout the Worker validates the selected Printful product, color, size, SKU, Sync Variant ID, and live retail price before creating Stripe Checkout. When Stripe confirms a paid Checkout Session, the Worker creates the corresponding Printful order and stores the fulfillment result in KV so webhook retries do not intentionally resubmit a completed order.

The storefront product feed is loaded from the Worker and contains only non-secret Printful catalog data needed for product selection and checkout validation.
