# STARGIRLS store worker

This folder contains the checkout backend for the custom storefront, Apliiq custom-store callbacks, and automatic Stripe-to-Apliiq fulfillment.

## Required Cloudflare configuration

- KV binding: `APLIIQ_PRODUCTS`
- Secret: `STRIPE_SECRET_KEY`
- Secret: `STRIPE_WEBHOOK_SECRET`
- Secret: `APLIIQ_SHARED_SECRET`
- Variable: `APLIIQ_APP_ID`
- `ALLOWED_ORIGIN=https://stargirls.maison`
- `PUBLIC_SITE_URL=https://stargirls.maison/`
- `CATALOG_URL=https://stargirls.maison/content/products.json`
- `SUCCESS_URL=https://stargirls.maison/checkout-success.html`
- `CANCEL_URL=https://stargirls.maison/checkout-cancelled.html`

Never commit Stripe or Apliiq secret values.

## Apliiq custom-store callbacks

- Add product to store: `https://stargirls.stargirlswoo.workers.dev/apliiq/product`
- Product search: `https://stargirls.stargirlswoo.workers.dev/apliiq/product-search?search=`
- Fulfillment: `https://stargirls.stargirlswoo.workers.dev/apliiq/fulfillment`
- Warehouse shipment complete: `https://stargirls.stargirlswoo.workers.dev/apliiq/warehouse-shipment-complete`

## Stripe webhook

Create a Stripe webhook endpoint pointing to:

`https://stargirls.stargirlswoo.workers.dev/stripe/webhook`

Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Copy Stripe's webhook signing secret into Cloudflare as the secret `STRIPE_WEBHOOK_SECRET`.

At checkout the Worker validates product prices and variants against the public catalog, then puts product ID, fulfillment owner, size, and Apliiq SKU into server-created Stripe product metadata. When Stripe confirms a paid Checkout Session, the Worker retrieves the paid line items, sends only `fulfillment: "apliiq"` items to Apliiq's Create Order API, and stores the fulfillment result in KV so retries do not intentionally resubmit a completed order.

Keep products `available: false` until their real retail price is set and the Stripe webhook has been configured and tested. Apliiq does not provide a sandbox, so the first end-to-end order test must use a real payment and then be cancelled if desired.
