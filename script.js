const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const menuClose = document.querySelector(".menu-close");
const menuBack = document.querySelector(".menu-back");
const menuOverlay = document.querySelector(".menu-overlay");

const navButtons = document.querySelectorAll(".nav-button");
const megaMenu = document.querySelector("#megaMenu");
const megaClose = document.querySelector(".mega-close");
const megaPanels = document.querySelectorAll(".mega-panel");

const mobileTitle = document.querySelector("#mobileMenuTitle");
const mobilePanels = document.querySelectorAll(".mobile-panel");
const mobileMainPanel = document.querySelector("#mobile-main");
const mobilePanelTriggers = document.querySelectorAll("[data-mobile-panel]");

let currentPanel = null;

function openMenu() {
  mobileMenu.classList.add("active");
  menuOverlay.classList.add("active");
  document.body.classList.add("menu-open");
  menuToggle.setAttribute("aria-expanded", "true");
  showMobilePanel("main");
}

function closeMenu() {
  mobileMenu.classList.remove("active");
  menuOverlay.classList.remove("active");
  document.body.classList.remove("menu-open");
  menuToggle.setAttribute("aria-expanded", "false");
  showMobilePanel("main");
}

function showMobilePanel(panelName) {
  mobilePanels.forEach(panel => panel.classList.remove("active"));

  const nextPanel =
    panelName === "main"
      ? mobileMainPanel
      : document.querySelector(`#mobile-${panelName}`);

  if (nextPanel) nextPanel.classList.add("active");

  if (panelName === "main") {
    mobileMenu.classList.remove("submenu-open");
    mobileTitle.textContent = "STARGIRLS";
  } else {
    mobileMenu.classList.add("submenu-open");
    mobileTitle.textContent = panelName.toUpperCase();
  }
}

function openMega(panelName) {
  if (!megaMenu) return;

  megaMenu.classList.add("active");

  navButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.panel === panelName);
  });

  megaPanels.forEach(panel => {
    panel.classList.toggle("active", panel.id === `${panelName}-panel`);
  });
}

function closeMega() {
  if (!megaMenu) return;

  megaMenu.classList.remove("active");
  navButtons.forEach(button => button.classList.remove("active"));
  megaPanels.forEach(panel => panel.classList.remove("active"));
  currentPanel = null;
}

if (menuToggle && mobileMenu && menuClose && menuBack && menuOverlay) {
  menuToggle.addEventListener("click", openMenu);
  menuClose.addEventListener("click", closeMenu);
  menuBack.addEventListener("click", () => showMobilePanel("main"));
  menuOverlay.addEventListener("click", closeMenu);
}

mobilePanelTriggers.forEach(trigger => {
  trigger.addEventListener("click", event => {
    event.preventDefault();
    showMobilePanel(trigger.dataset.mobilePanel);
  });
});

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    const panel = button.dataset.panel;

    if (currentPanel === panel && megaMenu.classList.contains("active")) {
      closeMega();
      return;
    }

    currentPanel = panel;
    openMega(panel);
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