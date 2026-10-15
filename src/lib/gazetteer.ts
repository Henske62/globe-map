import type { Place } from './geocode';
import { countryName } from './countries';
import { inFocus } from './region';

interface Entry {
  name: string;
  alt: string;
  cc: string;
  lat: number;
  lng: number;
  pop: number;
  key: string; // normalisiert: name + alt
}

/** Deutsche Namen bekannter Orte -> Name in der GeoNames-Liste. */
const GERMAN_NAMES: Record<string, string> = {
  muenchen: 'Munich', münchen: 'Munich', koeln: 'Cologne', köln: 'Cologne', nuernberg: 'Nuremberg', nürnberg: 'Nuremberg',
  hannover: 'Hanover', braunschweig: 'Braunschweig', wien: 'Vienna', rom: 'Rome', lissabon: 'Lisbon', prag: 'Prague',
  mailand: 'Milan', venedig: 'Venice', neapel: 'Naples', florenz: 'Florence', turin: 'Turin', genua: 'Genoa',
  bruessel: 'Brussels', brüssel: 'Brussels', kopenhagen: 'Copenhagen', warschau: 'Warsaw', krakau: 'Kraków',
  danzig: 'Gdańsk', breslau: 'Wrocław', moskau: 'Moscow', 'sankt petersburg': 'Saint Petersburg', athen: 'Athens',
  belgrad: 'Belgrade', bukarest: 'Bucharest', peking: 'Beijing', kairo: 'Cairo', kapstadt: 'Cape Town',
  'neu-delhi': 'New Delhi', 'mexiko-stadt': 'Mexico City', 'den haag': 'The Hague', genf: 'Geneva', zuerich: 'Zürich',
  luettich: 'Liège', lüttich: 'Liège', antwerpen: 'Antwerpen', nizza: 'Nice', sevilla: 'Sevilla', saloniki: 'Thessaloniki',
  tiflis: 'Tbilisi', edinburg: 'Edinburgh', 'frankfurt': 'Frankfurt am Main', bruegge: 'Bruges', brügge: 'Bruges',
  gent: 'Gent', jerusalem: 'Jerusalem', teheran: 'Tehran', bagdad: 'Baghdad', damaskus: 'Damascus', singapur: 'Singapore',
  'hongkong': 'Hong Kong', tokio: 'Tokyo', 'kyoto': 'Kyoto', seoul: 'Seoul', 'neu york': 'New York City',
  'new york': 'New York City', 'san francisco': 'San Francisco', havanna: 'Havana', 'rio de janeiro': 'Rio de Janeiro',
  'st. petersburg': 'Saint Petersburg', kiew: 'Kyiv', lemberg: 'Lviv', minsk: 'Minsk', riga: 'Riga', reval: 'Tallinn',
  wilna: 'Vilnius', pressburg: 'Bratislava', laibach: 'Ljubljana', agram: 'Zagreb', marrakesch: 'Marrakesh',
  'tel-aviv': 'Tel Aviv', jaffa: 'Tel Aviv', akkon: 'Acre', nazareth: 'Nazareth', bethlehem: 'Bethlehem', amman: 'Amman',
  beirut: 'Beirut', eriwan: 'Yerevan', baku: 'Baku', antalya: 'Antalya', smyrna: 'İzmir', nikosia: 'Nicosia',
  tunis: 'Tunis', algier: 'Algiers', reykjavik: 'Reykjavík', 'kapverden': 'Praia', korfu: 'Kérkyra', kreta: 'Heraklion',
};

let cache: Promise<Entry[]> | undefined;

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function load(): Promise<Entry[]> {
  cache ??= fetch(new URL('./gazetteer.txt', document.baseURI))
    .then((r) => {
      if (!r.ok) throw new Error('Ortsliste nicht gefunden');
      return r.text();
    })
    .then((text) =>
      text.split('\n').map((line) => {
        const [name, alt, cc, lat, lng, pop] = line.split('|');
        return { name, alt, cc, lat: Number(lat), lng: Number(lng), pop: Number(pop), key: normalize(`${name} ${alt}`) };
      }),
    )
    .catch((e) => {
      cache = undefined;
      throw e;
    });
  return cache;
}

/** Offline-Ortssuche: alle Orte der Quelle in Europa & Nahost, übrige Welt ab 5.000 Einwohnern (~99.000 Orte). */
export async function searchGazetteer(query: string, limit = 6): Promise<Place[]> {
  const entries = await load();
  const raw = normalize(query);
  const q = normalize(GERMAN_NAMES[query.trim().toLowerCase()] ?? GERMAN_NAMES[raw] ?? query);
  if (q.length < 2) return [];
  const scored: { e: Entry; score: number }[] = [];
  for (const e of entries) {
    const name = normalize(e.name);
    let score = -1;
    if (name === q) score = 3;
    else if (name.startsWith(q)) score = 2;
    else if (e.key.includes(q)) score = 1;
    // Orte in Europa & Nahost bei gleicher Treffergüte zuerst.
    if (score >= 0) scored.push({ e, score: score * 2 + (inFocus(e.cc) ? 1 : 0) });
  }
  // Liste ist nach Einwohnern sortiert -> stabile Sortierung nach Treffergüte genügt.
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ e }) => ({
    name: e.name,
    label: `${e.name}, ${countryName(e.cc)} · ${e.pop.toLocaleString('de-DE')} Einw.`,
    lat: e.lat,
    lng: e.lng,
    countryCode: e.cc,
  }));
}
