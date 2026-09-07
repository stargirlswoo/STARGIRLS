import { receiveStripeWebhook } from "./stripe-fulfillment.js";

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
  if (!env.APLIIQ_PRODUCTS) {
    throw new Error("APLIIQ_PRODUCTS KV binding is not configured");
  }
  return env.APLIIQ_PRODUCTS;
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

    let variant = null;
    if (Array.isArray(product.variants) && product.variants.length) {
      variant = product.variants.find(entry => entry.size === item.size);
      if (!variant || !variant.sku || (item.sku && item.sku !== variant.sku)) {
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

    body.set(`line_items[${index}][quantity]`, String(quantity));
    body.set(`line_items[${index}][price_data][currency]`, "usd");
    body.set(`line_items[${index}][price_data][unit_amount]`, String(cents));
    body.set(`line_items[${index}][price_data][product_data][name]`, size ? `${product.name} — ${size}` : product.name);
    body.set(`line_items[${index}][price_data][product_data][metadata][stargirls_product_id]`, product.id);
    body.set(`line_items[${index}][price_data][product_data][metadata][fulfillment]`, product.fulfillment || "stargirls");
    if (sku) body.set(`line_items[${index}][price_data][product_data][metadata][sku]`, sku);
    if (size) body.set(`line_items[${index}][price_data][product_data][metadata][size]`, size);

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

function compactProduct(payload, id) {
  const imageUrls = Array.isArray(payload.imageUrls) ? payload.imageUrls.filter(Boolean) : [];
  return {
    store_ProductId: id,
    name: String(payload.name || "Apliiq product"),
    imageUrls
  };
}

function normalizeApliiqProductPayload(rawPayload) {
  const candidates = [
    rawPayload,
    rawPayload?.product,
    rawPayload?.data,
    rawPayload?.productData,
    rawPayload?.product_data
  ].filter(candidate => candidate && typeof candidate === "object" && !Array.isArray(candidate));

  const productPayload = candidates.find(candidate =>
    candidate.name || candidate.title || candidate.productName || candidate.product_name
  ) || candidates[0] || {};

  const name = productPayload.name
    || productPayload.title
    || productPayload.productName
    || productPayload.product_name
    || rawPayload?.name
    || rawPayload?.title
    || "Apliiq product";

  return {
    ...rawPayload,
    ...productPayload,
    name: String(name)
  };
}

async function saveApliiqProduct(request, env) {
  const kv = requireProductsKv(env);
  const rawPayload = await request.json();
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return json({
      storeProductId: null,
      stepsCompleted: [],
      hasError: true,
      errorMessages: ["Invalid product payload"]
    }, 400);
  }

  const payload = normalizeApliiqProductPayload(rawPayload);
  const requestedIdValue = payload.store_ProductId ?? payload.storeProductId;
  const requestedId = requestedIdValue ? String(requestedIdValue) : "";
  const id = requestedId || `apliiq-${crypto.randomUUID()}`;
  const record = {
    ...payload,
    store_ProductId: id,
    stargirlsReceivedAt: new Date().toISOString()
  };

  await kv.put(`product:${id}`, JSON.stringify(record));
  return json({
    storeProductId: id,
    stepsCompleted: ["DraftCreated", "InventoryCreated", "ImagesUploaded", "Completed"],
    hasError: false,
    errorMessages: []
  });
}

async function searchApliiqProducts(url, env) {
  const kv = requireProductsKv(env);
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();
  const results = [];
  let cursor;

  do {
    const page = await kv.list({ prefix: "product:", cursor, limit: 100 });
    for (const key of page.keys) {
      const record = await kv.get(key.name, "json");
      if (!record) continue;
      const haystack = [record.name, record.type, record.store_ProductId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!search || haystack.includes(search)) {
        results.push(compactProduct(record, String(record.store_ProductId || key.name.slice(8))));
      }
      if (results.length >= 50) return json(results);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return json(results);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function hmacBase64(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  let binary = "";
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function verifyApliiqHmac(request, env, rawBody) {
  if (!env.APLIIQ_SHARED_SECRET) return false;
  const received = request.headers.get("x-apliiq-hmac") || "";
  if (!received) return false;
  const payloadBase64 = bytesToBase64(new TextEncoder().encode(rawBody));
  const expected = await hmacBase64(payloadBase64, env.APLIIQ_SHARED_SECRET);
  return timingSafeEqual(received, expected);
}

async function receiveFulfillment(request, env) {
  const rawBody = await request.text();
  if (!(await verifyApliiqHmac(request, env, rawBody))) {
    return json({ error: "Invalid Apliiq signature" }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const orderId = payload?.fulfillment?.order_id;
  if (!orderId) return json({ error: "Missing fulfillment.order_id" }, 400);

  const kv = requireProductsKv(env);
  await kv.put(`fulfillment:${orderId}:${Date.now()}`, JSON.stringify({
    ...payload,
    stargirlsReceivedAt: new Date().toISOString()
  }));

  return json({ ok: true });
}

async function receiveWarehouseShipment(request, env) {
  if (!env.APLIIQ_APP_ID) return json({ error: "APLIIQ_APP_ID is not configured" }, 503);
  const receivedAppId = request.headers.get("x-apliiq-appId") || "";
  if (!timingSafeEqual(receivedAppId, env.APLIIQ_APP_ID)) {
    return json({ error: "Invalid Apliiq app id" }, 401);
  }

  const payload = await request.json();
  if (!Array.isArray(payload)) return json({ error: "Expected shipment array" }, 400);

  const kv = requireProductsKv(env);
  await kv.put(`warehouse-shipment:${Date.now()}:${crypto.randomUUID()}`, JSON.stringify({
    shipments: payload,
    stargirlsReceivedAt: new Date().toISOString()
  }));

  return json({ ok: true, received: payload.length });
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
      return json({ ok: true }, 200, corsHeaders);
    }

    try {
      if (url.pathname === "/stripe/webhook" && request.method === "POST") {
        return await receiveStripeWebhook(request, env);
      }

      if (url.pathname === "/apliiq/product" && request.method === "POST") {
        return await saveApliiqProduct(request, env);
      }

      if (url.pathname === "/apliiq/product-search" && request.method === "GET") {
        return await searchApliiqProducts(url, env);
      }

      if (url.pathname === "/apliiq/fulfillment" && request.method === "POST") {
        return await receiveFulfillment(request, env);
      }

      if (url.pathname === "/apliiq/warehouse-shipment-complete" && request.method === "POST") {
        return await receiveWarehouseShipment(request, env);
      }

      if (url.pathname !== "/checkout" || request.method !== "POST") {
        return json({ error: "Not found" }, 404, corsHeaders);
      }

      if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) {
        return json({ error: "Origin not allowed" }, 403, corsHeaders);
      }

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
