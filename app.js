(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------

  // The query string is parsed once at load time; it can seed the language,
  // rules, and other settings below so a configuration can be shared via URL.
  const initialQuery = new URLSearchParams(window.location.search);

  /** @type {{id: number, pattern: string, matchType: "suffix"|"prefix"|"contains", color: string}[]} */
  let rules = [];
  let nextRuleId = 1;

  /** @type {{name: string, lat: number, lon: number, type?: "city"|"village"}[]} */
  const places = Array.isArray(window.POLAND_PLACES) ? window.POLAND_PLACES : [];

  /** @type {"all" | "city" | "village"} */
  let placeTypeFilter = validPlaceType(initialQuery.get("type")) || "all";

  /** @type {"dynamic" | "fixed"} */
  let markerSizeMode = validMarkerSizeMode(initialQuery.get("markerSize")) || "dynamic";
  let fixedMarkerRadius = validMarkerRadius(initialQuery.get("markerRadius")) ?? 6;

  let showPartitions = initialQuery.get("partitions") === "1";

  // ---------------------------------------------------------------------
  // i18n
  // ---------------------------------------------------------------------

  const LANG_STORAGE_KEY = "atlas-lang";

  const TRANSLATIONS = {
    pl: {
      title: "Atlas Końcówek — polskie nazwy miejscowości",
      metaDescription:
        "Interaktywna mapa Polski podświetlająca miejscowości wg końcówki nazwy (np. -ów, -owo, -ice) — 44 tys. miast i wsi, reguły dopasowania, nakładka granic zaborów.",
      appName: "Atlas Końcówek",
      subtitle: "Podświetlaj polskie miejscowości wg końcówki nazwy",
      loadingLabel: "Ładowanie danych…",
      panelToggleTitle: "Zwiń/rozwiń panel",
      panelHandleShow: "Pokaż filtry",
      panelHandleHide: "Pokaż mniej",
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
      overlaysHeading: "Nakładki mapy",
      partitionsLabel: "Pokaż granice zaborów (1815–1918)",
      partitionPruski: "Zabór pruski",
      partitionAustriacki: "Zabór austriacki",
      partitionRosyjski: "Zabór rosyjski",
      markerSizeHeading: "Rozmiar znaczników",
      dynamicSizeLabel: "Dynamiczny rozmiar (zależny od przybliżenia)",
      fixedSizeLabel: "Stały rozmiar",
      dataHeading: "Dane miejscowości",
      placeCountText: "Liczba wczytanych miejscowości: {count} — {source}.",
      sourcePoland:
        "miejscowości z Państwowego Rejestru Nazw Geograficznych (PRNG, CC BY 4.0 — zobacz README)",
      removeRuleTitle: "Usuń regułę",
      changeColorTitle: "Zmień kolor",
      noActiveRules: "Brak aktywnych reguł",
      matchesPattern: "pasuje do „{display}”",
      attributionHeading: "Źródła danych",
      attributionPlaces:
        "Miejscowości: Państwowy Rejestr Nazw Geograficznych (PRNG) via mbroton/polish-geonames, licencja CC BY 4.0.",
      attributionPartitions:
        "Granice zaborów: OpenHistoricalMap (CC0) + georgique/world-geojson (zarys Polski do przycięcia, GPL-3.0) — pochodna GPL-3.0.",
    },
    en: {
      title: "Suffix Atlas — Polish place names",
      metaDescription:
        "Interactive map of Poland highlighting place names by their ending (e.g. -ów, -owo, -ice) — 44k cities and villages, match rules, historical partition borders overlay.",
      appName: "Suffix Atlas",
      subtitle: "Highlight Polish place names by their ending",
      loadingLabel: "Loading data…",
      panelToggleTitle: "Collapse/expand panel",
      panelHandleShow: "Show filters",
      panelHandleHide: "Show less",
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
      overlaysHeading: "Map overlays",
      partitionsLabel: "Show partition borders (1815–1918)",
      partitionPruski: "Prussian partition",
      partitionAustriacki: "Austrian partition",
      partitionRosyjski: "Russian partition",
      markerSizeHeading: "Marker size",
      dynamicSizeLabel: "Dynamic size (based on zoom)",
      fixedSizeLabel: "Fixed size",
      dataHeading: "Place data",
      placeCountText: "Loaded places: {count} — {source}.",
      sourcePoland:
        "places from the National Register of Geographic Names (PRNG, CC BY 4.0 — see README)",
      removeRuleTitle: "Remove rule",
      changeColorTitle: "Change color",
      noActiveRules: "No active rules",
      matchesPattern: "matches „{display}”",
      attributionHeading: "Data sources",
      attributionPlaces:
        "Places: National Register of Geographic Names (PRNG) via mbroton/polish-geonames, CC BY 4.0 license.",
      attributionPartitions:
        "Partition borders: OpenHistoricalMap (CC0) + georgique/world-geojson (Poland outline used for clipping, GPL-3.0) — GPL-3.0 derivative.",
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

  let currentLang = validLang(initialQuery.get("lang")) || (loadStoredLang() === "en" ? "en" : "pl");

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
    document.querySelectorAll("[data-i18n-content]").forEach((el) => {
      el.setAttribute("content", t(el.getAttribute("data-i18n-content")));
    });
  }

  // ---------------------------------------------------------------------
  // URL query params (import/export settings via the URL)
  // ---------------------------------------------------------------------

  const VALID_MATCH_TYPES = new Set(["suffix", "prefix", "contains"]);

  function validLang(v) {
    return v === "pl" || v === "en" ? v : null;
  }

  function validPlaceType(v) {
    return v === "all" || v === "city" || v === "village" ? v : null;
  }

  function validMarkerSizeMode(v) {
    return v === "dynamic" || v === "fixed" ? v : null;
  }

  function validMarkerRadius(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(20, Math.max(1, Math.round(n))) : null;
  }

  function encodeRules(ruleList) {
    return ruleList
      .map((r) => `${r.matchType}:${encodeURIComponent(r.pattern)}:${encodeURIComponent(r.color)}`)
      .join(",");
  }

  /**
   * Parses the "rules" query param back into rule objects. Each rule is
   * encoded as "matchType:pattern:color", rules joined by commas; pattern
   * and color are individually URI-encoded so they can't collide with those
   * delimiters. Returns null (fall back to defaults) if absent or unusable.
   */
  function decodeRules(raw) {
    if (!raw) return null;
    try {
      const decoded = [];
      for (const part of raw.split(",")) {
        if (!part) continue;
        const [matchTypeRaw, patternRaw, colorRaw] = part.split(":");
        if (!patternRaw) continue;
        const pattern = decodeURIComponent(patternRaw);
        if (!pattern) continue;
        const matchType = VALID_MATCH_TYPES.has(matchTypeRaw) ? matchTypeRaw : "suffix";
        const color = colorRaw ? decodeURIComponent(colorRaw) : nextSuggestedColor();
        decoded.push({ id: nextRuleId++, pattern, matchType, color });
      }
      return decoded.length ? decoded : null;
    } catch {
      return null;
    }
  }

  /**
   * Mirrors the current settings into the URL's query string (via
   * replaceState, so it never adds history entries) so the page can be
   * bookmarked or shared to reproduce the same view.
   */
  function syncUrl() {
    const params = new URLSearchParams();
    params.set("lang", currentLang);
    params.set("type", placeTypeFilter);
    params.set("markerSize", markerSizeMode);
    if (markerSizeMode === "fixed") {
      params.set("markerRadius", String(fixedMarkerRadius));
    }
    if (showPartitions) {
      params.set("partitions", "1");
    }
    if (rules.length) {
      params.set("rules", encodeRules(rules));
    }
    const newSearch = "?" + params.toString();
    if (newSearch !== window.location.search) {
      history.replaceState(null, "", newSearch + window.location.hash);
    }
  }

  // ---------------------------------------------------------------------
  // Map setup
  // ---------------------------------------------------------------------

  const map = L.map("map", {
    zoomControl: true,
    // Smaller steps per +/- click and scroll tick (default is a full level).
    zoomSnap: 0.5,
    zoomDelta: 0.5,
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

  const PARTITION_COLORS = {
    pruski: "#b35806",
    austriacki: "#1b7837",
    rosyjski: "#2166ac",
  };
  const PARTITION_NAME_KEYS = {
    pruski: "partitionPruski",
    austriacki: "partitionAustriacki",
    rosyjski: "partitionRosyjski",
  };

  // A dedicated pane keeps the partition overlay under the markers (whose
  // default overlayPane sits at z-index 400) but above the tile layer.
  map.createPane("partitionsPane");
  map.getPane("partitionsPane").style.zIndex = 350;
  const partitionsLayer = L.geoJSON(window.PARTITIONS_GEOJSON || { type: "FeatureCollection", features: [] }, {
    pane: "partitionsPane",
    style: (feature) => ({
      color: PARTITION_COLORS[feature.properties.id] || "#888",
      weight: 1.5,
      fillColor: PARTITION_COLORS[feature.properties.id] || "#888",
      fillOpacity: 0.18,
    }),
    onEachFeature: (feature, layer) => {
      layer.bindTooltip(() => t(PARTITION_NAME_KEYS[feature.properties.id] || ""), {
        sticky: true,
        className: "place-tooltip",
      });
    },
  });

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
  const partitionsToggle = document.getElementById("partitions-toggle");
  const markerSizeDynamicToggle = document.getElementById("marker-size-dynamic");
  const markerSizeFixedRow = document.getElementById("marker-size-fixed-row");
  const markerSizeInput = document.getElementById("marker-size-input");
  const markerSizeValueEl = document.getElementById("marker-size-value");
  const panelEl = document.getElementById("panel");
  const panelToggleBtn = document.getElementById("panel-toggle");
  const panelHandleBtn = document.getElementById("panel-handle");
  const panelHandleLabelEl = document.getElementById("panel-handle-label");
  const langSwitchEl = document.getElementById("lang-switch");
  const placeCountLineEl = document.getElementById("place-count-line");

  // Colorblind-friendly-ish categorical palette, minus black (vanishes
  // against this dark sidebar) and minus yellow/green (blend into the
  // yellow/green/white map terrain). Used in order for the first rules;
  // once exhausted, new rules get a randomized color instead.
  const COLORBLIND_PALETTE = [
    "#e69f00", // orange
    "#56b4e9", // sky blue
    "#911eb4", // purple
    "#f032e6", // magenta
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
    // Skip the yellow/green band (~50-160°) so random colors stay visible
    // against the yellow/green/white map terrain.
    const hue = Math.floor(Math.random() * 250);
    const shiftedHue = (hue + 160) % 360;
    const saturation = 55 + Math.floor(Math.random() * 20); // 55-75%
    const lightness = 40 + Math.floor(Math.random() * 15); // 40-55%
    return hslToHex(shiftedHue, saturation, lightness);
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

  function render() {
    const { matched, counts } = computeMatches();
    renderMarkers(matched);
    renderRuleList(counts);
    renderLegend(counts);
    placeCountLineEl.textContent = t("placeCountText", {
      count: places.length,
      source: t("sourcePoland"),
    });
    syncUrl();
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

    syncUrl();
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

  partitionsToggle.addEventListener("change", () => {
    showPartitions = partitionsToggle.checked;
    if (showPartitions) {
      partitionsLayer.addTo(map);
    } else {
      partitionsLayer.remove();
    }
    syncUrl();
  });

  markerSizeDynamicToggle.addEventListener("change", () => {
    markerSizeMode = markerSizeDynamicToggle.checked ? "dynamic" : "fixed";
    markerSizeFixedRow.classList.toggle("hidden", markerSizeMode === "dynamic");
    applyMarkerRadius();
    syncUrl();
  });

  markerSizeInput.addEventListener("input", () => {
    fixedMarkerRadius = Number(markerSizeInput.value);
    markerSizeValueEl.textContent = `${fixedMarkerRadius}px`;
    if (markerSizeMode === "fixed") applyMarkerRadius();
    syncUrl();
  });

  function setPanelCollapsed(collapsed) {
    panelEl.classList.toggle("collapsed", collapsed);
    panelToggleBtn.setAttribute("aria-expanded", String(!collapsed));
    panelHandleBtn.setAttribute("aria-expanded", String(!collapsed));
    const labelKey = collapsed ? "panelHandleShow" : "panelHandleHide";
    panelHandleLabelEl.dataset.i18n = labelKey;
    panelHandleLabelEl.textContent = t(labelKey);
    // Collapsing/expanding the panel resizes the map container, but Leaflet
    // caches its viewport size and won't notice on its own.
    map.invalidateSize();
  }

  panelToggleBtn.addEventListener("click", () => {
    setPanelCollapsed(!panelEl.classList.contains("collapsed"));
  });

  panelHandleBtn.addEventListener("click", () => {
    setPanelCollapsed(!panelEl.classList.contains("collapsed"));
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
    render();
  }

  function syncTypeFilterUI() {
    const radio = typeFilterEl.querySelector(
      `input[name="place-type"][value="${placeTypeFilter}"]`
    );
    if (radio) radio.checked = true;
  }

  function syncMarkerSizeUI() {
    markerSizeDynamicToggle.checked = markerSizeMode === "dynamic";
    markerSizeFixedRow.classList.toggle("hidden", markerSizeMode === "dynamic");
    markerSizeInput.value = String(fixedMarkerRadius);
    markerSizeValueEl.textContent = `${fixedMarkerRadius}px`;
  }

  langSwitchEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".lang-switch__btn");
    if (!btn) return;
    setLanguage(btn.dataset.lang);
  });

  // ---------------------------------------------------------------------
  // Initial render
  // ---------------------------------------------------------------------

  // Rules can be imported from the URL's "rules" param (see decodeRules);
  // otherwise seed with two starter rules so the app shows something
  // meaningful on load.
  const queryRules = decodeRules(initialQuery.get("rules"));
  if (queryRules) {
    rules = queryRules;
  } else {
    rules.push({ id: nextRuleId++, pattern: "ów", matchType: "suffix", color: nextSuggestedColor() });
    rules.push({ id: nextRuleId++, pattern: "owo", matchType: "suffix", color: nextSuggestedColor() });
  }
  ruleColorInput.value = nextSuggestedColor();

  syncTypeFilterUI();
  syncMarkerSizeUI();
  partitionsToggle.checked = showPartitions;
  if (showPartitions) partitionsLayer.addTo(map);
  applyStaticTranslations();
  updateLangSwitchUI();
  render();

  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) loadingOverlay.classList.add("is-hidden");
})();
