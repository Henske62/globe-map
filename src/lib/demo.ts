import { db, uid } from './db';
import type { Stop, Transport, Trip } from './types';

type S = [name: string, cc: string, lat: number, lng: number, arrival: string, departure: string, transport: Transport, notes?: string];

function trip(t: Omit<Trip, 'id' | 'stops' | 'createdAt' | 'updatedAt' | 'fromHome'> & { stops: S[] }): Trip {
  const now = new Date().toISOString();
  return {
    ...t,
    tags: [...t.tags, 'Demo'],
    id: uid(),
    fromHome: true,
    createdAt: now,
    updatedAt: now,
    stops: t.stops.map(
      ([name, countryCode, lat, lng, arrival, departure, transport, notes]): Stop => ({
        id: uid(),
        name,
        countryCode,
        lat,
        lng,
        arrival,
        departure,
        transport,
        notes,
      }),
    ),
  };
}

export const DEMO_TRIPS = (): Trip[] => [
  trip({
    title: 'Roadtrip Portugal',
    startDate: '2019-05-10',
    endDate: '2019-05-24',
    description: 'Von Porto die Küste runter bis an die Algarve.',
    rating: 5,
    tags: ['Roadtrip', 'Strand'],
    companions: ['Anna'],
    costs: 1800,
    currency: 'EUR',
    returnTransport: 'flight',
    stops: [
      ['Porto', 'PT', 41.1579, -8.6291, '2019-05-10', '2019-05-13', 'flight', 'Francesinha probiert!'],
      ['Coimbra', 'PT', 40.2033, -8.4103, '2019-05-13', '2019-05-14', 'car'],
      ['Lissabon', 'PT', 38.7223, -9.1393, '2019-05-14', '2019-05-19', 'car', 'Tram 28 & Pastéis de Belém'],
      ['Lagos', 'PT', 37.1028, -8.6730, '2019-05-19', '2019-05-24', 'car'],
    ],
  }),
  trip({
    title: 'Griechische Inseln',
    startDate: '2022-09-10',
    endDate: '2022-09-24',
    description: 'Athen und mit der Fähre durch die Kykladen.',
    rating: 5,
    tags: ['Inselhopping', 'Strand'],
    companions: ['Anna', 'Jonas'],
    costs: 2600,
    currency: 'EUR',
    returnTransport: 'flight',
    stops: [
      ['Athen', 'GR', 37.9838, 23.7275, '2022-09-10', '2022-09-13', 'flight', 'Akropolis zum Sonnenaufgang'],
      ['Naxos', 'GR', 37.1036, 25.3766, '2022-09-13', '2022-09-19', 'ferry'],
      ['Santorini', 'GR', 36.3932, 25.4615, '2022-09-19', '2022-09-24', 'ferry', 'Sonnenuntergang in Oia'],
    ],
  }),
  trip({
    title: 'Wochenende in Wien',
    startDate: '2023-03-17',
    endDate: '2023-03-19',
    rating: 4,
    tags: ['Städtetrip'],
    companions: [],
    returnTransport: 'train',
    stops: [['Wien', 'AT', 48.2082, 16.3738, '2023-03-17', '2023-03-19', 'train', 'Kaffeehaus-Marathon']],
  }),
  trip({
    title: 'Island Ringstraße',
    startDate: '2024-07-02',
    endDate: '2024-07-13',
    rating: 5,
    tags: ['Roadtrip', 'Natur'],
    companions: ['Jonas'],
    costs: 3500,
    currency: 'EUR',
    returnTransport: 'flight',
    stops: [
      ['Reykjavík', 'IS', 64.1466, -21.9426, '2024-07-02', '2024-07-04', 'flight'],
      ['Vík', 'IS', 63.4186, -19.006, '2024-07-04', '2024-07-06', 'car'],
      ['Höfn', 'IS', 64.2539, -15.2082, '2024-07-06', '2024-07-08', 'car'],
      ['Akureyri', 'IS', 65.6885, -18.1262, '2024-07-08', '2024-07-11', 'car', 'Wale gesehen 🐋'],
      ['Reykjavík', 'IS', 64.1466, -21.9426, '2024-07-11', '2024-07-13', 'car'],
    ],
  }),
  trip({
    title: 'Israel: Tel Aviv bis Totes Meer',
    startDate: '2025-04-03',
    endDate: '2025-04-13',
    description: 'Strand, Altstädte und Floaten im Toten Meer.',
    rating: 5,
    tags: ['Kultur', 'Strand'],
    companions: ['Anna'],
    costs: 2900,
    currency: 'EUR',
    returnTransport: 'flight',
    stops: [
      ['Tel Aviv', 'IL', 32.0853, 34.7818, '2025-04-03', '2025-04-06', 'flight', 'Hummus im Abu Hassan, Jaffa am Abend'],
      ['Haifa', 'IL', 32.794, 34.9896, '2025-04-06', '2025-04-08', 'train', 'Bahai-Gärten'],
      ['Jerusalem', 'IL', 31.7683, 35.2137, '2025-04-08', '2025-04-11', 'train'],
      ['Ein Bokek', 'IL', 31.2003, 35.3628, '2025-04-11', '2025-04-13', 'bus', 'Totes Meer'],
    ],
  }),
  trip({
    title: 'Wochenende Amsterdam',
    startDate: '2025-06-20',
    endDate: '2025-06-22',
    rating: 4,
    tags: ['Städtetrip'],
    companions: [],
    returnTransport: 'train',
    stops: [['Amsterdam', 'NL', 52.3676, 4.9041, '2025-06-20', '2025-06-22', 'train', 'Grachtenfahrt']],
  }),
  trip({
    title: 'Interrail Balkan',
    startDate: '2025-08-01',
    endDate: '2025-08-18',
    rating: 4,
    tags: ['Backpacking', 'Kultur'],
    companions: ['Anna'],
    costs: 1500,
    currency: 'EUR',
    returnTransport: 'flight',
    stops: [
      ['Ljubljana', 'SI', 46.0569, 14.5058, '2025-08-01', '2025-08-03', 'train'],
      ['Zagreb', 'HR', 45.815, 15.9819, '2025-08-03', '2025-08-05', 'train'],
      ['Sarajevo', 'BA', 43.8563, 18.4131, '2025-08-05', '2025-08-08', 'bus'],
      ['Kotor', 'ME', 42.4247, 18.7712, '2025-08-08', '2025-08-12', 'bus'],
      ['Tirana', 'AL', 41.3275, 19.8187, '2025-08-12', '2025-08-15', 'bus'],
      ['Ohrid', 'MK', 41.1231, 20.8016, '2025-08-15', '2025-08-18', 'bus'],
    ],
  }),
];

