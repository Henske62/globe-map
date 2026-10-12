import { useEffect, useMemo, useState } from 'react';
import { db, uid } from '../lib/db';
import { addPhotos } from '../lib/photos';
import { navigate, useTripPhotos } from '../lib/hooks';
import { countryName, flag } from '../lib/countries';
import { TRANSPORTS, type Settings, type Stop, type Transport, type Trip } from '../lib/types';
import { PlaceSearch } from '../components/PlaceSearch';
import { StarRating } from '../components/StarRating';
import { ChipInput } from '../components/ChipInput';
import { PhotoThumb } from '../components/PhotoThumb';
import { confirmDanger } from '../components/Dialog';
import type { Place } from '../lib/geocode';
import { distanceKm } from '../lib/geo';

/** Sinnvoller Vorschlag fürs Verkehrsmittel: weite Strecken = Flug, sonst wie die vorige Etappe. */
function guessTransport(from: { lat: number; lng: number } | undefined, to: Place, previous?: Transport): Transport {
  if (from && distanceKm(from, to) > 700) return 'flight';
  return previous && previous !== 'flight' ? previous : 'car';
}

const CURRENCIES = ['EUR', 'USD', 'CHF', 'GBP', 'JPY', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'THB', 'AUD', 'CAD'];

function emptyTrip(): Trip {
  const now = new Date().toISOString();
  return {
    id: uid(),
    title: '',
    startDate: '',
    endDate: '',
    tags: [],
    companions: [],
    stops: [],
    fromHome: true,
    currency: 'EUR',
    createdAt: now,
    updatedAt: now,
  };
}

interface Props {
  id?: string; // undefined -> neue Reise
  allTrips: Trip[];
  settings?: Settings;
}

