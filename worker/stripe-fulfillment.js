function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacBytes(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

function parseStripeSignature(header) {
  const pairs = String(header || "").split(",").map(part => part.trim().split("="));
  const timestamp = pairs.find(([key]) => key === "t")?.[1] || "";
  const signatures = pairs.filter(([key]) => key === "v1").map(([, value]) => value);
  return { timestamp, signatures };
}

async function verifyStripeWebhook(rawBody, signatureHeader, secret) {
  if (!secret) return false;
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  if (!timestamp || !signatures.length) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = bytesToHex(await hmacBytes(`${timestamp}.${rawBody}`, secret));
  return signatures.some(signature => timingSafeEqual(signature, expected));
}

async function stripeGet(path, env, params = {}) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");

  const url = new URL(`https://api.stripe.com${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach(item => url.searchParams.append(key, item));
    else if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
  });
  const data = await response.json();

  if (!response.ok) {
    console.error("Stripe API error", data);
    throw new Error("Could not load Stripe checkout details");
  }
  return data;
}

function requireProductsKv(env) {
  const kv = env.STARGIRLS_PRODUCTS || env.APLIIQ_PRODUCTS;
  if (!kv) {
    throw new Error("STARGIRLS_PRODUCTS (or existing APLIIQ_PRODUCTS) KV binding is not configured");
  }
  return kv;
}

function printfulHeaders(env, includeJson = true) {
  if (!env.PRINTFUL_API_TOKEN) throw new Error("PRINTFUL_API_TOKEN is not configured");

  const headers = {
    Authorization: `Bearer ${env.PRINTFUL_API_TOKEN}`,
    Accept: "application/json"
  };
  if (includeJson) headers["Content-Type"] = "application/json";
  if (env.PRINTFUL_STORE_ID) headers["X-PF-Store-Id"] = String(env.PRINTFUL_STORE_ID);
  return headers;
}

async function printfulRequest(path, env, options = {}) {
  const response = await fetch(`https://api.printful.com${path}`, {
    ...options,
    headers: {
      ...printfulHeaders(env, options.body !== undefined),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || Number(data?.code || response.status) >= 400) {
    console.error("Printful API error", path, response.status, data);
    const message = data?.result || data?.error?.message || data?.message;
    throw new Error(typeof message === "string" ? message : `Printful request failed (${response.status})`);
  }
  return data;
}

export async function getPrintfulCatalog(env) {
  const products = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const page = await printfulRequest(`/store/products?offset=${offset}&limit=${limit}`, env, { method: "GET" });
    const batch = Array.isArray(page?.result) ? page.result : [];

    for (const product of batch) {
      const details = await printfulRequest(`/store/products/${encodeURIComponent(product.id)}`, env, { method: "GET" });
      const syncProduct = details?.result?.sync_product || product || {};
      const variants = Array.isArray(details?.result?.sync_variants)
        ? details.result.sync_variants
        : [];

      products.push({
        id: product.id,
        external_id: product.external_id || null,
        name: product.name || "",
        thumbnail_url: syncProduct.thumbnail_url || product.thumbnail_url || null,
        variants: variants.map(variant => ({
          sync_variant_id: variant.id,
          external_id: variant.external_id || null,
          name: variant.name || "",
          sku: variant.sku || "",
          catalog_variant_id: variant.variant_id || null,
          retail_price: variant.retail_price || null,
          synced: variant.synced !== false,
          availability_status: variant.availability_status || null,
          product: variant.product || null,
          files: Array.isArray(variant.files)
            ? variant.files.filter(file => file && file.preview_url).map(file => ({ preview_url: file.preview_url, type: file.type || null }))
            : []
        }))
      });
    }

    const total = Number(page?.paging?.total || batch.length);
    offset += batch.length;
    if (!batch.length || offset >= total) break;
  }

  return { products };
}

function printfulAddress(shippingDetails, customerDetails) {
  const details = shippingDetails || {};
  const address = details.address || customerDetails?.address || {};
  const name = details.name || customerDetails?.name || "";
  const phone = details.phone || customerDetails?.phone || "";
  const email = customerDetails?.email || "";
  const countryCode = String(address.country || "US").toUpperCase();

  if (!name || !address.line1 || !address.city || !address.postal_code || !address.state) {
    throw new Error("Stripe checkout is missing a complete shipping address");
  }

  return {
    name,
    address1: address.line1,
    address2: address.line2 || "",
    city: address.city,
    state_code: address.state,
    country_code: countryCode,
    zip: address.postal_code,
    phone,
    email
  };
}

function parsePrintfulVariantMap(env) {
  if (!env.PRINTFUL_VARIANT_MAP) return {};
  try {
    const parsed = typeof env.PRINTFUL_VARIANT_MAP === "string"
      ? JSON.parse(env.PRINTFUL_VARIANT_MAP)
      : env.PRINTFUL_VARIANT_MAP;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    throw new Error("PRINTFUL_VARIANT_MAP must be valid JSON");
  }
}

async function findPrintfulSyncVariantBySku(sku, env) {
  if (!sku) return null;
  const catalog = await getPrintfulCatalog(env);
  const matches = [];

  for (const product of catalog.products) {
    for (const variant of product.variants) {
      if (String(variant.sku || "") === String(sku)) matches.push(variant);
    }
  }

  if (matches.length > 1) {
    throw new Error(`More than one Printful Sync Variant uses SKU ${sku}; add an exact mapping`);
  }
  return matches[0]?.sync_variant_id ? Number(matches[0].sync_variant_id) : null;
}

