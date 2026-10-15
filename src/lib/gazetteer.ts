import type { Place } from './geocode';
import { countryName } from './countries';
import { inFocus } from './region';

export interface GazetteerEntry {
  name: string;
  /** Deutscher Anzeigename, falls bekannt (z. B. „München“ statt „Munich“). */
  de?: string;
  cc: string;
  lat: number;
  lng: number;
  pop: number;
  /** Normalisierte Suchbegriffe: Name, Alternativname, deutsche Namen. */
  terms: string[];
}

/**
 * Deutsche Namen -> genauer Eintrag der GeoNames-Liste [Name in der Liste, Land].
 * Mit Land, damit z. B. „Köln“ nicht beim italienischen Dorf „Cologne“ landet.
 * Wird in lib.test.ts gegen public/gazetteer.txt geprüft.
 */
export const GERMAN_ALIASES: [de: string, name: string, cc: string][] = [
  ['München', 'Munich', 'DE'], ['Frankfurt', 'Frankfurt am Main', 'DE'],
  ['Wien', 'Vienna', 'AT'], ['Rom', 'Rome', 'IT'], ['Mailand', 'Milan', 'IT'], ['Venedig', 'Venice', 'IT'],
  ['Neapel', 'Naples', 'IT'], ['Florenz', 'Florence', 'IT'], ['Genua', 'Genoa', 'IT'], ['Padua', 'Padova', 'IT'],
  ['Syrakus', 'Siracusa', 'IT'], ['Bozen', 'Bolzano', 'IT'], ['Meran', 'Merano', 'IT'], ['Trient', 'Trento', 'IT'],
  ['Lissabon', 'Lisbon', 'PT'], ['Teneriffa', 'Santa Cruz de Tenerife', 'ES'], ['Mallorca', 'Palma', 'ES'],
  ['Nizza', 'Nice', 'FR'], ['Straßburg', 'Strasbourg', 'FR'], ['Dünkirchen', 'Dunkerque', 'FR'],
  ['Brüssel', 'Brussels', 'BE'], ['Lüttich', 'Liège', 'BE'], ['Brügge', 'Brugge', 'BE'], ['Löwen', 'Leuven', 'BE'],
  ['Mecheln', 'Mechelen', 'BE'], ['Ostende', 'Ostend', 'BE'], ['Den Haag', 'The Hague', 'NL'], ['Luxemburg', 'Luxembourg', 'LU'],
  ['Genf', 'Genève', 'CH'], ['Neuenburg', 'Neuchâtel', 'CH'], ['Edinburg', 'Edinburgh', 'GB'],
  ['Kopenhagen', 'Copenhagen', 'DK'], ['Prag', 'Prague', 'CZ'], ['Brünn', 'Brno', 'CZ'], ['Karlsbad', 'Karlovy Vary', 'CZ'],
  ['Warschau', 'Warsaw', 'PL'], ['Krakau', 'Kraków', 'PL'], ['Danzig', 'Gdańsk', 'PL'], ['Breslau', 'Wrocław', 'PL'],
  ['Posen', 'Poznań', 'PL'], ['Stettin', 'Szczecin', 'PL'], ['Pressburg', 'Bratislava', 'SK'], ['Laibach', 'Ljubljana', 'SI'],
  ['Agram', 'Zagreb', 'HR'], ['Belgrad', 'Belgrade', 'RS'], ['Bukarest', 'Bucharest', 'RO'], ['Athen', 'Athens', 'GR'],
  ['Saloniki', 'Thessaloníki', 'GR'], ['Thessaloniki', 'Thessaloníki', 'GR'], ['Korfu', 'Corfu', 'GR'],
  ['Rhodos', 'Ródos', 'GR'], ['Heraklion', 'Irákleion', 'GR'], ['Kreta', 'Irákleion', 'GR'],
  ['Nikosia', 'Nicosia', 'CY'], ['Izmir', 'İzmir', 'TR'], ['Kappadokien', 'Göreme', 'TR'],
  ['Moskau', 'Moscow', 'RU'], ['Sankt Petersburg', 'Saint Petersburg', 'RU'], ['Königsberg', 'Kaliningrad', 'RU'],
  ['Kiew', 'Kyiv', 'UA'], ['Lemberg', 'Lviv', 'UA'], ['Reval', 'Tallinn', 'EE'], ['Wilna', 'Vilnius', 'LT'],
  ['Tiflis', 'Tbilisi', 'GE'], ['Eriwan', 'Yerevan', 'AM'], ['Akkon', 'Acre', 'IL'], ['Tel-Aviv', 'Tel Aviv', 'IL'],
  ['Kairo', 'Cairo', 'EG'], ['Marrakesch', 'Marrakesh', 'MA'], ['Algier', 'Algiers', 'DZ'], ['Teheran', 'Tehran', 'IR'],
  ['Damaskus', 'Damascus', 'SY'], ['Bagdad', 'Baghdad', 'IQ'], ['Peking', 'Beijing', 'CN'], ['Tokio', 'Tokyo', 'JP'],
  ['Singapur', 'Singapore', 'SG'], ['Hongkong', 'Hong Kong', 'HK'], ['Neu-Delhi', 'New Delhi', 'IN'],
  ['New York', 'New York City', 'US'], ['Havanna', 'Havana', 'CU'], ['Mexiko-Stadt', 'Mexico City', 'MX'],
  ['Kapstadt', 'Cape Town', 'ZA'],
];

