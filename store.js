const STORE_API_BASE = window.STARGIRLS_STORE_API || "";

const productGrid = document.querySelector("[data-product-grid]");
const filterLinks = document.querySelectorAll("[data-shop-filter]");
const cartButton = document.querySelector("[data-cart-open]");
const cartDrawer = document.querySelector("[data-cart-drawer]");
const cartClose = document.querySelector("[data-cart-close]");
const cartBackdrop = document.querySelector("[data-cart-backdrop]");
const cartItems = document.querySelector("[data-cart-items]");
const cartCount = document.querySelectorAll("[data-cart-count]");
const cartSubtotal = document.querySelector("[data-cart-subtotal]");
const checkoutButton = document.querySelector("[data-checkout]");
const checkoutNote = document.querySelector("[data-checkout-note]");

let products = [];
let cart = loadCart();
let activeFilter = "all";

function money(value) {
  if (typeof value !== "number") return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("stargirls-cart")) || [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem("stargirls-cart", JSON.stringify(cart));
  renderCart();
}

function productById(id) {
  return products.find(product => product.id === id);
}

function addToCart(id) {
  const product = productById(id);
  if (!product || !product.available || typeof product.price !== "number") return;

  const existing = cart.find(item => item.id === id);
  if (existing) existing.quantity += 1;
  else cart.push({ id, quantity: 1 });

  saveCart();
  openCart();
}

function changeQuantity(id, amount) {
  const item = cart.find(entry => entry.id === id);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart = cart.filter(entry => entry.id !== id);
  saveCart();
}

function renderProducts() {
  if (!productGrid) return;

  const visible = activeFilter === "all"
    ? products
    : products.filter(product => product.category === activeFilter);

  productGrid.innerHTML = visible.map(product => {
    const action = product.available && typeof product.price === "number"
      ? `<button class="catalog-buy" type="button" data-add-to-cart="${product.id}">ADD TO CART</button>`
      : `<span class="catalog-status">${product.status || "COMING SOON"}</span>`;

    const image = `<div class="catalog-card-image" style="background-image:url('${product.image}')"></div>`;
    const imageBlock = product.href
      ? `<a href="${product.href}" class="catalog-image-link">${image}</a>`
      : image;

    return `
      <article class="catalog-card" data-category="${product.category}">
        ${imageBlock}
        <div class="catalog-meta">
          <div>
            <strong>${product.name}</strong>
            <span>${product.category.toUpperCase()}</span>
          </div>
          <div class="catalog-price">${typeof product.price === "number" ? money(product.price) : product.status || "COMING SOON"}</div>
        </div>
        ${action}
      </article>
    `;
  }).join("");

  document.querySelectorAll("[data-add-to-cart]").forEach(button => {
    button.addEventListener("click", () => addToCart(button.dataset.addToCart));
  });
}

function renderCart() {
  const hydrated = cart
    .map(item => ({ ...item, product: productById(item.id) }))
    .filter(item => item.product && item.product.available && typeof item.product.price === "number");

  const count = hydrated.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.forEach(element => element.textContent = String(count));

  if (!cartItems || !cartSubtotal || !checkoutButton) return;

  if (!hydrated.length) {
    cartItems.innerHTML = `<div class="cart-empty"><strong>YOUR CART IS EMPTY.</strong><p>The real stuff will show up here as soon as the first products go live.</p></div>`;
    cartSubtotal.textContent = money(0);
    checkoutButton.disabled = true;
    if (checkoutNote) checkoutNote.textContent = "Checkout activates when purchasable products and the payment backend are connected.";
    return;
  }

  cartItems.innerHTML = hydrated.map(item => `
    <div class="cart-line">
      <div class="cart-thumb" style="background-image:url('${item.product.image}')"></div>
      <div class="cart-line-copy">
        <strong>${item.product.name}</strong>
        <span>${money(item.product.price)}</span>
        <div class="qty-controls">
          <button type="button" data-qty="-1" data-id="${item.id}">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-qty="1" data-id="${item.id}">+</button>
        </div>
      </div>
    </div>
  `).join("");

  document.querySelectorAll("[data-qty]").forEach(button => {
    button.addEventListener("click", () => changeQuantity(button.dataset.id, Number(button.dataset.qty)));
  });

  const subtotal = hydrated.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  cartSubtotal.textContent = money(subtotal);
  checkoutButton.disabled = !STORE_API_BASE;
  if (checkoutNote) {
    checkoutNote.textContent = STORE_API_BASE
      ? "Taxes and shipping are calculated at checkout."
      : "Cart is ready. Payment checkout will activate when the store backend is connected.";
  }
}

function openCart() {
  if (!cartDrawer || !cartBackdrop) return;
  cartDrawer.classList.add("active");
  cartBackdrop.classList.add("active");
  document.body.classList.add("menu-open");
}

function closeCart() {
  if (!cartDrawer || !cartBackdrop) return;
  cartDrawer.classList.remove("active");
  cartBackdrop.classList.remove("active");
  document.body.classList.remove("menu-open");
}

async function checkout() {
  if (!STORE_API_BASE || !cart.length) return;

  checkoutButton.disabled = true;
  checkoutButton.textContent = "OPENING CHECKOUT…";

  try {
    const response = await fetch(`${STORE_API_BASE}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart })
    });

    if (!response.ok) throw new Error("Checkout request failed");
    const data = await response.json();
    if (!data.url) throw new Error("Checkout URL missing");
    window.location.href = data.url;
  } catch (error) {
    console.error("STARGIRLS checkout:", error);
    checkoutButton.disabled = false;
    checkoutButton.textContent = "CHECKOUT";
    if (checkoutNote) checkoutNote.textContent = "Checkout could not open. Please try again.";
  }
}

async function initStore() {
  try {
    const response = await fetch(`content/products.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load products");
    const data = await response.json();
    products = Array.isArray(data.products) ? data.products : [];
  } catch (error) {
    console.error("STARGIRLS products:", error);
    products = [];
  }

  renderProducts();
  renderCart();
}

filterLinks.forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    activeFilter = link.dataset.shopFilter || "all";
    filterLinks.forEach(item => item.classList.toggle("active", item === link));
    renderProducts();
    document.querySelector("#catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

cartButton?.addEventListener("click", openCart);
cartClose?.addEventListener("click", closeCart);
cartBackdrop?.addEventListener("click", closeCart);
checkoutButton?.addEventListener("click", checkout);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeCart();
});

initStore();
