# 🌍 Travel Atlas (globe-map)

Persönlicher Reise-Katalog im Browser: alle Urlaube und Reisen auf einem 3D-Globus, in einer Timeline und als Statistik.

## Funktionen

- **Globus**: interaktiver 3D-Globus. Besuchte Länder sind nach Anzahl der Reisen eingefärbt, Orte als Punkte markiert, Routen als Bögen (Flüge animiert und gestrichelt, Landwege flach). Klick auf ein Land oder einen Ort zeigt die passenden Reisen; „Auf dem Globus“ zoomt auf eine einzelne Reise.
- **Timeline**: alle Reisen chronologisch nach Jahren, mit Titelbild, Flaggen, Route, Dauer, Kilometern und Bewertung.
- **Filter & Suche**: Volltextsuche (inkl. Notizen und Tagebuch), Zeitraum, Länder, Tags, Mitreisende, Verkehrsmittel und Mindestbewertung. Gilt für Globus, Timeline und Statistik.
- **Reisen & Routen erfassen**: beliebig viele Stopps pro Reise mit Ortssuche (OpenStreetMap), Verkehrsmittel pro Etappe, Daten, Unterkunft, Notizen und Bewertung. Stopps lassen sich umsortieren. Optional werden Hin- und Rückreise ab dem Wohnort einbezogen.
- **Statistik**: Länder (Anteil an der Welt), Kontinente, Orte, Reisetage, Kilometer (wie oft um die Erde), Verlauf pro Jahr, Kilometer nach Verkehrsmittel, Rekorde und Ausgaben.
- **Fotos & Tagebuch**: Fotos pro Reise (automatisch verkleinert), Zuordnung zu Stopps, Bildunterschriften, Titelbild, Lightbox. Dazu ein Freitext-Tagebuch.
- **Daten gehören dir**: Speicherung lokal im Browser (IndexedDB), JSON-Export und -Import inklusive Fotos zum Sichern oder Umziehen, Demo-Daten zum Ausprobieren.
- Dark/Light Mode automatisch, funktioniert auf Desktop und Handy.

## Loslegen

```bash
npm install
npm run dev        # http://localhost:5173
```

Weitere Befehle:

```bash
npm test           # Unit-Tests (Vitest)
npm run typecheck  # TypeScript prüfen
npm run build      # statischer Build nach dist/
npm run preview    # Build lokal ansehen
```

## Hosting

**Testversion:** https://claude.ai/artifact/UtYgoDx6teDRY6RDvU4oRs (als Claude-Artifact veröffentlicht, `npm run build:artifact` erzeugt `dist/artifact.html`).

Der Build in `dist/` ist eine rein statische Seite (Hash-Routing, relative Pfade) und läuft auf jedem Static Hoster:

- **Netlify / Vercel / Cloudflare Pages**: Repo verbinden, Build-Befehl `npm run build`, Ausgabeordner `dist`. Auch mit privaten Repos kostenlos.
- **GitHub Pages**: Settings → Pages → Source „GitHub Actions“, dann den Workflow *Deploy to GitHub Pages* manuell starten. Bei privaten Repos braucht das GitHub Pro.

> ⚠️ Die Reisedaten liegen **nur im Browser des jeweiligen Geräts**. Mach regelmäßig unter *Daten → Export mit Fotos* eine Sicherung.

## Technik

| Bereich | Bibliothek |
| --- | --- |
| UI | React 19 + TypeScript, Vite |
| Globus | [react-globe.gl](https://github.com/vasturiano/react-globe.gl) (three.js), wird erst bei Bedarf geladen |
| Ländergrenzen | [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth 1:50m) |
| Ländernamen (de) | i18n-iso-countries |
| Datenbank | IndexedDB via [Dexie](https://dexie.org) |
| Ortssuche | [Nominatim](https://nominatim.org) / © OpenStreetMap-Mitwirkende (max. 1 Anfrage/s), dazu offline ~50.000 Städte aus [GeoNames](https://www.geonames.org) (CC BY 4.0) via all-the-cities (`npm run gazetteer`) |

```
src/
  lib/          Datenmodell, DB, Geo-Berechnungen, Filter, Statistik, Backup, Ortssuche
  components/   Filterleiste, Ortssuche, Sterne, Chips, Fotos, Lightbox
  views/        Globus, Timeline, Statistik, Reise-Detail, Editor, Daten
```

## Ideen für später

- Bucket List / geplante Reisen (eigene Farbe auf dem Globus)
- Import von GPX-Tracks, Google-Maps-Timeline und GPS-Daten aus Fotos (EXIF)
- Animierte Routen-Wiedergabe („Fly-through“)
- PWA/Offline-Installation, Sync zwischen Geräten (z. B. Supabase)
- Teilen-Link oder Export einer einzelnen Reise
- „Heute vor X Jahren“-Erinnerungen
