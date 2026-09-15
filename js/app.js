import { state, syncUrl, rebuildPlaces, loadSubparts } from "./state.js";
import { initialHash, decodeRules } from "./url-state.js";
import { t, getLang, setLang, applyStaticTranslations } from "./i18n.js";
import { nextSuggestedColor } from "./colors.js";
import { map, partitionsLayer } from "./map.js";
import { render, applyMarkerRadius } from "./render.js";

map.on("zoomend", applyMarkerRadius);

/**
 * Turns the "include sub-parts" toggle on or off, fetching
 * places-poland-parts.js the first time it's turned on.
 */
function setSubpartsEnabled(enabled) {
  state.includeSubparts = enabled;
  if (!enabled) {
    rebuildPlaces();
    render();
    syncUrl();
    return;
  }

  subpartsToggle.disabled = true;
  subpartsStatusEl.textContent = t("subpartsLoading");
  subpartsStatusEl.classList.remove("hidden");
  loadSubparts()
    .then(() => {
      rebuildPlaces();
      render();
      subpartsStatusEl.classList.add("hidden");
      subpartsStatusEl.textContent = "";
    })
    .catch(() => {
      state.includeSubparts = false;
      subpartsToggle.checked = false;
      subpartsStatusEl.textContent = t("subpartsError");
      syncUrl();
    })
    .finally(() => {
      subpartsToggle.disabled = false;
    });
}

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
const typeFilterEl = document.getElementById("type-filter");
const partitionsToggle = document.getElementById("partitions-toggle");
const subpartsToggle = document.getElementById("subparts-toggle");
const subpartsStatusEl = document.getElementById("subparts-status");
const markerSizeDynamicToggle = document.getElementById("marker-size-dynamic");
const markerSizeFixedRow = document.getElementById("marker-size-fixed-row");
const markerSizeInput = document.getElementById("marker-size-input");
const markerSizeValueEl = document.getElementById("marker-size-value");
const panelEl = document.getElementById("panel");
const panelToggleBtn = document.getElementById("panel-toggle");
const panelHandleBtn = document.getElementById("panel-handle");
const panelHandleLabelEl = document.getElementById("panel-handle-label");
const langSwitchEl = document.getElementById("lang-switch");

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
  return state.rules.some(
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

  state.rules.push({
    id: state.nextRuleId++,
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
    state.placeTypeFilter.add(e.target.value);
  } else {
    state.placeTypeFilter.delete(e.target.value);
  }
  render();
});

partitionsToggle.addEventListener("change", () => {
  state.showPartitions = partitionsToggle.checked;
  if (state.showPartitions) {
    partitionsLayer.addTo(map);
  } else {
    partitionsLayer.remove();
  }
  syncUrl();
});

subpartsToggle.addEventListener("change", () => {
  setSubpartsEnabled(subpartsToggle.checked);
});

markerSizeDynamicToggle.addEventListener("change", () => {
  state.markerSizeMode = markerSizeDynamicToggle.checked ? "dynamic" : "fixed";
  markerSizeFixedRow.classList.toggle("hidden", state.markerSizeMode === "dynamic");
  applyMarkerRadius();
  syncUrl();
});

markerSizeInput.addEventListener("input", () => {
  state.fixedMarkerRadius = Number(markerSizeInput.value);
  markerSizeValueEl.textContent = `${state.fixedMarkerRadius}px`;
  if (state.markerSizeMode === "fixed") applyMarkerRadius();
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
    btn.classList.toggle("active", btn.dataset.lang === getLang());
  });
}

function setLanguage(lang) {
  if (lang !== "pl" && lang !== "en") return;
  setLang(lang);
  applyStaticTranslations();
  updateLangSwitchUI();
  render();
}

function syncTypeFilterUI() {
  typeFilterEl.querySelectorAll('input[name="place-type"]').forEach((checkbox) => {
    checkbox.checked = state.placeTypeFilter.has(checkbox.value);
  });
}

function syncMarkerSizeUI() {
  markerSizeDynamicToggle.checked = state.markerSizeMode === "dynamic";
  markerSizeFixedRow.classList.toggle("hidden", state.markerSizeMode === "dynamic");
  markerSizeInput.value = String(state.fixedMarkerRadius);
  markerSizeValueEl.textContent = `${state.fixedMarkerRadius}px`;
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
const decoded = decodeRules(initialHash.get("rules"), state.nextRuleId, nextSuggestedColor);
if (decoded) {
  state.rules = decoded.rules;
  state.nextRuleId = decoded.nextId;
} else {
  state.rules.push({ id: state.nextRuleId++, pattern: "ów", matchType: "suffix", color: nextSuggestedColor() });
  state.rules.push({ id: state.nextRuleId++, pattern: "owo", matchType: "suffix", color: nextSuggestedColor() });
}
ruleColorInput.value = nextSuggestedColor();

syncTypeFilterUI();
syncMarkerSizeUI();
partitionsToggle.checked = state.showPartitions;
if (state.showPartitions) partitionsLayer.addTo(map);
applyStaticTranslations();
updateLangSwitchUI();
render();

subpartsToggle.checked = state.includeSubparts;
if (state.includeSubparts) setSubpartsEnabled(true);

if (window.matchMedia("(max-width: 760px)").matches) {
  setPanelCollapsed(true);
}

const loadingOverlay = document.getElementById("loading-overlay");
if (loadingOverlay) loadingOverlay.classList.add("is-hidden");
