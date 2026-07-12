// admin/admin.js — talks to /api/verify, /api/content, /api/upload-image

(function () {
  const loginScreen = document.getElementById("loginScreen");
  const adminPanel = document.getElementById("adminPanel");
  const passwordInput = document.getElementById("passwordInput");
  const loginBtn = document.getElementById("loginBtn");
  const loginError = document.getElementById("loginError");
  const logoutBtn = document.getElementById("logoutBtn");
  const saveBtn = document.getElementById("saveBtn");
  const saveStatus = document.getElementById("saveStatus");
  const statsGrid = document.getElementById("statsGrid");
  const testimonialsList = document.getElementById("testimonialsList");
  const addTestimonialBtn = document.getElementById("addTestimonialBtn");
  const photoGrid = document.getElementById("photoGrid");

  let sessionPassword = sessionStorage.getItem("ramin_admin_pw") || "";
  let currentContent = { stats: [{}, {}, {}, {}], testimonials: [] };

  const PHOTO_SLOTS = [
    "hero.jpg",
    "gallery-01.jpg", "gallery-02.jpg", "gallery-03.jpg", "gallery-04.jpg", "gallery-05.jpg",
    "gallery-06.jpg", "gallery-07.jpg", "gallery-08.jpg", "gallery-09.jpg", "gallery-10.jpg",
    "gallery-11.jpg", "gallery-12.jpg", "gallery-13.jpg",
  ];

  function showPanel() {
    loginScreen.hidden = true;
    adminPanel.hidden = false;
    loadContent();
    renderPhotoGrid();
  }

  async function tryLogin(pw) {
    loginError.textContent = "";
    loginBtn.disabled = true;
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        sessionPassword = pw;
        sessionStorage.setItem("ramin_admin_pw", pw);
        showPanel();
      } else {
        loginError.textContent = data.error || "Falsches Passwort.";
      }
    } catch (e) {
      loginError.textContent = "Verbindungsfehler. Bitte erneut versuchen.";
    } finally {
      loginBtn.disabled = false;
    }
  }

  loginBtn.addEventListener("click", () => tryLogin(passwordInput.value));
  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryLogin(passwordInput.value);
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("ramin_admin_pw");
    sessionPassword = "";
    location.reload();
  });

  if (sessionPassword) {
    // Re-validate silently on reload
    tryLogin(sessionPassword);
  }

  // ---------- Load content ----------
  async function loadContent() {
    try {
      const res = await fetch("/data/content.json", { cache: "no-store" });
      const data = await res.json();
      currentContent = {
        stats: (data.stats && data.stats.length === 4) ? data.stats : [{}, {}, {}, {}],
        testimonials: data.testimonials || [],
      };
    } catch (e) {
      currentContent = { stats: [{}, {}, {}, {}], testimonials: [] };
    }
    renderStats();
    renderTestimonials();
  }

  // ---------- Stats ----------
  function renderStats() {
    statsGrid.innerHTML = "";
    for (let i = 0; i < 4; i++) {
      const stat = currentContent.stats[i] || { value: "", label: "" };
      const wrap = document.createElement("div");
      wrap.className = "admin-stat-field";
      wrap.innerHTML = `
        <label>Wert ${i + 1}</label>
        <input type="text" data-stat="${i}" data-field="value" placeholder="z. B. 12+" value="${escapeAttr(stat.value || "")}">
        <label>Beschriftung ${i + 1}</label>
        <input type="text" data-stat="${i}" data-field="label" placeholder="z. B. Jahre Erfahrung" value="${escapeAttr(stat.label || "")}">
      `;
      statsGrid.appendChild(wrap);
    }
    statsGrid.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        const idx = Number(input.dataset.stat);
        const field = input.dataset.field;
        if (!currentContent.stats[idx]) currentContent.stats[idx] = { value: "", label: "" };
        currentContent.stats[idx][field] = input.value;
      });
    });
  }

  // ---------- Testimonials ----------
  function renderTestimonials() {
    testimonialsList.innerHTML = "";
    if (currentContent.testimonials.length === 0) {
      const empty = document.createElement("p");
      empty.className = "admin-hint";
      empty.textContent = "Noch keine Bewertungen. Klicke auf „+ Neue Bewertung“.";
      testimonialsList.appendChild(empty);
      return;
    }
    currentContent.testimonials.forEach((t, idx) => {
      const card = document.createElement("div");
      card.className = "admin-testimonial-card";
      card.innerHTML = `
        <div class="admin-testimonial-row">
          <input type="text" data-t="${idx}" data-field="name" placeholder="Name" value="${escapeAttr(t.name || "")}">
          <input type="text" data-t="${idx}" data-field="role" placeholder="z. B. Kunde" value="${escapeAttr(t.role || "")}">
          <select data-t="${idx}" data-field="rating">
            ${[5,4,3,2,1].map(n => `<option value="${n}" ${Number(t.rating) === n ? "selected" : ""}>${"★".repeat(n)}</option>`).join("")}
          </select>
        </div>
        <textarea data-t="${idx}" data-field="quote" placeholder="Bewertungstext">${escapeHtml(t.quote || "")}</textarea>
        <button class="admin-remove-btn" data-remove="${idx}">Entfernen</button>
      `;
      testimonialsList.appendChild(card);
    });

    testimonialsList.querySelectorAll("input, select, textarea").forEach((el) => {
      el.addEventListener("input", () => {
        const idx = Number(el.dataset.t);
        const field = el.dataset.field;
        currentContent.testimonials[idx][field] = el.value;
      });
    });
    testimonialsList.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.remove);
        currentContent.testimonials.splice(idx, 1);
        renderTestimonials();
      });
    });
  }

  addTestimonialBtn.addEventListener("click", () => {
    currentContent.testimonials.push({ name: "", role: "", rating: 5, quote: "" });
    renderTestimonials();
  });

  // ---------- Photos ----------
  function renderPhotoGrid() {
    photoGrid.innerHTML = "";
    PHOTO_SLOTS.forEach((filename) => {
      const slot = document.createElement("div");
      slot.className = "admin-photo-slot";
      slot.innerHTML = `
        <img src="../assets/img/${filename}?t=${Date.now()}" alt="${filename}" loading="lazy">
        <label>${filename}</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" data-photo="${filename}">
      `;
      photoGrid.appendChild(slot);
    });

    photoGrid.querySelectorAll('input[type="file"]').forEach((input) => {
      input.addEventListener("change", () => handlePhotoUpload(input));
    });
  }

  async function handlePhotoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const filename = input.dataset.photo;

    saveStatus.textContent = `Lade ${filename} hoch …`;
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sessionPassword, filename, base64 }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        saveStatus.textContent = `${filename} aktualisiert. Live in ca. 1 Minute.`;
      } else {
        saveStatus.textContent = `Fehler: ${data.error || "Unbekannter Fehler"}`;
      }
    } catch (e) {
      saveStatus.textContent = "Fehler beim Hochladen.";
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---------- Save (stats + testimonials) ----------
  saveBtn.addEventListener("click", async () => {
    saveStatus.textContent = "Speichere …";
    saveBtn.disabled = true;
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sessionPassword, content: currentContent }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        saveStatus.textContent = "Gespeichert. Live in ca. 1 Minute.";
      } else {
        saveStatus.textContent = `Fehler: ${data.error || "Unbekannter Fehler"}`;
      }
    } catch (e) {
      saveStatus.textContent = "Verbindungsfehler beim Speichern.";
    } finally {
      saveBtn.disabled = false;
    }
  });

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }
  function escapeHtml(str) {
    return String(str).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }
})();
