# STARGIRLS checkout worker

This folder contains the checkout backend scaffold for the custom storefront.

The frontend stays safe by default: checkout is disabled until `window.STARGIRLS_STORE_API` is set in `store-config.js`.

When deploying the Worker:

1. Copy `wrangler.toml.example` to `wrangler.toml`.
2. Set the Worker secret `STRIPE_SECRET_KEY` in Cloudflare. Never commit it.
3. Deploy the Worker.
4. Put the deployed Worker URL into `store-config.js`.
5. Switch products in `content/products.json` to `available: true` only after their real price and fulfillment details are final.

The Worker reloads the public product catalog server-side and rejects unavailable products, so customers cannot alter prices in their browser and submit fake amounts.

Apliiq fulfillment and self-fulfilled China inventory routing are intentionally not connected yet. Those should be added after the actual SKUs and fulfillment ownership are final.