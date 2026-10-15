import { describe, expect, it } from 'vitest';
import { distanceKm, tripDays, tripLegs } from './geo';
import { applyFilters, activeFilterCount } from './filter';
import { computeStats } from './stats';
import { continentOf, flag } from './countries';
import { EMPTY_FILTERS, type Trip } from './types';

const home = { name: 'Frankfurt', lat: 50.1109, lng: 8.6821, countryCode: 'DE' };

function trip(partial: Partial<Trip>): Trip {
  return {
    id: partial.id ?? 't',
    title: 'Test',
    startDate: '2024-01-01',
    endDate: '2024-01-05',
    tags: [],
    companions: [],
    stops: [],
    fromHome: false,
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

const lisbon = { id: 'a', name: 'Lissabon', countryCode: 'PT', lat: 38.7223, lng: -9.1393, transport: 'flight' as const };
const porto = { id: 'b', name: 'Porto', countryCode: 'PT', lat: 41.1579, lng: -8.6291, transport: 'train' as const };
const tokyo = { id: 'c', name: 'Tokio', countryCode: 'JP', lat: 35.6762, lng: 139.6503, transport: 'flight' as const };

describe('geo', () => {
  it('berechnet Großkreis-Distanzen', () => {
    expect(distanceKm(lisbon, porto)).toBeGreaterThan(270);
    expect(distanceKm(lisbon, porto)).toBeLessThan(280);
    expect(distanceKm(home, home)).toBe(0);
  });

  it('zählt Reisetage inklusive An- und Abreisetag', () => {
    expect(tripDays(trip({ startDate: '2024-01-01', endDate: '2024-01-05' }))).toBe(5);
    expect(tripDays(trip({ startDate: '2024-01-01', endDate: '2024-01-01' }))).toBe(1);
  });

  it('bezieht Hin- und Rückreise ab Wohnort ein', () => {
    const t = trip({ stops: [lisbon, porto], fromHome: true, returnTransport: 'flight' });
    const legs = tripLegs(t, home);
    expect(legs.map((l) => [l.from.name, l.to.name, l.transport])).toEqual([
      ['Frankfurt', 'Lissabon', 'flight'],
      ['Lissabon', 'Porto', 'train'],
      ['Porto', 'Frankfurt', 'flight'],
    ]);
    expect(tripLegs({ ...t, fromHome: false }, home)).toHaveLength(1);
  });
});

describe('filter', () => {
  const trips = [
    trip({ id: '1', startDate: '2019-05-01', stops: [lisbon], tags: ['Strand'], rating: 5 }),
    trip({ id: '2', startDate: '2022-10-01', stops: [tokyo], companions: ['Anna'], rating: 3, journal: 'Ramen in Shibuya' }),
  ];
  const ids = (f: Partial<typeof EMPTY_FILTERS>) => applyFilters(trips, { ...EMPTY_FILTERS, ...f }).map((t) => t.id);

  it('filtert nach Jahr, Land, Tag, Person und Bewertung', () => {
    expect(ids({})).toEqual(['1', '2']);
    expect(ids({ yearFrom: 2020 })).toEqual(['2']);
    expect(ids({ countries: ['PT'] })).toEqual(['1']);
    expect(ids({ tags: ['Strand'] })).toEqual(['1']);
    expect(ids({ companions: ['Anna'] })).toEqual(['2']);
    expect(ids({ minRating: 4 })).toEqual(['1']);
  });

  it('durchsucht Freitext inkl. Tagebuch', () => {
    expect(ids({ query: 'ramen' })).toEqual(['2']);
    expect(ids({ query: 'lissabon' })).toEqual(['1']);
  });

  it('zählt aktive Filter', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTERS, query: 'x', countries: ['PT', 'JP'] })).toBe(3);
  });
});

describe('stats', () => {
  it('aggregiert Länder, Kontinente und Jahre', () => {
    const s = computeStats([
      trip({ id: '1', startDate: '2019-05-01', endDate: '2019-05-03', stops: [lisbon, porto] }),
      trip({ id: '2', startDate: '2019-08-01', endDate: '2019-08-01', stops: [lisbon] }),
      trip({ id: '3', startDate: '2022-10-01', endDate: '2022-10-10', stops: [tokyo] }),
    ]);
    expect(s.trips).toBe(3);
    expect(s.days).toBe(3 + 1 + 10);
    expect(s.countries.get('PT')).toBe(2);
    expect([...s.continents.keys()].sort()).toEqual(['Asien', 'Europa']);
    expect(s.cities).toBe(3);
    // Lückenlose Jahresachse
    expect(s.byYear.map((y) => [y.year, y.trips])).toEqual([
      [2019, 2],
      [2020, 0],
      [2021, 0],
      [2022, 1],
    ]);
    expect(s.longestTrip?.trip.id).toBe('3');
  });
});

describe('countries', () => {
  it('liefert Flaggen und Kontinente', () => {
    expect(flag('DE')).toBe('🇩🇪');
    expect(continentOf('br')).toBe('Südamerika');
  });
});

describe('Fokusregion', () => {
  it('umfasst Europa bis Israel, aber nicht Übersee', async () => {
    const { inFocus, FOCUS_REGION } = await import('./region');
    for (const c of ['DE', 'PT', 'IS', 'GR', 'TR', 'CY', 'IL', 'jo']) expect(inFocus(c)).toBe(true);
    for (const c of ['US', 'JP', 'EG', 'MA']) expect(inFocus(c)).toBe(false);
    expect(new Set(FOCUS_REGION.countries).size).toBe(FOCUS_REGION.countries.length);
  });
});
