import { useEffect, useRef, useState } from 'react';
import { searchPlaces, type Place } from '../lib/geocode';
import { flag } from '../lib/countries';

interface Props {
  onSelect: (p: Place) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/** Ortssuche mit Autovervollständigung (OpenStreetMap Nominatim, gedrosselt). */
export function PlaceSearch({ onSelect, placeholder = 'Ort suchen, z. B. „Lissabon“', autoFocus }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
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
      try {
        const r = await searchPlaces(q, ctrl.signal);
        setResults(r);
        setActive(0);
        setState('idle');
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setState('error');
      }
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
