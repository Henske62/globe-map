import { db, uid } from './db';
import type { Photo } from './types';

async function resize(file: Blob, maxSize: number, quality: number) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Bild konnte nicht verarbeitet werden'))), 'image/jpeg', quality),
  );
  return { blob, width, height };
}

/** Speichert Fotos verkleinert (max. 2000 px) plus Vorschaubild, damit der Browser-Speicher nicht überläuft. */
export async function addPhotos(tripId: string, files: FileList | File[], stopId?: string): Promise<Photo[]> {
  const photos: Photo[] = [];
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) continue;
    const full = await resize(file, 2000, 0.85);
    const thumb = await resize(file, 480, 0.75);
    photos.push({
      id: uid(),
      tripId,
      stopId,
      caption: '',
      takenAt: file.lastModified ? new Date(file.lastModified).toISOString().slice(0, 10) : undefined,
      blob: full.blob,
      thumb: thumb.blob,
      width: full.width,
      height: full.height,
    });
  }
  await db.photos.bulkAdd(photos);
  return photos;
}
