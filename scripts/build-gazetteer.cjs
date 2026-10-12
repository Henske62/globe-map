// Erzeugt public/gazetteer.txt: kompakte Offline-Ortsliste für die Ortssuche.
// Quelle: all-the-cities (GeoNames, CC BY 4.0). Aufruf: node scripts/build-gazetteer.cjs
const fs = require('fs');
const path = require('path');
const cities = require('all-the-cities');

const MIN_POPULATION = 5000;
const keep = cities.filter((c) => c.population >= MIN_POPULATION || /^PPL(C|A)$/.test(c.featureCode));
keep.sort((a, b) => b.population - a.population);

// Format pro Zeile: Name|Alternativname|Land|Breite|Länge|Einwohner
const lines = keep.map((c) => {
  const [lng, lat] = c.loc.coordinates;
  const clean = (s) => (s || '').replace(/[|\n]/g, ' ');
  return [clean(c.name), clean(c.altName), c.country, lat.toFixed(4), lng.toFixed(4), c.population].join('|');
});

const out = path.join(__dirname, '..', 'public', 'gazetteer.txt');
fs.writeFileSync(out, lines.join('\n'));
console.log(`${lines.length} Orte -> ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
