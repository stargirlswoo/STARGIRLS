# STARGIRLS store worker

This folder contains the checkout backend scaffold for the custom storefront plus the Apliiq custom-store callback endpoints.

The frontend stays safe by default: checkout is disabled until `window.STARGIRLS_STORE_API` is set in `store-config.js`.

## Deploy

1. Copy `wrangler.toml.example` to `wrangler.toml`.
2. Create a Cloudflare KV namespace and bind it as `APLIIQ_PRODUCTS`.
3. Set the Worker secret `STRIPE_SECRET_KEY` in Cloudflare.
4. Set the Worker secret `APLIIQ_SHARED_SECRET` in Cloudflare. Never commit it.
5. Put your Apliiq app ID into the Worker environment as `APLIIQ_APP_ID`.
6. Deploy the Worker.
7. Put the deployed Worker URL into `store-config.js`.
8. Switch products in `content/products.json` to `available: true` only after their real price and fulfillment details are final.

The Worker reloads the public product catalog server-side and rejects unavailable products, so customers cannot alter prices in their browser and submit fake amounts.

## Apliiq custom-store callback URLs

After deployment, replace `https://YOUR-WORKER-HOST` with the real Worker hostname and enter these in Apliiq Stores > Custom Store callbacks:

- Add product to store URL: `https://YOUR-WORKER-HOST/apliiq/product`
- Product search URL: `https://YOUR-WORKER-HOST/apliiq/product-search`
- Fulfillment URL: `https://YOUR-WORKER-HOST/apliiq/fulfillment`
- Warehouse shipment complete URL: `https://YOUR-WORKER-HOST/apliiq/warehouse-shipment-complete`

The product webhook stores Apliiq's payload in KV and returns Apliiq's expected custom-store response. Product search reads those stored records. Fulfillment callbacks are HMAC-verified with `APLIIQ_SHARED_SECRET`. Warehouse-complete callbacks require the matching `x-apliiq-appId` value.

Stripe-to-Apliiq automatic order submission is still a separate step. Do not mark POD products as live until the Stripe webhook and Apliiq Create Order flow are connected and tested.
