import { initialHash, parsePlaceTypeFilter, validMarkerSizeMode, validMarkerRadius, writeUrlState, buildShareUrl as buildShareUrlRaw } from "./url-state.js";
import { getLang } from "./i18n.js";

// ---------------------------------------------------------------------
// Shared app state
// ---------------------------------------------------------------------

/** @type {{name: string, lat: number, lon: number, type?: "city"|"village"|"osada"|"przysiolek"}[]} */
let basePlaces = Array.isArray(window.POLAND_PLACES) ? window.POLAND_PLACES : [];

export const state = {
  /** @type {{id: number, pattern: string, matchType: "suffix"|"prefix"|"contains"|"exact"|"regex", color: string, hidden?: boolean}[]} */
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

  // These just record the user's intent for each of the two independent
  // name-label modes -- whether labels actually draw also depends on
  // result count/zoom, see planNameLabels in render.js. Deep-zoom mode
  // defaults on (a shared link can still turn it off explicitly via
  // namesZoom=0, see buildShareUrl).
  showNamesFewResults: initialHash.get("namesFew") === "1",
  showNamesDeepZoom: initialHash.has("namesZoom") ? initialHash.get("namesZoom") === "1" : true,

  // Gates the "RegEx" match-type option behind an opt-in checkbox (see the
  // "Obsługa wyrażeń regularnych" advanced section) so casual users don't
  // see it by default. app.js also forces this on when a shared link's
  // rules already use it, so the recipient's dropdown/checkbox stays
  // consistent with what's actually active.
  regexEnabled: initialHash.get("regex") === "1",
};

function rebuildPlacesList() {
  return state.includeSubparts && state.subpartPlaces.length
    ? basePlaces.concat(state.subpartPlaces)
    : basePlaces;
}

export function rebuildPlaces() {
  state.places = rebuildPlacesList();
}

let basePlacesLoadPromise = null;

/**
 * Lazily fetches places-poland.js (the ~63k-place core dataset, several MB
 * uncompressed) instead of loading it as a render-blocking <script> in the
 * page -- that let the map, tiles and UI shell paint immediately, with this
 * called right after so the data streams in behind the loading overlay.
 * Only once -- repeat calls reuse the same promise.
 */
export function loadBasePlaces() {
  if (basePlacesLoadPromise) return basePlacesLoadPromise;
  basePlacesLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "places-poland.js";
    script.onload = () => {
      basePlaces = Array.isArray(window.POLAND_PLACES) ? window.POLAND_PLACES : [];
      rebuildPlaces();
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load places-poland.js"));
    document.head.appendChild(script);
  });
  return basePlacesLoadPromise;
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
    showNamesFewResults: state.showNamesFewResults,
    showNamesDeepZoom: state.showNamesDeepZoom,
    regexEnabled: state.regexEnabled,
    rules: state.rules,
  });
}
