import { db } from './db';
import type { Photo, Settings, Trip } from './types';

interface SerializedPhoto extends Omit<Photo, 'blob' | 'thumb'> {
  blob: string; // data URL
  thumb: string;
}

export interface Backup {
  app: 'travel-atlas';
  version: 1;
  exportedAt: string;
  settings?: Settings;
  trips: Trip[];
  photos: SerializedPhoto[];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

export async function createBackup(includePhotos: boolean): Promise<Blob> {
  const [trips, photos, settings] = await Promise.all([
    db.trips.toArray(),
    includePhotos ? db.photos.toArray() : Promise.resolve([]),
    db.settings.get('settings'),
  ]);
  const backup: Backup = {
    app: 'travel-atlas',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    trips,
    photos: await Promise.all(
      photos.map(async (p) => ({ ...p, blob: await blobToDataUrl(p.blob), thumb: await blobToDataUrl(p.thumb) })),
    ),
  };
  return new Blob([JSON.stringify(backup)], { type: 'application/json' });
}

export async function restoreBackup(file: File, mode: 'merge' | 'replace'): Promise<{ trips: number; photos: number }> {
  const data = JSON.parse(await file.text()) as Backup;
  if (data.app !== 'travel-atlas' || !Array.isArray(data.trips)) {
    throw new Error('Das ist keine gültige Travel-Atlas-Sicherung.');
  }
  const photos: Photo[] = await Promise.all(
    (data.photos ?? []).map(async (p) => ({ ...p, blob: await dataUrlToBlob(p.blob), thumb: await dataUrlToBlob(p.thumb) })),
  );
  await db.transaction('rw', db.trips, db.photos, db.settings, async () => {
    if (mode === 'replace') {
      await Promise.all([db.trips.clear(), db.photos.clear()]);
      if (data.settings) await db.settings.put(data.settings);
    }
    await db.trips.bulkPut(data.trips);
    await db.photos.bulkPut(photos);
  });
  return { trips: data.trips.length, photos: photos.length };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
