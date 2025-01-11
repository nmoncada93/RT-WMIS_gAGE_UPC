/********************************************************
*                                                        *
*              GENERAL WEBSITE: NAV (HOVER)              *
*                                                        *
********************************************************/
const navLinks = document.querySelectorAll(".headerNav__a");
const currentPath = window.location.pathname;

navLinks.forEach((link) => {
  let linkPath = new URL(link.href, window.location.origin).pathname;

  if (linkPath.endsWith("/")) {
    linkPath = linkPath.slice(0, -1);
  }

  link.classList.remove('active');

  if (currentPath === linkPath) {
    link.classList.add("active");
  }

  if (currentPath === "/" && linkPath.includes("index.html")) {
    link.classList.add("active");
  }
});

/**************************************************
 *
 * HEADER
 * ******************************************* */
document.querySelector(".menuToggle").addEventListener("click", () => {
  const nav = document.querySelector(".headerNav");
  const overlay = document.querySelector(".menuOverlay");
  const header = document.querySelector(".headerContainerTop");

  nav.classList.toggle("is-open");
  overlay.classList.toggle("is-visible");
  header.classList.toggle("no-bg");
});

document.addEventListener("click", (e) => {
  const nav = document.querySelector(".headerNav");
  const overlay = document.querySelector(".menuOverlay");
  const header = document.querySelector(".headerContainerTop");
  const toggleButton = document.querySelector(".menuToggle");

  if (
    !nav.contains(e.target) &&
    !toggleButton.contains(e.target) &&
    nav.classList.contains("is-open")
  ) {
    nav.classList.remove("is-open");
    overlay.classList.remove("is-visible");
    header.classList.remove("no-bg");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname;
  document.querySelectorAll(".headerNav__a").forEach((link) => {
    if (currentPath.endsWith(link.getAttribute("href"))) {
      link.classList.add("active");
    }
  });
});

/***************************************************
 *
 * HEADER LANDING
 **************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".headerContainer");
  const headerLogo = document.querySelector(".logo");
  const menuToggle = document.querySelector(".menuToggle");
  const headerNav = document.querySelector(".headerNav");
  const footerContainer = document.querySelector(".footerContainer");
  const svgGradiente = document.querySelector("#paint0_linear_9297_10")

  // Colores reutilizables
  const COLORS = {
    background: "#000000",
    text: "#ffffff",
    svgGradientStart: "rgba(255, 255, 255, 0)",
    svgGradientMiddle: "rgba(255, 255, 255, 0.7)",
    svgGradientEnd: "rgba(255, 255, 255, 0)"
  };

  const isHomePage = window.location.pathname.endsWith("index.html") || window.location.pathname === "/";

  if (isHomePage) {
    applyHomePageStyles();
  }

  function applyHomePageStyles() {
    if (header) header.style.backgroundColor = COLORS.background;
    if (headerLogo) {
      headerLogo.style.color = COLORS.text;
      headerLogo.style.backgroundColor = COLORS.background;
    }
    if (menuToggle) menuToggle.style.display = "none";
    if (headerNav) headerNav.style.display = "none";
    if (footerContainer) footerContainer.style.background = COLORS.background;

    if (svgGradiente) {
      svgGradiente.innerHTML = `
      <stop offset="0" stop-color="${COLORS.svgGradientStart}" stop-opacity="1" />
        <stop offset="0.5" stop-color="${COLORS.svgGradientMiddle}" stop-opacity="0.7" />
        <stop offset="1" stop-color="${COLORS.svgGradientEnd}" stop-opacity="1" />
      `;
    }
  }
});



