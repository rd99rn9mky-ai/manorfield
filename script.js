// Home page: shows an offering's details when it is hovered, clicked or tapped.
const offerings = document.querySelectorAll(".offering");

function showOffering(selected) {
  offerings.forEach((offering) => {
    const isSelected = offering === selected;
    offering.setAttribute("aria-expanded", String(isSelected));
    document.getElementById(offering.getAttribute("aria-controls")).hidden = !isSelected;
  });
}

offerings.forEach((offering) => {
  offering.addEventListener("mouseenter", () => showOffering(offering));
  offering.addEventListener("click", () => {
    showOffering(offering);
    // On short screens, bring the details into view after a tap.
    document.getElementById(offering.getAttribute("aria-controls")).scrollIntoView({ block: "nearest" });
  });
});

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

// Home page: the bar appears once you've scrolled halfway down. If the page
// is too short to scroll, it stays visible so the menu is always reachable.
function updateBar() {
  if (!bar.hasAttribute("data-reveal")) return;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const show = scrollable < 40 || window.scrollY >= scrollable / 2 || isMenuOpen();
  bar.classList.toggle("is-visible", show);
}

window.addEventListener("scroll", updateBar, { passive: true });
window.addEventListener("resize", updateBar);
new ResizeObserver(updateBar).observe(document.body);
updateBar();
