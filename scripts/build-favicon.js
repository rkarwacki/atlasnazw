#!/usr/bin/env node
// Regenerates favicon.svg, favicon.ico, apple-touch-icon.png, and og-image.png
// from the Poland outline already present in partitions-poland.js (the union
// of the three partition zones was clipped to modern Poland's outline, so it
// doubles as a ready-made silhouette). Not part of the running app — this is
// a one-off/occasional tool, run manually when the artwork needs a refresh:
//
//   npm install
//   node scripts/build-favicon.js

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");

const RED = "#d4213d";
const PAPER = "#eef1e9";
const INK = "#14211f";
const MUTED = "#9fb0a6";

function loadPolandOutlinePolygons() {
  const sandbox = { window: {} };
  const code = fs.readFileSync(path.join(ROOT, "partitions-poland.js"), "utf8");
  new Function("window", code)(sandbox.window);
  const fc = sandbox.window.PARTITIONS_GEOJSON;

  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const rings = [];

  for (const f of fc.features) {
    const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const poly of polys) {
      const ring = poly[0]; // exterior ring only; no holes in this dataset
      const target = 44; // decimate down to roughly this many points per ring
      const stride = Math.max(1, Math.floor(ring.length / target));
      const sampled = [];
      for (let i = 0; i < ring.length; i += stride) sampled.push(ring[i]);
      for (const [lon, lat] of sampled) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      rings.push(sampled);
    }
  }

  const meanLat = (minLat + maxLat) / 2;
  const lonScale = Math.cos((meanLat * Math.PI) / 180);
  const lonRange = (maxLon - minLon) * lonScale;
  const latRange = maxLat - minLat;

  const SIZE = 100; // viewBox units
  const PAD = 6;
  const drawable = SIZE - PAD * 2;
  const scale = drawable / Math.max(lonRange, latRange);
  const xOffset = (drawable - lonRange * scale) / 2 + PAD;
  const yOffset = (drawable - latRange * scale) / 2 + PAD;

  function project([lon, lat]) {
    const x = (lon - minLon) * lonScale * scale + xOffset;
    const y = SIZE - ((lat - minLat) * scale + yOffset); // flip Y (SVG y grows downward)
    return `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
  }

  return rings.map((ring) => ring.map(project).join(" "));
}

async function main() {
  const polygons = loadPolandOutlinePolygons();
  const polyMarkup = polygons.map((p) => `<polygon points="${p}"/>`).join("");

  // stroke = fill closes hairline gaps between adjacent partition polygons
  // (they were three separate GeoJSON features, not one clean union).
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" rx="20" fill="${PAPER}"/>
<g fill="${RED}" fill-rule="nonzero" stroke="${RED}" stroke-width="1.4" stroke-linejoin="round">${polyMarkup}</g>
</svg>`;

  const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" fill="${PAPER}"/>
<g fill="${RED}" fill-rule="nonzero" stroke="${RED}" stroke-width="1.4" stroke-linejoin="round">${polyMarkup}</g>
</svg>`;

  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect width="1200" height="630" fill="${INK}"/>
<text x="70" y="160" font-family="sans-serif" font-size="22" font-weight="700" letter-spacing="4" fill="${RED}">ATLASNAZW.PL</text>
<text x="68" y="270" font-family="sans-serif" font-size="76" font-weight="700" fill="${PAPER}">Atlas Nazw</text>
<text x="68" y="352" font-family="sans-serif" font-size="76" font-weight="700" fill="${PAPER}">Miejscowości</text>
<text x="70" y="420" font-family="sans-serif" font-size="27" fill="${MUTED}">Podświetlaj polskie miejscowości wg końcówki nazwy</text>
<g transform="translate(660,55) scale(4.9)">
  <g fill="${RED}" fill-rule="nonzero" stroke="${RED}" stroke-width="0.6" stroke-linejoin="round">${polyMarkup}</g>
</g>
</svg>`;

  fs.writeFileSync(path.join(ROOT, "favicon.svg"), faviconSvg);

  const favicon16 = await sharp(Buffer.from(faviconSvg)).resize(16, 16).png().toBuffer();
  const favicon32 = await sharp(Buffer.from(faviconSvg)).resize(32, 32).png().toBuffer();
  const { default: pngToIco } = await import("png-to-ico");
  fs.writeFileSync(path.join(ROOT, "favicon.ico"), await pngToIco([favicon16, favicon32]));

  await sharp(Buffer.from(squareSvg)).resize(180, 180).png().toFile(path.join(ROOT, "apple-touch-icon.png"));
  await sharp(Buffer.from(ogSvg)).png().toFile(path.join(ROOT, "og-image.png"));

  console.log("Wrote favicon.svg, favicon.ico, apple-touch-icon.png, og-image.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
