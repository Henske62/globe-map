import { useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { MeshPhongMaterial } from 'three';
import { loadCountries, type CountryFeature } from '../lib/worldGeo';
import { tripLegs, type Leg } from '../lib/geo';
import { countryName, flag } from '../lib/countries';
import { tripCountries } from '../lib/filter';
import { formatRange } from '../lib/format';
import { navigate, useDarkMode, useElementSize } from '../lib/hooks';
import { TRANSPORTS, type Settings, type Transport, type Trip } from '../lib/types';

// Verkehrsmittel in 5 Gruppen (validierte kategoriale Reihenfolge, je Modus eigene Stufen).
// Flüge sind zusätzlich gestrichelt + animiert, damit Farbe nicht das einzige Merkmal ist.
const TRANSPORT_COLORS: Record<'dark' | 'light', Record<Transport, string>> = {
  dark: { flight: '#3987e5', train: '#d95926', car: '#199e70', bus: '#199e70', ferry: '#c98500', bike: '#d55181', walk: '#d55181', other: '#8b8f98' },
  light: { flight: '#2a78d6', train: '#eb6834', car: '#1baf7a', bus: '#1baf7a', ferry: '#eda100', bike: '#e87ba4', walk: '#e87ba4', other: '#6b7280' },
};

// Besuchte Länder: sequentielle Violett-Rampe (1, 2, 3, 4+ Reisen), damit sie sich von den Routen abhebt.
const PALETTE = {
  dark: { ocean: '#0d1b2e', land: '#1f2f45', border: '#3b5372', atmosphere: '#5aa9ff', place: '#f8fafc', placeDim: '#f8fafc44', visited: ['#5b4fb0', '#7a6ee0', '#9d93ec', '#c4bdf5'] },
  light: { ocean: '#c9dcef', land: '#f4f1ea', border: '#9fb3c8', atmosphere: '#9cc7ff', place: '#1e293b', placeDim: '#1e293b44', visited: ['#b4abf2', '#8f84e6', '#6a5cd0', '#4b3fa5'] },
};

interface Place {
  key: string;
  name: string;
  countryCode: string;
  lat: number;
  lng: number;
  trips: Trip[];
  isHome?: boolean;
}

type Selection = { kind: 'place'; place: Place } | { kind: 'country'; code: string } | null;

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

interface Props {
  trips: Trip[];
  settings?: Settings;
  focusTripId?: string;
  onFilterCountry: (code: string) => void;
}

export default function GlobeView({ trips, settings, focusTripId, onFilterCountry }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [hoverCountry, setHoverCountry] = useState<CountryFeature | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const dark = useDarkMode();
  const colors = dark ? PALETTE.dark : PALETTE.light;
  const transportColors = dark ? TRANSPORT_COLORS.dark : TRANSPORT_COLORS.light;
  const home = settings?.home;

  useEffect(() => {
    loadCountries().then(setCountries);
  }, []);

  const material = useMemo(() => new MeshPhongMaterial({ color: colors.ocean, shininess: 8 }), [colors.ocean]);

  const visits = useMemo(() => {
    const m = new Map<string, Trip[]>();
    for (const t of trips) for (const c of tripCountries(t)) m.set(c, [...(m.get(c) ?? []), t]);
    return m;
  }, [trips]);

  const places = useMemo(() => {
    const m = new Map<string, Place>();
    for (const t of trips) {
      for (const s of t.stops) {
        const key = `${s.lat.toFixed(2)},${s.lng.toFixed(2)}`;
        const p = m.get(key) ?? { key, name: s.name, countryCode: s.countryCode, lat: s.lat, lng: s.lng, trips: [] };
        if (!p.trips.includes(t)) p.trips.push(t);
        m.set(key, p);
      }
    }
    const list = [...m.values()];
    if (home) list.push({ key: 'home', name: home.name, countryCode: home.countryCode, lat: home.lat, lng: home.lng, trips: [], isHome: true });
    return list;
  }, [trips, home]);

  const legs = useMemo(() => trips.flatMap((t) => tripLegs(t, home)), [trips, home]);

  // Auf eine Reise zoomen, wenn sie über #/globe?trip=… geöffnet wurde.
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const trip = focusTripId ? trips.find((t) => t.id === focusTripId) : undefined;
    if (trip && trip.stops.length) {
      const lat = trip.stops.reduce((s, x) => s + x.lat, 0) / trip.stops.length;
      const lng = trip.stops.reduce((s, x) => s + x.lng, 0) / trip.stops.length;
      g.controls().autoRotate = false;
      g.pointOfView({ lat, lng, altitude: 1.4 }, 1500);
    } else if (home) {
      g.pointOfView({ lat: home.lat - 10, lng: home.lng, altitude: 2.2 }, 0);
    }
  }, [focusTripId, trips, home, size.width > 0]);

  useEffect(() => {
    const g = globeRef.current;
    if (!g || !size.width) return;
    const controls = g.controls();
    controls.autoRotate = !focusTripId;
    controls.autoRotateSpeed = 0.35;
    const stop = () => (controls.autoRotate = false);
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [size.width > 0, focusTripId]);

  const highlightTrip = (trip: Trip) => focusTripId === trip.id;
  const legColor = (l: Leg) => {
    const c = transportColors[l.transport];
    if (focusTripId && l.tripId !== focusTripId) return `${c}33`;
    return c;
  };

  const visitColor = (code?: string) => {
    const n = code ? (visits.get(code)?.length ?? 0) : 0;
    if (!n) return colors.land;
    return colors.visited[Math.min(n, colors.visited.length) - 1];
  };

  // Legende nach Farbe gruppiert (z. B. „Auto / Bus“ teilen sich eine Farbe).
  const legend = new Map<string, string[]>();
  for (const t of new Set(legs.map((l) => l.transport))) {
    const c = transportColors[t];
    legend.set(c, [...(legend.get(c) ?? []), TRANSPORTS[t].label]);
  }
  const selectedCountryTrips = selection?.kind === 'country' ? (visits.get(selection.code) ?? []) : [];

  return (
    <div className="globe-wrap" ref={containerRef}>
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={material}
          showAtmosphere
          atmosphereColor={colors.atmosphere}
          atmosphereAltitude={0.18}
          polygonsData={countries}
          polygonCapColor={(f) => {
            const feat = f as CountryFeature;
            return feat === hoverCountry ? (dark ? '#f8fafc' : '#334155') : visitColor(feat.properties.code);
          }}
          polygonSideColor={() => 'rgba(0,0,0,0.15)'}
          polygonStrokeColor={() => colors.border}
          polygonAltitude={(f) => ((f as CountryFeature).properties.code && visits.has((f as CountryFeature).properties.code!) ? 0.012 : 0.005)}
          polygonsTransitionDuration={300}
          polygonLabel={(f) => {
            const code = (f as CountryFeature).properties.code;
            const name = code ? countryName(code) : (f as CountryFeature).properties.name;
            const n = code ? (visits.get(code)?.length ?? 0) : 0;
            return `<div class="globe-tip">${code ? flag(code) : ''} <b>${esc(name)}</b><br/>${n ? `${n} Reise${n > 1 ? 'n' : ''}` : 'noch nicht besucht'}</div>`;
          }}
          onPolygonHover={(f) => setHoverCountry(f as CountryFeature | null)}
          onPolygonClick={(f) => {
            const code = (f as CountryFeature).properties.code;
            if (code) setSelection({ kind: 'country', code });
          }}
          pointsData={places}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={(p) => ((p as Place).isHome ? 0.04 : 0.025)}
          pointRadius={(p) => ((p as Place).isHome ? 0.5 : 0.28 + Math.min(0.3, (p as Place).trips.length * 0.06))}
          pointColor={(p) => {
            const place = p as Place;
            if (place.isHome) return '#22c55e';
            if (focusTripId && !place.trips.some(highlightTrip)) return colors.placeDim;
            return colors.place;
          }}
          pointLabel={(p) => {
            const place = p as Place;
            if (place.isHome) return `<div class="globe-tip">🏠 <b>${esc(place.name)}</b><br/>Zuhause</div>`;
            return `<div class="globe-tip">${flag(place.countryCode)} <b>${esc(place.name)}</b><br/>${place.trips.map((t) => esc(t.title)).join('<br/>')}</div>`;
          }}
          onPointClick={(p) => !(p as Place).isHome && setSelection({ kind: 'place', place: p as Place })}
          arcsData={legs}
          arcStartLat={(l) => (l as Leg).from.lat}
          arcStartLng={(l) => (l as Leg).from.lng}
          arcEndLat={(l) => (l as Leg).to.lat}
          arcEndLng={(l) => (l as Leg).to.lng}
          arcColor={(l: object) => legColor(l as Leg)}
          arcAltitude={(l) => ((l as Leg).transport === 'flight' ? null : 0.004 + Math.min(0.03, (l as Leg).km / 60000))}
          arcAltitudeAutoScale={0.35}
          arcStroke={(l) => (focusTripId === (l as Leg).tripId ? 0.9 : 0.45)}
          arcDashLength={(l) => ((l as Leg).transport === 'flight' ? 0.4 : 1)}
          arcDashGap={(l) => ((l as Leg).transport === 'flight' ? 0.15 : 0)}
          arcDashAnimateTime={(l) => ((l as Leg).transport === 'flight' ? 4000 : 0)}
          arcLabel={(l) => {
            const leg = l as Leg;
            return `<div class="globe-tip">${TRANSPORTS[leg.transport].icon} ${esc(leg.from.name)} → ${esc(leg.to.name)}<br/>${Math.round(leg.km).toLocaleString('de-DE')} km</div>`;
          }}
        />
      )}

      {legend.size > 0 && (
        <div className="globe-legend" aria-label="Legende">
          {[...legend.entries()].map(([color, labels]) => (
            <span key={color}>
              <i style={{ background: color }} />
              {labels.join(' / ')}
            </span>
          ))}
          {home && (
            <span>
              <i style={{ background: '#22c55e' }} />
              Zuhause
            </span>
          )}
        </div>
      )}

      {trips.length === 0 && (
        <div className="globe-empty card">
          <h2>Noch keine Reisen</h2>
          <p className="muted">Lege deine erste Reise an oder lade Demo-Daten, um alles auszuprobieren.</p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => navigate('edit/new')}>
              + Erste Reise anlegen
            </button>
            <button className="btn" onClick={() => navigate('data')}>
              Demo-Daten
            </button>
          </div>
        </div>
      )}

      {selection && (
        <aside className="globe-panel card">
          <button className="panel-close" aria-label="Schließen" onClick={() => setSelection(null)}>
            ×
          </button>
          {selection.kind === 'place' ? (
            <>
              <h3>
                {flag(selection.place.countryCode)} {selection.place.name}
              </h3>
              <p className="muted">{countryName(selection.place.countryCode)}</p>
              <TripList trips={selection.place.trips} />
            </>
          ) : (
            <>
              <h3>
                {flag(selection.code)} {countryName(selection.code)}
              </h3>
              <p className="muted">
                {selectedCountryTrips.length ? `${selectedCountryTrips.length} Reise(n)` : 'Hier warst du noch nicht.'}
              </p>
              <TripList trips={selectedCountryTrips} />
              {selectedCountryTrips.length > 0 && (
                <button className="btn" onClick={() => onFilterCountry(selection.code)}>
                  Nach diesem Land filtern
                </button>
              )}
            </>
          )}
        </aside>
      )}
    </div>
  );
}

function TripList({ trips }: { trips: Trip[] }) {
  return (
    <ul className="panel-trips">
      {[...trips]
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .map((t) => (
          <li key={t.id}>
            <a href={`#/trip/${t.id}`}>
              <strong>{t.title}</strong>
              <small>{formatRange(t.startDate, t.endDate)}</small>
            </a>
          </li>
        ))}
    </ul>
  );
}
