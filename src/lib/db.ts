import Dexie, { type EntityTable } from 'dexie';
import type { Photo, Settings, Trip } from './types';

export const db = new Dexie('travel-atlas') as Dexie & {
  trips: EntityTable<Trip, 'id'>;
  photos: EntityTable<Photo, 'id'>;
  settings: EntityTable<Settings, 'id'>;
};

db.version(1).stores({
  trips: 'id, startDate, endDate, *tags, *companions',
  photos: 'id, tripId, stopId',
  settings: 'id',
});

export function uid(): string {
  return crypto.randomUUID();
}

/** Bittet den Browser, die Daten nicht automatisch zu löschen. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function deleteTrip(id: string): Promise<void> {
  await db.transaction('rw', db.trips, db.photos, async () => {
    await db.photos.where('tripId').equals(id).delete();
    await db.trips.delete(id);
  });
}
