// Wandelt dist/index.html in eine Seite für Claude-Artifacts um (dist/artifact.html):
// Der Artifact-Host liefert <html>/<head>/<body> selbst, deshalb nur Titel, Styles und Skripte übernehmen.
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const keep = head
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => /^<(title|link|script)/.test(l))
  .join('\n');
fs.writeFileSync(path.join(dist, 'artifact.html'), `${keep}\n${body.trim()}\n`);

const files = fs.readdirSync(dist, { recursive: true }).filter((f) => !/\.html$/.test(f) && fs.statSync(path.join(dist, f)).isFile());
console.log(JSON.stringify(Object.fromEntries(files.map((f) => [f, `dist/${f}`])), null, 1));
