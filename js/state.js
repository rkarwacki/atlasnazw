import { initialHash, parsePlaceTypeFilter, validMarkerSizeMode, validMarkerRadius, writeUrlState, buildShareUrl as buildShareUrlRaw } from "./url-state.js";
import { getLang } from "./i18n.js";

// ---------------------------------------------------------------------
// Shared app state
// ---------------------------------------------------------------------

/** @type {{name: string, lat: number, lon: number, type?: "city"|"village"|"osada"|"przysiolek"}[]} */
const basePlaces = Array.isArray(window.POLAND_PLACES) ? window.POLAND_PLACES : [];

export const state = {
  /** @type {{id: number, pattern: string, matchType: "suffix"|"prefix"|"contains"|"exact", color: string, hidden?: boolean}[]} */
  rules: [],
  nextRuleId: 1,

  // "Części" (named sub-parts of a village/city/osada, e.g. "Zawisty-Króle"
  // inside the village "Zawisty") live in a separate, lazily-loaded file --
  // together they're almost as large as the main dataset, so they're only
  // fetched once the user actually asks for them (checkbox, or a shared URL
  // that has parts=1).
  /** @type {{name: string, lat: number, lon: number, type: "city"|"village"|"osada"}[]} */
  subpartPlaces: [],
  includeSubparts: initialHash.get("parts") === "1",

  /** @type {{name: string, lat: number, lon: number, type?: "city"|"village"|"osada"|"przysiolek"}[]} */
  places: basePlaces,

  /** @type {Set<"city" | "village" | "osada" | "przysiolek">} */
  placeTypeFilter: parsePlaceTypeFilter(initialHash.get("types")),

  /** @type {"dynamic" | "fixed"} */
  markerSizeMode: validMarkerSizeMode(initialHash.get("markerSize")) || "dynamic",
  fixedMarkerRadius: validMarkerRadius(initialHash.get("markerRadius")) ?? 6,

  showPartitions: initialHash.get("partitions") === "1",

  // This just records the user's intent -- whether name labels actually
  // draw also depends on result count/zoom, see namesEligible in render.js.
  showNameLabels: initialHash.get("names") === "1",
};

function rebuildPlacesList() {
  return state.includeSubparts && state.subpartPlaces.length
    ? basePlaces.concat(state.subpartPlaces)
    : basePlaces;
}

export function rebuildPlaces() {
  state.places = rebuildPlacesList();
}

let subpartsLoadPromise = null;

/**
 * Lazily fetches places-poland-parts.js (only once -- repeat calls reuse
 * the same promise) and populates state.subpartPlaces from it.
 */
export function loadSubparts() {
  if (subpartsLoadPromise) return subpartsLoadPromise;
  subpartsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "places-poland-parts.js";
    script.onload = () => {
      state.subpartPlaces = Array.isArray(window.POLAND_PLACES_PARTS) ? window.POLAND_PLACES_PARTS : [];
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load places-poland-parts.js"));
    document.head.appendChild(script);
  });
  return subpartsLoadPromise;
}

/** Mirrors the current language into the address bar. See writeUrlState. */
export function syncUrl() {
  writeUrlState({ lang: getLang() });
}

/** Builds a full shareable URL encoding the current state. See buildShareUrl. */
export function buildShareUrl() {
  return buildShareUrlRaw({
    lang: getLang(),
    placeTypeFilter: state.placeTypeFilter,
    markerSizeMode: state.markerSizeMode,
    fixedMarkerRadius: state.fixedMarkerRadius,
    showPartitions: state.showPartitions,
    includeSubparts: state.includeSubparts,
    showNameLabels: state.showNameLabels,
    rules: state.rules,
  });
}
