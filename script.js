const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const menuClose = document.querySelector(".menu-close");
const menuOverlay = document.querySelector(".menu-overlay");


/* =========================================================
   ADD ABOUT TO EVERY NAV
========================================================= */

function addAboutLink(navSelector) {

  const nav = document.querySelector(navSelector);

  if (!nav) return;


  // Don't add it twice
  if (nav.querySelector('a[href="about.html"]')) return;


  const aboutLink = document.createElement("a");

  aboutLink.href = "about.html";
  aboutLink.textContent = "ABOUT";


  const joinLink =
    nav.querySelector('a[href="signup.html"]');


  if (joinLink) {

    nav.insertBefore(
      aboutLink,
      joinLink
    );

  } else {

    nav.appendChild(aboutLink);

  }

}


addAboutLink(".desktop-nav");
addAboutLink(".mobile-nav");


const mobileLinks =
  document.querySelectorAll(".mobile-nav a");


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


function setImage(selector, image, alt = "") {

  const element = document.querySelector(selector);

  if (!element || !image) return;

  element.src = image;

  if (alt) {
    element.alt = alt;
  }
}


function renderPhotoGrid(selector, photos, defaultAlt) {

  const grid = document.querySelector(selector);

  if (!grid || !Array.isArray(photos)) return;

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


function renderANEWPhotoGrid(photos) {

  const grid = document.querySelector(".anew-photo-grid");

  if (!grid || !Array.isArray(photos)) return;

  grid.innerHTML = "";


  photos.forEach(photo => {

    if (!photo.image) return;


    const item = document.createElement("figure");

    item.style.margin = "0";


    const image = document.createElement("img");

    image.src = photo.image;

    image.alt =
      photo.alt ||
      photo.caption ||
      "STARGIRLS during the ANEW era";

    image.loading = "lazy";


    item.appendChild(image);


    if (photo.caption) {

      const caption = document.createElement("figcaption");

      caption.textContent = photo.caption;

      caption.style.padding = "10px 4px 20px";
      caption.style.fontSize = "10px";
      caption.style.letterSpacing = "0.08em";

      item.appendChild(caption);

    }


    grid.appendChild(item);

  });

}


/* =========================================================
   HOMEPAGE
========================================================= */

async function loadHomepage() {

  if (!document.querySelector(".hero")) return;


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


    setBackground(".siren-panel", home.siren);
    setBackground(".risen-panel", home.risen);
    setBackground(".stargirls-panel", home.stargirls);

    setBackground(".world-bts", home.world_bts);
    setBackground(".world-life", home.world_life);
    setBackground(".world-studio", home.world_studio);
    setBackground(".world-travel", home.world_travel);


    setBackground(
      ".home-shop",
      home.shop,
      `linear-gradient(
        rgba(0, 0, 0, 0.18),
        rgba(0, 0, 0, 0.55)
      )`
    );


  } catch (error) {

    console.error("STARGIRLS Homepage CMS:", error);

  }

}


/* =========================================================
   ABOUT
========================================================= */

async function loadAbout() {

  if (!document.querySelector(".about-page")) return;


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


    setBackground(".about-photo-break", about.photo_break);
    setBackground(".sun-about-image", about.sun);
    setBackground(".moon-about-image", about.moon);


    renderPhotoGrid(
      ".camera-grid",
      about.photos,
      "STARGIRLS life lately"
    );


  } catch (error) {

    console.error("STARGIRLS About CMS:", error);

  }

}


/* =========================================================
   OUR WORLD
========================================================= */

async function loadOurWorld() {

  const page =
    document.querySelector(".world-hero") ||
    document.querySelector(".world-camera-grid");

  if (!page) return;


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

    console.error("STARGIRLS Our World CMS:", error);

  }

}


/* =========================================================
   ANEW PAGE
========================================================= */

