(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------

  /** @type {{id: number, pattern: string, matchType: "suffix"|"prefix"|"contains", color: string}[]} */
  let rules = [];
  let nextRuleId = 1;

  /** @type {{name: string, lat: number, lon: number, type?: "city"|"village"}[]} */
  let places = [];

  /** @type {"poland" | "sample" | "custom"} */
  let dataSource = "sample";

  if (Array.isArray(window.POLAND_PLACES) && window.POLAND_PLACES.length) {
    places = window.POLAND_PLACES;
    dataSource = "poland";
  } else if (Array.isArray(window.SAMPLE_PLACES)) {
    places = window.SAMPLE_PLACES;
    dataSource = "sample";
  }

  /** @type {"all" | "city" | "village"} */
  let placeTypeFilter = "all";

  /** @type {"dynamic" | "fixed"} */
  let markerSizeMode = "dynamic";
  let fixedMarkerRadius = 6;

  // ---------------------------------------------------------------------
  // i18n
  // ---------------------------------------------------------------------

  const LANG_STORAGE_KEY = "atlas-lang";

  const TRANSLATIONS = {
    pl: {
      title: "Atlas Końcówek — polskie nazwy miejscowości",
      appName: "Atlas Końcówek",
      subtitle: "Podświetlaj polskie miejscowości wg końcówki nazwy",
      panelToggleTitle: "Zwiń/rozwiń panel",
      addRuleHeading: "Dodaj regułę",
      suffixPlaceholder: "np. ów lub owo",
      matchTypeTitle: "Rodzaj dopasowania",
      optionSuffix: "Końcówka",
      optionPrefix: "Początek",
      optionContains: "Zawiera",
      colorTitle: "Kolor podświetlenia",
      addButton: "Dodaj",
      addRuleHint:
        "Wielkość liter nie ma znaczenia. Reguły są sprawdzane od góry do dołu — wygrywa pierwsza pasująca nazwa.",
      activeRulesHeading: "Aktywne reguły",
      noRulesHint: "Brak reguł — dodaj jedną powyżej, aby zacząć podświetlanie.",
      placeTypeHeading: "Typ miejscowości",
      typeAll: "Wszystkie",
      typeCity: "Tylko miasta",
      typeVillage: "Tylko wsie",
      advancedSummary: "Zaawansowane",
      markerSizeHeading: "Rozmiar znaczników",
      dynamicSizeLabel: "Dynamiczny rozmiar (zależny od przybliżenia)",
      fixedSizeLabel: "Stały rozmiar",
      dataHeading: "Dane miejscowości",
      placeCountText: "Liczba wczytanych miejscowości: {count} — {source}.",
      sourcePoland:
        "miejscowości z Państwowego Rejestru Nazw Geograficznych (PRNG, CC BY 4.0 — zobacz README)",
      sourceSample: "przykładowych punktów (wymyślone placeholdery, nie prawdziwy wykaz)",
      sourceCustom: "punktów z wczytanego pliku",
      loadJsonFile: "Wczytaj plik JSON",
      pasteInstead: "Wklej JSON zamiast tego",
      loadPastedData: "Wczytaj wklejone dane",
      removeRuleTitle: "Usuń regułę",
      changeColorTitle: "Zmień kolor",
      noActiveRules: "Brak aktywnych reguł",
      matchesPattern: "pasuje do „{display}”",
      errNotArray: "Oczekiwano tablicy JSON z miejscowościami.",
      errInvalidEntry: "Wpis {index} nie zawiera poprawnej nazwy/lat/lon (otrzymano: {json})",
      errLoadFailed: "Nie udało się wczytać danych: {message}",
      errReadFailed: "Nie udało się odczytać pliku.",
    },
    en: {
      title: "Suffix Atlas — Polish place names",
      appName: "Suffix Atlas",
      subtitle: "Highlight Polish place names by their ending",
      panelToggleTitle: "Collapse/expand panel",
      addRuleHeading: "Add rule",
      suffixPlaceholder: "e.g. ów or owo",
      matchTypeTitle: "Match type",
      optionSuffix: "Ending",
      optionPrefix: "Beginning",
      optionContains: "Contains",
      colorTitle: "Highlight color",
      addButton: "Add",
      addRuleHint:
        "Case doesn't matter. Rules are checked top to bottom — the first matching name wins.",
      activeRulesHeading: "Active rules",
      noRulesHint: "No rules yet — add one above to start highlighting.",
      placeTypeHeading: "Place type",
      typeAll: "All",
      typeCity: "Cities only",
      typeVillage: "Villages only",
      advancedSummary: "Advanced",
      markerSizeHeading: "Marker size",
      dynamicSizeLabel: "Dynamic size (based on zoom)",
      fixedSizeLabel: "Fixed size",
      dataHeading: "Place data",
      placeCountText: "Loaded places: {count} — {source}.",
      sourcePoland:
        "places from the National Register of Geographic Names (PRNG, CC BY 4.0 — see README)",
      sourceSample: "sample points (made-up placeholders, not a real list)",
      sourceCustom: "points from the loaded file",
      loadJsonFile: "Load JSON file",
      pasteInstead: "Paste JSON instead",
      loadPastedData: "Load pasted data",
      removeRuleTitle: "Remove rule",
      changeColorTitle: "Change color",
      noActiveRules: "No active rules",
      matchesPattern: "matches „{display}”",
      errNotArray: "Expected a JSON array of places.",
      errInvalidEntry: "Entry {index} is missing a valid name/lat/lon (got: {json})",
      errLoadFailed: "Failed to load data: {message}",
      errReadFailed: "Failed to read the file.",
    },
  };

  function loadStoredLang() {
    try {
      return localStorage.getItem(LANG_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function storeLang(lang) {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore (e.g. private browsing with storage disabled).
    }
  }

  let currentLang = loadStoredLang() === "en" ? "en" : "pl";

  function t(key, vars) {
    let str = TRANSLATIONS[currentLang][key] ?? TRANSLATIONS.pl[key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        str = str.replaceAll(`{${name}}`, value);
      }
    }
    return str;
  }

  function applyStaticTranslations() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = t(el.getAttribute("data-i18n-title"));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
    });
  }

  // ---------------------------------------------------------------------
  // Map setup
  // ---------------------------------------------------------------------

  const map = L.map("map", {
    zoomControl: true,
    // Thousands of circle markers render far faster on canvas than SVG.
    preferCanvas: true,
  }).setView([52.0, 19.3], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Roughly constrain panning to the Poland area (generous padding).
  map.setMaxBounds([
    [45.0, 5.0],
    [59.0, 33.0],
  ]);

  const markerLayer = L.layerGroup().addTo(map);

  map.on("zoomend", applyMarkerRadius);

  const legendControl = L.control({ position: "topright" });
  legendControl.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.id = "legend";
    return div;
  };
  legendControl.addTo(map);

  // ---------------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------------

  const ruleForm = document.getElementById("rule-form");
  const ruleSuffixInput = document.getElementById("rule-suffix");
  const ruleMatchTypeSelect = document.getElementById("rule-match-type");
  const ruleColorInput = document.getElementById("rule-color");
  const ruleListEl = document.getElementById("rule-list");
  const ruleEmptyEl = document.getElementById("rule-empty");
  const typeFilterEl = document.getElementById("type-filter");
  const fileInput = document.getElementById("file-input");
  const pasteToggle = document.getElementById("paste-toggle");
  const pasteArea = document.getElementById("paste-area");
  const pasteButtons = document.getElementById("paste-buttons");
  const pasteLoadBtn = document.getElementById("paste-load");
  const dataErrorEl = document.getElementById("data-error");
  const markerSizeDynamicToggle = document.getElementById("marker-size-dynamic");
  const markerSizeFixedRow = document.getElementById("marker-size-fixed-row");
  const markerSizeInput = document.getElementById("marker-size-input");
  const markerSizeValueEl = document.getElementById("marker-size-value");
  const panelEl = document.getElementById("panel");
  const panelToggleBtn = document.getElementById("panel-toggle");
  const langSwitchEl = document.getElementById("lang-switch");
  const placeCountLineEl = document.getElementById("place-count-line");

  // Colorblind-friendly categorical palette (Okabe-Ito, minus black — a black
  // swatch would vanish against this dark sidebar). Used in order for the
  // first rules; once exhausted, new rules get a randomized color instead.
  const COLORBLIND_PALETTE = [
    "#e69f00", // orange
    "#56b4e9", // sky blue
    "#009e73", // bluish green
    "#f0e442", // yellow
    "#0072b2", // blue
    "#d55e00", // vermillion
    "#cc79a7", // reddish purple
  ];
  let colorsUsedCount = 0;

  function nextSuggestedColor() {
    const color =
      colorsUsedCount < COLORBLIND_PALETTE.length
        ? COLORBLIND_PALETTE[colorsUsedCount]
        : randomColor();
    colorsUsedCount++;
    return color;
  }

  function randomColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 55 + Math.floor(Math.random() * 20); // 55-75%
    const lightness = 40 + Math.floor(Math.random() * 15); // 40-55%
    return hslToHex(hue, saturation, lightness);
  }

  function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

  // ---------------------------------------------------------------------
  // Matching logic
  // ---------------------------------------------------------------------

  /**
   * Returns the first rule whose pattern matches the given name, or null.
   * Matching is case-insensitive and diacritic-sensitive (ów !== ow).
   */
  function matchRule(name) {
    const lower = name.toLowerCase();
    for (const rule of rules) {
      const pattern = rule.pattern.toLowerCase();
      if (!pattern) continue;
      if (rule.matchType === "prefix" && lower.startsWith(pattern)) return rule;
      if (rule.matchType === "contains" && lower.includes(pattern)) return rule;
      if ((rule.matchType || "suffix") === "suffix" && lower.endsWith(pattern)) return rule;
    }
    return null;
  }

  /**
   * Renders a rule's pattern with ellipses showing where it must appear in
   * a name, e.g. "…ów" for a suffix or "Kra…" for a prefix.
   */
  function formatPatternDisplay(rule) {
    const escaped = escapeHtml(rule.pattern);
    if (rule.matchType === "prefix") return `${escaped}…`;
    if (rule.matchType === "contains") return `…${escaped}…`;
    return `…${escaped}`;
  }

  function passesTypeFilter(place) {
    if (placeTypeFilter === "all") return true;
    // Places without type info (sample/custom data) are never hidden by the
    // filter -- we simply don't know what they are.
    if (!place.type) return true;
    return place.type === placeTypeFilter;
  }

  /**
   * Single pass over all places: computes which ones to render (with their
   * matched rule) and a per-rule match count, so the three views below don't
   * each re-scan the whole dataset separately.
   */
  function computeMatches() {
    const counts = new Map(rules.map((r) => [r.id, 0]));
    const matched = [];

    for (const place of places) {
      if (typeof place.lat !== "number" || typeof place.lon !== "number") continue;
      if (!passesTypeFilter(place)) continue;

      const rule = matchRule(place.name || "");
      if (!rule) continue;

      counts.set(rule.id, (counts.get(rule.id) || 0) + 1);
      matched.push({ place, rule });
    }

    return { matched, counts };
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------

  const SOURCE_LABEL_KEYS = {
    poland: "sourcePoland",
    sample: "sourceSample",
    custom: "sourceCustom",
  };

  function render() {
    const { matched, counts } = computeMatches();
    renderMarkers(matched);
    renderRuleList(counts);
    renderLegend(counts);
    placeCountLineEl.textContent = t("placeCountText", {
      count: places.length,
      source: t(SOURCE_LABEL_KEYS[dataSource] || "sourceCustom"),
    });
  }

  // Marker radius grows with zoom: 1px fully zoomed out, up to 10px by the
  // time towns are spread out enough to tell apart (around zoom 11).
  const MARKER_RADIUS_MIN = 1;
  const MARKER_RADIUS_MAX = 10;
  const MARKER_RADIUS_MIN_ZOOM = 6;
  const MARKER_RADIUS_MAX_ZOOM = 11;

  function getMarkerRadius(zoom) {
    if (zoom <= MARKER_RADIUS_MIN_ZOOM) return MARKER_RADIUS_MIN;
    if (zoom >= MARKER_RADIUS_MAX_ZOOM) return MARKER_RADIUS_MAX;
    const ratio =
      (zoom - MARKER_RADIUS_MIN_ZOOM) /
      (MARKER_RADIUS_MAX_ZOOM - MARKER_RADIUS_MIN_ZOOM);
    return MARKER_RADIUS_MIN + ratio * (MARKER_RADIUS_MAX - MARKER_RADIUS_MIN);
  }

  function getCurrentRadius() {
    return markerSizeMode === "fixed"
      ? fixedMarkerRadius
      : getMarkerRadius(map.getZoom());
  }

  function applyMarkerRadius() {
    const radius = getCurrentRadius();
    markerLayer.eachLayer((marker) => marker.setRadius(radius));
  }

  function renderMarkers(matched) {
    markerLayer.clearLayers();

    const radius = getCurrentRadius();

    for (const { place, rule } of matched) {
      const marker = L.circleMarker([place.lat, place.lon], {
        radius,
        color: rule.color,
        weight: 2,
        fillColor: rule.color,
        fillOpacity: 0.85,
      });
      marker.ruleId = rule.id;

      const label = `<strong>${escapeHtml(place.name)}</strong><br/>${t("matchesPattern", { display: formatPatternDisplay(rule) })}`;
      marker.bindTooltip(label, { className: "place-tooltip" });
      marker.addTo(markerLayer);
    }
  }

  function renderRuleList(counts) {
    ruleListEl.innerHTML = "";

    if (rules.length === 0) {
      ruleEmptyEl.classList.remove("hidden");
      return;
    }
    ruleEmptyEl.classList.add("hidden");

    for (const rule of rules) {
      const count = counts.get(rule.id) || 0;

      const li = document.createElement("li");
      li.className = "rule-item";
      li.innerHTML = `
        <input type="color" class="rule-item__swatch" value="${rule.color}" title="${t("changeColorTitle")}" />
        <span class="rule-item__suffix">${formatPatternDisplay(rule)}</span>
        <span class="rule-item__count">${count}</span>
        <button class="rule-item__remove" title="${t("removeRuleTitle")}" aria-label="${t("removeRuleTitle")}">&times;</button>
      `;
      li.querySelector(".rule-item__swatch").addEventListener("input", (e) => {
        onRuleColorChange(rule, e.target.value);
      });
      li.querySelector(".rule-item__remove").addEventListener("click", () => {
        rules = rules.filter((r) => r.id !== rule.id);
        render();
      });
      ruleListEl.appendChild(li);
    }
  }

  function renderLegend(counts) {
    const legend = document.getElementById("legend");
    if (!legend) return;

    if (rules.length === 0) {
      legend.innerHTML = `<div class="legend__row">${t("noActiveRules")}</div>`;
      return;
    }

    legend.innerHTML = rules
      .map((rule) => {
        const count = counts.get(rule.id) || 0;
        return `
          <div class="legend__row">
            <span class="legend__dot" data-rule-id="${rule.id}" style="background:${rule.color}"></span>
            <span>${formatPatternDisplay(rule)} (${count})</span>
          </div>
        `;
      })
      .join("");
  }

  /**
   * Applies a color edit to an existing rule in place: updates already
   * rendered markers and the legend dot directly, without rebuilding the
   * rule list (which would interrupt the open color picker).
   */
  function onRuleColorChange(rule, newColor) {
    rule.color = newColor;

    markerLayer.eachLayer((marker) => {
      if (marker.ruleId === rule.id) {
        marker.setStyle({ color: newColor, fillColor: newColor });
      }
    });

    const dot = document.querySelector(`.legend__dot[data-rule-id="${rule.id}"]`);
    if (dot) dot.style.background = newColor;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---------------------------------------------------------------------
  // Event handlers: rules
  // ---------------------------------------------------------------------

  ruleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const pattern = ruleSuffixInput.value.trim();
    if (!pattern) return;

    rules.push({
      id: nextRuleId++,
      pattern,
      matchType: ruleMatchTypeSelect.value,
      color: ruleColorInput.value,
    });

    ruleSuffixInput.value = "";
    ruleColorInput.value = nextSuggestedColor();

    render();
  });

  typeFilterEl.addEventListener("change", (e) => {
    if (e.target.name !== "place-type") return;
    placeTypeFilter = e.target.value;
    render();
  });

  markerSizeDynamicToggle.addEventListener("change", () => {
    markerSizeMode = markerSizeDynamicToggle.checked ? "dynamic" : "fixed";
    markerSizeFixedRow.classList.toggle("hidden", markerSizeMode === "dynamic");
    applyMarkerRadius();
  });

  markerSizeInput.addEventListener("input", () => {
    fixedMarkerRadius = Number(markerSizeInput.value);
    markerSizeValueEl.textContent = `${fixedMarkerRadius}px`;
    if (markerSizeMode === "fixed") applyMarkerRadius();
  });

  panelToggleBtn.addEventListener("click", () => {
    const collapsed = panelEl.classList.toggle("collapsed");
    panelToggleBtn.setAttribute("aria-expanded", String(!collapsed));
    // Collapsing/expanding the panel resizes the map container, but Leaflet
    // caches its viewport size and won't notice on its own.
    map.invalidateSize();
  });

  function updateLangSwitchUI() {
    langSwitchEl.querySelectorAll(".lang-switch__btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === currentLang);
    });
  }

  function setLanguage(lang) {
    if (lang !== "pl" && lang !== "en") return;
    currentLang = lang;
    storeLang(lang);
    applyStaticTranslations();
    updateLangSwitchUI();
    setDataError(lastErrorKey, lastErrorVars);
    render();
  }

  langSwitchEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".lang-switch__btn");
    if (!btn) return;
    setLanguage(btn.dataset.lang);
  });

  // ---------------------------------------------------------------------
  // Event handlers: data loading
  // ---------------------------------------------------------------------

  let lastErrorKey = null;
  let lastErrorVars = null;

  function setDataError(key, vars) {
    lastErrorKey = key;
    lastErrorVars = vars;
    if (!key) {
      dataErrorEl.classList.add("hidden");
      dataErrorEl.textContent = "";
      return;
    }
    dataErrorEl.textContent = t(key, vars);
    dataErrorEl.classList.remove("hidden");
  }

  /**
   * Accepts an array of objects and normalizes to {name, lat, lon, type?}.
   * Supports "lon" or "lng" as the longitude key.
   */
  function normalizePlaces(raw) {
    if (!Array.isArray(raw)) {
      throw new Error(t("errNotArray"));
    }
    return raw.map((entry, i) => {
      const name = entry.name ?? entry.town ?? entry.city;
      const lat = Number(entry.lat ?? entry.latitude);
      const lon = Number(entry.lon ?? entry.lng ?? entry.longitude);
      const type =
        entry.type === "city" || entry.type === "village" ? entry.type : undefined;

      if (!name || Number.isNaN(lat) || Number.isNaN(lon)) {
        throw new Error(
          t("errInvalidEntry", { index: i, json: JSON.stringify(entry) })
        );
      }
      return { name: String(name), lat, lon, type };
    });
  }

  function loadPlacesFromJsonText(text) {
    try {
      const parsed = JSON.parse(text);
      const normalized = normalizePlaces(parsed);
      places = normalized;
      dataSource = "custom";
      setDataError(null);
      render();
      map.fitBounds(
        L.latLngBounds(places.map((p) => [p.lat, p.lon])),
        { padding: [30, 30] }
      );
    } catch (err) {
      setDataError("errLoadFailed", { message: err.message });
    }
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadPlacesFromJsonText(String(reader.result));
    reader.onerror = () => setDataError("errReadFailed");
    reader.readAsText(file);
  });

  pasteToggle.addEventListener("click", () => {
    pasteArea.classList.toggle("hidden");
    pasteButtons.classList.toggle("hidden");
  });

  pasteLoadBtn.addEventListener("click", () => {
    loadPlacesFromJsonText(pasteArea.value);
  });

  // ---------------------------------------------------------------------
  // Initial render
  // ---------------------------------------------------------------------

  // Seed with two starter rules so the app shows something meaningful on load.
  rules.push({ id: nextRuleId++, pattern: "ów", matchType: "suffix", color: nextSuggestedColor() });
  rules.push({ id: nextRuleId++, pattern: "owo", matchType: "suffix", color: nextSuggestedColor() });
  ruleColorInput.value = nextSuggestedColor();

  applyStaticTranslations();
  updateLangSwitchUI();
  render();
})();
