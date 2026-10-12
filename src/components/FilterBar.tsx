import { useMemo, useState } from 'react';
import { activeFilterCount, tripCountries, tripYear } from '../lib/filter';
import { countryName, flag } from '../lib/countries';
import { EMPTY_FILTERS, TRANSPORTS, type Filters, type Transport, type Trip } from '../lib/types';

interface Props {
  trips: Trip[];
  filters: Filters;
  onChange: (f: Filters) => void;
  resultCount: number;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterBar({ trips, filters, onChange, resultCount }: Props) {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => {
    const years = new Set<number>();
    const countries = new Set<string>();
    const tags = new Set<string>();
    const companions = new Set<string>();
    const transports = new Set<Transport>();
    for (const t of trips) {
      years.add(tripYear(t));
      tripCountries(t).forEach((c) => countries.add(c));
      t.tags.forEach((x) => tags.add(x));
      t.companions.forEach((x) => companions.add(x));
      t.stops.forEach((s) => transports.add(s.transport));
    }
    return {
      years: [...years].sort((a, b) => b - a),
      countries: [...countries].sort((a, b) => countryName(a).localeCompare(countryName(b), 'de')),
      tags: [...tags].sort((a, b) => a.localeCompare(b, 'de')),
      companions: [...companions].sort((a, b) => a.localeCompare(b, 'de')),
      transports: [...transports],
    };
  }, [trips]);

  const count = activeFilterCount(filters);
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="filterbar">
      <div className="filterbar-row">
        <input
          type="search"
          className="filter-search"
          placeholder="Reisen, Orte, Notizen durchsuchen…"
          aria-label="Suche"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
        />
        <button className={`btn ${count ? 'btn-accent' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Filter{count ? ` (${count})` : ''}
        </button>
        {count > 0 && (
          <>
            <span className="muted filter-count">
              {resultCount} von {trips.length}
            </span>
            <button className="btn btn-ghost" onClick={() => onChange(EMPTY_FILTERS)}>
              Zurücksetzen
            </button>
          </>
        )}
      </div>

      {open && (
        <div className="filter-panel">
          <div className="filter-group">
            <span className="filter-label">Zeitraum</span>
            <div className="row">
              <select
                aria-label="Von Jahr"
                value={filters.yearFrom ?? ''}
                onChange={(e) => set({ yearFrom: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">von …</option>
                {options.years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
              <select
                aria-label="Bis Jahr"
                value={filters.yearTo ?? ''}
                onChange={(e) => set({ yearTo: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">bis …</option>
                {options.years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Mindestbewertung</span>
            <div className="chips">
              {[0, 3, 4, 5].map((r) => (
                <button key={r} className={`chip-btn ${filters.minRating === r ? 'on' : ''}`} onClick={() => set({ minRating: r })}>
                  {r ? `${'★'.repeat(r)}+` : 'alle'}
                </button>
              ))}
            </div>
          </div>

          {options.countries.length > 0 && (
            <div className="filter-group wide">
              <span className="filter-label">Länder</span>
              <div className="chips">
                {options.countries.map((c) => (
                  <button
                    key={c}
                    className={`chip-btn ${filters.countries.includes(c) ? 'on' : ''}`}
                    onClick={() => set({ countries: toggle(filters.countries, c) })}
                  >
                    {flag(c)} {countryName(c)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {options.tags.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">Tags</span>
              <div className="chips">
                {options.tags.map((t) => (
                  <button key={t} className={`chip-btn ${filters.tags.includes(t) ? 'on' : ''}`} onClick={() => set({ tags: toggle(filters.tags, t) })}>
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {options.companions.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">Mitreisende</span>
              <div className="chips">
                {options.companions.map((c) => (
                  <button
                    key={c}
                    className={`chip-btn ${filters.companions.includes(c) ? 'on' : ''}`}
                    onClick={() => set({ companions: toggle(filters.companions, c) })}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {options.transports.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">Verkehrsmittel</span>
              <div className="chips">
                {options.transports.map((t) => (
                  <button
                    key={t}
                    className={`chip-btn ${filters.transports.includes(t) ? 'on' : ''}`}
                    onClick={() => set({ transports: toggle(filters.transports, t) })}
                  >
                    {TRANSPORTS[t].icon} {TRANSPORTS[t].label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
