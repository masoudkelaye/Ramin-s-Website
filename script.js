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

  // ---------- Scroll-progress "snipping" scissors ----------
  const rail = document.querySelector(".scroll-rail");
  const scissors = document.getElementById("scissors");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (rail && !reduceMotion) {
    let snipTimeout = null;
    const railHeight = () => rail.getBoundingClientRect().height;

    function onScroll() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;

      rail.style.setProperty("--progress", (pct * 100) + "%");
      scissors.style.top = (pct * railHeight()) + "px";

      scissors.classList.add("snip");
      clearTimeout(snipTimeout);
      snipTimeout = setTimeout(() => scissors.classList.remove("snip"), 380);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  } else if (rail) {
    rail.style.display = "none";
  }

  // ---------- Reveal-on-scroll (gallery frames + .reveal elements) ----------
  const revealTargets = document.querySelectorAll(".reveal, .gframe");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("in-view"));
  }
})();
