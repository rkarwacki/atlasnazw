# Suffix Atlas — Poland place-name highlighter

A small static web app: a Leaflet map of Poland (OpenStreetMap tiles) where you
define one or more "rules" — a name ending plus a color — and every place
whose name matches gets highlighted in that color.

No backend, no build step. It's three files: `index.html`, `style.css`,
`app.js`, plus a placeholder dataset in `places-sample.js`.

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
   pick a color, and hit **Add**.
2. Add more rules for other endings/colors. Matching is case-insensitive and
   checked top to bottom — a place gets the color of the **first** rule it
   matches, so put more specific endings above more general ones if they
   overlap (e.g. `ówko` above `ów`, if you don't want `ówko` towns painted
   with the `ów` color).
3. Toggle **"Show non-matching towns as small dots"** if you want to see
   everything that *didn't* match, in gray, for context.
4. The bottom-left legend and the sidebar rule list both show a live count of
   matches per rule.

## About the data

The app ships with `places-sample.js` — **~30 fabricated placeholder
names** at plausible-looking coordinates inside Poland, just so the map isn't
empty. They are not a real gazetteer; don't read anything into which "towns"
appear to match.

To load the real list, you don't need to touch any code:

- **Load JSON file** — pick a `.json` file containing an array like:
  ```json
  [
    { "name": "Kraków", "lat": 50.0647, "lon": 19.9450 },
    { "name": "Ostrów Wielkopolski", "lat": 51.6465, "lon": 17.8079 }
  ]
  ```
  (`lng`/`longitude`/`latitude` keys are also accepted, so most exports work
  as-is.)
- **Paste JSON instead** — same format, pasted directly, for quick testing.

Loading new data replaces the current set and re-fits the map to it.

### Where to get a real list of Polish towns

- **GUS/TERYT** (Polish national register of localities) — the authoritative
  source, covers every town and village.
- **OpenStreetMap Overpass API** — query `place=city|town|village` within
  Poland's boundary, which also gives you coordinates directly.
- **GeoNames** — has a Poland export with lat/lon and admin regions.

Any of these can be converted to the `{name, lat, lon}` array shape with a
short script.

## What to extend first

Roughly in order of how much value they add for how little effort:

1. **Persist rules across reloads.** Right now rules reset on page refresh.
   Save them to `localStorage` (this is a plain static page, not a Claude
   artifact, so `localStorage` is fine here) so a set-up session survives a
   refresh.
2. **Regex or multi-pattern rules.** Right now it's a plain suffix match.
   Some users will want prefix matching, "contains", or a real regex for
   trickier patterns (e.g. `ów$` vs `ówka$`).
3. **Load the full official dataset by default**, with the sample data only
   shown if nothing else is available, and bundle a fetch/convert script
   (e.g. pulling from Overpass) so the repo is self-sufficient.
4. **Marker clustering** for when the real dataset has thousands of points —
   `Leaflet.markercluster` is the standard plugin and drops in cleanly on top
   of the existing `markerLayer`.
5. **Shareable state.** Encode the current rules (and maybe the loaded
   dataset's source URL) into the page's URL hash so a configured view can be
   sent as a link.
6. **Export.** A "download matches as CSV/GeoJSON" button per rule, for
   people who want to take the highlighted subset elsewhere.
