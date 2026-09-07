# Stripe test-mode fulfillment guard

Stripe webhook events with `livemode: false` are acknowledged after signature verification but before any Stripe fulfillment lookup or Apliiq order creation. This is required because Apliiq has no sandbox and test payments must never create production fulfillment orders.