async function loadAnew() {

  if (!document.querySelector(".anew-page")) return;


  try {

    const anew = await getCMSContent("anew.json");


    setBackground(
      ".anew-hero",
      anew.hero,
      `linear-gradient(
        rgba(0, 0, 0, 0.08),
        rgba(0, 0, 0, 0.55)
      )`
    );


    setBackground(
      ".anew-personal-break",
      anew.personal_break,
      `linear-gradient(
        rgba(0, 0, 0, 0.08),
        rgba(0, 0, 0, 0.48)
      )`
    );


    renderANEWPhotoGrid(anew.photos);


  } catch (error) {

    console.error("STARGIRLS ANEW CMS:", error);

  }

}


/* =========================================================
   JUNOON
========================================================= */

async function loadJunoon() {

  if (!document.querySelector(".junoon-page")) return;


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


    setBackground(".junoon-photo-break", junoon.photo_break);


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

    console.error("STARGIRLS JUNOON CMS:", error);

  }

}


/* =========================================================
   JUNO
========================================================= */

async function loadJuno() {

  if (!document.querySelector(".juno-page")) return;


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


    setImage(
      ".juno-product-image img",
      juno.product,
      "JUNO Eau de Parfum by STARGIRLS"
    );


    setBackground(".juno-photo-break", juno.photo_break);


    renderPhotoGrid(
      ".juno-camera-grid",
      juno.photos,
      "Making JUNO Eau de Parfum"
    );


  } catch (error) {

    console.error("STARGIRLS JUNO CMS:", error);

  }

}


/* =========================================================
   SHOP
========================================================= */

async function loadShop() {

  if (!document.querySelector(".shop-page")) return;


  try {

    const shop = await getCMSContent("shop.json");


    setBackground(
      ".shop-juno",
      shop.feature,
      `linear-gradient(
        rgba(0, 0, 0, 0.10),
        rgba(0, 0, 0, 0.55)
      )`
    );


    setImage(
      ".shop-product-image img",
      shop.product,
      "JUNO Eau de Parfum by STARGIRLS"
    );


    setBackground(
      ".shop-junoon",
      shop.junoon,
      `linear-gradient(
        rgba(0, 0, 0, 0.10),
        rgba(0, 0, 0, 0.55)
      )`
    );


    renderPhotoGrid(
      ".shop-camera-grid",
      shop.photos,
      "Making JUNO with STARGIRLS"
    );


  } catch (error) {

    console.error("STARGIRLS Shop CMS:", error);

  }

}


/* =========================================================
   MUSIC PAGE
   Reuses ANEW + JUNOON + Homepage content
========================================================= */

async function loadMusic() {

  if (!document.querySelector(".music-page")) return;


  try {

    const [anew, junoon, home] = await Promise.all([
      getCMSContent("anew.json"),
      getCMSContent("junoon.json"),
      getCMSContent("home.json")
    ]);


    /* JUNOON */

    setBackground(
      ".music-project-junoon",
      junoon.hero,
      `linear-gradient(
        rgba(0, 0, 0, 0.10),
        rgba(0, 0, 0, 0.55)
      )`
    );


    /* ANEW ALBUM COVER */

    setBackground(
      ".music-project-anew",
      anew.cover,
      `linear-gradient(
        rgba(0, 0, 0, 0.10),
        rgba(0, 0, 0, 0.55)
      )`
    );


    /* SIREN / RISEN / STARGIRLS */

    const storyImages =
      document.querySelectorAll(
        ".music-story-card img"
      );


    const storySources = [
      home.siren,
      home.risen,
      home.stargirls
    ];


    storyImages.forEach((image, index) => {

      if (storySources[index]) {
        image.src = storySources[index];
      }

    });


    /* BEHIND THE MUSIC */

    setBackground(
      ".music-bts",
      anew.personal_break,
      `linear-gradient(
        rgba(0, 0, 0, 0.10),
        rgba(0, 0, 0, 0.55)
      )`
    );


  } catch (error) {

    console.error("STARGIRLS Music CMS:", error);

  }

}


/* =========================================================
   LOAD EVERYTHING
========================================================= */

loadHomepage();
loadAbout();
loadOurWorld();
loadAnew();
loadJunoon();
loadJuno();
loadShop();
loadMusic();
/* =========================================================
   BREVO — STAY CLOSE SIGNUP
========================================================= */

