// Home page: selecting an offering widens its panel and narrows the other two.
const offerings = [...document.querySelectorAll(".offering")];
const panels = offerings.map((offering) => document.getElementById(offering.getAttribute("aria-controls")));
const panelArea = document.querySelector(".offering-details");
const linkArea = document.querySelector(".offering-links");
const links = linkArea ? [...linkArea.querySelectorAll("path")] : [];

function showOffering(selected) {
  offerings.forEach((offering, i) => {
    const isSelected = offering === selected;
    offering.setAttribute("aria-expanded", String(isSelected));
    panels[i].hidden = !isSelected;
  });
  animateLinks();
}

offerings.forEach((offering) => {
  offering.addEventListener("mouseenter", () => showOffering(offering));
  offering.addEventListener("click", () => {
    showOffering(offering);
    // On short screens, bring the panels into view after a tap.
    panelArea.scrollIntoView({ block: "nearest" });
  });
});

// A skinny strip can be clicked to open it too.
panels.forEach((panel, i) => {
  panel.addEventListener("click", () => {
    if (panel.hidden) showOffering(offerings[i]);
  });
});

// A line runs straight down when its offering sits over its panel. Otherwise
// it bends twice with rounded corners, like an S, to reach its panel.
function drawLinks() {
  if (!linkArea) return;
  const area = linkArea.getBoundingClientRect();
  const lines = offerings.map((offering, i) => {
    const box = offering.getBoundingClientRect();
    const panel = panels[i].getBoundingClientRect();
    const startX = box.left + box.width / 2 - area.left;
    const inset = Math.min(panel.width / 2, 28);
    const left = panel.left + inset - area.left;
    const right = panel.right - inset - area.left;
    return { i, startX, endX: Math.min(Math.max(startX, left), right), bend: 0.5 };
  });

  // When two lines bend the same way, the outer one turns first so they never cross.
  const rightward = lines.filter((line) => line.endX - line.startX > 1).sort((a, b) => b.startX - a.startX);
  const leftward = lines.filter((line) => line.startX - line.endX > 1).sort((a, b) => a.startX - b.startX);
  [rightward, leftward].forEach((group) => {
    if (group.length === 2) {
      group[0].bend = 0.34;
      group[1].bend = 0.66;
    }
  });

  const height = area.height;
  lines.forEach(({ i, startX, endX, bend }) => {
    const y = height * bend;
    const change = endX - startX;
    const way = Math.sign(change);
    const radius = Math.min(Math.abs(change) / 2, height * 0.3, 14);
    const d =
      Math.abs(change) <= 1
        ? `M${startX} 0 L${startX} ${height}`
        : `M${startX} 0 L${startX} ${y - radius} Q${startX} ${y} ${startX + way * radius} ${y} ` +
          `L${endX - way * radius} ${y} Q${endX} ${y} ${endX} ${y + radius} L${endX} ${height}`;
    links[i].setAttribute("d", d);
    links[i].classList.toggle("is-active", !panels[i].hidden);
  });
}

// Keep the lines attached while the panels slide.
let linkAnimation = 0;
function animateLinks() {
  cancelAnimationFrame(linkAnimation);
  const started = performance.now();
  function step(now) {
    drawLinks();
    if (now - started < 500) linkAnimation = requestAnimationFrame(step);
  }
  drawLinks();
  linkAnimation = requestAnimationFrame(step);
}

if (linkArea) {
  drawLinks();
  window.addEventListener("resize", drawLinks);
  new ResizeObserver(drawLinks).observe(panelArea);
  panelArea.addEventListener("transitionend", drawLinks);
  document.fonts.ready.then(drawLinks);
}

// Hamburger menu.
const menuToggle = document.querySelector(".menu-toggle");
const siteMenu = document.getElementById("site-menu");
const bar = document.querySelector(".site-bar");

function isMenuOpen() {
  return menuToggle.getAttribute("aria-expanded") === "true";
}

function setMenuOpen(open) {
  menuToggle.setAttribute("aria-expanded", String(open));
  siteMenu.hidden = !open;
  updateBar();
}

menuToggle.addEventListener("click", () => setMenuOpen(!isMenuOpen()));

document.addEventListener("click", (event) => {
  if (isMenuOpen() && !event.target.closest(".menu")) setMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isMenuOpen()) {
    setMenuOpen(false);
    menuToggle.focus();
  }
});

// The links (web) or hamburger (phones) appear once you've scrolled halfway.
// If the page is too short to scroll, they stay visible so the menu is reachable.
function updateBar() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const show = scrollable < 40 || window.scrollY >= scrollable / 2 || isMenuOpen();
  bar.classList.toggle("is-revealed", show);
  bar.classList.toggle("is-scrolled", window.scrollY > 8);
}

window.addEventListener("scroll", updateBar, { passive: true });
window.addEventListener("resize", updateBar);
new ResizeObserver(updateBar).observe(document.body);
updateBar();
