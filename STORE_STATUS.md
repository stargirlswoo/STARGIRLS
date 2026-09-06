# STARGIRLS storefront status

## Built
- Shop-first homepage direction
- Unified shop catalog
- Category filters
- Data-driven product source in `content/products.json`
- Cart drawer with local persistence
- Quantity controls and subtotal calculation
- Checkout frontend integration point
- Cloudflare Worker Stripe Checkout scaffold
- Checkout success and cancellation pages
- Confirmed social/community links in the storefront footer

## Intentionally not live yet
- Real product prices
- Real sizes / variants
- Apliiq SKUs
- China inventory SKUs
- Stripe secret key
- Deployed Worker URL
- Apliiq fulfillment routing
- Self-fulfilled inventory decrement

Products remain `available: false` until real launch data is ready. This prevents fake or premature checkout.