async function resolvePrintfulSyncVariant(item, env) {
  const product = item.price?.product;
  const metadata = product?.metadata || {};

  const directId = Number(metadata.printful_sync_variant_id || 0);
  if (Number.isInteger(directId) && directId > 0) return directId;

  const map = parsePrintfulVariantMap(env);
  const productId = String(metadata.stargirls_product_id || "").trim();
  const size = String(metadata.size || "").trim();
  const color = String(metadata.color || "").trim();
  const sku = String(metadata.sku || "").trim();

  const keys = [
    sku,
    productId && color && size ? `${productId}:${color}:${size}` : "",
    productId && size ? `${productId}:${size}` : "",
    color && size ? `${color}:${size}` : ""
  ].filter(Boolean);

  for (const key of keys) {
    const mapped = Number(map[key] || 0);
    if (Number.isInteger(mapped) && mapped > 0) return mapped;
  }

  const bySku = await findPrintfulSyncVariantBySku(sku, env);
  if (bySku) return bySku;

  throw new Error(
    `No Printful Sync Variant mapping for ${productId || product?.name || "item"}`
    + `${color ? ` / ${color}` : ""}${size ? ` / ${size}` : ""}${sku ? ` / SKU ${sku}` : ""}`
  );
}

async function createPrintfulOrder(payload, env) {
  const confirm = String(env.PRINTFUL_CONFIRM_ORDERS || "").toLowerCase() === "true";

  const data = await printfulRequest(
    `/orders?confirm=${confirm ? "true" : "false"}&update_existing=true`,
    env,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
  return data?.result || data;
}

async function fulfillStripeSession(session, env) {
  const kv = requireProductsKv(env);
  const key = `stripe-fulfillment:${session.id}`;
  const existing = await kv.get(key, "json");

  if (existing?.status === "completed") return existing;

  await kv.put(key, JSON.stringify({
    status: "processing",
    stripeEventAt: new Date().toISOString()
  }), { expirationTtl: 60 * 60 * 24 * 365 });

  const [fullSession, lineItems] = await Promise.all([
    stripeGet(`/v1/checkout/sessions/${encodeURIComponent(session.id)}`, env),
    stripeGet(`/v1/checkout/sessions/${encodeURIComponent(session.id)}/line_items`, env, {
      limit: 100,
      "expand[]": ["data.price.product"]
    })
  ]);

  const printfulItems = (lineItems.data || []).filter(item => {
    const product = item.price?.product;
    return product && typeof product === "object" && product.metadata?.fulfillment === "printful";
  });

  if (!printfulItems.length) {
    const result = { status: "completed", skipped: true, reason: "No Printful items" };
    await kv.put(key, JSON.stringify(result), { expirationTtl: 60 * 60 * 24 * 365 });
    return result;
  }

  const shippingDetails =
    fullSession.collected_information?.shipping_details ||
    fullSession.shipping_details ||
    null;
  const customerDetails = fullSession.customer_details || null;
  const recipient = printfulAddress(shippingDetails, customerDetails);

  const items = await Promise.all(printfulItems.map(async item => ({
    sync_variant_id: await resolvePrintfulSyncVariant(item, env),
    quantity: item.quantity || 1,
    retail_price: (
      (item.amount_total || item.amount_subtotal || 0) /
      100 /
      Math.max(item.quantity || 1, 1)
    ).toFixed(2)
  })));

  const payload = {
    external_id: `stripe-${session.id}`,
    shipping: "STANDARD",
    recipient,
    items
  };

  const printfulResponse = await createPrintfulOrder(payload, env);
  const result = {
    status: "completed",
    stripeSessionId: session.id,
    printfulOrderId: printfulResponse?.id || null,
    printfulOrderStatus: printfulResponse?.status || null,
    confirmedForFulfillment:
      String(env.PRINTFUL_CONFIRM_ORDERS || "").toLowerCase() === "true",
    completedAt: new Date().toISOString()
  };

  await kv.put(key, JSON.stringify(result), { expirationTtl: 60 * 60 * 24 * 365 });
  return result;
}

export async function receiveStripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Stripe webhook secret is not configured" }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("stripe-signature") || "";

  if (!(await verifyStripeWebhook(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET))) {
    return new Response(JSON.stringify({ error: "Invalid Stripe signature" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  if (event.livemode === false) {
    return new Response(JSON.stringify({
      received: true,
      testMode: true,
      fulfillmentSkipped: true
    }), {
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    return new Response(JSON.stringify({ received: true, ignored: event.type }), {
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  const session = event.data?.object;
  if (!session?.id) {
    return new Response(JSON.stringify({ error: "Missing checkout session" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  if (event.type === "checkout.session.completed" && session.payment_status !== "paid") {
    return new Response(JSON.stringify({ received: true, waitingForPayment: true }), {
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  try {
    const result = await fulfillStripeSession(session, env);
    return new Response(JSON.stringify({ received: true, fulfillment: result }), {
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  } catch (error) {
    console.error("Printful fulfillment error", error);
    return new Response(JSON.stringify({
      received: true,
      fulfillmentError: error.message || "Printful fulfillment failed"
    }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
}
