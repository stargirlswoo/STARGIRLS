import { receiveStripeWebhook, getPrintfulCatalog } from "./stripe-fulfillment.js";
import { getPublicPrintfulCatalog } from "./catalog-public.js";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
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
  if (!env.STARGIRLS_PRODUCTS) throw new Error("STARGIRLS_PRODUCTS KV binding is not configured");
  return env.STARGIRLS_PRODUCTS;
}

async function loadCatalog(env) {
  if (!env.CATALOG_URL) throw new Error("CATALOG_URL is not configured");
  const response = await fetch(env.CATALOG_URL, { cf: { cacheTtl: 60 } });
  if (!response.ok) throw new Error("Could not load product catalog");
  const data = await response.json();
  return Array.isArray(data.products) ? data.products : [];
}

function parsedVariant(variant) {
  const parts = String(variant.name || "").split(" / ").map(part => part.trim()).filter(Boolean);
  const explicitSize = String(variant.size || "").trim();
  const explicitColor = String(variant.color || "").trim();
  const size = explicitSize || (parts.length >= 3 ? parts.at(-1) : "One Size");
  const color = explicitColor || (parts.length >= 3 ? parts.at(-2) : parts.length === 2 ? parts.at(-1) : "Default");
  const price = Number(variant.retail_price);
  return {
    ...variant,
    size,
    color,
    price: Number.isFinite(price) ? price : null,
    printful_sync_variant_id: Number(variant.sync_variant_id || 0)
  };
}

function mergePrintfulProduct(product, printfulCatalog) {
  if (!product.printful_product_id) return product;
  const source = (printfulCatalog.products || []).find(entry => Number(entry.id) === Number(product.printful_product_id));
  if (!source) throw new Error(`Printful product not found: ${product.name}`);
  const variants = (source.variants || [])
    .filter(v => v.synced !== false && v.availability_status !== "inactive")
    .map(parsedVariant)
    .filter(v => v.size && v.color && v.sku && v.printful_sync_variant_id > 0);
  if (!variants.length) throw new Error(`No active Printful variants: ${product.name}`);
  return { ...product, name: source.name || product.name, image: source.thumbnail_url || product.image || "", variants };
}

function dynamicPrintfulProduct(itemId, printfulCatalog) {
  const match = /^printful-(\d+)$/.exec(String(itemId || ""));
  if (!match) return null;
  const printfulId = Number(match[1]);
  const source = (printfulCatalog.products || []).find(entry => Number(entry.id) === printfulId);
  if (!source) return null;
  return {
    id: `printful-${printfulId}`,
    name: source.name || "STARGIRLS PIECE",
    category: "fashion",
    status: "AVAILABLE",
    available: true,
    fulfillment: "printful",
    printful_product_id: printfulId,
    price_mode: "printful",
    image: source.thumbnail_url || ""
  };
}

function validateCart(requestedItems, catalog, printfulCatalog) {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) throw new Error("Cart is empty");

  return requestedItems.map(item => {
    const baseProduct = catalog.find(entry => entry.id === item.id) || dynamicPrintfulProduct(item.id, printfulCatalog);
    if (!baseProduct || !baseProduct.available) throw new Error(`Product is not available: ${item.id}`);
    const product = mergePrintfulProduct(baseProduct, printfulCatalog);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error(`Invalid quantity for: ${item.id}`);

    let variant = null;
    if (Array.isArray(product.variants) && product.variants.length) {
      const requestedSyncId = Number(item.printful_sync_variant_id || item.syncVariantId || 0);
      variant = product.variants.find(entry =>
        (requestedSyncId > 0 && entry.printful_sync_variant_id === requestedSyncId) ||
        (entry.size === item.size && entry.color === item.color && (!item.sku || entry.sku === item.sku))
      );
      if (!variant) throw new Error(`Invalid variant for: ${item.id}`);
    }

    const price = Number(variant?.price ?? product.price);
    if (!Number.isFinite(price) || price < 0) throw new Error(`Invalid price for: ${item.id}`);
    return { product, variant, quantity, unitPrice: price };
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

  items.forEach(({ product, variant, quantity, unitPrice }, index) => {
    const cents = Math.round(unitPrice * 100);
    const sku = variant?.sku || product.sku || "";
    const size = variant?.size || "";
    const color = variant?.color || product.color || "";
    const syncVariantId = variant?.printful_sync_variant_id || "";
    const optionLabel = [color, size].filter(Boolean).join(" / ");

    body.set(`line_items[${index}][quantity]`, String(quantity));
    body.set(`line_items[${index}][price_data][currency]`, "usd");
    body.set(`line_items[${index}][price_data][unit_amount]`, String(cents));
    body.set(`line_items[${index}][price_data][product_data][name]`, optionLabel ? `${product.name} — ${optionLabel}` : product.name);
    body.set(`line_items[${index}][price_data][product_data][metadata][stargirls_product_id]`, product.id);
    body.set(`line_items[${index}][price_data][product_data][metadata][fulfillment]`, "printful");
    if (syncVariantId) body.set(`line_items[${index}][price_data][product_data][metadata][printful_sync_variant_id]`, String(syncVariantId));
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
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" },
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

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (url.pathname === "/health") return json({ ok: true, fulfillment: "printful" }, 200, corsHeaders);

    try {
      if (url.pathname === "/stripe/webhook" && request.method === "POST") return await receiveStripeWebhook(request, env);
      if (url.pathname === "/printful/catalog" && request.method === "GET") {
        return json(await getPublicPrintfulCatalog(env), 200, {
          ...corsHeaders,
          "cache-control": "no-store"
        });
      }
      if (url.pathname !== "/checkout" || request.method !== "POST") return json({ error: "Not found" }, 404, corsHeaders);
      if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) return json({ error: "Origin not allowed" }, 403, corsHeaders);

      requireProductsKv(env);
      const payload = await request.json();
      const [catalog, printfulCatalog] = await Promise.all([loadCatalog(env), getPrintfulCatalog(env)]);
      const validatedItems = validateCart(payload.items, catalog, printfulCatalog);
      const session = await createStripeCheckout(validatedItems, env);
      return json({ url: session.url }, 200, corsHeaders);
    } catch (error) {
      console.error("STARGIRLS store worker", error);
      return json({ error: error.message || "Request failed" }, 400, corsHeaders);
    }
  }
};
