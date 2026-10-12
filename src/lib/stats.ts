import { continentOf, type Continent } from './countries';
import { tripCountries, tripYear } from './filter';
import { tripDays, tripDistanceKm, tripLegs, EARTH_CIRCUMFERENCE_KM } from './geo';
import type { Settings, Transport, Trip } from './types';

export interface Stats {
  trips: number;
  days: number;
  km: number;
  earthLaps: number;
  countries: Map<string, number>; // Code -> Anzahl Reisen
  continents: Map<Continent, number>;
  cities: number;
  byYear: { year: number; trips: number; days: number; km: number }[];
  byTransport: Map<Transport, number>; // km pro Verkehrsmittel
  longestTrip?: { trip: Trip; days: number };
  farthestTrip?: { trip: Trip; km: number };
  totalCosts: Map<string, number>; // Währung -> Summe
}

export function computeStats(trips: Trip[], home?: Settings['home']): Stats {
  const countries = new Map<string, number>();
  const continents = new Map<Continent, number>();
  const cities = new Set<string>();
  const years = new Map<number, { trips: number; days: number; km: number }>();
  const byTransport = new Map<Transport, number>();
  const totalCosts = new Map<string, number>();
  let days = 0;
  let km = 0;
  let longestTrip: Stats['longestTrip'];
  let farthestTrip: Stats['farthestTrip'];

  for (const trip of trips) {
    const d = tripDays(trip);
    const dist = tripDistanceKm(trip, home);
    days += d;
    km += dist;
    if (!longestTrip || d > longestTrip.days) longestTrip = { trip, days: d };
    if (!farthestTrip || dist > farthestTrip.km) farthestTrip = { trip, km: dist };

    for (const c of tripCountries(trip)) {
      countries.set(c, (countries.get(c) ?? 0) + 1);
    }
    for (const s of trip.stops) cities.add(`${s.name.toLowerCase()}|${s.countryCode}`);
    for (const leg of tripLegs(trip, home)) {
      byTransport.set(leg.transport, (byTransport.get(leg.transport) ?? 0) + leg.km);
    }
    if (trip.costs) {
      const cur = trip.currency || 'EUR';
      totalCosts.set(cur, (totalCosts.get(cur) ?? 0) + trip.costs);
    }

    const y = tripYear(trip);
    const entry = years.get(y) ?? { trips: 0, days: 0, km: 0 };
    entry.trips += 1;
    entry.days += d;
    entry.km += dist;
    years.set(y, entry);
  }

  for (const code of countries.keys()) {
    const cont = continentOf(code);
    if (cont) continents.set(cont, (continents.get(cont) ?? 0) + 1);
  }

  // Lückenlose Jahresachse: Jahre ohne Reisen erscheinen mit 0.
  const yearKeys = [...years.keys()];
  const byYear: Stats['byYear'] = [];
  if (yearKeys.length) {
    for (let y = Math.min(...yearKeys); y <= Math.max(...yearKeys); y++) {
      byYear.push({ year: y, ...(years.get(y) ?? { trips: 0, days: 0, km: 0 }) });
    }
  }

  return {
    trips: trips.length,
    days,
    km,
    earthLaps: km / EARTH_CIRCUMFERENCE_KM,
    countries,
    continents,
    cities: cities.size,
    byYear,
    byTransport,
    longestTrip,
    farthestTrip,
    totalCosts,
  };
}
