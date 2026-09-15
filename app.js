(function () {
  "use strict";

  const ALL_PLACE_TYPES = ["city", "village", "osada"];

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------

  // The URL is parsed once at load time so a configuration can be shared as
  // a link. Language lives in the query string (short, human-readable,
  // worth keeping visible); everything else lives in the hash so the query
  // string doesn't balloon with rule/marker/partition settings.
  const initialQuery = new URLSearchParams(window.location.search);
  const initialHash = new URLSearchParams(window.location.hash.slice(1));

  /** @type {{id: number, pattern: string, matchType: "suffix"|"prefix"|"contains"|"exact", color: string}[]} */
  let rules = [];
  let nextRuleId = 1;

  /** @type {{name: string, lat: number, lon: number, type?: "city"|"village"|"osada"}[]} */
  const places = Array.isArray(window.POLAND_PLACES) ? window.POLAND_PLACES : [];

  /** @type {Set<"city" | "village" | "osada">} */
  let placeTypeFilter = parsePlaceTypeFilter(initialHash.get("types"));

  /** @type {"dynamic" | "fixed"} */
  let markerSizeMode = validMarkerSizeMode(initialHash.get("markerSize")) || "dynamic";
  let fixedMarkerRadius = validMarkerRadius(initialHash.get("markerRadius")) ?? 6;

  let showPartitions = initialHash.get("partitions") === "1";

  // ---------------------------------------------------------------------
  // i18n
  // ---------------------------------------------------------------------

  const LANG_STORAGE_KEY = "atlas-lang";

  const TRANSLATIONS = {
    pl: {
      title: "Atlas Nazw Miejscowości — polskie nazwy miejscowości",
      metaDescription:
        "Interaktywna mapa Polski podświetlająca miejscowości wg końcówki nazwy (np. -ów, -owo, -ice) — 44 tys. miast i wsi, reguły dopasowania, nakładka granic zaborów.",
      appName: "Atlas Nazw Miejscowości",
      subtitle: "Podświetlaj miejscowości wg nazwy",
      loadingLabel: "Ładowanie danych…",
      panelToggleTitle: "Zwiń/rozwiń panel",
      panelHandleShow: "Pokaż menu",
      panelHandleHide: "Ukryj menu",
      addRuleHeading: "Dodaj regułę",
      suffixPlaceholder: "np. ów lub owo",
      matchTypeTitle: "Rodzaj dopasowania",
      optionSuffix: "Końcówka",
      optionPrefix: "Początek",
      optionContains: "Zawiera",
      optionExact: "Dokładnie",
      colorTitle: "Kolor podświetlenia",
      colorLabel: "Kolor",
      addButton: "Dodaj",
      addRuleButton: "Dodaj regułę",
      addRuleSuccess: "✓ Dodano!",
      addRuleDuplicate: "Już dodano!",
      addRuleHint:
        "Wielkość liter nie ma znaczenia. Reguły są sprawdzane od góry do dołu — wygrywa pierwsza pasująca nazwa.",
      activeRulesHeading: "Aktywne reguły",
      noRulesHint: "Brak reguł — dodaj jedną powyżej, aby zacząć podświetlanie.",
      placeTypeHeading: "Typ miejscowości",
      typeCity: "Miasto",
      typeVillage: "Wieś",
      typeOsada: "Osada",
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
      hideRuleTitle: "Ukryj na mapie",
      showRuleTitle: "Pokaż na mapie",
      noActiveRules: "Brak aktywnych reguł",
      matchesPattern: "pasuje do „{display}”",
      aboutHeading: "O projekcie",
      attributionHeading: "Źródła danych",
      attributionPlaces:
        "Miejscowości: Państwowy Rejestr Nazw Geograficznych (PRNG), licencja CC BY 4.0 — miasta i wsie via mbroton/polish-geonames, osady wyodrębnione bezpośrednio z eksportu PRNG.",
      attributionPartitions:
        "Granice zaborów: OpenHistoricalMap (CC0) + georgique/world-geojson (zarys Polski do przycięcia, GPL-3.0) — pochodna GPL-3.0.",
    },
    en: {
      title: "Town Name Atlas — Polish place names",
      metaDescription:
        "Interactive map of Poland highlighting place names by their ending (e.g. -ów, -owo, -ice) — 44k cities and villages, match rules, historical partition borders overlay.",
      appName: "Town Name Atlas",
      subtitle: "Highlight place names by their ending",
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
      optionExact: "Exact",
      colorTitle: "Highlight color",
      colorLabel: "Color",
      addButton: "Add",
      addRuleButton: "Add rule",
      addRuleSuccess: "✓ Added!",
      addRuleDuplicate: "Already added!",
      addRuleHint:
        "Case doesn't matter. Rules are checked top to bottom — the first matching name wins.",
      activeRulesHeading: "Active rules",
      noRulesHint: "No rules yet — add one above to start highlighting.",
      placeTypeHeading: "Place type",
      typeCity: "City",
      typeVillage: "Village",
      typeOsada: "Osada",
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
      hideRuleTitle: "Hide on map",
      showRuleTitle: "Show on map",
      noActiveRules: "No active rules",
      matchesPattern: "matches „{display}”",
      aboutHeading: "About",
      attributionHeading: "Data sources",
      attributionPlaces:
        "Places: National Register of Geographic Names (PRNG), CC BY 4.0 license — cities and villages via mbroton/polish-geonames, osady extracted directly from the PRNG export.",
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

  const VALID_MATCH_TYPES = new Set(["suffix", "prefix", "contains", "exact"]);

  function validLang(v) {
    return v === "pl" || v === "en" ? v : null;
  }

  /**
   * Parses the "types" hash param (a comma-separated list of place types)
   * into a Set. Falls back to all types selected if absent or unusable, so
   * the type-filter checkboxes default to "everything checked".
   */
  function parsePlaceTypeFilter(v) {
    if (!v) return new Set(ALL_PLACE_TYPES);
    const parsed = v.split(",").filter((part) => ALL_PLACE_TYPES.includes(part));
    return new Set(parsed.length ? parsed : ALL_PLACE_TYPES);
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
   * Mirrors the current settings into the URL (via replaceState, so it
   * never adds history entries) so the page can be bookmarked or shared to
   * reproduce the same view. Language stays a query param; everything else
   * moves into the hash so the query string doesn't balloon with rules.
   */
  function syncUrl() {
    const queryParams = new URLSearchParams();
    queryParams.set("lang", currentLang);
    const newSearch = "?" + queryParams.toString();

    const hashParams = new URLSearchParams();
    hashParams.set("types", Array.from(placeTypeFilter).join(","));
    hashParams.set("markerSize", markerSizeMode);
    if (markerSizeMode === "fixed") {
      hashParams.set("markerRadius", String(fixedMarkerRadius));
    }
    if (showPartitions) {
      hashParams.set("partitions", "1");
    }
    if (rules.length) {
      hashParams.set("rules", encodeRules(rules));
    }
    const newHash = "#" + hashParams.toString();

    if (newSearch !== window.location.search || newHash !== window.location.hash) {
      history.replaceState(null, "", newSearch + newHash);
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
  });
  // Fit to Poland's actual extent rather than a fixed zoom level, so narrow
  // (mobile portrait) viewports zoom out further and still show it in full.
  map.fitBounds([
    [49.0, 14.1],
    [54.9, 24.15],
  ]);

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

  // Let the legend be dragged and enlarged on desktop, so it can be
  // repositioned and made more legible for screenshots. Mobile has no
  // mouse, so this is skipped there. A custom resize handle is used
  // instead of the native CSS `resize` property, which doesn't play well
  // with the flex-positioned Leaflet control corner it lives in.
  const legendEl = document.getElementById("legend");
  const LEGEND_RESIZE_HANDLE_HOTZONE = 16;
  const LEGEND_MIN_WIDTH = 100;
  const LEGEND_MIN_HEIGHT = 32;
  // Must match .legend's font-size/line-height in style.css: the scale
  // factor is "how much taller is each row than it is by default".
  const LEGEND_BASE_FONT_SIZE = 12.5;
  const LEGEND_LINE_HEIGHT = 1.7;
  const LEGEND_MAX_FONT_SCALE = 4;
  let legendManuallySized = false;
  let legendRowCount = 1;

  // Once the box has been manually resized, text and dots (sized in `em`,
  // see .legend__dot) scale up to fill any extra vertical space beyond
  // what the current rows need at the default size — never below it, so
  // a box too small for its content just scrolls instead of shrinking text.
  function updateLegendFontScale() {
    if (!legendManuallySized) {
      legendEl.style.fontSize = "";
      return;
    }
    const cs = getComputedStyle(legendEl);
    const verticalChrome =
      parseFloat(cs.paddingTop) +
      parseFloat(cs.paddingBottom) +
      parseFloat(cs.borderTopWidth) +
      parseFloat(cs.borderBottomWidth);
    const availableHeight = legendEl.getBoundingClientRect().height - verticalChrome;
    const heightPerRow = availableHeight / legendRowCount;
    const naturalHeightPerRow = LEGEND_BASE_FONT_SIZE * LEGEND_LINE_HEIGHT;
    const scale = Math.min(LEGEND_MAX_FONT_SCALE, Math.max(1, heightPerRow / naturalHeightPerRow));
    legendEl.style.fontSize = `${LEGEND_BASE_FONT_SIZE * scale}px`;
  }

  legendEl.addEventListener("mousedown", (e) => {
    if (!window.matchMedia("(min-width: 761px)").matches) return;

    const rect = legendEl.getBoundingClientRect();
    const nearResizeHandle =
      rect.right - e.clientX < LEGEND_RESIZE_HANDLE_HOTZONE &&
      rect.bottom - e.clientY < LEGEND_RESIZE_HANDLE_HOTZONE;

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;

    if (nearResizeHandle) {
      const startWidth = rect.width;
      const startHeight = rect.height;
      legendEl.classList.add("legend--dragging");

      function onResizeMove(moveEvent) {
        legendManuallySized = true;
        legendEl.style.width = `${Math.max(LEGEND_MIN_WIDTH, startWidth + (moveEvent.clientX - startX))}px`;
        legendEl.style.height = `${Math.max(LEGEND_MIN_HEIGHT, startHeight + (moveEvent.clientY - startY))}px`;
        updateLegendFontScale();
      }
      function onResizeUp() {
        document.removeEventListener("mousemove", onResizeMove);
        document.removeEventListener("mouseup", onResizeUp);
        legendEl.classList.remove("legend--dragging");
      }
      document.addEventListener("mousemove", onResizeMove);
      document.addEventListener("mouseup", onResizeUp);
      return;
    }

    const startLeft = rect.left;
    const startTop = rect.top;

    legendEl.style.position = "fixed";
    legendEl.style.left = `${startLeft}px`;
    legendEl.style.top = `${startTop}px`;
    legendEl.style.right = "auto";
    legendEl.style.margin = "0";
    legendEl.classList.add("legend--dragging");

    function onMove(moveEvent) {
      legendEl.style.left = `${startLeft + (moveEvent.clientX - startX)}px`;
      legendEl.style.top = `${startTop + (moveEvent.clientY - startY)}px`;
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      legendEl.classList.remove("legend--dragging");
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  // ---------------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------------

  const ruleForm = document.getElementById("rule-form");
  const ruleSuffixInput = document.getElementById("rule-suffix");
  const ruleMatchTypeSelect = document.getElementById("rule-match-type");
  const ruleColorInput = document.getElementById("rule-color");
  const ruleAddButton = document.getElementById("rule-add-button");
  const ruleHintIcon = document.getElementById("rule-hint-icon");
  const ruleHintTooltip = document.getElementById("rule-hint-tooltip");
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
  // Nice palette colors not currently assigned to a rule, most-preferred
  // first. Starts as the full palette in order; when a rule using a palette
  // color is deleted, its color is returned to the front so it's suggested
  // again right away.
  let paletteQueue = [...COLORBLIND_PALETTE];
  // Colors freed by deleting a rule that used a non-palette (random) color.
  // Only offered once the palette queue is empty, since palette colors are
  // preferred.
  let returnedColorQueue = [];

  function nextSuggestedColor() {
    if (paletteQueue.length > 0) return paletteQueue.shift();
    if (returnedColorQueue.length > 0) return returnedColorQueue.shift();
    return randomColor();
  }

  /** Makes a rule's color available again after the rule is deleted. */
  function releaseColor(color) {
    if (COLORBLIND_PALETTE.includes(color)) {
      paletteQueue.unshift(color);
    } else {
      returnedColorQueue.unshift(color);
    }
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
      if (rule.matchType === "exact" && lower === pattern) return rule;
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
    if (rule.matchType === "exact") return escaped;
    return `…${escaped}`;
  }

  function passesTypeFilter(place) {
    // Places without type info (sample/custom data) are never hidden by the
    // filter -- we simply don't know what they are.
    if (!place.type) return true;
    return placeTypeFilter.has(place.type);
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
      if (rule.hidden) continue;

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

  const EYE_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const EYE_OFF_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.4 20.4 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a20.32 20.32 0 0 1-3.22 4.44"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  function renderRuleList(counts) {
    ruleListEl.innerHTML = "";

    if (rules.length === 0) {
      ruleEmptyEl.classList.remove("hidden");
      return;
    }
    ruleEmptyEl.classList.add("hidden");

    for (const rule of rules) {
      const count = counts.get(rule.id) || 0;
      const visibilityTitle = t(rule.hidden ? "showRuleTitle" : "hideRuleTitle");

      const li = document.createElement("li");
      li.className = "rule-item" + (rule.hidden ? " rule-item--hidden" : "");
      li.innerHTML = `
        <input type="color" class="rule-item__swatch" value="${rule.color}" title="${t("changeColorTitle")}" />
        <span class="rule-item__suffix">${formatPatternDisplay(rule)}</span>
        <button class="rule-item__visibility" title="${visibilityTitle}" aria-label="${visibilityTitle}">${rule.hidden ? EYE_OFF_ICON : EYE_ICON}</button>
        <span class="rule-item__count">${count}</span>
        <button class="rule-item__remove" title="${t("removeRuleTitle")}" aria-label="${t("removeRuleTitle")}">&times;</button>
      `;
      li.querySelector(".rule-item__swatch").addEventListener("input", (e) => {
        onRuleColorChange(rule, e.target.value);
      });
      li.querySelector(".rule-item__visibility").addEventListener("click", () => {
        rule.hidden = !rule.hidden;
        render();
      });
      li.querySelector(".rule-item__remove").addEventListener("click", () => {
        releaseColor(rule.color);
        ruleColorInput.value = nextSuggestedColor();
        rules = rules.filter((r) => r.id !== rule.id);
        render();
      });
      ruleListEl.appendChild(li);
    }
  }

  function renderLegend(counts) {
    const legend = document.getElementById("legend");
    if (!legend) return;

    legendRowCount = rules.length === 0 ? 1 : rules.length;

    if (rules.length === 0) {
      legend.innerHTML = `<div class="legend__row">${t("noActiveRules")}</div>`;
    } else {
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

    // A rule may have been added/removed since the box was manually
    // resized: re-fit the text/dot scale to the (possibly changed) row
    // count within the same box size the user chose.
    updateLegendFontScale();
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

  // Native `title` tooltips don't respond to a tap on touch devices, so the
  // hint icon also toggles a visible tooltip on click for mobile users.
  ruleHintIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    ruleHintTooltip.classList.toggle("visible");
  });

  document.addEventListener("click", () => {
    ruleHintTooltip.classList.remove("visible");
  });

  let ruleAddFeedbackTimeout = null;

  function showRuleFeedback(className, textKey) {
    clearTimeout(ruleAddFeedbackTimeout);
    ruleAddButton.classList.remove("rule-form__add--success", "rule-form__add--duplicate");
    ruleAddButton.classList.add(className);
    ruleAddButton.textContent = t(textKey);
    ruleAddFeedbackTimeout = setTimeout(() => {
      ruleAddButton.classList.remove(className);
      ruleAddButton.textContent = t("addRuleButton");
    }, 1400);
  }

  // Phones auto-capitalize the first letter of a text field, which turns
  // e.g. "ino" into "Ino" (easily misread as "Ino"/"lno"). Rules already
  // match case-insensitively, so the field is forced to lowercase as you
  // type to avoid the confusing capital.
  ruleSuffixInput.addEventListener("input", () => {
    const { selectionStart, selectionEnd } = ruleSuffixInput;
    ruleSuffixInput.value = ruleSuffixInput.value.toLowerCase();
    ruleSuffixInput.setSelectionRange(selectionStart, selectionEnd);
  });

  function isDuplicateRule(pattern, matchType) {
    const lowerPattern = pattern.toLowerCase();
    return rules.some(
      (r) => r.matchType === matchType && r.pattern.toLowerCase() === lowerPattern
    );
  }

  ruleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const pattern = ruleSuffixInput.value;
    if (!pattern.trim()) return;

    const matchType = ruleMatchTypeSelect.value;
    if (isDuplicateRule(pattern, matchType)) {
      showRuleFeedback("rule-form__add--duplicate", "addRuleDuplicate");
      return;
    }

    rules.push({
      id: nextRuleId++,
      pattern,
      matchType,
      color: ruleColorInput.value,
    });

    ruleSuffixInput.value = "";
    ruleColorInput.value = nextSuggestedColor();

    render();
    showRuleFeedback("rule-form__add--success", "addRuleSuccess");
  });

  typeFilterEl.addEventListener("change", (e) => {
    if (e.target.name !== "place-type") return;
    if (e.target.checked) {
      placeTypeFilter.add(e.target.value);
    } else {
      placeTypeFilter.delete(e.target.value);
    }
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
    typeFilterEl.querySelectorAll('input[name="place-type"]').forEach((checkbox) => {
      checkbox.checked = placeTypeFilter.has(checkbox.value);
    });
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
  const queryRules = decodeRules(initialHash.get("rules"));
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

  if (window.matchMedia("(max-width: 760px)").matches) {
    setPanelCollapsed(true);
  }

  const loadingOverlay = document.getElementById("loading-overlay");
  if (loadingOverlay) loadingOverlay.classList.add("is-hidden");
})();
