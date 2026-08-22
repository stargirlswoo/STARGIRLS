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
   OUR WORLD CMS
========================================================= */

async function loadOurWorld() {

  const worldGrid = document.querySelector(".world-camera-grid");
  const worldHero = document.querySelector(".world-hero");

  /*
    If we are not on the Our World page,
    there is nothing to load.
  */

  if (!worldGrid && !worldHero) return;


  try {

    /*
      Add a timestamp so the browser does not keep
      showing an old cached version of the photo list.
    */

    const response = await fetch(
      `content/world.json?v=${Date.now()}`,
      {
        cache: "no-store"
      }
    );


    if (!response.ok) {
      throw new Error("Could not load Our World content.");
    }


    const world = await response.json();


    /* =====================================================
       HERO PHOTO
    ===================================================== */

    if (worldHero && world.hero) {

      worldHero.style.backgroundImage = `
        linear-gradient(
          rgba(0, 0, 0, 0.08),
          rgba(0, 0, 0, 0.55)
        ),
        url("${world.hero}")
      `;

    }


    /* =====================================================
       CAMERA ROLL
    ===================================================== */

    if (worldGrid && Array.isArray(world.photos)) {

      /*
        Remove the old placeholder photo boxes.
      */

      worldGrid.innerHTML = "";


      /*
        Build one photo tile for every photo
        you added through Sveltia.
      */

      world.photos.forEach(photo => {

        if (!photo.image) return;


        const photoItem = document.createElement("figure");

        photoItem.className = "world-cms-photo";


        const image = document.createElement("img");

        image.src = photo.image;

        image.alt =
          photo.alt ||
          photo.caption ||
          "STARGIRLS camera roll";

        image.loading = "lazy";


        photoItem.appendChild(image);


        /*
          Caption is optional.
          Nothing appears if you leave it blank.
        */

        if (photo.caption) {

          const caption = document.createElement("figcaption");

          caption.textContent = photo.caption;

          photoItem.appendChild(caption);

        }


        worldGrid.appendChild(photoItem);

      });

    }

  } catch (error) {

    console.error(
      "STARGIRLS Our World CMS:",
      error
    );

  }

}


loadOurWorld();