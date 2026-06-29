const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const menuClose = document.querySelector(".menu-close");
const menuBack = document.querySelector(".menu-back");
const menuOverlay = document.querySelector(".menu-overlay");

const navButtons = document.querySelectorAll(".nav-button");
const megaMenu = document.querySelector("#megaMenu");
const megaClose = document.querySelector(".mega-close");
const megaPanels = document.querySelectorAll(".mega-panel");

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

function openMega(panelName) {
  megaMenu.classList.add("active");

  navButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.panel === panelName);
  });

  megaPanels.forEach(panel => {
    panel.classList.toggle("active", panel.id === `${panelName}-panel`);
  });
}

function closeMega() {
  megaMenu.classList.remove("active");
  navButtons.forEach(button => button.classList.remove("active"));
  megaPanels.forEach(panel => panel.classList.remove("active"));
}

if (menuToggle && mobileMenu && menuClose && menuBack && menuOverlay) {
  menuToggle.addEventListener("click", openMenu);
  menuClose.addEventListener("click", closeMenu);
  menuBack.addEventListener("click", closeMenu);
  menuOverlay.addEventListener("click", closeMenu);
}

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    openMega(button.dataset.panel);
  });
});

if (megaClose) {
  megaClose.addEventListener("click", closeMega);
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeMenu();
    closeMega();
  }
});