export default function TripEditor({ id, allTrips, settings }: Props) {
  const isNew = !id || id === 'new';
  const [trip, setTrip] = useState<Trip | null | undefined>(isNew ? emptyTrip() : undefined);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) {
      setTrip(emptyTrip());
      return;
    }
    setTrip(undefined);
    db.trips.get(id!).then((t) => setTrip(t ?? null));
  }, [id, isNew]);

  const suggestions = useMemo(
    () => ({
      tags: [...new Set(allTrips.flatMap((t) => t.tags))].sort(),
      companions: [...new Set(allTrips.flatMap((t) => t.companions))].sort(),
    }),
    [allTrips],
  );

  if (!trip) return <div className="page muted">{trip === null ? 'Reise nicht gefunden.' : 'Lädt…'}</div>;

  const set = (patch: Partial<Trip>) => setTrip({ ...trip, ...patch });
  const setStop = (stopId: string, patch: Partial<Stop>) =>
    set({ stops: trip.stops.map((s) => (s.id === stopId ? { ...s, ...patch } : s)) });
  const moveStop = (index: number, dir: -1 | 1) => {
    const stops = [...trip.stops];
    const [s] = stops.splice(index, 1);
    stops.splice(index + dir, 0, s);
    set({ stops });
  };

  const addStop = (p: Place) => {
    const last = trip.stops[trip.stops.length - 1];
    const stop: Stop = {
      id: uid(),
      name: p.name,
      countryCode: p.countryCode,
      lat: p.lat,
      lng: p.lng,
      transport: guessTransport(last ?? settings?.home, p, last?.transport),
      arrival: last?.departure || (trip.stops.length === 0 ? trip.startDate || undefined : undefined),
    };
    set({ stops: [...trip.stops, stop] });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const stopDates = trip.stops.flatMap((s) => [s.arrival, s.departure]).filter(Boolean).sort() as string[];
    const startDate = trip.startDate || stopDates[0] || '';
    const endDate = trip.endDate || stopDates[stopDates.length - 1] || startDate;
    if (!trip.title.trim()) return setError('Bitte gib der Reise einen Titel.');
    if (!startDate) return setError('Bitte gib ein Startdatum an.');
    if (endDate < startDate) return setError('Das Enddatum liegt vor dem Startdatum.');
    setSaving(true);
    await db.trips.put({ ...trip, title: trip.title.trim(), startDate, endDate, updatedAt: new Date().toISOString() });
    navigate(`trip/${trip.id}`);
  };

  return (
    <form className="page editor" onSubmit={save}>
      <header className="section-head">
        <h1>{isNew ? 'Neue Reise' : 'Reise bearbeiten'}</h1>
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={() => history.back()}>
            Abbrechen
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Speichern
          </button>
        </div>
      </header>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <section className="card form-grid">
        <div className="field span-2">
          <label htmlFor="title">Titel *</label>
          <input id="title" required value={trip.title} placeholder="z. B. Roadtrip Portugal" onChange={(e) => set({ title: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="start">Von *</label>
          <input id="start" type="date" value={trip.startDate} onChange={(e) => set({ startDate: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="end">Bis</label>
          <input id="end" type="date" value={trip.endDate} min={trip.startDate} onChange={(e) => set({ endDate: e.target.value })} />
        </div>
        <div className="field span-2">
          <label htmlFor="desc">Kurzbeschreibung</label>
          <input id="desc" value={trip.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
        </div>
        <div className="field">
          <label>Bewertung</label>
          <StarRating value={trip.rating} onChange={(rating) => set({ rating })} />
        </div>
        <div className="field">
          <label htmlFor="costs">Kosten (gesamt)</label>
          <div className="row nowrap">
            <input
              id="costs"
              type="number"
              min={0}
              step="any"
              value={trip.costs ?? ''}
              onChange={(e) => set({ costs: e.target.value ? Number(e.target.value) : undefined })}
            />
            <select aria-label="Währung" value={trip.currency ?? 'EUR'} onChange={(e) => set({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <ChipInput label="Tags" values={trip.tags} onChange={(tags) => set({ tags })} suggestions={suggestions.tags} placeholder="Strand, Städtetrip … (Enter)" />
        <ChipInput
          label="Mitreisende"
          values={trip.companions}
          onChange={(companions) => set({ companions })}
          suggestions={suggestions.companions}
          placeholder="Namen (Enter)"
        />
      </section>

      <section className="card">
        <header className="section-head">
          <h2>Route & Stopps</h2>
        </header>
        <label className="check">
          <input type="checkbox" checked={trip.fromHome} onChange={(e) => set({ fromHome: e.target.checked })} />
          Hin- und Rückreise ab Zuhause{settings?.home ? ` (${settings.home.name})` : ''} einbeziehen
        </label>
        {trip.fromHome && !settings?.home && (
          <p className="muted small">
            Tipp: Lege unter <a href="#/data">Daten & Einstellungen</a> deinen Wohnort fest, dann zählen Hin- und Rückweg zu den Kilometern.
          </p>
        )}

        <ol className="stop-editor">
          {trip.stops.map((s, i) => (
            <li key={s.id} className="stop-card">
              <div className="stop-card-head">
                <span className="stop-num">{i + 1}</span>
                <span className="flag" title={countryName(s.countryCode)}>
                  {flag(s.countryCode)}
                </span>
                <input aria-label="Ortsname" className="stop-name" value={s.name} onChange={(e) => setStop(s.id, { name: e.target.value })} />
                <div className="row nowrap">
                  <button type="button" className="icon-btn" aria-label="Nach oben" disabled={i === 0} onClick={() => moveStop(i, -1)}>
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Nach unten"
                    disabled={i === trip.stops.length - 1}
                    onClick={() => moveStop(i, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label="Stopp entfernen"
                    onClick={() => set({ stops: trip.stops.filter((x) => x.id !== s.id) })}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Anreise per</label>
                  <select value={s.transport} onChange={(e) => setStop(s.id, { transport: e.target.value as Transport })}>
                    {Object.entries(TRANSPORTS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.icon} {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Bewertung</label>
                  <StarRating value={s.rating} onChange={(rating) => setStop(s.id, { rating })} />
                </div>
                <div className="field">
                  <label>Ankunft</label>
                  <input type="date" value={s.arrival ?? ''} onChange={(e) => setStop(s.id, { arrival: e.target.value || undefined })} />
                </div>
                <div className="field">
                  <label>Abreise</label>
                  <input
                    type="date"
                    value={s.departure ?? ''}
                    min={s.arrival}
                    onChange={(e) => setStop(s.id, { departure: e.target.value || undefined })}
                  />
                </div>
                <div className="field span-2">
                  <label>Unterkunft</label>
                  <input value={s.accommodation ?? ''} onChange={(e) => setStop(s.id, { accommodation: e.target.value })} />
                </div>
                <div className="field span-2">
                  <label>Notizen</label>
                  <textarea rows={2} value={s.notes ?? ''} onChange={(e) => setStop(s.id, { notes: e.target.value })} />
                </div>
              </div>
              <details className="small" open={s.lat === 0 && s.lng === 0}>
                <summary className="muted">Koordinaten & Land</summary>
                <div className="form-grid">
                  <div className="field">
                    <label>Breitengrad</label>
                    <input type="number" step="any" value={s.lat} onChange={(e) => setStop(s.id, { lat: Number(e.target.value) })} />
                  </div>
                  <div className="field">
                    <label>Längengrad</label>
                    <input type="number" step="any" value={s.lng} onChange={(e) => setStop(s.id, { lng: Number(e.target.value) })} />
                  </div>
                  <div className="field">
                    <label>Ländercode (ISO)</label>
                    <input
                      maxLength={2}
                      value={s.countryCode}
                      onChange={(e) => setStop(s.id, { countryCode: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ol>

        <div className="field">
          <label>{trip.stops.length ? 'Weiteren Stopp hinzufügen' : 'Ersten Stopp hinzufügen'}</label>
          <PlaceSearch
            onSelect={addStop}
            onManual={(name) => addStop({ name, label: name, lat: 0, lng: 0, countryCode: '' })}
          />
        </div>

        {trip.fromHome && trip.stops.length > 0 && (
          <div className="field narrow">
            <label>Rückreise nach Hause per</label>
            <select value={trip.returnTransport ?? trip.stops[0].transport} onChange={(e) => set({ returnTransport: e.target.value as Transport })}>
              {Object.entries(TRANSPORTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.icon} {v.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Tagebuch & Notizen</h2>
        <textarea
          aria-label="Tagebuch"
          rows={8}
          value={trip.journal ?? ''}
          placeholder="Was war besonders? Highlights, Restaurants, Tipps für das nächste Mal…"
          onChange={(e) => set({ journal: e.target.value })}
        />
      </section>

      {isNew ? (
        <p className="muted small">Fotos kannst du nach dem ersten Speichern hinzufügen.</p>
      ) : (
        <PhotoManager trip={trip} onCover={(coverPhotoId) => set({ coverPhotoId })} />
      )}

      <div className="row end">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          Speichern
        </button>
      </div>
    </form>
  );
}

function PhotoManager({ trip, onCover }: { trip: Trip; onCover: (id?: string) => void }) {
  const photos = useTripPhotos(trip.id) ?? [];
  const [busy, setBusy] = useState(false);

  return (
    <section className="card">
      <header className="section-head">
        <h2>Fotos</h2>
        <label className="btn">
          {busy ? 'Lädt hoch…' : '+ Fotos hinzufügen'}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={async (e) => {
              const files = e.target.files;
              if (!files?.length) return;
              setBusy(true);
              try {
                await addPhotos(trip.id, files);
              } finally {
                setBusy(false);
                e.target.value = '';
              }
            }}
          />
        </label>
      </header>
      <p className="muted small">Änderungen an Fotos werden sofort gespeichert. Das Titelbild wird mit der Reise gespeichert.</p>
      <div className="photo-editor">
        {photos.map((p) => (
          <div key={p.id} className={`photo-edit ${trip.coverPhotoId === p.id ? 'is-cover' : ''}`}>
            <PhotoThumb photo={p} />
            <input
              aria-label="Bildunterschrift"
              placeholder="Bildunterschrift"
              defaultValue={p.caption}
              onBlur={(e) => db.photos.update(p.id, { caption: e.target.value })}
            />
            <select aria-label="Stopp" value={p.stopId ?? ''} onChange={(e) => db.photos.update(p.id, { stopId: e.target.value || undefined })}>
              <option value="">– kein Stopp –</option>
              {trip.stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="row nowrap">
              <button type="button" className="btn btn-small" onClick={() => onCover(trip.coverPhotoId === p.id ? undefined : p.id)}>
                {trip.coverPhotoId === p.id ? '★ Titelbild' : 'Als Titelbild'}
              </button>
              <button
                type="button"
                className="btn btn-small btn-danger"
                onClick={async () => {
                  if (await confirmDanger('Foto löschen?', 'Das Foto wird aus dieser Reise entfernt.')) {
                    await db.photos.delete(p.id);
                    if (trip.coverPhotoId === p.id) onCover(undefined);
                  }
                }}
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
