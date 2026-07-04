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
})();
