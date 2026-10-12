import type { Filters, Trip } from './types';

export function tripYear(trip: Trip): number {
  return Number(trip.startDate.slice(0, 4));
}

export function tripCountries(trip: Trip): string[] {
  return [...new Set(trip.stops.map((s) => s.countryCode).filter(Boolean))];
}

export function applyFilters(trips: Trip[], f: Filters): Trip[] {
  const q = f.query.trim().toLowerCase();
  return trips.filter((t) => {
    const year = tripYear(t);
    if (f.yearFrom && year < f.yearFrom) return false;
    if (f.yearTo && year > f.yearTo) return false;
    if (f.minRating && (t.rating ?? 0) < f.minRating) return false;
    if (f.countries.length && !tripCountries(t).some((c) => f.countries.includes(c))) return false;
    if (f.tags.length && !t.tags.some((x) => f.tags.includes(x))) return false;
    if (f.companions.length && !t.companions.some((x) => f.companions.includes(x))) return false;
    if (f.transports.length && !t.stops.some((s) => f.transports.includes(s.transport))) return false;
    if (q) {
      const haystack = [
        t.title,
        t.description,
        t.journal,
        ...t.tags,
        ...t.companions,
        ...t.stops.flatMap((s) => [s.name, s.notes, s.accommodation]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function activeFilterCount(f: Filters): number {
  return (
    (f.query.trim() ? 1 : 0) +
    (f.yearFrom ? 1 : 0) +
    (f.yearTo ? 1 : 0) +
    (f.minRating ? 1 : 0) +
    f.countries.length +
    f.tags.length +
    f.companions.length +
    f.transports.length
  );
}

export function sortByDateDesc(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => b.startDate.localeCompare(a.startDate));
}
