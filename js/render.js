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
const showNamesFewToggleEl = document.getElementById("show-names-few-toggle");
const showNamesFewHintEl = document.getElementById("show-names-few-hint");
const showNamesZoomToggleEl = document.getElementById("show-names-zoom-toggle");
const showNamesZoomHintEl = document.getElementById("show-names-zoom-hint");

// Two independent switches for permanent name tooltips: a low-result-count
// mode (see every matching place at once, wherever it is) and a deep-zoom
// mode (only a handful of markers are actually on screen at a time). Either
// can be toggled on its own; below/above these thresholds is where the map
// would otherwise become a wall of overlapping labels.
export const MAX_NAME_LABELS = 250;
const NAME_LABEL_MIN_ZOOM = 11;

/**
 * Decides whether name labels should render at all, and if so, whether
 * they need to be restricted to markers inside the current viewport.
 * The low-result-count mode is unrestricted by design -- the whole point
 * is to see every matching place at once, wherever it is. The deep-zoom
 * mode is restricted to the viewport, since binding a permanent tooltip
 * (a real DOM node) to thousands of off-screen markers would be wasteful
 * and slow -- but at deep zoom there are only ever a few on screen anyway.
 */
function planNameLabels(visibleCount, zoom) {
  const unrestricted = state.showNamesFewResults && visibleCount < MAX_NAME_LABELS;
  const viaZoom = state.showNamesDeepZoom && zoom >= NAME_LABEL_MIN_ZOOM;
  return { eligible: unrestricted || viaZoom, restrictToViewport: !unrestricted && viaZoom };
}

function shouldLabelMarker(marker, restrictToViewport, bounds) {
  return !restrictToViewport || bounds.contains(marker.getLatLng());
}

// Result count for the currently rendered markers, cached so moveend (which
// only re-styles existing markers, not a full re-render) can re-check name
// label eligibility without re-running the match logic.
let lastVisibleCount = 0;

export function render() {
  const { matched, counts } = computeMatches();
  lastVisibleCount = renderMarkers(matched);
  renderRuleList(counts);
  renderLegend(counts);
  syncShowNamesUI(lastVisibleCount, map.getZoom());
  placeCountLineEl.textContent = t("placeCountText", {
    count: state.places.length,
    source: t("sourcePoland"),
  });
  syncUrl();
}

function syncShowNamesUI(visibleCount, zoom) {
  showNamesFewToggleEl.checked = state.showNamesFewResults;
  showNamesFewHintEl.textContent = t("showNamesFewHint", { count: visibleCount });

  showNamesZoomToggleEl.checked = state.showNamesDeepZoom;
  showNamesZoomHintEl.textContent = t("showNamesZoomHint", {
    minZoom: NAME_LABEL_MIN_ZOOM,
    // Floor, never round: zoom is a multiple of 0.5 (see zoomSnap in
    // map.js), and rounding 10.5 up to "11" would falsely claim the
    // threshold is met when labels are actually still off.
    zoom: Math.floor(zoom),
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
  return state.markerSizeMode === "fixed"
    ? state.fixedMarkerRadius
    : getMarkerRadius(map.getZoom());
}

// A marker can only have one bound tooltip at a time: with names shown
// permanently there's no need for the hover tooltip too, since the name
// (the main thing it added over the permanent label) is already visible.
// `nameLabel`/`hoverLabel` are cached on the marker at creation time so
// re-styling on zoom doesn't need to recompute them.
function bindMarkerTooltip(marker, showNames, radius) {
  if (showNames) {
    marker.bindTooltip(marker.nameLabel, {
      className: "place-tooltip place-tooltip--name",
      permanent: true,
      direction: "top",
      offset: [0, -radius],
    });
  } else {
    marker.bindTooltip(marker.hoverLabel, { className: "place-tooltip" });
  }
}

/**
 * Re-applies view-dependent marker styling: dynamic radius, and whether
 * name labels are shown (the deep-zoom mode can switch on independently of
 * the low-result-count mode once the user zooms in far enough -- and since
 * it's restricted to the current viewport, panning can bring it in or out
 * of effect too). Runs on every moveend (pan or zoom), so it only re-styles
 * existing markers rather than re-rendering from scratch.
 */
export function applyMarkerStyle() {
  const zoom = map.getZoom();
  const radius = getCurrentRadius();
  const { eligible, restrictToViewport } = planNameLabels(lastVisibleCount, zoom);
  const bounds = restrictToViewport ? map.getBounds() : null;

  markerLayer.eachLayer((marker) => {
    marker.setRadius(radius);

    const showNames = eligible && shouldLabelMarker(marker, restrictToViewport, bounds);
    const tooltip = marker.getTooltip();
    const isPermanent = !!tooltip?.options.permanent;
    if (showNames !== isPermanent) {
      marker.unbindTooltip();
      bindMarkerTooltip(marker, showNames, radius);
    } else if (isPermanent) {
      // Permanent tooltips are offset above the marker by its radius; keep
      // that in sync as dynamic sizing changes the radius with zoom.
      tooltip.options.offset = [0, -radius];
      tooltip.update();
    }
  });

  syncShowNamesUI(lastVisibleCount, zoom);
}

function renderMarkers(matched) {
  markerLayer.clearLayers();

  const zoom = map.getZoom();
  const radius = getCurrentRadius();
  const visible = matched.filter(({ rule }) => !rule.hidden);
  const { eligible, restrictToViewport } = planNameLabels(visible.length, zoom);
  const bounds = restrictToViewport ? map.getBounds() : null;

  for (const { place, rule } of visible) {
    const marker = L.circleMarker([place.lat, place.lon], {
      radius,
      color: rule.color,
      weight: 2,
      fillColor: rule.color,
      fillOpacity: 0.85,
    });
    marker.ruleId = rule.id;
    marker.nameLabel = escapeHtml(place.name);
    marker.hoverLabel = `<strong>${escapeHtml(place.name)}</strong><br/>${t("matchesPattern", { display: formatPatternDisplay(rule) })}`;

    const showNames = eligible && shouldLabelMarker(marker, restrictToViewport, bounds);
    bindMarkerTooltip(marker, showNames, radius);
    marker.addTo(markerLayer);
  }

  return visible.length;
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
