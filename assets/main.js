const header = document.querySelector(".site-header");
const menuButton = document.querySelector("[data-menu-button]");
const searchableItems = document.querySelectorAll("[data-search-item]");
const searchInput = document.querySelector("[data-search-input]");
const fileInputs = document.querySelectorAll("[data-file-input]");
const mockActions = document.querySelectorAll("[data-mock-action]");

const setScrolledHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 8);
};

setScrolledHeader();
window.addEventListener("scroll", setScrolledHeader, { passive: true });

menuButton?.addEventListener("click", () => {
  const isOpen = header?.classList.toggle("is-menu-open");
  menuButton.setAttribute("aria-expanded", String(Boolean(isOpen)));
});

const observer = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 })
  : null;

document.querySelectorAll("[data-reveal]").forEach((element) => {
  if (observer) {
    observer.observe(element);
  } else {
    element.classList.add("is-visible");
  }
});

document.querySelectorAll("a[href^='#']").forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

searchInput?.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();

  searchableItems.forEach((item) => {
    const haystack = item.textContent.toLowerCase();
    item.hidden = query.length > 0 && !haystack.includes(query);
  });
});

fileInputs.forEach((input) => {
  input.addEventListener("change", () => {
    const target = document.querySelector(input.dataset.fileTarget);
    if (!target) return;
    const names = [...input.files].map((file) => file.name);
    target.textContent = names.length > 0 ? names.join(", ") : target.dataset.emptyText || "No file selected";
  });
});

mockActions.forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(button.dataset.statusTarget);
    if (!target) return;
    target.textContent = button.dataset.statusText || "已记录为设计态，等待接入真实工作流。";
  });
});
