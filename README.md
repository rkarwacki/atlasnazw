# Suffix Atlas — Poland place-name highlighter

A small static web app: a Leaflet map of Poland (OpenStreetMap tiles) where you
define one or more "rules" — a name ending plus a color — and every place
whose name matches gets highlighted in that color.

No backend, no build step. It's `index.html`, `style.css`, `app.js`, plus data
files: `places-poland.js` (the real bundled dataset, 44,664 places),
`places-sample.js` (a small placeholder fallback), and `partitions-poland.js`
(an optional overlay of the historical Partitions of Poland borders).

## Run it

Any of these work:

**Option A — just open it**
Double-click `index.html`. It loads Leaflet and fonts from public CDNs, so you
need an internet connection, but no server.

**Option B — tiny local server (recommended, avoids occasional browser
file:// quirks)**
```bash
cd suffix-map
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
3. Use **"Typ miejscowości"** (place type) to restrict the map to cities,
   villages, or both.
4. The bottom-left legend and the sidebar rule list both show a live count of
   matches per rule. Only places matching an active rule are ever drawn —
   there's no "show everything else too" mode, since with 44k+ places that
   was the main thing making the map sluggish.

The UI is in Polish. `places-poland.js` records carry a `type` of `"city"` or
`"village"`; the type filter has no effect on records that don't carry that
field (e.g. the sample data or a custom file that doesn't include `type`).

## About the data

The app ships with the **real list by default**: `places-poland.js`, 44,664
Polish cities and villages with coordinates (WGS 84).

### Data source & license

- Dataset: [mbroton/polish-geonames](https://github.com/mbroton/polish-geonames),
  release `v0.4.0` — a snapshot of PRNG (Państwowy Rejestr Nazw
  Geograficznych, Poland's National Register of Geographical Names) valid as
  of 2026-01-01, maintained by GUGiK (Poland's Head Office of Geodesy and
  Cartography).
- License: **CC BY 4.0**. Attribution: data derived from the PRNG register
  via mbroton/polish-geonames (CC BY 4.0). Keep this notice if you redistribute
  `places-poland.js` or a derivative of it.
- `places-poland.js` trims the upstream records down to the `{name, lat, lon,
  type}` shape this app uses (`type` is `"city"` or `"village"`, used by the
  "Typ miejscowości" filter); the upstream dataset also carries `province`,
  `district`, and `commune` fields if you want to re-fetch and use those.

`places-sample.js` (~30 fabricated placeholder names) still ships alongside
it as a fallback and is only used if `places-poland.js` fails to load.

### Partition borders overlay

The "Advanced" panel has a checkbox that overlays the borders of the three
Partitions of Poland (zabory) as they stood from 1815 to 1918 — Prussian,
Austrian, and Russian — clipped to modern Poland's outline, so you can see how
name-ending clusters line up with historical borders (e.g. `-ów` vs. `-owo`).

- Dataset: `partitions-poland.js`, derived from
  [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps)
  (1815 world boundaries: Prussia, Austrian Empire, Russian Empire, Republic
  of Kraków) intersected with a modern Poland outline from
  [georgique/world-geojson](https://github.com/georgique/world-geojson).
- License: both source repos are **GPL-3.0**; `partitions-poland.js` is a
  derivative of that data. Keep this notice (and the GPL-3.0 license) if you
  redistribute it.
- This is a simplified reference overlay, not a survey-accurate historical
  boundary — source polygons are approximate and the Republic of Kraków
  (independent 1815–1846) is merged into the Austrian zone since it was
  annexed by Austria for most of the partition period.

### Loading your own data instead

You don't need to touch any code to swap in a different dataset:

- **Load JSON file** — pick a `.json` file containing an array like:
  ```json
  [
    { "name": "Kraków", "lat": 50.0647, "lon": 19.9450, "type": "city" },
    { "name": "Ostrów Wielkopolski", "lat": 51.6465, "lon": 17.8079 }
  ]
  ```
  (`lng`/`longitude`/`latitude` keys are also accepted, so most exports work
  as-is. `type` is optional — only `"city"` and `"village"` are recognized;
  omit it, or use any other value, if you don't want the type filter to
  apply to that place.)
- **Paste JSON instead** — same format, pasted directly, for quick testing.

Loading new data replaces the current set and re-fits the map to it.

Other sources if you want to update or replace the bundled dataset later:

- **GUS/TERYT** (Polish national register of localities) — names/admin codes,
  but no coordinates.
- **OpenStreetMap Overpass API** — query `place=city|town|village` within
  Poland's boundary; gives coordinates directly.
- **GeoNames** — `PL.zip` bulk export at
  [download.geonames.org/export/dump](https://download.geonames.org/export/dump/),
  with lat/lon and feature-class columns.

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
4. **Shareable state.** Encode the current rules (and maybe the loaded
   dataset's source URL) into the page's URL hash so a configured view can be
   sent as a link.
5. **Export.** A "download matches as CSV/GeoJSON" button per rule, for
   people who want to take the highlighted subset elsewhere.
