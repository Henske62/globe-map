// Erzeugt public/gazetteer.txt: kompakte Offline-Ortsliste für die Ortssuche.
// Quelle: all-the-cities (GeoNames, CC BY 4.0). Aufruf: npm run gazetteer
// In der Fokusregion (Europa & Nahost, siehe src/lib/region.ts) alle Orte der Quelle (auch Dörfer),
// sonst Städte ab 5.000 Einwohnern plus Haupt- und Verwaltungsstädte.
const fs = require('fs');
const path = require('path');
const cities = require('all-the-cities');

const regionSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'region.ts'), 'utf8');
const focus = new Set(regionSrc.match(/countries: \(([\s\S]*?)\)\.split/)[1].match(/[A-Z]{2}/g));

const keep = cities.filter(
  (c) => c.population >= (focus.has(c.country) ? 0 : 5000) || /^PPL(C|A)$/.test(c.featureCode),
);
keep.sort((a, b) => b.population - a.population);

// Format pro Zeile: Name|Alternativname|Land|Breite|Länge|Einwohner
const lines = keep.map((c) => {
  const [lng, lat] = c.loc.coordinates;
  const clean = (s) => (s || '').replace(/[|\n]/g, ' ');
  return [clean(c.name), clean(c.altName), c.country, lat.toFixed(4), lng.toFixed(4), c.population].join('|');
});

const out = path.join(__dirname, '..', 'public', 'gazetteer.txt');
fs.writeFileSync(out, lines.join('\n'));
console.log(`${lines.length} Orte (Fokusregion: ${focus.size} Länder) -> ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
