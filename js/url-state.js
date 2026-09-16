// ---------------------------------------------------------------------
// URL query params (import/export settings via the URL)
// ---------------------------------------------------------------------
//
// The URL is parsed once at load time so a configuration can be shared as
// a link. Language lives in the query string (short, human-readable,
// worth keeping visible); everything else lives in the hash so the query
// string doesn't balloon with rule/marker/partition settings.

export const initialQuery = new URLSearchParams(window.location.search);
export const initialHash = new URLSearchParams(window.location.hash.slice(1));

const ALL_PLACE_TYPES = ["city", "village", "osada", "przysiolek"];
const VALID_MATCH_TYPES = new Set(["suffix", "prefix", "contains", "exact"]);

export function validLang(v) {
  return v === "pl" || v === "en" ? v : null;
}

/**
 * Parses the "types" hash param (a comma-separated list of place types)
 * into a Set. Falls back to all types selected if absent or unusable, so
 * the type-filter checkboxes default to "everything checked".
 */
export function parsePlaceTypeFilter(v) {
  if (!v) return new Set(ALL_PLACE_TYPES);
  const parsed = v.split(",").filter((part) => ALL_PLACE_TYPES.includes(part));
  return new Set(parsed.length ? parsed : ALL_PLACE_TYPES);
}

export function validMarkerSizeMode(v) {
  return v === "dynamic" || v === "fixed" ? v : null;
}

export function validMarkerRadius(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(20, Math.max(1, Math.round(n))) : null;
}

export function encodeRules(ruleList) {
  return ruleList
    .map((r) => `${r.matchType}:${encodeURIComponent(r.pattern)}:${encodeURIComponent(r.color)}`)
    .join(",");
}

/**
 * Parses the "rules" query param back into rule objects. Each rule is
 * encoded as "matchType:pattern:color", rules joined by commas; pattern
 * and color are individually URI-encoded so they can't collide with those
 * delimiters. Returns null (fall back to defaults) if absent or unusable.
 *
 * IDs are assigned starting at `startId`; the returned `nextId` is the
 * first unused id afterwards, for the caller to keep assigning fresh ones.
 * `suggestColor` fills in a color for rules the URL didn't specify one for.
 */
export function decodeRules(raw, startId, suggestColor) {
  if (!raw) return null;
  let nextId = startId;
  try {
    const decoded = [];
    for (const part of raw.split(",")) {
      if (!part) continue;
      const [matchTypeRaw, patternRaw, colorRaw] = part.split(":");
      if (!patternRaw) continue;
      const pattern = decodeURIComponent(patternRaw);
      if (!pattern) continue;
      const matchType = VALID_MATCH_TYPES.has(matchTypeRaw) ? matchTypeRaw : "suffix";
      const color = colorRaw ? decodeURIComponent(colorRaw) : suggestColor();
      decoded.push({ id: nextId++, pattern, matchType, color });
    }
    return decoded.length ? { rules: decoded, nextId } : null;
  } catch {
    return null;
  }
}

/**
 * Keeps the address bar down to just the language so links stay short and
 * non-scary to share by copy/paste. Uses replaceState so it never adds
 * history entries. The full state (rules, filters, etc.) is only ever put
 * in a URL on demand, via buildShareUrl().
 */
export function writeUrlState({ lang }) {
  const queryParams = new URLSearchParams();
  queryParams.set("lang", lang);
  const newSearch = "?" + queryParams.toString();

  if (newSearch !== window.location.search || window.location.hash) {
    history.replaceState(null, "", newSearch);
  }
}

/**
 * Builds a full URL encoding the current settings (rules, filters, marker
 * size, overlays) so it can be copied and shared to reproduce this exact
 * view. Language stays a query param; everything else lives in the hash so
 * the query string doesn't balloon with rules.
 */
export function buildShareUrl({
  lang,
  placeTypeFilter,
  markerSizeMode,
  fixedMarkerRadius,
  showPartitions,
  includeSubparts,
  rules,
}) {
  const queryParams = new URLSearchParams();
  queryParams.set("lang", lang);

  const hashParams = new URLSearchParams();
  hashParams.set("types", Array.from(placeTypeFilter).join(","));
  hashParams.set("markerSize", markerSizeMode);
  if (markerSizeMode === "fixed") {
    hashParams.set("markerRadius", String(fixedMarkerRadius));
  }
  if (showPartitions) {
    hashParams.set("partitions", "1");
  }
  if (includeSubparts) {
    hashParams.set("parts", "1");
  }
  if (rules.length) {
    hashParams.set("rules", encodeRules(rules));
  }

  return `${window.location.origin}${window.location.pathname}?${queryParams.toString()}#${hashParams.toString()}`;
}
