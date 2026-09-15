// ---------------------------------------------------------------------
// Rule color suggestions
// ---------------------------------------------------------------------

// Colorblind-friendly-ish categorical palette, minus black (vanishes
// against this dark sidebar) and minus yellow/green (blend into the
// yellow/green/white map terrain). Used in order for the first rules;
// once exhausted, new rules get a randomized color instead.
const COLORBLIND_PALETTE = [
  "#e69f00", // orange
  "#56b4e9", // sky blue
  "#911eb4", // purple
  "#f032e6", // magenta
  "#0072b2", // blue
  "#d55e00", // vermillion
  "#cc79a7", // reddish purple
];

// Nice palette colors not currently assigned to a rule, most-preferred
// first. Starts as the full palette in order; when a rule using a palette
// color is deleted, its color is returned to the front so it's suggested
// again right away.
let paletteQueue = [...COLORBLIND_PALETTE];
// Colors freed by deleting a rule that used a non-palette (random) color.
// Only offered once the palette queue is empty, since palette colors are
// preferred.
let returnedColorQueue = [];

export function nextSuggestedColor() {
  if (paletteQueue.length > 0) return paletteQueue.shift();
  if (returnedColorQueue.length > 0) return returnedColorQueue.shift();
  return randomColor();
}

/** Makes a rule's color available again after the rule is deleted. */
export function releaseColor(color) {
  if (COLORBLIND_PALETTE.includes(color)) {
    paletteQueue.unshift(color);
  } else {
    returnedColorQueue.unshift(color);
  }
}

function randomColor() {
  // Skip the yellow/green band (~50-160°) so random colors stay visible
  // against the yellow/green/white map terrain.
  const hue = Math.floor(Math.random() * 250);
  const shiftedHue = (hue + 160) % 360;
  const saturation = 55 + Math.floor(Math.random() * 20); // 55-75%
  const lightness = 40 + Math.floor(Math.random() * 15); // 40-55%
  return hslToHex(shiftedHue, saturation, lightness);
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
