import { initialQuery, validLang } from "./url-state.js";

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
    typePrzysiolek: "Przysiółek",
    advancedSummary: "Zaawansowane",
    overlaysHeading: "Nakładki mapy",
    partitionsLabel: "Pokaż granice zaborów (1815–1918)",
    partitionPruski: "Zabór pruski",
    partitionAustriacki: "Zabór austriacki",
    partitionRosyjski: "Zabór rosyjski",
    subpartsHeading: "Części miejscowości",
    subpartsLabel: "Dołącz części miejscowości (np. Zawisty-Króle jako część wsi Zawisty)",
    subpartsHint:
      "Dodaje ok. 53 tys. dodatkowych punktów — nazwane części wsi, miast i osad, doliczane do odpowiedniego typu w filtrze powyżej. Wczytywane dopiero po zaznaczeniu.",
    subpartsLoading: "Wczytywanie części miejscowości…",
    subpartsError: "Nie udało się wczytać części miejscowości. Spróbuj ponownie.",
    markerSizeHeading: "Rozmiar znaczników",
    dynamicSizeLabel: "Dynamiczny rozmiar (zależny od przybliżenia)",
    fixedSizeLabel: "Stały rozmiar",
    shareHeading: "Udostępnij",
    shareButton: "Skopiuj link ze stanem",
    shareButtonSuccess: "✓ Skopiowano!",
    shareHint:
      "Adres w pasku przeglądarki jest krótki — ten przycisk kopiuje pełny link z Twoimi regułami i ustawieniami.",
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
      "Miejscowości: Państwowy Rejestr Nazw Geograficznych (PRNG), licencja CC BY 4.0 — miasta i wsie via mbroton/polish-geonames, osady i przysiółki wyodrębnione bezpośrednio z eksportu PRNG.",
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
    typePrzysiolek: "Przysiółek",
    advancedSummary: "Advanced",
    overlaysHeading: "Map overlays",
    partitionsLabel: "Show partition borders (1815–1918)",
    partitionPruski: "Prussian partition",
    partitionAustriacki: "Austrian partition",
    partitionRosyjski: "Russian partition",
    subpartsHeading: "Sub-parts (części)",
    subpartsLabel: "Include sub-parts of places (e.g. Zawisty-Króle as part of the village Zawisty)",
    subpartsHint:
      "Adds around 53k extra points — named parts of villages, cities, and osady, counted under the matching type above. Loaded only once checked.",
    subpartsLoading: "Loading sub-parts…",
    subpartsError: "Couldn't load sub-parts. Try again.",
    markerSizeHeading: "Marker size",
    dynamicSizeLabel: "Dynamic size (based on zoom)",
    fixedSizeLabel: "Fixed size",
    shareHeading: "Share",
    shareButton: "Copy link with current state",
    shareButtonSuccess: "✓ Copied!",
    shareHint:
      "The address bar link is short — this button copies a full link with your rules and settings.",
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
      "Places: National Register of Geographic Names (PRNG), CC BY 4.0 license — cities and villages via mbroton/polish-geonames, osady and przysiółki extracted directly from the PRNG export.",
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

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  currentLang = lang;
  storeLang(lang);
}

export function t(key, vars) {
  let str = TRANSLATIONS[currentLang][key] ?? TRANSLATIONS.pl[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      str = str.replaceAll(`{${name}}`, value);
    }
  }
  return str;
}

export function applyStaticTranslations() {
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
