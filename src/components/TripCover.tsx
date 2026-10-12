import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { PhotoThumb } from './PhotoThumb';
import type { Trip } from '../lib/types';
import { tripCountries } from '../lib/filter';
import { flag } from '../lib/countries';

/** Titelbild einer Reise (gewähltes Cover oder erstes Foto), sonst Flaggen als Platzhalter. */
export function TripCover({ trip, className = '' }: { trip: Trip; className?: string }) {
  const photo = useLiveQuery(
    async () =>
      (trip.coverPhotoId && (await db.photos.get(trip.coverPhotoId))) ||
      (await db.photos.where('tripId').equals(trip.id).first()) ||
      null,
    [trip.id, trip.coverPhotoId],
  );
  if (photo) return <PhotoThumb photo={photo} className={`cover ${className}`} alt="" />;
  return (
    <div className={`cover cover-empty ${className}`} aria-hidden>
      {tripCountries(trip).slice(0, 3).map((c) => (
        <span key={c}>{flag(c)}</span>
      ))}
    </div>
  );
}
