*[Wersja polska](README.pl.md)*

# Atlas Nazw Miejscowości (Town Name Atlas) — Poland place-name highlighter

Live at [atlasnazw.pl](https://atlasnazw.pl).

A small static web app: a Leaflet map of Poland (OpenStreetMap tiles) where you
define one or more "rules" — a name ending plus a color — and every place
whose name matches gets highlighted in that color.

No backend, no build step. It's `index.html`, `style.css`, `app.js`, plus data
files: `places-poland.js` (the bundled dataset, 63,340 places),
`places-poland-parts.js` (an optional +53,094 named sub-parts of places,
lazily loaded only if turned on — see below), and `partitions-poland.js` (an
optional overlay of the historical Partitions of Poland borders).
`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, and `og-image.png` are
pre-built static assets; `robots.txt` and `sitemap.xml` round out the basic
SEO setup.

## Run it

Any of these work:

**Option A — just open it**
Double-click `index.html`. It loads Leaflet and fonts from public CDNs, so you
need an internet connection, but no server.

**Option B — tiny local server (recommended, avoids occasional browser
file:// quirks)**
```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## How to use it

1. Type an ending (e.g. `ów`, `owo`, `ice`, `in`) into the "Add a rule" box,
   pick a color, and hit **Add**. The color field auto-advances through a
   colorblind-friendly palette (Okabe-Ito) for each new rule; once that's
   exhausted, further rules get a randomized color.
2. Add more rules for other endings/colors. Matching is case-insensitive and
   checked top to bottom — a place gets the color of the **first** rule it
   matches, so put more specific endings above more general ones if they
   overlap (e.g. `ówko` above `ów`, if you don't want `ówko` towns painted
   with the `ów` color).
3. Use **"Typ miejscowości"** (place type) checkboxes to restrict the map to
   any combination of cities, villages, osady, and przysiółki (all four are
   checked by default).
4. The bottom-left legend and the sidebar rule list both show a live count of
   matches per rule. Only places matching an active rule are ever drawn —
   there's no "show everything else too" mode, since with 44k+ places that
   was the main thing making the map sluggish.
5. The **"Advanced"** panel has an **"Include sub-parts of places"** checkbox
   (off by default) that adds ~53k more points — named sub-parts of a
   village/city/osada (e.g. `Zawisty-Króle`, a named part of the village
   `Zawisty`) that would otherwise never show up, since they're not in the
   base dataset at all. It's off by default and fetched lazily (a separate
   ~3.5MB file, `places-poland-parts.js`) only once you turn it on, since it
   nearly doubles the point count. See [About the data](#about-the-data) for
   what exactly it adds.

The UI is in Polish or English (toggle top-right). `places-poland.js` records
carry a `type` of `"city"`, `"village"`, `"osada"`, or `"przysiolek"`; the
type filter has no effect on records that don't carry that field.

## About the data

The app ships with the **real list by default**: `places-poland.js`, 63,340
Polish cities, villages, osady (settlements), and przysiółki (hamlets) with
coordinates (WGS 84).

### Data source & license

- Dataset: [mbroton/polish-geonames](https://github.com/mbroton/polish-geonames),
  release `v0.4.0` — a snapshot of PRNG (Państwowy Rejestr Nazw
  Geograficznych, Poland's National Register of Geographical Names) valid as
  of 2026-01-01, maintained by GUGiK (Poland's Head Office of Geodesy and
  Cartography). This upstream dataset only keeps records whose official PRNG
  type (`rodzajObiektu`) is `miasto` (city) or `wieś` (village) — 44,664
  records.
- Everything else was added here by downloading the same underlying PRNG
  export directly —
  [`PRNG_MIEJSCOWOSCI_GML`](https://dane.gov.pl/pl/dataset/780,panstwowy-rejestr-nazw-geograficznych-prng)
  from dane.gov.pl, also valid as of 2026-01-01 — since mbroton/polish-geonames's
  parser drops every other PRNG type:
  - **`"osada"` (8,432 records)** merges PRNG's `rodzajObiektu` values
    `osada` (5,287), `osada wsi` (700), `osada leśna` (2,170), and `osada
    leśna wsi` (275) — all variants that are themselves an osada (a small
    settlement, generally without formal village status), differing only in
    whether it's a forest settlement and/or formally attached to a wieś.
    `osada kolonii` (4) and `osada osady` (8) are not included (attached to a
    kolonia/osada instead of a wieś — negligible counts either way).
  - **`"przysiolek"` (10,244 records)** merges `przysiółek` (152), `przysiółek
    wsi` (9,952), `przysiółek kolonii` (74), and `przysiółek osady` (66) —
    every przysiółek (hamlet) regardless of what it's formally attached to.
  - Still **not** included: `część wsi`/`część miasta`/`część osady` (part of
    a village/city/osada, not a separate locality), `kolonia`/`kolonia wsi`
    etc., `leśniczówka`, `osiedle`, and `schronisko turystyczne`.
- License: **CC BY 4.0** for both. Attribution: data derived from the PRNG
  register via mbroton/polish-geonames and, for the `osada`/`przysiolek`
  records, directly from PRNG (CC BY 4.0). Keep this notice if you
  redistribute `places-poland.js` or a derivative of it.
- `places-poland.js` trims the source records down to the `{name, lat, lon,
  type}` shape this app uses (`type` is `"city"`, `"village"`, `"osada"`, or
  `"przysiolek"`, used by the "Typ miejscowości" filter); the upstream
  datasets also carry `province`, `district`, and `commune` fields if you
  want to re-fetch and use those.

### Sub-parts of places (`places-poland-parts.js`)

A PRNG `"część"` record is a named place that has its own official
geographic name and coordinates but sits administratively *inside* a larger
locality rather than being a separate one — e.g. `Zawisty-Króle` is
`rodzajObiektu` `"część wsi"` (part of a village), inside the village
`Zawisty`. These are common enough (comparable in count to everything else in
this app combined) that they get their own lazily-loaded file instead of
bloating `places-poland.js` for everyone by default:

- **`"village"` (+41,919)** from `część wsi`, **`"city"` (+11,081)** from
  `część miasta`, **`"osada"` (+94)** from `część osady` — each tagged with
  its *parent* locality's type so it slots straight into the existing
  type-filter checkboxes. `część kolonii` (265 records) is not included,
  since `"kolonia"` isn't one of this app's tracked types.
- Same source, license, and validity date as `places-poland.js` (PRNG,
  CC BY 4.0, 2026-01-01).
- `app.js` injects a `<script src="places-poland-parts.js">` tag on demand
  (see `loadSubparts()`) the first time the checkbox is turned on, or if a
  shared link has `parts=1` in its URL hash; it's never fetched otherwise.

### Partition borders overlay

The "Advanced" panel has a checkbox that overlays the borders of the three
Partitions of Poland (zabory) as they stood from 1815 to 1918 — Prussian,
Austrian, and Russian — clipped to modern Poland's outline, so you can see how
name-ending clusters line up with historical borders (e.g. `-ów` vs. `-owo`).

- Dataset: `partitions-poland.js`, built by fetching the administrative-boundary
  relations for the **Kingdom of Prussia**, the **Russian Empire**, and the
  **Kingdom of Galicia and Lodomeria** from
  [OpenHistoricalMap](https://www.openhistoricalmap.org/) (via its Overpass
  API) and intersecting each with a modern Poland outline from
  [georgique/world-geojson](https://github.com/georgique/world-geojson). Zones
  are by ruling state (matching the common "zabory" convention), not strictly
  by former Commonwealth territory — so Silesia, West Pomerania, and
  Warmia-Mazury are shown Prussian too, even though they'd only formally
  joined Prussia/Germany well before the Partitions rather than through them.
- License: OpenHistoricalMap data is dedicated to the public domain (CC0)
  unless a feature says otherwise; the Poland outline used for clipping is
  GPL-3.0, so treat `partitions-poland.js` as a GPL-3.0 derivative and keep
  this notice if you redistribute it.
- Built from OHM's actual traced state borders rather than a coarse
  whole-empire dataset, which is both more accurate and far more detailed at
  the seams than a country-scale dataset. It's still a simplified reference
  overlay, not a survey-accurate boundary, and picks one representative
  late-19th-century border per zone (borders
  shifted slightly within 1815–1918, e.g. Kraków was an independent city-state
  until Austria annexed it in 1846).

### Updating the bundled dataset

There's no in-app way to load a different dataset — it always uses
`places-poland.js` (plus `places-poland-parts.js` if the sub-parts checkbox
is on). To use a different dataset, replace either file's contents (an array
of `{name, lat, lon, type?}` objects; `type` is optional, and only `"city"`,
`"village"`, `"osada"`, and `"przysiolek"` are recognized). Other sources if
you want to update or replace the bundled dataset later:

- **GUS/TERYT** (Polish national register of localities) — names/admin codes,
  but no coordinates.
- **OpenStreetMap Overpass API** — query `place=city|town|village` within
  Poland's boundary; gives coordinates directly.
- **GeoNames** — `PL.zip` bulk export at
  [download.geonames.org/export/dump](https://download.geonames.org/export/dump/),
  with lat/lon and feature-class columns.

## Regenerating the favicon / OG image

`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, and `og-image.png` are
checked-in static files — nothing at runtime depends on Node. They're built
by `scripts/build-favicon.js`, which draws the Poland silhouette straight
from `partitions-poland.js`'s coordinates (the union of the three partition
zones already traces modern Poland's outline). To regenerate them after a
design tweak:

```bash
npm install
node scripts/build-favicon.js
```

## What to extend first

Roughly in order of how much value they add for how little effort:

1. **Persist rules across reloads.** Right now rules reset on page refresh.
   Save them to `localStorage` (this is a plain static page, not a Claude
   artifact, so `localStorage` is fine here) so a set-up session survives a
   refresh.
2. **Regex or multi-pattern rules.** Right now it's a plain suffix match.
   Some users will want prefix matching, "contains", or a real regex for
   trickier patterns (e.g. `ów$` vs `ówka$`).
3. **Marker clustering** for panning/zooming smoothness with thousands of
   points on screen at once — `Leaflet.markercluster` is the standard plugin
   and drops in cleanly on top of the existing `markerLayer`. (The map already
   uses Leaflet's canvas renderer to keep the default ~44k-point dataset
   responsive, but clustering would help further at low zoom levels.)
4. **Export.** A "download matches as CSV/GeoJSON" button per rule, for
   people who want to take the highlighted subset elsewhere.
