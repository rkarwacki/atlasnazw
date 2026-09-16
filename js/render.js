import { state, syncUrl } from "./state.js";
import { t } from "./i18n.js";
import { nextSuggestedColor, releaseColor } from "./colors.js";
import { map, markerLayer, updateLegendFontScale, setLegendRowCount, legendEl } from "./map.js";

// ---------------------------------------------------------------------
// Matching logic
// ---------------------------------------------------------------------

/**
 * Returns the first rule whose pattern matches the given name, or null.
 * Matching is case-insensitive and diacritic-sensitive (ów !== ow).
 */
function matchRule(name) {
  const lower = name.toLowerCase();
  for (const rule of state.rules) {
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
  return state.placeTypeFilter.has(place.type);
}

/**
 * Single pass over all places: computes which ones to render (with their
 * matched rule) and a per-rule match count, so the three views below don't
 * each re-scan the whole dataset separately.
 */
function computeMatches() {
  const counts = new Map(state.rules.map((r) => [r.id, 0]));
  const matched = [];

  for (const place of state.places) {
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

const placeCountLineEl = document.getElementById("place-count-line");

export function render() {
  const { matched, counts } = computeMatches();
  renderMarkers(matched);
  renderRuleList(counts);
  renderLegend(counts);
  placeCountLineEl.textContent = t("placeCountText", {
    count: state.places.length,
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
  return state.markerSizeMode === "fixed"
    ? state.fixedMarkerRadius
    : getMarkerRadius(map.getZoom());
}

export function applyMarkerRadius() {
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

const ruleListEl = document.getElementById("rule-list");
const ruleEmptyEl = document.getElementById("rule-empty");
const ruleColorInput = document.getElementById("rule-color");

function renderRuleList(counts) {
  ruleListEl.innerHTML = "";

  if (state.rules.length === 0) {
    ruleEmptyEl.classList.remove("hidden");
    return;
  }
  ruleEmptyEl.classList.add("hidden");

  for (const rule of state.rules) {
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
      state.rules = state.rules.filter((r) => r.id !== rule.id);
      render();
    });
    ruleListEl.appendChild(li);
  }
}

function renderLegend(counts) {
  if (!legendEl) return;

  setLegendRowCount(state.rules.length === 0 ? 1 : state.rules.length);

  if (state.rules.length === 0) {
    legendEl.innerHTML = `<div class="legend__row">${t("noActiveRules")}</div>`;
  } else {
    legendEl.innerHTML = state.rules
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
