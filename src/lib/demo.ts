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
    title: 'Japan im Herbst',
    startDate: '2022-10-28',
    endDate: '2022-11-14',
    description: 'Laubfärbung, Tempel und Ramen.',
    rating: 5,
    tags: ['Kultur', 'Städtetrip'],
    companions: ['Anna', 'Jonas'],
    costs: 4200,
    currency: 'EUR',
    returnTransport: 'flight',
    stops: [
      ['Tokio', 'JP', 35.6762, 139.6503, '2022-10-29', '2022-11-03', 'flight'],
      ['Kyoto', 'JP', 35.0116, 135.7681, '2022-11-03', '2022-11-08', 'train', 'Fushimi Inari früh morgens'],
      ['Hiroshima', 'JP', 34.3853, 132.4553, '2022-11-08', '2022-11-10', 'train'],
      ['Osaka', 'JP', 34.6937, 135.5023, '2022-11-10', '2022-11-14', 'train'],
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
    title: 'Konferenz in New York',
    startDate: '2025-04-07',
    endDate: '2025-04-11',
    rating: 3,
    tags: ['Arbeit'],
    companions: ['Kollegen'],
    returnTransport: 'flight',
    stops: [['New York', 'US', 40.7128, -74.006, '2025-04-07', '2025-04-11', 'flight']],
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

export async function loadDemoData() {
  await db.trips.bulkAdd(DEMO_TRIPS());
  const settings = await db.settings.get('settings');
  await db.settings.put({
    ...settings,
    id: 'settings',
    demoSeeded: true,
    home: settings?.home ?? { name: 'Frankfurt am Main', lat: 50.1109, lng: 8.6821, countryCode: 'DE' },
  });
}

let seeding: Promise<void> | undefined;

/** Beim allerersten Start Beispielreisen anlegen, damit Globus und Statistik nicht leer sind. */
export function seedDemoOnFirstRun(): Promise<void> {
  seeding ??= (async () => {
    const [count, settings] = await Promise.all([db.trips.count(), db.settings.get('settings')]);
    if (count === 0 && !settings?.demoSeeded) await loadDemoData();
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
