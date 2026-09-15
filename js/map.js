import { t } from "./i18n.js";

// ---------------------------------------------------------------------
// Map setup
// ---------------------------------------------------------------------

export const map = L.map("map", {
  zoomControl: true,
  // Smaller steps per +/- click and scroll tick (default is a full level).
  zoomSnap: 0.5,
  zoomDelta: 0.5,
  // Thousands of circle markers render far faster on canvas than SVG.
  preferCanvas: true,
});
// Module scripts don't block on a still-pending external stylesheet (unlike
// the classic script this used to be), so Leaflet can measure the map
// container before its CSS has been applied and cache the wrong size.
// invalidateSize() forces a fresh measurement so fitBounds below is correct.
map.invalidateSize();

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
export const partitionsLayer = L.geoJSON(window.PARTITIONS_GEOJSON || { type: "FeatureCollection", features: [] }, {
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

export const markerLayer = L.layerGroup().addTo(map);

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
export const legendEl = document.getElementById("legend");
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

/** Tells the font-scale calculation how many rows the legend currently has. */
export function setLegendRowCount(count) {
  legendRowCount = count;
}

// Once the box has been manually resized, text and dots (sized in `em`,
// see .legend__dot) scale up to fill any extra vertical space beyond
// what the current rows need at the default size — never below it, so
// a box too small for its content just scrolls instead of shrinking text.
export function updateLegendFontScale() {
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
