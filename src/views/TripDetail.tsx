import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteTrip } from '../lib/db';
import { addPhotos } from '../lib/photos';
import { navigate, useTripPhotos } from '../lib/hooks';
import { countryName, flag } from '../lib/countries';
import { tripCountries } from '../lib/filter';
import { distanceKm, tripDays, tripDistanceKm } from '../lib/geo';
import { formatDate, formatMoney, formatNumber, formatRange } from '../lib/format';
import { TRANSPORTS, type Settings } from '../lib/types';
import { StarRating } from '../components/StarRating';
import { TripCover } from '../components/TripCover';
import { PhotoThumb } from '../components/PhotoThumb';
import { Lightbox } from '../components/Lightbox';

export default function TripDetail({ id, settings }: { id: string; settings?: Settings }) {
  const trip = useLiveQuery(() => db.trips.get(id).then((t) => t ?? null), [id]);
  const photos = useTripPhotos(id) ?? [];
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (trip === undefined) return <div className="page muted">Lädt…</div>;
  if (trip === null) {
    return (
      <div className="page">
        <div className="empty card">
          <h2>Reise nicht gefunden</h2>
          <a className="btn" href="#/timeline">
            Zur Timeline
          </a>
        </div>
      </div>
    );
  }

  const home = trip.fromHome ? settings?.home : undefined;
  const stopName = (stopId?: string) => trip.stops.find((s) => s.id === stopId)?.name;

  const onDelete = async () => {
    if (!confirm(`„${trip.title}“ wirklich löschen? Fotos und Notizen gehen dabei verloren.`)) return;
    await deleteTrip(trip.id);
    navigate('timeline');
  };

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      await addPhotos(trip.id, files);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="page detail">
      <header className="detail-hero">
        <TripCover trip={trip} className="detail-cover" />
        <div className="detail-head">
          <div className="muted">{formatRange(trip.startDate, trip.endDate)}</div>
          <h1>{trip.title}</h1>
          <div className="detail-meta">
            <span>{tripCountries(trip).map((c) => `${flag(c)} ${countryName(c)}`).join(' · ')}</span>
            <span>{tripDays(trip)} Tage</span>
            <span>{formatNumber(tripDistanceKm(trip, settings?.home))} km</span>
            {trip.costs ? <span>{formatMoney(trip.costs, trip.currency || 'EUR')}</span> : null}
            <StarRating value={trip.rating} />
          </div>
          {(trip.tags.length > 0 || trip.companions.length > 0) && (
            <div className="tags">
              {trip.companions.map((c) => (
                <span key={c} className="tag tag-person">
                  👤 {c}
                </span>
              ))}
              {trip.tags.map((t) => (
                <span key={t} className="tag">
                  #{t}
                </span>
              ))}
            </div>
          )}
          <div className="row">
            <a className="btn btn-primary" href={`#/edit/${trip.id}`}>
              Bearbeiten
            </a>
            <a className="btn" href={`#/globe?trip=${trip.id}`}>
              🌍 Auf dem Globus
            </a>
            <button className="btn btn-danger" onClick={onDelete}>
              Löschen
            </button>
          </div>
        </div>
      </header>

      {trip.description && <p className="lead">{trip.description}</p>}

      <div className="detail-grid">
        <section className="card">
          <h2>Route</h2>
          <ol className="route">
            {home && (
              <li className="route-stop route-home">
                <span className="route-icon">🏠</span>
                <div>
                  <strong>{home.name}</strong>
                </div>
              </li>
            )}
            {trip.stops.map((s, i) => {
              const prev = i === 0 ? home : trip.stops[i - 1];
              const km = prev ? distanceKm(prev, s) : 0;
              return (
                <li key={s.id} className="route-stop">
                  {prev && km > 0.5 && (
                    <div className="route-leg muted">
                      {TRANSPORTS[s.transport].icon} {TRANSPORTS[s.transport].label} · {formatNumber(km)} km
                    </div>
                  )}
                  <span className="route-icon">{flag(s.countryCode)}</span>
                  <div>
                    <strong>{s.name}</strong>
                    <StarRating value={s.rating} size="sm" />
                    {(s.arrival || s.departure) && (
                      <div className="muted small">{formatRange(s.arrival || s.departure!, s.departure || s.arrival!)}</div>
                    )}
                    {s.accommodation && <div className="small">🛏️ {s.accommodation}</div>}
                    {s.notes && <p className="small pre">{s.notes}</p>}
                  </div>
                </li>
              );
            })}
            {home && trip.stops.length > 0 && (
              <li className="route-stop route-home">
                <div className="route-leg muted">
                  {TRANSPORTS[trip.returnTransport ?? 'other'].icon} Rückreise ·{' '}
                  {formatNumber(distanceKm(trip.stops[trip.stops.length - 1], home))} km
                </div>
                <span className="route-icon">🏠</span>
                <div>
                  <strong>{home.name}</strong>
                </div>
              </li>
            )}
          </ol>
        </section>

        {trip.journal && (
          <section className="card">
            <h2>Tagebuch</h2>
            <div className="pre journal">{trip.journal}</div>
          </section>
        )}
      </div>

      <section className="card">
        <header className="section-head">
          <h2>Fotos {photos.length > 0 && <span className="muted">({photos.length})</span>}</h2>
          <label className="btn">
            {uploading ? 'Lädt hoch…' : '+ Fotos hinzufügen'}
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onUpload(e.target.files)} />
          </label>
        </header>
        {photos.length ? (
          <div className="gallery">
            {photos.map((p, i) => (
              <button key={p.id} className="gallery-item" onClick={() => setLightbox(i)}>
                <PhotoThumb photo={p} />
                {(p.caption || p.stopId) && <span className="gallery-caption">{p.caption || stopName(p.stopId)}</span>}
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">Noch keine Fotos. Bilder werden verkleinert lokal in deinem Browser gespeichert.</p>
        )}
      </section>

      <p className="muted small">
        Angelegt am {formatDate(trip.createdAt.slice(0, 10))} · zuletzt geändert am {formatDate(trip.updatedAt.slice(0, 10))}
      </p>

      {lightbox !== null && <Lightbox photos={photos} index={lightbox} onIndex={setLightbox} stopName={stopName} />}
    </div>
  );
}