const BREVO_SIGNUP_URL =
  "https://4f91725b.sibforms.com/serve/MUIFABK2uNLRQcki4e-Qq149f_zusNJ0-mwCeXoEO-IMUHMOdzBmgVaxYXIagi2-0H1di_hzFNRu6LWB0etAaRFbchmq1rIRvjxqcbI5tA40XMg6oUJx7zyO9c3l0hKaIeMqa8LKqcdPk7CHQfCUXNndc15U4VEJhS7EPLo9w0VmE_8HjGotOZcxgE_zVZ98shwbI2IKBqP89FtUDQ==";


document.querySelectorAll(".signup-form").forEach((form, index) => {

  if (form.dataset.brevoConnected === "true") return;


  const emailInput =
    form.querySelector('input[type="email"]');


  if (!emailInput) return;


  form.dataset.brevoConnected = "true";


  /* Connect this existing STARGIRLS form to Brevo */

  form.method = "POST";
  form.action = BREVO_SIGNUP_URL;
  form.setAttribute("data-type", "subscription");


  /*
    Brevo specifically expects the email field
    to be named EMAIL.
  */

  emailInput.name = "EMAIL";


  /* =====================================================
     BREVO HIDDEN FIELDS
  ===================================================== */

  if (!form.querySelector('[name="email_address_check"]')) {

    const honeypot = document.createElement("input");

    honeypot.type = "text";
    honeypot.name = "email_address_check";
    honeypot.value = "";
    honeypot.tabIndex = -1;
    honeypot.autocomplete = "off";
    honeypot.setAttribute("aria-hidden", "true");

    honeypot.style.position = "absolute";
    honeypot.style.left = "-9999px";

    form.appendChild(honeypot);

  }


  if (!form.querySelector('[name="locale"]')) {

    const locale = document.createElement("input");

    locale.type = "hidden";
    locale.name = "locale";
    locale.value = "en";

    form.appendChild(locale);

  }


  /* =====================================================
     HIDDEN BREVO RESPONSE WINDOW
     Keeps visitors on stargirls.maison
  ===================================================== */

  const frameName =
    `stargirls-brevo-${index}`;


  const responseFrame =
    document.createElement("iframe");


  responseFrame.name = frameName;
  responseFrame.title = "Newsletter signup response";
  responseFrame.style.display = "none";


  form.target = frameName;


  /* =====================================================
     STARGIRLS SUCCESS MESSAGE
  ===================================================== */

  const status =
    document.createElement("p");


  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  status.style.display = "none";
  status.style.maxWidth = "650px";
  status.style.margin = "28px auto 0";
  status.style.textAlign = "center";
  status.style.fontFamily = "var(--display)";
  status.style.fontSize = "clamp(21px, 3vw, 30px)";
  status.style.lineHeight = "1.4";


  form.insertAdjacentElement(
    "afterend",
    status
  );


  status.insertAdjacentElement(
    "afterend",
    responseFrame
  );


  /* =====================================================
     FRIENDLIER EMAIL ERRORS
  ===================================================== */

  emailInput.addEventListener("invalid", () => {

    emailInput.setCustomValidity("");


    if (emailInput.validity.valueMissing) {

      emailInput.setCustomValidity(
        "don't forget your email ♡"
      );

    } else if (emailInput.validity.typeMismatch) {

      emailInput.setCustomValidity(
        "hmm, something looks a little off — check your email and try again ♡"
      );

    }

  });


  emailInput.addEventListener("input", () => {

    emailInput.setCustomValidity("");

  });


  /* =====================================================
     SUBMISSION
  ===================================================== */

  let waitingForBrevo = false;


  form.addEventListener("submit", () => {

    waitingForBrevo = true;


    const button =
      form.querySelector('button[type="submit"]');


    if (button) {

      button.dataset.originalText =
        button.textContent;

      button.textContent =
        "JOINING...";

      button.disabled = true;

    }

  });


  responseFrame.addEventListener("load", () => {

    if (!waitingForBrevo) return;


    waitingForBrevo = false;


    form.style.display = "none";


    status.textContent =
      "you're officially one of our stars ♡ stay close :)";

    status.style.display = "block";

  });

});