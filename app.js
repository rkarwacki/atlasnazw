(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------

  /** @type {{id: number, suffix: string, color: string}[]} */
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
    [48.5, 12.0],
    [55.5, 26.0],
  ]);

  const markerLayer = L.layerGroup().addTo(map);

  const legendControl = L.control({ position: "bottomleft" });
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
  const ruleColorInput = document.getElementById("rule-color");
  const ruleListEl = document.getElementById("rule-list");
  const ruleEmptyEl = document.getElementById("rule-empty");
  const typeFilterEl = document.getElementById("type-filter");
  const placeCountEl = document.getElementById("place-count");
  const placeSourceLabelEl = document.getElementById("place-source-label");
  const fileInput = document.getElementById("file-input");
  const pasteToggle = document.getElementById("paste-toggle");
  const pasteArea = document.getElementById("paste-area");
  const pasteButtons = document.getElementById("paste-buttons");
  const pasteLoadBtn = document.getElementById("paste-load");
  const dataErrorEl = document.getElementById("data-error");

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
   * Returns the first rule whose suffix matches the given name, or null.
   * Matching is case-insensitive and diacritic-sensitive (ów !== ow).
   */
  function matchRule(name) {
    const lower = name.toLowerCase();
    for (const rule of rules) {
      const suffix = rule.suffix.toLowerCase();
      if (suffix && lower.endsWith(suffix)) {
        return rule;
      }
    }
    return null;
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

  const SOURCE_LABELS = {
    poland:
      "miejscowości z Państwowego Rejestru Nazw Geograficznych (PRNG, CC BY 4.0 — zobacz README)",
    sample: "przykładowych punktów (wymyślone placeholdery, nie prawdziwy wykaz)",
    custom: "punktów z wczytanego pliku",
  };

  function render() {
    const { matched, counts } = computeMatches();
    renderMarkers(matched);
    renderRuleList(counts);
    renderLegend(counts);
    placeCountEl.textContent = String(places.length);
    placeSourceLabelEl.textContent = SOURCE_LABELS[dataSource] || "punktów";
  }

  function renderMarkers(matched) {
    markerLayer.clearLayers();

    for (const { place, rule } of matched) {
      const marker = L.circleMarker([place.lat, place.lon], {
        radius: 7,
        color: rule.color,
        weight: 2,
        fillColor: rule.color,
        fillOpacity: 0.85,
      });

      const label = `<strong>${escapeHtml(place.name)}</strong><br/>pasuje do „…${escapeHtml(rule.suffix)}”`;
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
        <span class="rule-item__swatch" style="background:${rule.color}"></span>
        <span class="rule-item__suffix">${escapeHtml(rule.suffix)}</span>
        <span class="rule-item__count">${count}</span>
        <button class="rule-item__remove" title="Usuń regułę" aria-label="Usuń regułę">&times;</button>
      `;
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
      legend.innerHTML = `<div class="legend__row">Brak aktywnych reguł</div>`;
      return;
    }

    legend.innerHTML = rules
      .map((rule) => {
        const count = counts.get(rule.id) || 0;
        return `
          <div class="legend__row">
            <span class="legend__dot" style="background:${rule.color}"></span>
            <span>…${escapeHtml(rule.suffix)} (${count})</span>
          </div>
        `;
      })
      .join("");
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
    const suffix = ruleSuffixInput.value.trim();
    if (!suffix) return;

    rules.push({
      id: nextRuleId++,
      suffix,
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

  // ---------------------------------------------------------------------
  // Event handlers: data loading
  // ---------------------------------------------------------------------

  function setDataError(message) {
    if (!message) {
      dataErrorEl.classList.add("hidden");
      dataErrorEl.textContent = "";
      return;
    }
    dataErrorEl.textContent = message;
    dataErrorEl.classList.remove("hidden");
  }

  /**
   * Accepts an array of objects and normalizes to {name, lat, lon, type?}.
   * Supports "lon" or "lng" as the longitude key.
   */
  function normalizePlaces(raw) {
    if (!Array.isArray(raw)) {
      throw new Error("Oczekiwano tablicy JSON z miejscowościami.");
    }
    return raw.map((entry, i) => {
      const name = entry.name ?? entry.town ?? entry.city;
      const lat = Number(entry.lat ?? entry.latitude);
      const lon = Number(entry.lon ?? entry.lng ?? entry.longitude);
      const type =
        entry.type === "city" || entry.type === "village" ? entry.type : undefined;

      if (!name || Number.isNaN(lat) || Number.isNaN(lon)) {
        throw new Error(
          `Wpis ${i} nie zawiera poprawnej nazwy/lat/lon (otrzymano: ${JSON.stringify(entry)})`
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
      setDataError("Nie udało się wczytać danych: " + err.message);
    }
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadPlacesFromJsonText(String(reader.result));
    reader.onerror = () => setDataError("Nie udało się odczytać pliku.");
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
  rules.push({ id: nextRuleId++, suffix: "ów", color: nextSuggestedColor() });
  rules.push({ id: nextRuleId++, suffix: "owo", color: nextSuggestedColor() });
  ruleColorInput.value = nextSuggestedColor();

  render();
})();
