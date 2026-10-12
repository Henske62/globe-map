import { useEffect, useRef, useState } from 'react';
import { searchPlaces, type Place } from '../lib/geocode';
import { searchGazetteer } from '../lib/gazetteer';
import { flag } from '../lib/countries';

interface Props {
  onSelect: (p: Place) => void;
  /** Wird angeboten, wenn die Suche nichts findet. */
  onManual?: (name: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/** Ortssuche mit Autovervollständigung: OpenStreetMap Nominatim (gedrosselt) plus eingebaute Offline-Städteliste. */
export function PlaceSearch({ onSelect, onManual, placeholder = 'Ort suchen, z. B. „Lissabon“', autoFocus }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searched, setSearched] = useState('');
  const lastRequest = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    // Mindestens 1 s zwischen Anfragen (Nominatim-Nutzungsbedingungen) + Tipp-Pause abwarten.
    const wait = Math.max(450, 1000 - (Date.now() - lastRequest.current));
    const timer = setTimeout(async () => {
      lastRequest.current = Date.now();
      setState('loading');
      // Online (OpenStreetMap) und offline (eingebaute Städteliste) parallel; was erreichbar ist, wird angezeigt.
      const [online, offline] = await Promise.allSettled([searchPlaces(q, ctrl.signal), searchGazetteer(q)]);
      if (ctrl.signal.aborted) return;
      const merged: Place[] = [];
      for (const p of [
        ...(online.status === 'fulfilled' ? online.value : []),
        ...(offline.status === 'fulfilled' ? offline.value : []),
      ]) {
        if (!merged.some((m) => m.countryCode === p.countryCode && Math.abs(m.lat - p.lat) < 0.1 && Math.abs(m.lng - p.lng) < 0.1)) merged.push(p);
      }
      setResults(merged.slice(0, 8));
      setSearched(q);
      setActive(0);
      setOpen(true);
      setState(online.status === 'rejected' && offline.status === 'rejected' ? 'error' : 'idle');
    }, wait);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const choose = (p: Place) => {
    onSelect(p);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="place-search">
      <input
        type="search"
        value={query}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label="Ort suchen"
        aria-autocomplete="list"
        aria-expanded={open && results.length > 0}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!results.length) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => (a + 1) % results.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => (a - 1 + results.length) % results.length);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(results[active]);
          }
        }}
      />
      {state === 'loading' && <span className="place-search-status">Suche…</span>}
      {state === 'error' && <span className="place-search-status error">Suche nicht erreichbar</span>}
      {open && state === 'idle' && results.length === 0 && searched === query.trim() && query.trim().length >= 2 && onManual && (
        <ul className="place-results">
          <li
            onMouseDown={(e) => {
              e.preventDefault();
              onManual(query.trim());
              setQuery('');
              setOpen(false);
            }}
          >
            <span className="flag">📍</span>
            <span>
              <strong>„{query.trim()}“ manuell anlegen</strong>
              <small>Nichts gefunden – Koordinaten trägst du danach selbst ein.</small>
            </span>
          </li>
        </ul>
      )}
      {open && results.length > 0 && (
        <ul className="place-results" role="listbox">
          {results.map((p, i) => (
            <li
              key={`${p.lat},${p.lng},${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
            >
              <span className="flag">{flag(p.countryCode)}</span>
              <span>
                <strong>{p.name}</strong>
                <small>{p.label}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
