*[English version](README.md)*

# Atlas Nazw Miejscowości (Town Name Atlas) — podświetlacz nazw miejscowości w Polsce

Działa pod adresem [atlasnazw.pl](https://atlasnazw.pl).

Mała statyczna aplikacja webowa: mapa Polski w Leaflet (kafelki OpenStreetMap),
na której definiujesz jedną lub więcej "reguł" — końcówkę nazwy plus kolor —
i każda miejscowość, której nazwa pasuje, zostaje podświetlona tym kolorem.

Bez backendu, bez kroku budowania. To `index.html`, `style.css`, `app.js`,
plus pliki z danymi: `places-poland.js` (dołączony zbiór danych, 63 340
miejscowości), `places-poland-parts.js` (opcjonalne +53 094 nazwanych
"części" miejscowości, wczytywane leniwie tylko po włączeniu — patrz niżej)
oraz `partitions-poland.js` (opcjonalna nakładka z historycznymi granicami
zaborów). `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` i
`og-image.png` to gotowe, wygenerowane wcześniej pliki statyczne; `robots.txt`
i `sitemap.xml` uzupełniają podstawowe SEO.

## Jak uruchomić

Działa każdy z tych sposobów:

**Opcja A — po prostu otwórz**
Kliknij dwukrotnie `index.html`. Aplikacja wczytuje Leaflet i czcionki z
publicznych CDN-ów, więc potrzebujesz połączenia z internetem, ale nie
potrzebujesz serwera.

**Opcja B — mały lokalny serwer (zalecane, omija czasem spotykane dziwactwa
przeglądarek przy `file://`)**
```bash
python3 -m http.server 8000
# a potem otwórz http://localhost:8000
```

## Jak korzystać

1. Wpisz końcówkę (np. `ów`, `owo`, `ice`, `in`) w pole "Add a rule" ("Dodaj
   regułę"), wybierz kolor i kliknij **Add** ("Dodaj"). Pole koloru
   automatycznie przechodzi przez paletę przyjazną dla daltonistów
   (Okabe-Ito) przy każdej nowej regule; gdy się wyczerpie, kolejne reguły
   dostają losowy kolor.
2. Dodaj kolejne reguły dla innych końcówek/kolorów. Dopasowanie nie
   rozróżnia wielkości liter i jest sprawdzane od góry do dołu — miejscowość
   dostaje kolor **pierwszej** pasującej reguły, więc umieszczaj bardziej
   szczegółowe końcówki nad bardziej ogólnymi, jeśli się pokrywają (np.
   `ówko` nad `ów`, jeśli nie chcesz, żeby miejscowości na `ówko` były
   pomalowane kolorem reguły `ów`).
3. Użyj checkboxów **"Typ miejscowości"**, żeby ograniczyć mapę do dowolnej
   kombinacji miast, wsi, osad i przysiółków (domyślnie zaznaczone są
   wszystkie cztery).
4. Legenda w lewym dolnym rogu i lista reguł w panelu bocznym pokazują na
   bieżąco liczbę dopasowań dla każdej reguły. Rysowane są tylko miejscowości
   pasujące do aktywnej reguły — nie ma trybu "pokaż też wszystko inne",
   bo przy 44 tys.+ miejscowości to właśnie ono najbardziej spowalniało mapę.
5. Panel **"Advanced"** ("Zaawansowane") ma checkbox **"Include sub-parts of
   places"** ("Uwzględnij części miejscowości") (domyślnie wyłączony), który
   dodaje ~53 tys. kolejnych punktów — nazwane części wsi/miasta/osady (np.
   `Zawisty-Króle`, nazwana część wsi `Zawisty`), które inaczej w ogóle by
   się nie pojawiły, bo nie ma ich w podstawowym zbiorze danych. Jest domyślnie
   wyłączony i pobierany leniwie (osobny plik ~3,5 MB,
   `places-poland-parts.js`) dopiero po włączeniu, bo niemal podwaja liczbę
   punktów. Zobacz [O danych](#o-danych), żeby dokładnie zobaczyć, co dodaje.

Interfejs jest po polsku lub po angielsku (przełącznik w prawym górnym rogu).
Rekordy w `places-poland.js` mają pole `type` o wartości `"city"`,
`"village"`, `"osada"` lub `"przysiolek"`; filtr typu nie ma wpływu na
rekordy bez tego pola.

## O danych

Aplikacja domyślnie zawiera **pełną listę**: `places-poland.js`, 63 340
polskich miast, wsi, osad i przysiółków ze współrzędnymi (WGS 84).

### Źródło danych i licencja

- Zbiór danych: [mbroton/polish-geonames](https://github.com/mbroton/polish-geonames),
  wydanie `v0.4.0` — migawka PRNG (Państwowego Rejestru Nazw
  Geograficznych) aktualna na dzień 2026-01-01, prowadzonego przez GUGiK
  (Główny Urząd Geodezji i Kartografii). Ten zbiór źródłowy zawiera tylko
  rekordy, których oficjalny typ PRNG (`rodzajObiektu`) to `miasto` lub
  `wieś` — 44 664 rekordy.
- Wszystko pozostałe zostało dodane tutaj przez pobranie tego samego
  źródłowego eksportu PRNG bezpośrednio —
  [`PRNG_MIEJSCOWOSCI_GML`](https://dane.gov.pl/pl/dataset/780,panstwowy-rejestr-nazw-geograficznych-prng)
  z dane.gov.pl, również aktualnego na dzień 2026-01-01 — ponieważ parser
  mbroton/polish-geonames odrzuca każdy inny typ PRNG:
  - **`"osada"` (8432 rekordy)** łączy wartości `rodzajObiektu` z PRNG:
    `osada` (5287), `osada wsi` (700), `osada leśna` (2170) i `osada leśna
    wsi` (275) — wszystkie warianty, które same w sobie są osadą (mała
    miejscowość, zwykle bez formalnego statusu wsi), różniące się tylko tym,
    czy to osada leśna i/lub czy jest formalnie przypisana do wsi. `osada
    kolonii` (4) i `osada osady` (8) nie są uwzględnione (przypisane do
    kolonii/osady zamiast do wsi — w obu przypadkach liczby pomijalne).
  - **`"przysiolek"` (10 244 rekordy)** łączy `przysiółek` (152),
    `przysiółek wsi` (9952), `przysiółek kolonii` (74) i `przysiółek osady`
    (66) — każdy przysiółek niezależnie od tego, do czego jest formalnie
    przypisany.
  - Nadal **nie uwzględnione**: `część wsi`/`część miasta`/`część osady`
    (część wsi/miasta/osady, nie osobna miejscowość), `kolonia`/`kolonia
    wsi` itp., `leśniczówka`, `osiedle` i `schronisko turystyczne`.
- Licencja: **CC BY 4.0** dla obu źródeł. Atrybucja: dane pochodzą z rejestru
  PRNG za pośrednictwem mbroton/polish-geonames, a dla rekordów
  `osada`/`przysiolek` — bezpośrednio z PRNG (CC BY 4.0). Zachowaj tę
  informację, jeśli redystrybuujesz `places-poland.js` lub jego pochodną.
- `places-poland.js` ogranicza rekordy źródłowe do kształtu `{name, lat, lon,
  type}` używanego przez tę aplikację (`type` to `"city"`, `"village"`,
  `"osada"` lub `"przysiolek"`, używane przez filtr "Typ miejscowości");
  zbiory źródłowe mają też pola `province`, `district` i `commune`, jeśli
  chcesz je pobrać ponownie i wykorzystać.

### Części miejscowości (`places-poland-parts.js`)

Rekord PRNG typu `"część"` to nazwane miejsce, które ma własną oficjalną
nazwę geograficzną i współrzędne, ale administracyjnie znajduje się
*wewnątrz* większej miejscowości, zamiast być osobną miejscowością — np.
`Zawisty-Króle` ma `rodzajObiektu` `"część wsi"` (część wsi), wewnątrz wsi
`Zawisty`. Takich rekordów jest sporo (porównywalnie z sumą wszystkiego
innego w tej aplikacji), więc mają swój własny, leniwie wczytywany plik,
zamiast domyślnie rozdymać `places-poland.js` dla wszystkich:

- **`"village"` (+41 919)** z `część wsi`, **`"city"` (+11 081)** z `część
  miasta`, **`"osada"` (+94)** z `część osady` — każda oznaczona typem
  miejscowości *nadrzędnej*, dzięki czemu od razu pasuje do istniejących
  checkboxów filtra typu. `część kolonii` (265 rekordów) nie jest
  uwzględniona, bo `"kolonia"` nie jest jednym ze śledzonych przez tę
  aplikację typów.
- To samo źródło, licencja i data ważności co `places-poland.js` (PRNG, CC BY
  4.0, 2026-01-01).
- `app.js` wstrzykuje tag `<script src="places-poland-parts.js">` na
  żądanie (patrz `loadSubparts()`) przy pierwszym włączeniu checkboxa, albo
  gdy udostępniony link ma `parts=1` w hashu URL; w innym wypadku plik nigdy
  nie jest pobierany.

### Nakładka z granicami zaborów

Panel "Advanced" ma checkbox, który nakłada granice trzech zaborów Polski,
jakie obowiązywały od 1815 do 1918 roku — pruskiego, austriackiego i
rosyjskiego — przycięte do zarysu współczesnej Polski, dzięki czemu widać,
jak skupiska końcówek nazw pokrywają się z historycznymi granicami (np.
`-ów` vs. `-owo`).

- Zbiór danych: `partitions-poland.js`, zbudowany przez pobranie relacji
  granic administracyjnych dla **Królestwa Prus**, **Imperium Rosyjskiego**
  i **Królestwa Galicji i Lodomerii** z
  [OpenHistoricalMap](https://www.openhistoricalmap.org/) (przez jego API
  Overpass) i przecięcie każdej z nich ze współczesnym zarysem Polski z
  [georgique/world-geojson](https://github.com/georgique/world-geojson).
  Strefy są podzielone według państwa zaborczego (zgodnie z powszechną
  konwencją "zabory"), a nie ściśle według dawnych terytoriów
  Rzeczypospolitej — więc Śląsk, Pomorze Zachodnie i Warmia-Mazury są
  pokazane jako pruskie, mimo że formalnie przyłączyły się do Prus/Niemiec
  na długo przed zaborami, a nie w ich wyniku.
- Licencja: dane OpenHistoricalMap są przekazane do domeny publicznej (CC0),
  chyba że dana cecha mówi inaczej; zarys Polski użyty do przycinania jest
  na licencji GPL-3.0, więc traktuj `partitions-poland.js` jako pochodną
  GPL-3.0 i zachowaj tę informację, jeśli go redystrybuujesz.
- Zbudowane z rzeczywistych, wyrysowanych granic państw z OHM, a nie z
  grubego zbioru danych całych imperiów, co jest zarówno dokładniejsze, jak
  i znacznie bardziej szczegółowe przy granicach niż zbiór danych w skali
  kraju. To wciąż uproszczona nakładka referencyjna, a nie granica o
  dokładności geodezyjnej, i wybiera jedną reprezentatywną granicę z końca
  XIX wieku dla każdej strefy (granice nieznacznie przesuwały się w latach
  1815–1918, np. Kraków był niezależnym miastem-państwem, dopóki Austria go
  nie zaanektowała w 1846 roku).

### Aktualizacja dołączonego zbioru danych

Nie ma sposobu na wczytanie innego zbioru danych w samej aplikacji — zawsze
używa `places-poland.js` (plus `places-poland-parts.js`, jeśli checkbox
części miejscowości jest włączony). Żeby użyć innego zbioru danych, podmień
zawartość jednego z tych plików (tablica obiektów `{name, lat, lon, type?}`;
`type` jest opcjonalne, rozpoznawane są tylko `"city"`, `"village"`,
`"osada"` i `"przysiolek"`). Inne źródła, jeśli chcesz później zaktualizować
lub zastąpić dołączony zbiór danych:

- **GUS/TERYT** (krajowy rejestr miejscowości) — nazwy/kody
  administracyjne, ale bez współrzędnych.
- **OpenStreetMap Overpass API** — zapytanie `place=city|town|village` w
  granicach Polski; daje współrzędne bezpośrednio.
- **GeoNames** — zbiorczy eksport `PL.zip` na
  [download.geonames.org/export/dump](https://download.geonames.org/export/dump/),
  z kolumnami lat/lon i klasy obiektu.

## Regenerowanie faviconu / obrazu OG

`favicon.svg`, `favicon.ico`, `apple-touch-icon.png` i `og-image.png` to
pliki statyczne wpisane do repozytorium — nic w czasie działania aplikacji
nie zależy od Node. Są budowane przez `scripts/build-favicon.js`, który
rysuje sylwetkę Polski bezpośrednio ze współrzędnych w
`partitions-poland.js` (suma trzech stref zaborów już odwzorowuje zarys
współczesnej Polski). Żeby je zregenerować po zmianie projektu graficznego:

```bash
npm install
node scripts/build-favicon.js
```

## Co rozwijać w pierwszej kolejności

Mniej więcej w kolejności stosunku wartości do nakładu pracy:

1. **Zapisywanie reguł między odświeżeniami.** W tej chwili reguły resetują
   się po odświeżeniu strony. Warto zapisywać je w `localStorage` (to zwykła
   statyczna strona, nie artefakt Claude, więc `localStorage` jest tu jak
   najbardziej na miejscu), żeby skonfigurowana sesja przetrwała odświeżenie.
2. **Reguły z regexem lub wieloma wzorcami.** W tej chwili jest to zwykłe
   dopasowanie sufiksu. Część użytkowników będzie chciała dopasowania
   prefiksu, "zawiera" albo prawdziwego regexa dla trudniejszych wzorców
   (np. `ów$` vs `ówka$`).
3. **Grupowanie znaczników (clustering)** dla płynności przesuwania/zoomu
   przy tysiącach punktów na ekranie naraz — `Leaflet.markercluster` to
   standardowy plugin, który da się czysto dołożyć na istniejący
   `markerLayer`. (Mapa już używa renderera canvas z Leaflet, żeby domyślny
   zbiór ~44 tys. punktów działał płynnie, ale clustering pomógłby dodatkowo
   przy niskich poziomach zoomu.)
4. **Eksport.** Przycisk "pobierz dopasowania jako CSV/GeoJSON" dla każdej
   reguły, dla osób, które chcą zabrać podświetlony podzbiór gdzie indziej.
