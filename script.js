const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const menuClose = document.querySelector(".menu-close");
const menuBack = document.querySelector(".menu-back");
const menuOverlay = document.querySelector(".menu-overlay");

function openMenu() {
  mobileMenu.classList.add("active");
  menuOverlay.classList.add("active");
  document.body.classList.add("menu-open");
  menuToggle.setAttribute("aria-expanded", "true");
}

function closeMenu() {
  mobileMenu.classList.remove("active");
  menuOverlay.classList.remove("active");
  document.body.classList.remove("menu-open");
  menuToggle.setAttribute("aria-expanded", "false");
}

if (
  menuToggle &&
  mobileMenu &&
  menuClose &&
  menuBack &&
  menuOverlay
) {
  menuToggle.addEventListener("click", openMenu);
  menuClose.addEventListener("click", closeMenu);
  menuBack.addEventListener("click", closeMenu);
  menuOverlay.addEventListener("click", closeMenu);
}