/** Kleinschreibung, ohne Akzente; ä/ae, ö/oe, ü/ue und ß/ss gelten als gleich. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function parseGazetteer(text: string): GazetteerEntry[] {
  const entries: GazetteerEntry[] = [];
  const byNameCc = new Map<string, GazetteerEntry>();
  for (const line of text.split('\n')) {
    const [name, alt, cc, lat, lng, pop] = line.split('|');
    const e: GazetteerEntry = { name, cc, lat: Number(lat), lng: Number(lng), pop: Number(pop), terms: [normalize(name)] };
    if (alt) e.terms.push(normalize(alt));
    entries.push(e);
    const key = `${name}|${cc}`;
    if (!byNameCc.has(key)) byNameCc.set(key, e); // Liste ist nach Einwohnern sortiert -> größter Ort gewinnt
  }
  for (const [de, name, cc] of GERMAN_ALIASES) {
    const e = byNameCc.get(`${name}|${cc}`);
    if (!e) continue;
    e.de ??= de;
    e.terms.push(normalize(de));
  }
  return entries;
}

let cache: Promise<GazetteerEntry[]> | undefined;

function load(): Promise<GazetteerEntry[]> {
  cache ??= fetch(new URL('./gazetteer.txt', document.baseURI))
    .then((r) => {
      if (!r.ok) throw new Error('Ortsliste nicht gefunden');
      return r.text();
    })
    .then(parseGazetteer)
    .catch((e) => {
      cache = undefined;
      throw e;
    });
  return cache;
}

export function searchEntries(entries: GazetteerEntry[], query: string, limit = 6): GazetteerEntry[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const scored: { e: GazetteerEntry; score: number }[] = [];
  for (const e of entries) {
    let score = -1;
    for (const t of e.terms) {
      if (t === q) score = Math.max(score, 3);
      else if (t.startsWith(q)) score = Math.max(score, 2);
      else if (t.includes(q)) score = Math.max(score, 1);
    }
    // Orte in Europa & Nahost bei gleicher Treffergüte zuerst.
    if (score >= 0) scored.push({ e, score: score * 2 + (inFocus(e.cc) ? 1 : 0) });
  }
  // Liste ist nach Einwohnern sortiert -> stabile Sortierung nach Treffergüte genügt.
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.e);
}

/** Offline-Ortssuche: alle Orte der Quelle in Europa & Nahost, übrige Welt ab 5.000 Einwohnern (~99.000 Orte). */
export async function searchGazetteer(query: string, limit = 6): Promise<Place[]> {
  return searchEntries(await load(), query, limit).map((e) => {
    const display = e.de ?? e.name;
    return {
      name: display,
      label: [display !== e.name ? e.name : '', countryName(e.cc), e.pop ? `${e.pop.toLocaleString('de-DE')} Einw.` : '']
        .filter(Boolean)
        .join(' · '),
      lat: e.lat,
      lng: e.lng,
      countryCode: e.cc,
    };
  });
}
