import { t } from "./i18n.js";
import { initialQuery } from "./url-state.js";

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
  const div = L.DomUtil.create("div", "legend draggable-box");
  div.id = "legend";
  return div;
};
legendControl.addTo(map);

// Let a box be dragged and enlarged on desktop, so it can be repositioned
// and made more legible for screenshots. Mobile has no mouse, so this is
// skipped there. A custom resize handle is used instead of the native CSS
// `resize` property, which doesn't play well with the flex-positioned
// Leaflet control corner the legend lives in.
//
// Dragging/resizing pans the map underneath the box otherwise, which is
// confusing, so map panning is disabled for the duration of the gesture.
function makeDraggableResizable(el, { minWidth, minHeight, onResize }) {
  el.addEventListener("mousedown", (e) => {
    if (!window.matchMedia("(min-width: 761px)").matches) return;

    const rect = el.getBoundingClientRect();
    const nearResizeHandle =
      rect.right - e.clientX < RESIZE_HANDLE_HOTZONE && rect.bottom - e.clientY < RESIZE_HANDLE_HOTZONE;

    e.preventDefault();
    map.dragging.disable();
    const startX = e.clientX;
    const startY = e.clientY;

    if (nearResizeHandle) {
      const startWidth = rect.width;
      const startHeight = rect.height;
      el.classList.add("draggable-box--dragging");

      function onResizeMove(moveEvent) {
        el.style.width = `${Math.max(minWidth, startWidth + (moveEvent.clientX - startX))}px`;
        el.style.height = `${Math.max(minHeight, startHeight + (moveEvent.clientY - startY))}px`;
        onResize?.();
      }
      function onResizeUp() {
        document.removeEventListener("mousemove", onResizeMove);
        document.removeEventListener("mouseup", onResizeUp);
        el.classList.remove("draggable-box--dragging");
        map.dragging.enable();
      }
      document.addEventListener("mousemove", onResizeMove);
      document.addEventListener("mouseup", onResizeUp);
      return;
    }

    const startLeft = rect.left;
    const startTop = rect.top;

    el.style.position = "fixed";
    // Clears any centering transform (e.g. the watermark's default
    // translateX(-50%)) — from here on, left/top alone track the pointer.
    el.style.transform = "none";
    el.style.left = `${startLeft}px`;
    el.style.top = `${startTop}px`;
    el.style.right = "auto";
    el.style.bottom = "auto";
    el.style.margin = "0";
    el.classList.add("draggable-box--dragging");

    function onMove(moveEvent) {
      el.style.left = `${startLeft + (moveEvent.clientX - startX)}px`;
      el.style.top = `${startTop + (moveEvent.clientY - startY)}px`;
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      el.classList.remove("draggable-box--dragging");
      map.dragging.enable();
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

const RESIZE_HANDLE_HOTZONE = 16;
export const legendEl = document.getElementById("legend");
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

  // The row-count formula above assumes every row stays on one line, but a
  // box made wide-and-short (or containing long place names) can force rows
  // to wrap at that font size, growing taller than the formula predicted and
  // spilling past the bottom of the box. Back the scale off until whatever
  // actually rendered fits.
  if (legendEl.scrollHeight > legendEl.clientHeight) {
    let lo = 1;
    let hi = scale;
    for (let i = 0; i < 8; i++) {
      const mid = (lo + hi) / 2;
      legendEl.style.fontSize = `${LEGEND_BASE_FONT_SIZE * mid}px`;
      if (legendEl.scrollHeight > legendEl.clientHeight) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    legendEl.style.fontSize = `${LEGEND_BASE_FONT_SIZE * lo}px`;
  }
}

makeDraggableResizable(legendEl, {
  minWidth: LEGEND_MIN_WIDTH,
  minHeight: LEGEND_MIN_HEIGHT,
  onResize: () => {
    legendManuallySized = true;
    updateLegendFontScale();
  },
});

// Undocumented "?watermark=1" URL param: draws "www.atlasnazw.pl" at the
// bottom center of the map, draggable/resizable like the legend, so
// screenshots posted elsewhere carry the site's URL. No UI toggle for it
// on purpose — it's meant for the person taking the screenshot, not a
// feature to discover by clicking around.
if (initialQuery.has("watermark")) {
  const watermarkEl = document.createElement("div");
  watermarkEl.className = "watermark draggable-box";
  watermarkEl.textContent = "www.atlasnazw.pl";
  document.body.appendChild(watermarkEl);
  makeDraggableResizable(watermarkEl, {
    minWidth: 60,
    minHeight: 16,
    onResize: () => {
      watermarkEl.style.fontSize = `${watermarkEl.getBoundingClientRect().height * 0.6}px`;
    },
  });
}
