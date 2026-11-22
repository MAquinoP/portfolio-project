const dockLinks = Array.from(document.querySelectorAll(".dock a"));
const sections = dockLinks
  .map((link) => document.getElementById(link.dataset.section))
  .filter(Boolean);
const revealItems = document.querySelectorAll(".reveal");
const yearSlot = document.getElementById("year");
const contactForm = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");

const CONTACT_ENDPOINT = "/contacto";

function setActiveLink(id) {
  dockLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.section === id);
  });
}

function watchSections() {
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible) setActiveLink(visible.target.id);
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] }
  );

  sections.forEach((section) => observer.observe(section));
}

function revealOnScroll() {
  if (!revealItems.length) return;

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, self) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        self.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -60px 0px", threshold: 0.15 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function showStatus(text, state) {
  if (!formStatus) return;
  formStatus.textContent = text;
  formStatus.classList.remove("is-success", "is-error");
  if (state) formStatus.classList.add(state);
}

async function submitContact(event) {
  event.preventDefault();

  if (!contactForm.checkValidity()) {
    contactForm.reportValidity();
    showStatus("Revisa los campos marcados antes de enviar.", "is-error");
    return;
  }

  const submitButton = contactForm.querySelector("button[type=submit]");
  const data = Object.fromEntries(new FormData(contactForm).entries());

  submitButton.disabled = true;
  showStatus("Enviando tu mensaje...", null);

  try {
    const response = await fetch(CONTACT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      showStatus(payload.error || "No se pudo enviar el mensaje. Intenta de nuevo.", "is-error");
      return;
    }

    contactForm.reset();
    showStatus("Mensaje enviado. Te respondo pronto.", "is-success");
  } catch (error) {
    showStatus("No hubo conexion con el servidor. Intenta de nuevo en un momento.", "is-error");
  } finally {
    submitButton.disabled = false;
  }
}

function stampYear() {
  if (yearSlot) yearSlot.textContent = String(new Date().getFullYear());
}

watchSections();
revealOnScroll();
stampYear();

if (contactForm) contactForm.addEventListener("submit", submitContact);
