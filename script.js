const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const menuClose = document.querySelector(".menu-close");
const menuOverlay = document.querySelector(".menu-overlay");
const mobileLinks = document.querySelectorAll(".mobile-nav a");

/* OPEN MOBILE MENU */
function openMenu() {
  if (!mobileMenu) return;

  mobileMenu.classList.add("active");

  if (menuOverlay) {
    menuOverlay.classList.add("active");
  }

  document.body.classList.add("menu-open");

  if (menuToggle) {
    menuToggle.setAttribute("aria-expanded", "true");
  }
}


/* CLOSE MOBILE MENU */
function closeMenu() {
  if (!mobileMenu) return;

  mobileMenu.classList.remove("active");

  if (menuOverlay) {
    menuOverlay.classList.remove("active");
  }

  document.body.classList.remove("menu-open");

  if (menuToggle) {
    menuToggle.setAttribute("aria-expanded", "false");
  }
}


/* MENU BUTTON */
if (menuToggle) {
  menuToggle.addEventListener("click", openMenu);
}


/* CLOSE BUTTON */
if (menuClose) {
  menuClose.addEventListener("click", closeMenu);
}


/* CLICK OUTSIDE MENU */
if (menuOverlay) {
  menuOverlay.addEventListener("click", closeMenu);
}


/* CLOSE MENU AFTER SELECTING A PAGE */
mobileLinks.forEach(link => {
  link.addEventListener("click", closeMenu);
});


/* ESCAPE KEY CLOSES MENU */
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeMenu();
  }
});


/* SMOOTH SCROLL FOR LINKS TO SECTIONS ON THE SAME PAGE */
document.querySelectorAll('a[href^="#"]').forEach(link => {

  link.addEventListener("click", event => {

    const targetId = link.getAttribute("href");

    if (!targetId || targetId === "#") return;

    const target = document.querySelector(targetId);

    if (!target) return;

    event.preventDefault();

    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  });

});