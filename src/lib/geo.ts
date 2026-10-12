import type { Settings, Stop, Transport, Trip } from './types';

const EARTH_RADIUS_KM = 6371.0088;
export const EARTH_CIRCUMFERENCE_KM = 40075;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Großkreis-Distanz in km (Haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface Leg {
  tripId: string;
  from: LatLng & { name: string };
  to: LatLng & { name: string };
  transport: Transport;
  km: number;
}

/** Zerlegt eine Reise in Etappen, optional inkl. Hin-/Rückreise ab Wohnort. */
export function tripLegs(trip: Trip, home?: Settings['home']): Leg[] {
  const points: (LatLng & { name: string; transport: Transport })[] = trip.stops.map(
    (s: Stop) => ({ lat: s.lat, lng: s.lng, name: s.name, transport: s.transport }),
  );
  const useHome = trip.fromHome && home && points.length > 0;
  if (useHome) {
    points.unshift({ ...home, transport: 'other' });
    points.push({ ...home, transport: trip.returnTransport ?? points[1].transport });
  }
  const legs: Leg[] = [];
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const km = distanceKm(from, to);
    if (km < 0.5) continue;
    legs.push({ tripId: trip.id, from, to, transport: to.transport, km });
  }
  return legs;
}

export function tripDistanceKm(trip: Trip, home?: Settings['home']): number {
  return tripLegs(trip, home).reduce((sum, l) => sum + l.km, 0);
}

/** Anzahl Reisetage inkl. An- und Abreisetag. */
export function tripDays(trip: Trip): number {
  const start = Date.parse(trip.startDate);
  const end = Date.parse(trip.endDate || trip.startDate);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}
