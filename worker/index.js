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
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}

async function loadCatalog(env) {
  if (!env.CATALOG_URL) {
    throw new Error("CATALOG_URL is not configured");
  }

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

    return { product, quantity };
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

  items.forEach(({ product, quantity }, index) => {
    const cents = Math.round(product.price * 100);
    body.set(`line_items[${index}][quantity]`, String(quantity));
    body.set(`line_items[${index}][price_data][currency]`, "usd");
    body.set(`line_items[${index}][price_data][unit_amount]`, String(cents));
    body.set(`line_items[${index}][price_data][product_data][name]`, product.name);
    body.set(`line_items[${index}][price_data][product_data][metadata][stargirls_product_id]`, product.id);
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
    throw new Error("Could not create checkout session");
  }

  return data;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    const corsHeaders = cors(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true }, 200, corsHeaders);
    }

    if (url.pathname !== "/checkout" || request.method !== "POST") {
      return json({ error: "Not found" }, 404, corsHeaders);
    }

    if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) {
      return json({ error: "Origin not allowed" }, 403, corsHeaders);
    }

    try {
      const payload = await request.json();
      const catalog = await loadCatalog(env);
      const validatedItems = validateCart(payload.items, catalog);
      const session = await createStripeCheckout(validatedItems, env);
      return json({ url: session.url }, 200, corsHeaders);
    } catch (error) {
      console.error("STARGIRLS checkout worker", error);
      return json({ error: error.message || "Checkout failed" }, 400, corsHeaders);
    }
  }
};