/** Erhöhen, wenn sich die Beispielreisen ändern – alte Beispiele werden dann ersetzt. */
const DEMO_VERSION = 2;

export async function loadDemoData() {
  await db.trips.bulkAdd(DEMO_TRIPS());
  const settings = await db.settings.get('settings');
  await db.settings.put({
    ...settings,
    id: 'settings',
    demoSeeded: true,
    demoVersion: DEMO_VERSION,
    home: settings?.home ?? { name: 'Frankfurt am Main', lat: 50.1109, lng: 8.6821, countryCode: 'DE' },
  });
}

let seeding: Promise<void> | undefined;

/** Beim allerersten Start Beispielreisen anlegen, damit Globus und Statistik nicht leer sind. */
export function seedDemoOnFirstRun(): Promise<void> {
  seeding ??= (async () => {
    const [count, settings] = await Promise.all([db.trips.count(), db.settings.get('settings')]);
    if (count === 0 && !settings?.demoSeeded) return loadDemoData();
    // Ältere Beispielreisen (z. B. Japan, New York) gegen die aktuellen tauschen.
    if ((settings?.demoVersion ?? 1) < DEMO_VERSION && (await db.trips.where('tags').equals('Demo').count()) > 0) {
      await removeDemoData();
      await loadDemoData();
    }
  })();
  return seeding;
}

export async function removeDemoData() {
  const ids = await db.trips.where('tags').equals('Demo').primaryKeys();
  await db.transaction('rw', db.trips, db.photos, async () => {
    await db.photos.where('tripId').anyOf(ids).delete();
    await db.trips.bulkDelete(ids);
  });
}
