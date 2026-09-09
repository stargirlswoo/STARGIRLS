import { receiveStripeWebhook, getPrintfulCatalog } from "./stripe-fulfillment.js";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

function cors(origin, allowedOrigin) {
  const allow = allowedOrigin || origin || "*";
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}

function requireProductsKv(env) {
  const kv = env.STARGIRLS_PRODUCTS || env.APLIIQ_PRODUCTS;
  if (!kv) {
    throw new Error("STARGIRLS_PRODUCTS (or existing APLIIQ_PRODUCTS) KV binding is not configured");
  }
  return kv;
}

async function loadCatalog(env) {
  if (!env.CATALOG_URL) throw new Error("CATALOG_URL is not configured");
  const response = await fetch(env.CATALOG_URL, { cf: { cacheTtl: 60 } });
  if (!response.ok) throw new Error("Could not load product catalog");
  const data = await response.json();
  return Array.isArray(data.products) ? data.products : [];
}

function validateCart(requestedItems, catalog) {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    throw new Error("Cart is empty");
  }

  return requestedItems.map(item => {
    const product = catalog.find(entry => entry.id === item.id);
    const quantity = Number(item.quantity);

    if (!product || !product.available || typeof product.price !== "number") {
      throw new Error(`Product is not available: ${item.id}`);
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new Error(`Invalid quantity for: ${item.id}`);
    }

    let variant = null;
    if (Array.isArray(product.variants) && product.variants.length) {
      variant = product.variants.find(entry => entry.size === item.size);
      if (!variant || (item.sku && variant.sku && item.sku !== variant.sku)) {
        throw new Error(`Invalid variant for: ${item.id}`);
      }
    }

    return { product, variant, quantity };
  });
}

async function createStripeCheckout(items, env) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!env.SUCCESS_URL || !env.CANCEL_URL) throw new Error("Checkout return URLs are not configured");

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", env.SUCCESS_URL);
  body.set("cancel_url", env.CANCEL_URL);
  body.set("billing_address_collection", "auto");
  body.set("shipping_address_collection[allowed_countries][0]", "US");

  items.forEach(({ product, variant, quantity }, index) => {
    const cents = Math.round(product.price * 100);
    const sku = variant?.sku || product.sku || "";
    const size = variant?.size || "";
    const color = variant?.color || product.color || "";

    body.set(`line_items[${index}][quantity]`, String(quantity));
    body.set(`line_items[${index}][price_data][currency]`, "usd");
    body.set(`line_items[${index}][price_data][unit_amount]`, String(cents));
    body.set(`line_items[${index}][price_data][product_data][name]`, size ? `${product.name} — ${size}` : product.name);
    body.set(`line_items[${index}][price_data][product_data][metadata][stargirls_product_id]`, product.id);

    const configuredFulfillment = product.fulfillment || "stargirls";
    const fulfillment = configuredFulfillment === "apliiq" ? "printful" : configuredFulfillment;
    body.set(`line_items[${index}][price_data][product_data][metadata][fulfillment]`, fulfillment);

    const syncVariantId =
      variant?.printful_sync_variant_id ||
      variant?.printfulSyncVariantId ||
      product.printful_sync_variant_id ||
      product.printfulSyncVariantId ||
      "";

    if (syncVariantId) {
      body.set(`line_items[${index}][price_data][product_data][metadata][printful_sync_variant_id]`, String(syncVariantId));
    }
    if (sku) body.set(`line_items[${index}][price_data][product_data][metadata][sku]`, sku);
    if (size) body.set(`line_items[${index}][price_data][product_data][metadata][size]`, size);
    if (color) body.set(`line_items[${index}][price_data][product_data][metadata][color]`, color);

    if (product.image && env.PUBLIC_SITE_URL) {
      const imageUrl = new URL(product.image, env.PUBLIC_SITE_URL).toString();
      body.set(`line_items[${index}][price_data][product_data][images][0]`, imageUrl);
    }
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Stripe checkout error", data);
    throw new Error(data?.error?.message || "Could not create checkout session");
  }
  return data;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    const corsHeaders = cors(origin, env.ALLOWED_ORIGIN);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, fulfillment: "printful" }, 200, corsHeaders);
    }

    try {
      if (url.pathname === "/stripe/webhook" && request.method === "POST") {
        return await receiveStripeWebhook(request, env);
      }

      // Temporary, non-secret catalog discovery endpoint used to map the Printful
      // Sync Variant IDs. It never returns the API token or file URLs.
      if (url.pathname === "/printful/catalog" && request.method === "GET") {
        const catalog = await getPrintfulCatalog(env);
        return json(catalog, 200, corsHeaders);
      }

      if (url.pathname !== "/checkout" || request.method !== "POST") {
        return json({ error: "Not found" }, 404, corsHeaders);
      }

      if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) {
        return json({ error: "Origin not allowed" }, 403, corsHeaders);
      }

      // Ensure the KV binding is available before checkout so fulfillment
      // idempotency is guaranteed before taking an order.
      requireProductsKv(env);

      const payload = await request.json();
      const catalog = await loadCatalog(env);
      const validatedItems = validateCart(payload.items, catalog);
      const session = await createStripeCheckout(validatedItems, env);
      return json({ url: session.url }, 200, corsHeaders);
    } catch (error) {
      console.error("STARGIRLS store worker", error);
      return json({ error: error.message || "Request failed" }, 400, corsHeaders);
    }
  }
};
