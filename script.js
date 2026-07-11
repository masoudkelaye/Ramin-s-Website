// script.js — language switching for Ramin Ghorbani site

(function () {
  const select = document.getElementById("langSelect");

  // Populate language dropdown from I18N
  SUPPORTED_LANGS.forEach((code) => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = I18N[code].label;
    select.appendChild(opt);
  });

  function applyLang(code) {
    const dict = I18N[code] || I18N[DEFAULT_LANG];
    document.documentElement.lang = code;
    document.documentElement.dir = dict.dir;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key] !== undefined) {
        el.textContent = dict[key];
      }
    });

    select.value = code;
    localStorage.setItem("ramin_lang", code);
  }

  function detectInitialLang() {
    const saved = localStorage.getItem("ramin_lang");
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;

    const browserLangs = navigator.languages || [navigator.language || DEFAULT_LANG];
    for (const bl of browserLangs) {
      const short = bl.slice(0, 2).toLowerCase();
      if (SUPPORTED_LANGS.includes(short)) return short;
    }
    return DEFAULT_LANG;
  }

  select.addEventListener("change", (e) => applyLang(e.target.value));

  applyLang(detectInitialLang());

  document.getElementById("year").textContent = new Date().getFullYear();

  // ---------- Dynamic content: stats + testimonials (editable via /admin) ----------
  (async function loadDynamicContent() {
    try {
      const res = await fetch("data/content.json", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();

      // Stats — show the row only if at least one stat has both a value and a label
      const stats = (data.stats || []).filter((s) => s && s.value && s.label);
      const statRow = document.getElementById("statRow");
      if (statRow && stats.length > 0) {
        statRow.innerHTML = stats
          .map(
            (s) => `
          <div>
            <div class="stat-value">${escapeHtml(s.value)}</div>
            <div class="stat-label">${escapeHtml(s.label)}</div>
          </div>`
          )
          .join("");
        statRow.hidden = false;
      }

      // Testimonials — show the section only if at least one exists
      const testimonials = (data.testimonials || []).filter((t) => t && t.quote);
      const section = document.getElementById("testimonials");
      const grid = document.getElementById("testimonialsGrid");
      if (section && grid && testimonials.length > 0) {
        grid.innerHTML = testimonials
          .map((t) => {
            const rating = Math.max(1, Math.min(5, Number(t.rating) || 5));
            return `
          <div class="t-card">
            <div class="t-stars">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</div>
            <p class="t-quote">"${escapeHtml(t.quote)}"</p>
            <div class="t-name">${escapeHtml(t.name || "")}</div>
            ${t.role ? `<div class="t-role">${escapeHtml(t.role)}</div>` : ""}
          </div>`;
          })
          .join("");
        section.hidden = false;
      }
    } catch (e) {
      /* content.json not reachable yet — sections stay hidden */
    }
  })();

  function escapeHtml(str) {
    return String(str).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  // ---------- Nav: subtle background/border once scrolled ----------
  const siteNav = document.getElementById("siteNav");
  if (siteNav) {
    const onNavScroll = () => {
      siteNav.classList.toggle("scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", onNavScroll, { passive: true });
    onNavScroll();
  }

  // ---------- Scroll-progress "snipping" scissors (real open/close via JS) ----------
  const rail = document.querySelector(".scroll-rail");
  const scissors = document.getElementById("scissors");
  const bladeA = document.getElementById("bladeA");
  const bladeB = document.getElementById("bladeB");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (rail && !reduceMotion) {
    const railHeight = () => rail.getBoundingClientRect().height;
    const OPEN_ANGLE = 22;
    const SNIP_DURATION = 420;
    let snipStart = null;
    let snipRAF = null;

    function stepSnip(ts) {
      if (snipStart === null) snipStart = ts;
      const t = Math.min(1, (ts - snipStart) / SNIP_DURATION);
      const angle = OPEN_ANGLE * Math.sin(Math.PI * t);
      bladeA.setAttribute("transform", `rotate(${angle} 16 13)`);
      bladeB.setAttribute("transform", `rotate(${-angle} 16 13)`);
      if (t < 1) {
        snipRAF = requestAnimationFrame(stepSnip);
      } else {
        snipRAF = null;
        snipStart = null;
      }
    }

    function triggerSnip() {
      if (snipRAF === null) {
        snipRAF = requestAnimationFrame(stepSnip);
      } else {
        snipStart = null; // restart the easing curve without stopping the loop
      }
    }

    function onScroll() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;

      rail.style.setProperty("--progress", (pct * 100) + "%");
      scissors.style.top = (pct * railHeight()) + "px";
      triggerSnip();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  } else if (rail) {
    rail.style.display = "none";
  }

  // ---------- Gallery coverflow: centered slide scales up, others shrink ----------
  const galleryScroll = document.getElementById("galleryScroll");
  if (galleryScroll) {
    const frames = Array.from(galleryScroll.querySelectorAll(".gframe"));
    let ticking = false;

    function updateGalleryScale() {
      const rect = galleryScroll.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;

      frames.forEach((f) => {
        const fRect = f.getBoundingClientRect();
        const fCenter = fRect.left + fRect.width / 2;
        const dist = Math.abs(centerX - fCenter);
        const norm = Math.min(dist / (rect.width / 2), 1);
        const scale = 1.15 - norm * 0.55;   // active ≈1.15, edges ≈0.6
        const opacity = 1 - norm * 0.55;

        f.style.transform = `scale(${scale})`;
        f.style.opacity = f.classList.contains("in-view") ? opacity : 0;
        f.style.zIndex = Math.round((1 - norm) * 100);
      });
      ticking = false;
    }

    function requestUpdate() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateGalleryScale);
      }
    }

    galleryScroll.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("load", () => setTimeout(updateGalleryScale, 60));
    setTimeout(updateGalleryScale, 300);
  }

  // ---------- Reveal-on-scroll (.reveal elements + gallery frames) ----------
  const revealTargets = document.querySelectorAll(".reveal, .gframe");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          if (entry.target.classList.contains("gframe") && galleryScroll) {
            requestAnimationFrame(() =>
              galleryScroll.dispatchEvent(new Event("scroll"))
            );
          }
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("in-view"));
  }
})();
