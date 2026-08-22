const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const menuClose = document.querySelector(".menu-close");
const menuOverlay = document.querySelector(".menu-overlay");
const mobileLinks = document.querySelectorAll(".mobile-nav a");


/* =========================================================
   MOBILE MENU
========================================================= */

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


if (menuToggle) {
  menuToggle.addEventListener("click", openMenu);
}

if (menuClose) {
  menuClose.addEventListener("click", closeMenu);
}

if (menuOverlay) {
  menuOverlay.addEventListener("click", closeMenu);
}

mobileLinks.forEach(link => {
  link.addEventListener("click", closeMenu);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeMenu();
  }
});


/* =========================================================
   SMOOTH SCROLL
========================================================= */

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


/* =========================================================
   CMS HELPERS
========================================================= */

async function getCMSContent(file) {

  const response = await fetch(
    `content/${file}?v=${Date.now()}`,
    {
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`Could not load ${file}`);
  }

  return response.json();
}


function setBackground(selector, image, gradient = "") {

  const element = document.querySelector(selector);

  if (!element || !image) return;

  const imageURL = `url(${JSON.stringify(image)})`;

  element.style.backgroundImage = gradient
    ? `${gradient}, ${imageURL}`
    : imageURL;
}


function renderPhotoGrid(selector, photos, defaultAlt) {

  const grid = document.querySelector(selector);

  if (!grid || !Array.isArray(photos)) return;

  /*
    The CMS becomes the source of truth,
    so remove old placeholder boxes.
  */

  grid.innerHTML = "";


  photos.forEach(photo => {

    if (!photo.image) return;

    const item = document.createElement("figure");

    item.className = "world-cms-photo";


    const image = document.createElement("img");

    image.src = photo.image;

    image.alt =
      photo.alt ||
      photo.caption ||
      defaultAlt;

    image.loading = "lazy";


    item.appendChild(image);


    if (photo.caption) {

      const caption = document.createElement("figcaption");

      caption.textContent = photo.caption;

      item.appendChild(caption);

    }


    grid.appendChild(item);

  });

}


/* =========================================================
   HOMEPAGE CMS
========================================================= */

async function loadHomepage() {

  const homepage = document.querySelector(".hero");

  if (!homepage) return;


  try {

    const home = await getCMSContent("home.json");


    setBackground(
      ".hero",
      home.hero,
      `linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.08),
        rgba(0, 0, 0, 0.52)
      )`
    );


    setBackground(
      ".siren-panel",
      home.siren
    );


    setBackground(
      ".risen-panel",
      home.risen
    );


    setBackground(
      ".stargirls-panel",
      home.stargirls
    );


    setBackground(
      ".world-bts",
      home.world_bts
    );


    setBackground(
      ".world-life",
      home.world_life
    );


    setBackground(
      ".world-studio",
      home.world_studio
    );


    setBackground(
      ".world-travel",
      home.world_travel
    );


    setBackground(
      ".home-shop",
      home.shop,
      `linear-gradient(
        rgba(0, 0, 0, 0.18),
        rgba(0, 0, 0, 0.55)
      )`
    );


  } catch (error) {

    console.error(
      "STARGIRLS Homepage CMS:",
      error
    );

  }

}


/* =========================================================
   ABOUT CMS
========================================================= */

async function loadAbout() {

  const aboutPage = document.querySelector(".about-page");

  if (!aboutPage) return;


  try {

    const about = await getCMSContent("about.json");


    setBackground(
      ".about-hero",
      about.hero,
      `linear-gradient(
        rgba(0, 0, 0, 0.08),
        rgba(0, 0, 0, 0.55)
      )`
    );


    setBackground(
      ".about-photo-break",
      about.photo_break
    );


    setBackground(
      ".sun-about-image",
      about.sun
    );


    setBackground(
      ".moon-about-image",
      about.moon
    );


    renderPhotoGrid(
      ".camera-grid",
      about.photos,
      "STARGIRLS life lately"
    );


  } catch (error) {

    console.error(
      "STARGIRLS About CMS:",
      error
    );

  }

}


/* =========================================================
   OUR WORLD CMS
========================================================= */

async function loadOurWorld() {

  const worldPage =
    document.querySelector(".world-hero") ||
    document.querySelector(".world-camera-grid");

  if (!worldPage) return;


  try {

    const world = await getCMSContent("world.json");


    setBackground(
      ".world-hero",
      world.hero,
      `linear-gradient(
        rgba(0, 0, 0, 0.08),
        rgba(0, 0, 0, 0.55)
      )`
    );


    renderPhotoGrid(
      ".world-camera-grid",
      world.photos,
      "STARGIRLS camera roll"
    );


  } catch (error) {

    console.error(
      "STARGIRLS Our World CMS:",
      error
    );

  }

}


/* =========================================================
   JUNOON CMS
========================================================= */

async function loadJunoon() {

  const junoonPage = document.querySelector(".junoon-page");

  if (!junoonPage) return;


  try {

    const junoon = await getCMSContent("junoon.json");


    setBackground(
      ".junoon-hero",
      junoon.hero,
      `linear-gradient(
        rgba(0, 0, 0, 0.08),
        rgba(0, 0, 0, 0.55)
      )`
    );


    setBackground(
      ".junoon-photo-break",
      junoon.photo_break
    );


    setBackground(
      ".junoon-juno",
      junoon.juno_image,
      `linear-gradient(
        rgba(0, 0, 0, 0.15),
        rgba(0, 0, 0, 0.55)
      )`
    );


    renderPhotoGrid(
      ".junoon-camera-grid",
      junoon.photos,
      "Making JUNOON with STARGIRLS"
    );


  } catch (error) {

    console.error(
      "STARGIRLS JUNOON CMS:",
      error
    );

  }

}


/* =========================================================
   JUNO CMS
========================================================= */

async function loadJuno() {

  const junoPage = document.querySelector(".juno-page");

  if (!junoPage) return;


  try {

    const juno = await getCMSContent("juno.json");


    setBackground(
      ".juno-hero",
      juno.hero,
      `linear-gradient(
        rgba(0, 0, 0, 0.08),
        rgba(0, 0, 0, 0.55)
      )`
    );


    const productImage =
      document.querySelector(".juno-product-image img");


    if (productImage && juno.product) {

      productImage.src = juno.product;

      productImage.alt =
        "JUNO Eau de Parfum by STARGIRLS";

    }


    setBackground(
      ".juno-photo-break",
      juno.photo_break
    );


    renderPhotoGrid(
      ".juno-camera-grid",
      juno.photos,
      "Making JUNO Eau de Parfum"
    );


  } catch (error) {

    console.error(
      "STARGIRLS JUNO CMS:",
      error
    );

  }

}


/* =========================================================
   LOAD CMS
========================================================= */

loadHomepage();
loadAbout();
loadOurWorld();
loadJunoon();
loadJuno();