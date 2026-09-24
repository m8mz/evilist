// Progressive enhancement for /contact: tab switching between the two forms, and in-place
// submission through the Astro action so field values survive validation errors.
import { actions, isInputError } from "astro:actions";

function initTabs(): void {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>("[data-contact-tab]")];
  const panels = [...document.querySelectorAll<HTMLElement>("[data-contact-panel]")];
  if (tabs.length === 0) return;

  const select = (tab: HTMLButtonElement, focus = false) => {
    for (const t of tabs) {
      const active = t === tab;
      t.setAttribute("aria-selected", String(active));
      t.tabIndex = active ? 0 : -1;
    }
    for (const panel of panels) {
      panel.classList.toggle("is-active", panel.id === tab.getAttribute("aria-controls"));
    }
    if (focus) tab.focus();
  };

  for (const tab of tabs) {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      const i = tabs.indexOf(tab);
      if (event.key === "ArrowRight") select(tabs[(i + 1) % tabs.length], true);
      if (event.key === "ArrowLeft") select(tabs[(i - 1 + tabs.length) % tabs.length], true);
    });
  }
}

function showFieldErrors(form: HTMLFormElement, fields: Record<string, string[] | undefined>) {
  for (const slot of form.querySelectorAll<HTMLElement>("[data-error-for]")) {
    const name = slot.dataset.errorFor!;
    const message = fields[name]?.[0] ?? "";
    slot.textContent = message;
    const input = form.elements.namedItem(name);
    if (input instanceof HTMLElement) {
      if (message) {
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", slot.id);
      } else {
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      }
    }
  }
  const first = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  first?.focus();
}

function initForms(): void {
  for (const form of document.querySelectorAll<HTMLFormElement>("[data-contact-form]")) {
    const status = form.querySelector<HTMLElement>("[data-form-status]")!;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "";
      button.disabled = true;
      button.textContent = "Sending…";

      const { error } = await actions.contact(new FormData(form));

      button.disabled = false;
      button.textContent = "Send message";

      if (!error) {
        const panel = form.closest<HTMLElement>("[data-contact-panel]");
        const done = document.createElement("div");
        done.className = "sent";
        done.setAttribute("role", "status");
        done.tabIndex = -1;
        done.innerHTML = "<h2>Message sent</h2><p>Thanks. I'll reply to you by email.</p>";
        (panel ?? form).replaceChildren(done);
        done.focus();
        return;
      }

      if (isInputError(error)) {
        showFieldErrors(form, error.fields as Record<string, string[] | undefined>);
        status.textContent = "Check the highlighted fields and send again.";
      } else {
        status.textContent = error.message;
      }
    });
  }
}

initTabs();
initForms();
