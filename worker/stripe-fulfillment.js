function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
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

async function hmacBase64(message, secret) {
  return bytesToBase64(await hmacBytes(message, secret));
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

async function stableNumericId(value) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)))
  );
  return Number.parseInt(bytesToHex(digest.slice(0, 6)), 16);
}

function splitName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: "Customer", last_name: "Customer" };
  if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] };
  return { first_name: parts.slice(0, -1).join(" "), last_name: parts.at(-1) };
}

function apliIqAddress(shippingDetails, customerDetails) {
  const details = shippingDetails || {};
  const address = details.address || customerDetails?.address || {};
  const name = details.name || customerDetails?.name || "";
  const phone = details.phone || customerDetails?.phone || "";
  const names = splitName(name);
  const countryCode = String(address.country || "US").toUpperCase();

  if (!address.line1 || !address.city || !address.postal_code || !address.state) {
    throw new Error("Stripe checkout is missing a complete shipping address");
  }

  return {
    ...names,
    address1: address.line1,
    address2: address.line2 || "",
    phone,
    city: address.city,
    zip: address.postal_code,
    province: address.state,
    province_code: countryCode === "US" ? address.state : (address.state || ""),
    country: countryCode === "US" ? "United States" : countryCode,
    country_code: countryCode,
    name
  };
}

async function createApliiqOrder(payload, env) {
  if (!env.APLIIQ_APP_ID || !env.APLIIQ_SHARED_SECRET) {
    throw new Error("Apliiq API credentials are not configured");
  }

  const body = JSON.stringify(payload);
  const rts = String(Math.floor(Date.now() / 1000));
  const state = crypto.randomUUID().replaceAll("-", "").toLowerCase();
  const contentBase64 = bytesToBase64(new TextEncoder().encode(body));
  const signature = await hmacBase64(
    `${env.APLIIQ_APP_ID}${rts}${state}${contentBase64}`,
    env.APLIIQ_SHARED_SECRET
  );

  const response = await fetch("https://api.apliiq.com/v1/Order", {
    method: "POST",
    headers: {
      Authorization: `x-apliiq-auth ${rts}:${signature}:${env.APLIIQ_APP_ID}:${state}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body
  });

  const data = await response.json().catch(() => ({}));
  if (response.status !== 200) {
    console.error("Apliiq create order error", response.status, data);
    throw new Error(data?.message || `Apliiq order was not processed (${response.status})`);
  }
  return data;
}

async function fulfillStripeSession(session, env) {
  if (!env.APLIIQ_PRODUCTS) throw new Error("APLIIQ_PRODUCTS KV binding is not configured");
  const kv = env.APLIIQ_PRODUCTS;
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

  const apliIqItems = (lineItems.data || []).filter(item => {
    const product = item.price?.product;
    return product && typeof product === "object" && product.metadata?.fulfillment === "apliiq";
  });

  if (!apliIqItems.length) {
    const result = { status: "completed", skipped: true, reason: "No Apliiq items" };
    await kv.put(key, JSON.stringify(result), { expirationTtl: 60 * 60 * 24 * 365 });
    return result;
  }

  const shippingDetails =
    fullSession.collected_information?.shipping_details ||
    fullSession.shipping_details ||
    null;
  const customerDetails = fullSession.customer_details || null;
  const shippingAddress = apliIqAddress(shippingDetails, customerDetails);
  const orderId = await stableNumericId(session.id);
  const friendlyName = `#SG-${session.id.slice(-8).toUpperCase()}`;

  const payload = {
    id: orderId,
    number: orderId,
    name: friendlyName,
    order_number: orderId,
    line_items: await Promise.all(apliIqItems.map(async item => {
      const product = item.price.product;
      const sku = product.metadata?.sku || "";
      if (!sku) throw new Error(`Missing Apliiq SKU for Stripe line item ${item.id}`);
      return {
        id: String(await stableNumericId(item.id)),
        title: product.name || item.description || "STARGIRLS item",
        name: product.name || item.description || "STARGIRLS item",
        quantity: item.quantity || 1,
        price: ((item.amount_total || item.amount_subtotal || 0) / 100 / Math.max(item.quantity || 1, 1)).toFixed(2),
        grams: 0,
        sku
      };
    })),
    billing_address: shippingAddress,
    shipping_address: shippingAddress,
    shipping_lines: [{ code: "standard" }]
  };

  const apliIqResponse = await createApliiqOrder(payload, env);
  const result = {
    status: "completed",
    stripeSessionId: session.id,
    apliIqOrderId: apliIqResponse?.id || null,
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

  const result = await fulfillStripeSession(session, env);
  return new Response(JSON.stringify({ received: true, fulfillment: result }), {
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
