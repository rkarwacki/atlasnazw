(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------

  /** @type {{id: number, suffix: string, color: string}[]} */
  let rules = [];
  let nextRuleId = 1;

  /** @type {{name: string, lat: number, lon: number}[]} */
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

  let showUnmatched = false;

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
  const toggleUnmatchedEl = document.getElementById("toggle-unmatched");
  const placeCountEl = document.getElementById("place-count");
  const placeSourceLabelEl = document.getElementById("place-source-label");
  const fileInput = document.getElementById("file-input");
  const pasteToggle = document.getElementById("paste-toggle");
  const pasteArea = document.getElementById("paste-area");
  const pasteButtons = document.getElementById("paste-buttons");
  const pasteLoadBtn = document.getElementById("paste-load");
  const dataErrorEl = document.getElementById("data-error");

  // A palette to auto-suggest the next color, cycling if the user adds many rules.
  const SUGGESTED_COLORS = [
    "#c0392b", "#2e7d5b", "#2f6690", "#b8860b",
    "#8e44ad", "#c96f2c", "#3a7d44", "#a4374d",
  ];

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

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------

  const SOURCE_LABELS = {
    poland: "towns/villages from the national geographic register (PRNG, CC BY 4.0 — see README)",
    sample: "demo points (clearly-labeled placeholders, not a real gazetteer)",
    custom: "points from your loaded file",
  };

  function render() {
    renderMarkers();
    renderRuleList();
    renderLegend();
    placeCountEl.textContent = String(places.length);
    placeSourceLabelEl.textContent = SOURCE_LABELS[dataSource] || "points";
  }

  function renderMarkers() {
    markerLayer.clearLayers();

    for (const place of places) {
      if (typeof place.lat !== "number" || typeof place.lon !== "number") continue;

      const rule = matchRule(place.name || "");

      if (!rule && !showUnmatched) continue;

      const color = rule ? rule.color : "#7c8b83";
      const radius = rule ? 7 : 3.5;
      const weight = rule ? 2 : 1;
      const fillOpacity = rule ? 0.85 : 0.5;

      const marker = L.circleMarker([place.lat, place.lon], {
        radius,
        color,
        weight,
        fillColor: color,
        fillOpacity,
      });

      const label = rule
        ? `<strong>${escapeHtml(place.name)}</strong><br/>matches "…${escapeHtml(rule.suffix)}"`
        : `${escapeHtml(place.name)}`;

      marker.bindTooltip(label, { className: "place-tooltip" });
      marker.addTo(markerLayer);
    }
  }

  function renderRuleList() {
    ruleListEl.innerHTML = "";

    if (rules.length === 0) {
      ruleEmptyEl.classList.remove("hidden");
      return;
    }
    ruleEmptyEl.classList.add("hidden");

    for (const rule of rules) {
      const count = places.filter(
        (p) => matchRule(p.name || "") === rule
      ).length;

      const li = document.createElement("li");
      li.className = "rule-item";
      li.innerHTML = `
        <span class="rule-item__swatch" style="background:${rule.color}"></span>
        <span class="rule-item__suffix">${escapeHtml(rule.suffix)}</span>
        <span class="rule-item__count">${count}</span>
        <button class="rule-item__remove" title="Remove rule" aria-label="Remove rule">&times;</button>
      `;
      li.querySelector(".rule-item__remove").addEventListener("click", () => {
        rules = rules.filter((r) => r.id !== rule.id);
        render();
      });
      ruleListEl.appendChild(li);
    }
  }

  function renderLegend() {
    const legend = document.getElementById("legend");
    if (!legend) return;

    if (rules.length === 0) {
      legend.innerHTML = `<div class="legend__row">No rules active</div>`;
      return;
    }

    legend.innerHTML = rules
      .map((rule) => {
        const count = places.filter((p) => matchRule(p.name || "") === rule).length;
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
    ruleColorInput.value =
      SUGGESTED_COLORS[rules.length % SUGGESTED_COLORS.length];

    render();
  });

  toggleUnmatchedEl.addEventListener("change", (e) => {
    showUnmatched = e.target.checked;
    renderMarkers();
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
   * Accepts an array of objects and normalizes to {name, lat, lon}.
   * Supports "lon" or "lng" as the longitude key.
   */
  function normalizePlaces(raw) {
    if (!Array.isArray(raw)) {
      throw new Error("Expected a JSON array of places.");
    }
    return raw.map((entry, i) => {
      const name = entry.name ?? entry.town ?? entry.city;
      const lat = Number(entry.lat ?? entry.latitude);
      const lon = Number(entry.lon ?? entry.lng ?? entry.longitude);

      if (!name || Number.isNaN(lat) || Number.isNaN(lon)) {
        throw new Error(
          `Entry ${i} is missing a usable name/lat/lon (got: ${JSON.stringify(entry)})`
        );
      }
      return { name: String(name), lat, lon };
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
      setDataError("Couldn't load that data: " + err.message);
    }
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadPlacesFromJsonText(String(reader.result));
    reader.onerror = () => setDataError("Couldn't read that file.");
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
  rules.push({ id: nextRuleId++, suffix: "ów", color: "#c0392b" });
  rules.push({ id: nextRuleId++, suffix: "owo", color: "#2f6690" });

  render();
})();
