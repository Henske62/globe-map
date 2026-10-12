import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { applyFilters } from './lib/filter';
import { navigate, useRoute, useSettings, useTrips } from './lib/hooks';
import { requestPersistentStorage } from './lib/db';
import { EMPTY_FILTERS, type Filters } from './lib/types';
import TimelineView from './views/TimelineView';
import StatsView from './views/StatsView';
import TripDetail from './views/TripDetail';
import TripEditor from './views/TripEditor';
import DataView from './views/DataView';

// three.js ist groß -> Globus erst bei Bedarf laden.
const GlobeView = lazy(() => import('./views/GlobeView'));

const NAV = [
  { view: 'globe', label: 'Globus', icon: '🌍' },
  { view: 'timeline', label: 'Timeline', icon: '🗓️' },
  { view: 'stats', label: 'Statistik', icon: '📊' },
  { view: 'data', label: 'Daten', icon: '⚙️' },
] as const;

const FILTER_KEY = 'travel-atlas:filters';

function loadFilters(): Filters {
  try {
    const raw = sessionStorage.getItem(FILTER_KEY);
    return raw ? { ...EMPTY_FILTERS, ...JSON.parse(raw) } : EMPTY_FILTERS;
  } catch {
    return EMPTY_FILTERS;
  }
}

export default function App() {
  const route = useRoute();
  const trips = useTrips();
  const settings = useSettings();
  const [filters, setFilters] = useState<Filters>(loadFilters);

  useEffect(() => {
    requestPersistentStorage();
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify(filters));
    } catch {
      /* privater Modus o. Ä. */
    }
  }, [filters]);

  const filtered = useMemo(() => applyFilters(trips ?? [], filters), [trips, filters]);
  const showFilters = route.view === 'globe' || route.view === 'timeline' || route.view === 'stats';

  let content: React.ReactNode;
  if (!trips) content = <div className="page muted">Lädt…</div>;
  else if (route.view === 'timeline') content = <TimelineView trips={filtered} settings={settings} />;
  else if (route.view === 'stats') content = <StatsView trips={filtered} settings={settings} />;
  else if (route.view === 'data') content = <DataView settings={settings} />;
  else if (route.view === 'trip' && route.id) content = <TripDetail id={route.id} settings={settings} />;
  else if (route.view === 'edit') content = <TripEditor id={route.id} allTrips={trips} settings={settings} />;
  else
    content = (
      <Suspense fallback={<div className="globe-wrap globe-loading muted">Globus wird geladen…</div>}>
        <GlobeView
          trips={filtered}
          settings={settings}
          focusTripId={route.params.get('trip') ?? undefined}
          onFilterCountry={(code) => {
            setFilters({ ...filters, countries: [code] });
            navigate('timeline');
          }}
        />
      </Suspense>
    );

  return (
    <div className={`app view-${route.view}`}>
      <header className="topbar">
        <a href="#/globe" className="brand">
          <img src="./favicon.svg" alt="" width={26} height={26} />
          <span>Travel Atlas</span>
        </a>
        <nav className="nav" aria-label="Hauptnavigation">
          {NAV.map((n) => (
            <a key={n.view} href={`#/${n.view}`} className={route.view === n.view ? 'active' : ''} aria-current={route.view === n.view ? 'page' : undefined}>
              <span aria-hidden>{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </a>
          ))}
        </nav>
        <a href="#/edit/new" className="btn btn-primary add-btn">
          + <span className="nav-label">Neue Reise</span>
        </a>
      </header>
      {showFilters && trips && trips.length > 0 && (
        <FilterBar trips={trips} filters={filters} onChange={setFilters} resultCount={filtered.length} />
      )}
      <main>{content}</main>
    </div>
  );
}
